package utils

import (
	"github.com/google/uuid"
)

// GenerateTrackID 生成一个新的 UUID v4 字符串
func GenerateTrackID() string {
	return uuid.New().String()
}

// IsValidUUID 检查字符串是否为有效的 UUID
func IsValidUUID(u string) bool {
	_, err := uuid.Parse(u)
	return err == nil
}
