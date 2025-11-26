package config

import (
	"os"
	"strconv"
)

type Config struct {
	ServerPort    string
	ElasticURL    string
	RedisAddr     string
	RedisPassword string
	RedisDB       int
	Environment   string
	ServiceName   string
}

// Load 从环境变量加载配置
func Load() *Config {
	return &Config{
		ServerPort:    getEnv("SERVER_PORT", "8080"),
		ElasticURL:    getEnv("ELASTIC_URL", "http://localhost:9200"),
		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),
		Environment:   getEnv("ENVIRONMENT", "development"),
		ServiceName:   getEnv("SERVICE_NAME", "tracebuddy"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, ok := os.LookupEnv(key); ok {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return fallback
}
