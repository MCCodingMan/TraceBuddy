package storage

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "time"

    "github.com/MCCodingMan/TraceBuddy/pkg/core/domain"
    "github.com/MCCodingMan/TraceBuddy/pkg/core/ports"

    _ "github.com/jackc/pgx/v5/stdlib"
)

type PostgresRepository struct {
    db *sql.DB
}

func NewPostgresRepository(dsn string) (*PostgresRepository, error) {
    db, err := sql.Open("pgx", dsn)
    if err != nil {
        return nil, err
    }
    if err := db.Ping(); err != nil {
        return nil, err
    }
    r := &PostgresRepository{db: db}
    if err := r.initSchema(context.Background()); err != nil {
        return nil, err
    }
    return r, nil
}

func (r *PostgresRepository) initSchema(ctx context.Context) error {
    _, err := r.db.ExecContext(ctx, `
        CREATE TABLE IF NOT EXISTS logs (
            track_id TEXT PRIMARY KEY,
            timestamp TIMESTAMPTZ NOT NULL,
            duration_ms BIGINT,
            method TEXT,
            url TEXT,
            status_code INT,
            client_ip TEXT,
            service TEXT,
            environment TEXT,
            level TEXT,
            message TEXT,
            request_headers JSONB,
            request_query_params JSONB,
            request_body JSONB,
            response_headers JSONB,
            response_body JSONB,
            response_size BIGINT
        );
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs (timestamp);
        CREATE INDEX IF NOT EXISTS idx_logs_method ON logs (method);
        CREATE INDEX IF NOT EXISTS idx_logs_status ON logs (status_code);
        CREATE INDEX IF NOT EXISTS idx_logs_url ON logs (url);
        CREATE INDEX IF NOT EXISTS idx_logs_level ON logs (level);

        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    `)
    return err
}

func (r *PostgresRepository) Save(ctx context.Context, entry domain.LogEntry) error {
    reqHeaders, _ := json.Marshal(entry.Request.Headers)
    reqQuery, _ := json.Marshal(entry.Request.QueryParams)
    reqBody, _ := json.Marshal(entry.Request.Body)
    respHeaders, _ := json.Marshal(entry.Response.Headers)
    respBody, _ := json.Marshal(entry.Response.Body)

    _, err := r.db.ExecContext(ctx, `
        INSERT INTO logs (
            track_id, timestamp, duration_ms, method, url, status_code,
            client_ip, service, environment, level, message,
            request_headers, request_query_params, request_body,
            response_headers, response_body, response_size
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17
        )
        ON CONFLICT (track_id) DO UPDATE SET
            timestamp = EXCLUDED.timestamp,
            duration_ms = EXCLUDED.duration_ms,
            method = EXCLUDED.method,
            url = EXCLUDED.url,
            status_code = EXCLUDED.status_code,
            client_ip = EXCLUDED.client_ip,
            service = EXCLUDED.service,
            environment = EXCLUDED.environment,
            level = EXCLUDED.level,
            message = EXCLUDED.message,
            request_headers = EXCLUDED.request_headers,
            request_query_params = EXCLUDED.request_query_params,
            request_body = EXCLUDED.request_body,
            response_headers = EXCLUDED.response_headers,
            response_body = EXCLUDED.response_body,
            response_size = EXCLUDED.response_size
    `,
        entry.TrackID,
        entry.Timestamp,
        entry.DurationMs,
        entry.Request.Method,
        entry.Request.URL,
        entry.Response.StatusCode,
        entry.ClientIP,
        entry.Service,
        entry.Environment,
        entry.Level,
        entry.Message,
        reqHeaders,
        reqQuery,
        reqBody,
        respHeaders,
        respBody,
        entry.Response.Size,
    )
    return err
}

func (r *PostgresRepository) FindByID(ctx context.Context, trackID string) (*domain.LogEntry, error) {
    row := r.db.QueryRowContext(ctx, `
        SELECT 
            track_id, timestamp, duration_ms, method, url, status_code,
            client_ip, service, environment, level, message,
            request_headers, request_query_params, request_body,
            response_headers, response_body, response_size
        FROM logs WHERE track_id = $1
    `, trackID)

    var (
        entry domain.LogEntry
        reqHeaders []byte
        reqQuery []byte
        reqBody []byte
        respHeaders []byte
        respBody []byte
    )

    err := row.Scan(
        &entry.TrackID,
        &entry.Timestamp,
        &entry.DurationMs,
        &entry.Request.Method,
        &entry.Request.URL,
        &entry.Response.StatusCode,
        &entry.ClientIP,
        &entry.Service,
        &entry.Environment,
        &entry.Level,
        &entry.Message,
        &reqHeaders,
        &reqQuery,
        &reqBody,
        &respHeaders,
        &respBody,
        &entry.Response.Size,
    )
    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    if len(reqHeaders) > 0 {
        _ = json.Unmarshal(reqHeaders, &entry.Request.Headers)
    }
    if len(reqQuery) > 0 {
        _ = json.Unmarshal(reqQuery, &entry.Request.QueryParams)
    }
    if len(reqBody) > 0 {
        var body interface{}
        _ = json.Unmarshal(reqBody, &body)
        entry.Request.Body = body
    }
    if len(respHeaders) > 0 {
        _ = json.Unmarshal(respHeaders, &entry.Response.Headers)
    }
    if len(respBody) > 0 {
        var body interface{}
        _ = json.Unmarshal(respBody, &body)
        entry.Response.Body = body
    }

    return &entry, nil
}

