package main

import (
	"log"

	"github.com/MCCodingMan/TraceBuddy/config"
	adapterHttp "github.com/MCCodingMan/TraceBuddy/pkg/adapters/http"
	"github.com/MCCodingMan/TraceBuddy/pkg/adapters/storage"

	"github.com/gin-gonic/gin"
)

const jwtSecret = "your-secret-key-change-this-in-production"

func main() {
	// 加载配置
	cfg := config.Load()

    repo, err := storage.NewPostgresRepository(cfg.DatabaseDSN)
    if err != nil {
        log.Fatalf("Failed to connect to Postgres: %v", err)
    }

	// 初始化 Redis
	redisRepo := storage.NewRedisRepository(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)

	// 初始化异步日志记录器
	// 我们使用 ES repo 进行异步日志记录
	// asyncLogger := logger.NewAsyncLogger(esRepo, 1000)
	// defer asyncLogger.Close()

	// 初始化 Gin
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
    r := gin.New()
    r.Use(gin.Recovery())
    r.Use(adapterHttp.CORSMiddleware())

	// 注册中间件
	// logMiddleware := adapterHttp.NewLogMiddleware(asyncLogger)
	// r.Use(logMiddleware.Handler())

	// 注册安全中间件
	// 注意：通常建议全局应用，或者针对特定路由组应用
	// 这里为了演示，我们假设所有 /api 路由都需要认证
	// 但为了方便测试，我们只在 Export 接口上强制认证，或者在路由组中添加

    logHandler := adapterHttp.NewLogHandler(repo, redisRepo)
    authHandler := adapterHttp.NewAuthHandler(repo, jwtSecret)

	// 注册登录接口 (不需要认证)
	r.POST("/api/auth/login", authHandler.Login)

	// 使用带认证的路由组
	api := r.Group("/api")
	api.Use(adapterHttp.AuthMiddleware(jwtSecret))
	api.Use(adapterHttp.AuditMiddleware())
	{
		api.GET("/logs/:track_id", logHandler.GetLogByID)
		api.POST("/logs/search", logHandler.SearchLogs)
		api.GET("/logs/search", logHandler.SearchLogs)
		api.POST("/logs/export", logHandler.ExportLogs)
	}

	// 启动服务器
	log.Printf("Starting server on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
