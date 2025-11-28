package main

import (
    "log"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"

    // 引入 TraceBuddy SDK
    adapterHttp "github.com/MCCodingMan/TraceBuddy/pkg/adapters/http"
    "github.com/MCCodingMan/TraceBuddy/pkg/adapters/logger"
    "github.com/MCCodingMan/TraceBuddy/pkg/adapters/storage"
)

func main() {
    // 1. 初始化存储 (Postgres)
    // 在实际项目中，你应该从配置中读取 DSN
    repo, err := storage.NewPostgresRepository("postgres://tracebuddy:tracebuddy@localhost:5432/tracebuddy?sslmode=disable")
    if err != nil {
        log.Fatalf("Failed to connect to Postgres: %v", err)
    }

	// 2. 初始化异步日志记录器
	// bufferSize 可以根据负载调整，例如 1000
    asyncLogger := logger.NewAsyncLogger(repo, 1000)
	defer asyncLogger.Close()

	// 3. 初始化 Gin 引擎
	r := gin.Default()

	// 4. 注册 TraceBuddy 日志中间件
	// 这将自动捕获所有请求的详细信息并发送到 Elasticsearch
	logMiddleware := adapterHttp.NewLogMiddleware(asyncLogger)
	r.Use(logMiddleware.Handler())

	// 5. 定义你的业务路由
	r.GET("/hello", func(c *gin.Context) {
		// 你可以在处理函数中获取 Trace ID
		trackID := c.GetHeader("X-Trace-Id")

		c.JSON(http.StatusOK, gin.H{
			"message":  "Hello, World!",
			"track_id": trackID,
			"time":     time.Now(),
		})
	})

	// 6. 启动服务
	log.Println("Starting example server on :8081")
	if err := r.Run(":8081"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
