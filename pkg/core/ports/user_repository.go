package ports

import (
    "context"
    "github.com/MCCodingMan/TraceBuddy/pkg/core/domain"
)

type UserRepository interface {
    FindUserByUsername(ctx context.Context, username string) (*domain.User, error)
}

