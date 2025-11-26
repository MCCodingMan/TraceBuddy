package utils

import (
	"testing"
)

func TestGenerateTrackID(t *testing.T) {
	id := GenerateTrackID()
	if id == "" {
		t.Error("期望生成非空的 UUID")
	}
	if !IsValidUUID(id) {
		t.Errorf("期望有效的 UUID，得到 %s", id)
	}
}

func TestIsValidUUID(t *testing.T) {
	valid := "f47ac10b-58cc-4372-a567-0e02b2c3d479"
	invalid := "invalid-uuid"

	if !IsValidUUID(valid) {
		t.Errorf("期望 %s 是有效的", valid)
	}
	if IsValidUUID(invalid) {
		t.Errorf("期望 %s 是无效的", invalid)
	}
}
