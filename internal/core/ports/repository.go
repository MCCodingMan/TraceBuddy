package ports

import (
	"context"

	"github.com/MCCodingMan/TraceBuddy/internal/core/domain"
)

// LogRepository 定义日志存储和检索的接口
type LogRepository interface {
	Save(ctx context.Context, entry domain.LogEntry) error
	FindByID(ctx context.Context, trackID string) (*domain.LogEntry, error)
	Search(ctx context.Context, query LogSearchQuery) ([]domain.LogEntry, int64, error)
}

// LogSearchQuery 定义日志搜索参数
type LogSearchQuery struct {
	From      int
	Size      int
	StartTime string
	EndTime   string
	Method    string
	Status    int
	Path      string
}
