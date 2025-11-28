package http

import (
    "net/http"
    "time"

    "github.com/MCCodingMan/TraceBuddy/pkg/core/ports"
    "golang.org/x/crypto/bcrypt"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
)

type AuthHandler struct {
    userRepo  ports.UserRepository
    jwtSecret []byte
}

func NewAuthHandler(userRepo ports.UserRepository, jwtSecret string) *AuthHandler {
    return &AuthHandler{
        userRepo:  userRepo,
        jwtSecret: []byte(jwtSecret),
    }
}

// Login 用户登录并返回 JWT Token
func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 从数据库查找用户
    user, err := h.userRepo.FindUserByUsername(c.Request.Context(), req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Service unavailable"})
		return
	}
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// 生成 JWT Token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":    tokenString,
		"username": user.Username,
		"role":     user.Role,
	})
}
