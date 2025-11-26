package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"time"

	"tracebuddy/internal/core/domain"
	"tracebuddy/internal/core/ports"

	elasticsearch "github.com/elastic/go-elasticsearch/v8"
)

type ElasticsearchRepository struct {
	client *elasticsearch.Client
}

func NewElasticsearchRepository(url string) (*ElasticsearchRepository, error) {
	cfg := elasticsearch.Config{
		Addresses: []string{url},
	}
	es, err := elasticsearch.NewClient(cfg)
	if err != nil {
		return nil, err
	}
	return &ElasticsearchRepository{client: es}, nil
}

// Save 将日志条目保存到 Elasticsearch
func (r *ElasticsearchRepository) Save(ctx context.Context, entry domain.LogEntry) error {
	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	indexName := fmt.Sprintf("logs-%s", time.Now().Format("2006.01.02"))

	res, err := r.client.Index(
		indexName,
		bytes.NewReader(data),
		r.client.Index.WithContext(ctx),
		r.client.Index.WithDocumentID(entry.TrackID),
	)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("error indexing document: %s", res.String())
	}
	return nil
}

// FindByID 根据 TrackID 查找日志条目
func (r *ElasticsearchRepository) FindByID(ctx context.Context, trackID string) (*domain.LogEntry, error) {
	// 在所有日志索引中搜索
	var buf bytes.Buffer
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"term": map[string]interface{}{
				"track_id.keyword": trackID,
			},
		},
	}
	if err := json.NewEncoder(&buf).Encode(query); err != nil {
		return nil, err
	}

	res, err := r.client.Search(
		r.client.Search.WithContext(ctx),
		r.client.Search.WithIndex("logs-*"),
		r.client.Search.WithBody(&buf),
		r.client.Search.WithSize(1),
	)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("error searching document: %s", res.String())
	}

	var result map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, err
	}

	hits := result["hits"].(map[string]interface{})["hits"].([]interface{})
	if len(hits) == 0 {
		return nil, nil
	}

	source := hits[0].(map[string]interface{})["_source"]
	sourceBytes, _ := json.Marshal(source)

	var entry domain.LogEntry
	if err := json.Unmarshal(sourceBytes, &entry); err != nil {
		return nil, err
	}

	return &entry, nil
}

// Search 根据查询条件搜索日志
func (r *ElasticsearchRepository) Search(ctx context.Context, query ports.LogSearchQuery) ([]domain.LogEntry, int64, error) {
	var buf bytes.Buffer

	boolQuery := map[string]interface{}{
		"must": []interface{}{},
	}

	if query.StartTime != "" || query.EndTime != "" {
		rangeQuery := map[string]interface{}{
			"timestamp": map[string]interface{}{},
		}
		if query.StartTime != "" {
			rangeQuery["timestamp"].(map[string]interface{})["gte"] = query.StartTime
		}
		if query.EndTime != "" {
			rangeQuery["timestamp"].(map[string]interface{})["lte"] = query.EndTime
		}
		boolQuery["must"] = append(boolQuery["must"].([]interface{}), map[string]interface{}{"range": rangeQuery})
	}

	if query.Method != "" {
		boolQuery["must"] = append(boolQuery["must"].([]interface{}), map[string]interface{}{"term": map[string]interface{}{"request.method.keyword": query.Method}})
	}

	if query.Status != 0 {
		boolQuery["must"] = append(boolQuery["must"].([]interface{}), map[string]interface{}{"term": map[string]interface{}{"response.status_code": query.Status}})
	}

	if query.Path != "" {
		boolQuery["must"] = append(boolQuery["must"].([]interface{}), map[string]interface{}{"wildcard": map[string]interface{}{"request.url.keyword": "*" + query.Path + "*"}})
	}

	esQuery := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": boolQuery,
		},
		"from": query.From,
		"size": query.Size,
		"sort": []interface{}{
			map[string]interface{}{"timestamp": "desc"},
		},
	}

	if err := json.NewEncoder(&buf).Encode(esQuery); err != nil {
		return nil, 0, err
	}

	res, err := r.client.Search(
		r.client.Search.WithContext(ctx),
		r.client.Search.WithIndex("logs-*"),
		r.client.Search.WithBody(&buf),
	)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()

	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		log.Printf("ES Search Error: %s", string(body))
		return nil, 0, fmt.Errorf("error searching documents: %s", res.Status())
	}

	var result map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, 0, err
	}

	hitsWrapper, ok := result["hits"].(map[string]interface{})
	if !ok {
		return []domain.LogEntry{}, 0, nil
	}

	total := int64(hitsWrapper["total"].(map[string]interface{})["value"].(float64))
	hits := hitsWrapper["hits"].([]interface{})

	entries := make([]domain.LogEntry, 0, len(hits))
	for _, hit := range hits {
		source := hit.(map[string]interface{})["_source"]
		sourceBytes, _ := json.Marshal(source)
		var entry domain.LogEntry
		if err := json.Unmarshal(sourceBytes, &entry); err != nil {
			continue
		}
		entries = append(entries, entry)
	}

	return entries, total, nil
}
