package domain

import "time"

// LogEntry 代表核心日志实体
type LogEntry struct {
	TrackID     string       `json:"track_id"`
	Timestamp   time.Time    `json:"timestamp"`
	DurationMs  int64        `json:"duration_ms"`
	Request     RequestInfo  `json:"request"`
	Response    ResponseInfo `json:"response"`
	ClientIP    string       `json:"client_ip"`
	Service     string       `json:"service,omitempty"`
	Environment string       `json:"environment,omitempty"`
	Level       string       `json:"level,omitempty"`   // 日志级别: info, warn, error
	Message     string       `json:"message,omitempty"` // 日志内容
}

// RequestInfo 捕获HTTP请求详情
type RequestInfo struct {
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	Proto       string            `json:"proto"`
	Headers     map[string]string `json:"headers"`
	QueryParams map[string]string `json:"query_params,omitempty"`
	Body        interface{}       `json:"body,omitempty"` // 可以是字符串或 map[string]interface{}
}

// ResponseInfo 捕获HTTP响应详情
type ResponseInfo struct {
	StatusCode int               `json:"status_code"`
	Headers    map[string]string `json:"headers"`
	Body       interface{}       `json:"body,omitempty"`
	Size       int64             `json:"size"`
}
