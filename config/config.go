package config

import (
	"os"
	"strconv"
)

type Config struct {
    ServerPort    string
    RedisAddr     string
    RedisPassword string
    RedisDB       int
    Environment   string
    ServiceName   string
    DatabaseDriver string
    DatabaseDSN    string
}

// Load 从环境变量加载配置
func Load() *Config {
    return &Config{
        ServerPort:    getEnv("SERVER_PORT", "8080"),
        RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
        RedisPassword: getEnv("REDIS_PASSWORD", ""),
        RedisDB:       getEnvInt("REDIS_DB", 0),
        Environment:   getEnv("ENVIRONMENT", "development"),
        ServiceName:   getEnv("SERVICE_NAME", "tracebuddy"),
        DatabaseDriver: getEnv("DB_DRIVER", "pgx"),
        DatabaseDSN:    getEnv("DB_DSN", "postgres://tracebuddy:tracebuddy@localhost:5432/tracebuddy?sslmode=disable"),
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