func (r *PostgresRepository) Search(ctx context.Context, query ports.LogSearchQuery) ([]domain.LogEntry, int64, error) {
    conditions := []string{}
    args := []interface{}{}
    argPos := 1

    if query.StartTime != "" || query.EndTime != "" {
        var start, end time.Time
        var err error
        if query.StartTime != "" {
            start, err = time.Parse(time.RFC3339, query.StartTime)
            if err == nil {
                conditions = append(conditions, fmt.Sprintf("timestamp >= $%d", argPos))
                args = append(args, start)
                argPos++
            }
        }
        if query.EndTime != "" {
            end, err = time.Parse(time.RFC3339, query.EndTime)
            if err == nil {
                conditions = append(conditions, fmt.Sprintf("timestamp <= $%d", argPos))
                args = append(args, end)
                argPos++
            }
        }
    }

    if query.Method != "" {
        conditions = append(conditions, fmt.Sprintf("method = $%d", argPos))
        args = append(args, query.Method)
        argPos++
    }
    if query.Status != 0 {
        conditions = append(conditions, fmt.Sprintf("status_code = $%d", argPos))
        args = append(args, query.Status)
        argPos++
    }
    if query.Path != "" {
        conditions = append(conditions, fmt.Sprintf("url ILIKE $%d", argPos))
        args = append(args, "%"+query.Path+"%")
        argPos++
    }
    if query.Level != "" {
        conditions = append(conditions, fmt.Sprintf("level = $%d", argPos))
        args = append(args, query.Level)
        argPos++
    }
    if query.Keyword != "" {
        conditions = append(conditions, fmt.Sprintf("(message ILIKE $%d OR url ILIKE $%d OR track_id ILIKE $%d)", argPos, argPos+1, argPos+2))
        args = append(args, "%"+query.Keyword+"%", "%"+query.Keyword+"%", "%"+query.Keyword+"%")
        argPos += 3
    }

    where := ""
    if len(conditions) > 0 {
        where = "WHERE " + conditions[0]
        for i := 1; i < len(conditions); i++ {
            where += " AND " + conditions[i]
        }
    }

    page := query.Page
    size := query.Size
    if page <= 0 {
        page = 1
    }
    if size <= 0 {
        size = 10
    }
    offset := (page - 1) * size

    countSQL := "SELECT COUNT(*) FROM logs " + where
    var total int64
    if err := r.db.QueryRowContext(ctx, countSQL, args...).Scan(&total); err != nil {
        return nil, 0, err
    }

    querySQL := "SELECT track_id, timestamp, duration_ms, method, url, status_code, client_ip, service, environment, level, message, request_headers, request_query_params, request_body, response_headers, response_body, response_size FROM logs " + where + " ORDER BY timestamp DESC LIMIT $" + fmt.Sprintf("%d", argPos) + " OFFSET $" + fmt.Sprintf("%d", argPos+1)

    args = append(args, size, offset)
    rows, err := r.db.QueryContext(ctx, querySQL, args...)
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()

    entries := []domain.LogEntry{}
    for rows.Next() {
        var entry domain.LogEntry
        var reqHeaders, reqQuery, reqBody, respHeaders, respBody []byte
        if err := rows.Scan(
            &entry.TrackID,
            &entry.Timestamp,
            &entry.DurationMs,
            &entry.Request.Method,
            &entry.Request.URL,
            &entry.Response.StatusCode,
            &entry.ClientIP,
            &entry.Service,
            &entry.Environment,
            &entry.Level,
            &entry.Message,
            &reqHeaders,
            &reqQuery,
            &reqBody,
            &respHeaders,
            &respBody,
            &entry.Response.Size,
        ); err != nil {
            return nil, 0, err
        }
        if len(reqHeaders) > 0 {
            _ = json.Unmarshal(reqHeaders, &entry.Request.Headers)
        }
        if len(reqQuery) > 0 {
            _ = json.Unmarshal(reqQuery, &entry.Request.QueryParams)
        }
        if len(reqBody) > 0 {
            var body interface{}
            _ = json.Unmarshal(reqBody, &body)
            entry.Request.Body = body
        }
        if len(respHeaders) > 0 {
            _ = json.Unmarshal(respHeaders, &entry.Response.Headers)
        }
        if len(respBody) > 0 {
            var body interface{}
            _ = json.Unmarshal(respBody, &body)
            entry.Response.Body = body
        }
        entries = append(entries, entry)
    }

    return entries, total, nil
}

func (r *PostgresRepository) FindUserByUsername(ctx context.Context, username string) (*domain.User, error) {
    row := r.db.QueryRowContext(ctx, `
        SELECT username, password_hash, role, created_at, updated_at FROM users WHERE username = $1
    `, username)
    var u domain.User
    err := row.Scan(&u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt)
    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    return &u, nil
}

