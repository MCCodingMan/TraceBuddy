package http

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"tracebuddy/internal/adapters/logger"
	"tracebuddy/internal/core/domain"
	"tracebuddy/internal/utils"

	"github.com/gin-gonic/gin"
)

type LogMiddleware struct {
	logger *logger.AsyncLogger
}

func NewLogMiddleware(l *logger.AsyncLogger) *LogMiddleware {
	return &LogMiddleware{logger: l}
}

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (m *LogMiddleware) Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// 生成或获取 Track ID
		trackID := c.GetHeader("X-Trace-Id")
		if trackID == "" {
			trackID = utils.GenerateTrackID()
		}
		c.Header("X-Trace-Id", trackID)

		// 读取请求体
		var reqBodyBytes []byte
		if c.Request.Body != nil {
			reqBodyBytes, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(reqBodyBytes))
		}

		// 包装 Response Writer 以捕获响应体
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		// 处理请求
		c.Next()

		// 计算耗时
		duration := time.Since(start).Milliseconds()

		// 准备日志条目
		entry := domain.LogEntry{
			TrackID:    trackID,
			Timestamp:  start,
			DurationMs: duration,
			ClientIP:   c.ClientIP(),
			Request: domain.RequestInfo{
				Method:      c.Request.Method,
				URL:         c.Request.URL.String(),
				Proto:       c.Request.Proto,
				Headers:     convertHeaders(c.Request.Header),
				QueryParams: convertQueryParams(c.Request.URL.Query()),
				Body:        maskSensitiveData(reqBodyBytes),
			},
			Response: domain.ResponseInfo{
				StatusCode: c.Writer.Status(),
				Headers:    convertHeaders(c.Writer.Header()),
				Body:       maskSensitiveData(blw.body.Bytes()),
				Size:       int64(blw.Size()),
			},
		}

		// 发送到异步记录器
		m.logger.Log(entry)
	}
}

func convertHeaders(h http.Header) map[string]string {
	headers := make(map[string]string)
	for k, v := range h {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}
	return headers
}

func convertQueryParams(q map[string][]string) map[string]string {
	params := make(map[string]string)
	for k, v := range q {
		if len(v) > 0 {
			params[k] = v[0]
		}
	}
	return params
}

func maskSensitiveData(body []byte) interface{} {
	if len(body) == 0 {
		return nil
	}

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return string(body) // 如果不是 JSON，则返回原始字符串
	}

	maskKeys := []string{"password", "token", "secret", "authorization"}
	for k := range data {
		for _, maskKey := range maskKeys {
			if k == maskKey {
				data[k] = "***"
			}
		}
	}
	return data
}
