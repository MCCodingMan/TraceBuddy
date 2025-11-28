package storage

import (
	"context"
	"encoding/json"
	"time"

	"github.com/MCCodingMan/TraceBuddy/pkg/core/domain"

	"github.com/redis/go-redis/v9"
)

type RedisRepository struct {
	client *redis.Client
}

func NewRedisRepository(addr, password string, db int) *RedisRepository {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	return &RedisRepository{client: rdb}
}

// Save 将日志条目保存到 Redis 缓存
func (r *RedisRepository) Save(ctx context.Context, entry domain.LogEntry, ttl time.Duration) error {
	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, "log:"+entry.TrackID, data, ttl).Err()
}

// Get 从 Redis 缓存中获取日志条目
func (r *RedisRepository) Get(ctx context.Context, trackID string) (*domain.LogEntry, error) {
	val, err := r.client.Get(ctx, "log:"+trackID).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var entry domain.LogEntry
	if err := json.Unmarshal([]byte(val), &entry); err != nil {
		return nil, err
	}
	return &entry, nil
}

// CacheSearchResult 缓存搜索结果
func (r *RedisRepository) CacheSearchResult(ctx context.Context, key string, logs []domain.LogEntry, total int64, ttl time.Duration) error {
	data := map[string]interface{}{
		"logs":  logs,
		"total": total,
	}
	bytes, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, "search:"+key, bytes, ttl).Err()
}

// GetCachedSearchResult 获取缓存的搜索结果
func (r *RedisRepository) GetCachedSearchResult(ctx context.Context, key string) ([]domain.LogEntry, int64, error) {
	val, err := r.client.Get(ctx, "search:"+key).Result()
	if err == redis.Nil {
		return nil, 0, nil
	}
	if err != nil {
		return nil, 0, err
	}

	var data struct {
		Logs  []domain.LogEntry `json:"logs"`
		Total int64             `json:"total"`
	}
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, 0, err
	}
	return data.Logs, data.Total, nil
}

// SaveAPIKey 保存 API Key
func (r *RedisRepository) SaveAPIKey(ctx context.Context, apiKey string, clientInfo string) error {
	return r.client.Set(ctx, "apikey:"+apiKey, clientInfo, 0).Err() // 0 means no expiration
}

// ValidateAPIKey 验证 API Key 是否有效
func (r *RedisRepository) ValidateAPIKey(ctx context.Context, apiKey string) (bool, error) {
	exists, err := r.client.Exists(ctx, "apikey:"+apiKey).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}
