package logger

import (
	"context"
	"log"
	"sync"

	"github.com/MCCodingMan/TraceBuddy/pkg/core/domain"
	"github.com/MCCodingMan/TraceBuddy/pkg/core/ports"
)

// AsyncLogger 异步日志记录器
type AsyncLogger struct {
	logChan chan domain.LogEntry
	repo    ports.LogRepository
	wg      sync.WaitGroup
}

func NewAsyncLogger(repo ports.LogRepository, bufferSize int) *AsyncLogger {
	l := &AsyncLogger{
		logChan: make(chan domain.LogEntry, bufferSize),
		repo:    repo,
	}
	l.startWorker()
	return l
}

func (l *AsyncLogger) startWorker() {
	l.wg.Add(1)
	go func() {
		defer l.wg.Done()
		for entry := range l.logChan {
			// 这里可以添加重试逻辑
			if err := l.repo.Save(context.Background(), entry); err != nil {
				log.Printf("Failed to save log entry: %v", err)
			}
		}
	}()
}

// Log 将日志条目发送到通道
func (l *AsyncLogger) Log(entry domain.LogEntry) {
	select {
	case l.logChan <- entry:
	default:
		log.Printf("Log buffer full, dropping log: %s", entry.TrackID)
	}
}

// Close 关闭日志记录器并等待所有日志处理完成
func (l *AsyncLogger) Close() {
	close(l.logChan)
	l.wg.Wait()
}
