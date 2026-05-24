package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type windowCounter struct {
	count   int
	resetAt time.Time
}

// RateLimit returns a middleware that limits each client IP to n requests per window.
// Excess requests receive 429 Too Many Requests. Safe for concurrent use.
//
// Usage:
//
//	r.With(middleware.RateLimit(10, 5*time.Minute)).Post("/api/groups/join", handler)
func RateLimit(n int, window time.Duration) func(http.Handler) http.Handler {
	var mu sync.Mutex
	counters := make(map[string]*windowCounter)

	// Periodically remove expired entries to prevent unbounded memory growth.
	go func() {
		for range time.Tick(window) {
			now := time.Now()
			mu.Lock()
			for ip, c := range counters {
				if now.After(c.resetAt) {
					delete(counters, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)
			now := time.Now()

			mu.Lock()
			c, ok := counters[ip]
			if !ok || now.After(c.resetAt) {
				c = &windowCounter{resetAt: now.Add(window)}
				counters[ip] = c
			}
			c.count++
			over := c.count > n
			mu.Unlock()

			if over {
				http.Error(w, `{"error":"too many requests, please slow down"}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// clientIP extracts the real client IP, respecting common proxy headers.
func clientIP(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return strings.TrimSpace(ip)
	}
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		// X-Forwarded-For may be a comma-separated list; the leftmost is the client.
		return strings.TrimSpace(strings.SplitN(forwarded, ",", 2)[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
