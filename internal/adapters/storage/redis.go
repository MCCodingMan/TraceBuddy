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
