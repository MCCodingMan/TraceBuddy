package ports

import (
	"context"

	"github.com/MCCodingMan/TraceBuddy/pkg/core/domain"
)

// LogRepository 定义日志存储和检索的接口
type LogRepository interface {
	Save(ctx context.Context, entry domain.LogEntry) error
	FindByID(ctx context.Context, trackID string) (*domain.LogEntry, error)
	Search(ctx context.Context, query LogSearchQuery) ([]domain.LogEntry, int64, error)
}

// LogSearchQuery 定义日志搜索参数
type LogSearchQuery struct {
	Page      int    `json:"page" form:"page"` // 页码
	Size      int    `json:"size" form:"size"` // 每页数量
	From      int    `json:"-"`                // ES from (calculated)
	StartTime string `json:"start_time" form:"start_time"`
	EndTime   string `json:"end_time" form:"end_time"`
	Method    string `json:"method" form:"method"`
	Status    int    `json:"status" form:"status"`
	Path      string `json:"path" form:"path"`
	Level     string `json:"level" form:"level"`     // 日志级别筛选
	Keyword   string `json:"keyword" form:"keyword"` // 关键字模糊搜索
}
