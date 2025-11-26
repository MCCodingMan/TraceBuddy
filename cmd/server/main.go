package main

import (
	"log"
	"time"

	"tracebuddy/config"
	adapterHttp "tracebuddy/internal/adapters/http"
	"tracebuddy/internal/adapters/logger"
	"tracebuddy/internal/adapters/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 初始化 Elasticsearch
	esRepo, err := storage.NewElasticsearchRepository(cfg.ElasticURL)
	if err != nil {
		log.Fatalf("Failed to connect to Elasticsearch: %v", err)
	}

	// 初始化 Redis
	// redisRepo := storage.NewRedisRepository(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)

	// 初始化异步日志记录器
	// 我们使用 ES repo 进行异步日志记录
	asyncLogger := logger.NewAsyncLogger(esRepo, 1000)
	defer asyncLogger.Close()

	// 初始化 Gin
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery())

	// 注册中间件
	logMiddleware := adapterHttp.NewLogMiddleware(asyncLogger)
	r.Use(logMiddleware.Handler())

	// 初始化处理器
	logHandler := adapterHttp.NewLogHandler(esRepo)
	logHandler.RegisterRoutes(r)

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "up",
			"time":   time.Now(),
		})
	})

	// 启动服务器
	log.Printf("Starting server on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
