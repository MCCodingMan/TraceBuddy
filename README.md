# TraceBuddy 日志系统

TraceBuddy 是一个基于 Go 语言开发的全面日志记录系统，支持 HTTP 请求/响应拦截、性能监控、分布式追踪以及日志的持久化存储和查询。

## 功能特性

- **全量日志记录**：自动捕获 HTTP 请求和响应的详细信息（Header、Body、Status 等）。
- **分布式追踪**：生成并传播 `X-Trace-Id`，支持跨服务链路追踪。
- **异步写入**：使用 Goroutine 和 Channel 实现异步日志写入，不阻塞主业务。
- **高性能存储**：使用 PostgreSQL(JSONB + 索引) 进行日志存储和检索。
- **敏感数据脱敏**：自动隐藏密码、Token 等敏感信息。
- **API 查询**：提供 RESTful API 用于日志查询和分析。

## 依赖说明

本项目依赖以下核心组件：

1.  **PostgreSQL (v16.x)**: 用于日志的主要存储与检索。
2.  **Redis (v7.x)**: (可选) 用于缓存热点日志数据。
3.  **Docker & Docker Compose**: 用于快速部署依赖环境。

## 如何依赖本项目

如果你需要在其他 Go 项目中使用 TraceBuddy 的核心领域模型或工具库，可以通过以下方式引入：

1.  **获取依赖**:
    ```bash
    go get github.com/MCCodingMan/TraceBuddy
    ```

2.  **代码引用**:
    ```go
    import (
        "github.com/MCCodingMan/TraceBuddy/pkg/core/domain"
        "github.com/MCCodingMan/TraceBuddy/pkg/utils"
    )

    func main() {
        // 使用领域模型
        entry := domain.LogEntry{
            TrackID: utils.GenerateTrackID(),
        }
        // ...
    }
    ```

3.  **完整使用示例**:

    以下是一个完整的示例，展示了如何在 Gin 项目中集成 TraceBuddy SDK：

    ```go
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
        // 1. 初始化存储 (PostgreSQL)
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
        // 这将自动捕获所有请求的详细信息并写入 PostgreSQL
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
    ```

## 快速开始

### 1. 环境准备

确保本地已安装 Docker 和 Docker Compose。

### 2. 启动依赖服务

在项目根目录下运行以下命令，启动 PostgreSQL 和 Redis：

```bash
docker-compose up -d
```

该命令会启动：
- PostgreSQL (端口 5432)
- Redis (端口 6379)

### 3. 运行项目

#### 方式一：直接运行源码

确保已安装 Go 1.18+ 环境。

```bash
# 下载依赖
go mod tidy

# 运行服务
go run cmd/server/main.go
```

#### 方式二：编译运行

```bash
# 编译二进制文件
go build -o tracebuddy cmd/server/main.go

# 运行二进制文件
./tracebuddy
```

### 4. 验证服务

服务启动后，默认监听 8080 端口。

- **健康检查**:
  ```bash
  curl http://localhost:8080/health
  ```

- **搜索日志**:
  ```bash
  curl -X POST http://localhost:8080/api/logs/search \
    -H "Content-Type: application/json" \
    -d '{"size": 10}'
  ```

## 配置说明

可以通过环境变量配置服务：

| 变量名 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `SERVER_PORT` | `8080` | 服务监听端口 |
| `DB_DRIVER` | `pgx` | 数据库驱动 |
| `DB_DSN` | `postgres://tracebuddy:tracebuddy@localhost:5432/tracebuddy?sslmode=disable` | 数据库连接串 |
| `REDIS_ADDR` | `localhost:6379` | Redis 地址 |
| `ENVIRONMENT` | `development` | 运行环境 (development/production) |

## 目录结构

```
TraceBuddy/
├── cmd/
│   └── server/          # 程序入口
├── config/              # 配置加载
├── internal/
│   ├── core/
│   │   ├── domain/      # 领域实体
│   │   └── ports/       # 接口定义
│   ├── adapters/
│   │   ├── http/        # HTTP 处理器和中间件
│   │   ├── storage/     # Postgres 和 Redis 实现
│   │   └── logger/      # 异步日志记录器
│   └── utils/           # 工具函数
├── go.mod
└── docker-compose.yml   # 基础设施编排
```
