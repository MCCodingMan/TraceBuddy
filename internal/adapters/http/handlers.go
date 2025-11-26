package http

import (
	"net/http"
	"strconv"

	"tracebuddy/internal/core/ports"

	"github.com/gin-gonic/gin"
)

type LogHandler struct {
	repo ports.LogRepository
}

func NewLogHandler(repo ports.LogRepository) *LogHandler {
	return &LogHandler{repo: repo}
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
		// 如果 JSON 绑定失败或为空，尝试从查询参数绑定
		// 这允许同时支持 POST body 和 GET query params
		if query.From == 0 && query.Size == 0 {
			query.From, _ = strconv.Atoi(c.DefaultQuery("from", "0"))
			query.Size, _ = strconv.Atoi(c.DefaultQuery("size", "10"))
			query.StartTime = c.Query("start_time")
			query.EndTime = c.Query("end_time")
			query.Method = c.Query("method")
			query.Status, _ = strconv.Atoi(c.Query("status"))
			query.Path = c.Query("path")
		}
	}

	if query.Size == 0 {
		query.Size = 10
	}

	logs, total, err := h.repo.Search(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  logs,
		"total": total,
		"page":  query.From/query.Size + 1,
		"size":  query.Size,
	})
}

func (h *LogHandler) RegisterRoutes(router *gin.Engine) {
	api := router.Group("/api")
	{
		api.GET("/logs/:track_id", h.GetLogByID)
		api.POST("/logs/search", h.SearchLogs)
		api.GET("/logs/search", h.SearchLogs) // 支持 GET 进行简单搜索
	}
}
