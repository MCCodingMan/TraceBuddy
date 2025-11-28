package http

import (
	"context"
	"net/http"
	"strconv"

	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"time"

	"github.com/MCCodingMan/TraceBuddy/pkg/adapters/storage"
	"github.com/MCCodingMan/TraceBuddy/pkg/core/ports"

	"github.com/gin-gonic/gin"
)

type LogHandler struct {
	repo      ports.LogRepository
	redisRepo *storage.RedisRepository
}

func NewLogHandler(repo ports.LogRepository, redisRepo *storage.RedisRepository) *LogHandler {
	return &LogHandler{
		repo:      repo,
		redisRepo: redisRepo,
	}
}

// GetLogByID 根据 ID 获取日志
func (h *LogHandler) GetLogByID(c *gin.Context) {
	trackID := c.Param("track_id")
	if trackID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "track_id is required"})
		return
	}

	logEntry, err := h.repo.FindByID(c.Request.Context(), trackID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if logEntry == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "log not found"})
		return
	}

	c.JSON(http.StatusOK, logEntry)
}

// SearchLogs 搜索日志
func (h *LogHandler) SearchLogs(c *gin.Context) {
	var query ports.LogSearchQuery
	if err := c.ShouldBindJSON(&query); err != nil {
		if query.Page == 0 && query.Size == 0 {
			query.Page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
			query.Size, _ = strconv.Atoi(c.DefaultQuery("size", "10"))
			query.StartTime = c.Query("start_time")
			query.EndTime = c.Query("end_time")
			query.Method = c.Query("method")
			query.Status, _ = strconv.Atoi(c.Query("status"))
			query.Path = c.Query("path")
			query.Level = c.Query("level")
			query.Keyword = c.Query("keyword")
		}
	}

	if query.Page <= 0 {
		query.Page = 1
	}
	if query.Size <= 0 {
		query.Size = 10
	}

	// Generate cache key
	queryBytes, _ := json.Marshal(query)
	hash := sha256.Sum256(queryBytes)
	cacheKey := hex.EncodeToString(hash[:])

	// Try to get from cache
	if h.redisRepo != nil {
		logs, total, err := h.redisRepo.GetCachedSearchResult(c.Request.Context(), cacheKey)
		if err == nil && logs != nil {
			c.Header("X-Cache", "HIT")
			c.JSON(http.StatusOK, gin.H{
				"data":  logs,
				"total": total,
				"page":  query.Page,
				"size":  query.Size,
			})
			return
		}
	}

	logs, total, err := h.repo.Search(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Cache result
	if h.redisRepo != nil {
		go func() {
			if err := h.redisRepo.CacheSearchResult(context.Background(), cacheKey, logs, total, 5*time.Minute); err != nil {
				log.Printf("Failed to cache search result: %v", err)
			}
		}()
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"data":  logs,
		"total": total,
		"page":  query.Page,
		"size":  query.Size,
	})
}

// ExportLogs 异步导出日志
func (h *LogHandler) ExportLogs(c *gin.Context) {
	var query ports.LogSearchQuery
	if err := c.ShouldBindJSON(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query"})
		return
	}

	// Start async export
	go func() {
		log.Printf("Starting export for query: %+v", query)
		// Simulate export delay
		time.Sleep(2 * time.Second)
		// In real world, this would query ES (scroll API) and write to a file/S3
		log.Printf("Export completed for query: %+v", query)
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Export task started",
		"status":  "processing",
	})
}

func (h *LogHandler) RegisterRoutes(router *gin.Engine) {
	api := router.Group("/api")
	{
		api.GET("/logs/:track_id", h.GetLogByID)
		api.POST("/logs/search", h.SearchLogs)
		api.GET("/logs/search", h.SearchLogs) // 支持 GET 进行简单搜索
		api.POST("/logs/export", h.ExportLogs)
	}
}
