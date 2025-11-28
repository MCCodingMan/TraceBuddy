package http

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/MCCodingMan/TraceBuddy/pkg/adapters/logger"
	"github.com/MCCodingMan/TraceBuddy/pkg/core/domain"
	"github.com/MCCodingMan/TraceBuddy/pkg/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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

// AuthMiddleware JWT Token 认证
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		// 提取 Bearer Token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}

		tokenString := parts[1]

		// 验证 JWT Token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		// 提取用户信息
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("username", claims["username"])
			c.Set("role", claims["role"])
		}

		c.Next()
	}
}

// AuditMiddleware 审计日志中间件
func AuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 只审计敏感操作，例如导出
		if c.Request.Method == "POST" && c.FullPath() == "/api/logs/export" {
			user := c.GetHeader("X-API-Key") // 假设 API Key 是用户标识
			log.Printf("[AUDIT] User %s requested log export at %s", user, time.Now().Format(time.RFC3339))
		}
		c.Next()
	}
}

func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        origin := c.GetHeader("Origin")
        if origin != "" {
            c.Header("Access-Control-Allow-Origin", origin)
        } else {
            c.Header("Access-Control-Allow-Origin", "*")
        }
        c.Header("Access-Control-Allow-Credentials", "true")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Trace-Id")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        c.Next()
    }
}
