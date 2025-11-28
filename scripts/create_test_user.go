package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
)

func main() {
    dsn := "postgres://tracebuddy:tracebuddy@localhost:5432/tracebuddy?sslmode=disable"
    db, err := sql.Open("pgx", dsn)
    if err != nil {
        log.Fatalf("Error opening database: %v", err)
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        log.Fatalf("Error pinging database: %v", err)
    }

    _, err = db.Exec(`
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    `)
    if err != nil {
        log.Fatalf("Error ensuring schema: %v", err)
    }
    
    password := "admin123"
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        log.Fatalf("Error hashing password: %v", err)
    }

    now := time.Now()
    _, err = db.Exec(`
        INSERT INTO users (username, password_hash, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            updated_at = EXCLUDED.updated_at
    `, "admin", string(hash), "admin", now, now)
    if err != nil {
        log.Fatalf("Error inserting user: %v", err)
    }

    fmt.Println("✓ Successfully created test user:")
    fmt.Println("  Username: admin")
    fmt.Println("  Password: admin123")
    fmt.Println("  Role: admin")
}
