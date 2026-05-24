package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"worktrack/db"
	"worktrack/handlers"
	wkmiddleware "worktrack/middleware"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	port := getenv("PORT", "8080")
	dbPath := getenv("DB_PATH", "/data/worktrack.db")
	frontendURL := getenv("FRONTEND_URL", "http://localhost:5173")
	jwtSecret := getenv("JWT_SECRET", "change-me-in-production")

	database, err := db.Init(dbPath)
	if err != nil {
		log.Fatalf("failed to initialise database: %v", err)
	}
	log.Printf("database initialised at %s", dbPath)

	// Initialise handlers.
	authHandler := handlers.NewAuthHandler(database)
	groupHandler := handlers.NewGroupHandler(database)
	taskHandler := handlers.NewTaskHandler(database)
	logHandler := handlers.NewLogHandler(database)

	r := chi.NewRouter()

	// Global middleware.
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{frontendURL},
		AllowCredentials: true,
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		MaxAge:           300,
	}))

	// Public auth routes.
	r.Route("/api/auth", func(r chi.Router) {
		r.Get("/google/login", authHandler.GoogleLogin)
		r.Get("/google/callback", authHandler.GoogleCallback)
	})

	// Protected routes.
	r.Group(func(r chi.Router) {
		r.Use(wkmiddleware.Authenticate(jwtSecret))

		// Current user.
		r.Get("/api/auth/me", authHandler.Me)

		// Groups.
		r.Get("/api/groups", groupHandler.ListMyGroups)
		r.Post("/api/groups", groupHandler.CreateGroup)
		// Rate-limited: 10 join attempts per 5 minutes per IP.
		r.With(wkmiddleware.RateLimit(10, 5*time.Minute)).Post("/api/groups/join", groupHandler.JoinGroup)
		r.Get("/api/groups/{id}", groupHandler.GetGroup)
		r.Put("/api/groups/{id}", groupHandler.UpdateGroup)
		r.Post("/api/groups/{id}/refresh-code", groupHandler.RefreshJoinCode)
		r.Delete("/api/groups/{id}/members/{uid}", groupHandler.KickMember)

		// Task types.
		r.Get("/api/groups/{id}/task-types", taskHandler.ListTaskTypes)
		r.Post("/api/groups/{id}/task-types", taskHandler.CreateTaskType)
		r.Put("/api/groups/{id}/task-types/{tid}", taskHandler.UpdateTaskType)
		r.Delete("/api/groups/{id}/task-types/{tid}", taskHandler.DeleteTaskType)

		// Task logs.
		r.Get("/api/groups/{id}/logs", logHandler.ListLogs)
		r.Post("/api/groups/{id}/logs", logHandler.CreateLog)
		r.Delete("/api/groups/{id}/logs/{lid}", logHandler.DeleteLog)

		// Leaderboard.
		r.Get("/api/groups/{id}/leaderboard", logHandler.Leaderboard)
	})

	addr := ":" + port
	log.Printf("worktrack server listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
