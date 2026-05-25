package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"2gether/db"
	"2gether/middleware"

	"github.com/go-chi/chi/v5"
)

// LogHandler handles task-log endpoints.
type LogHandler struct {
	db *db.DB
}

// NewLogHandler constructs a LogHandler.
func NewLogHandler(database *db.DB) *LogHandler {
	return &LogHandler{db: database}
}

// requireLogMember checks that the user is a member of the given group.
func (h *LogHandler) requireLogMember(groupID, userID string) (*db.GroupMember, error) {
	member, err := h.db.GetGroupMember(groupID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("not a member of this group")
	}
	return member, nil
}

// ListLogs handles GET /api/groups/{id}/logs?start=YYYY-MM-DD&end=YYYY-MM-DD
func (h *LogHandler) ListLogs(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")

	if _, err := h.requireLogMember(groupID, userID); err != nil {
		jsonError(w, "group not found or access denied", http.StatusNotFound)
		return
	}

	start := strings.TrimSpace(r.URL.Query().Get("start"))
	end := strings.TrimSpace(r.URL.Query().Get("end"))

	if start == "" || end == "" {
		start, end = db.CurrentWeekRange()
	}

	logs, err := h.db.ListTaskLogs(groupID, start, end)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if logs == nil {
		logs = []*db.TaskLog{}
	}
	jsonOK(w, logs)
}

// CreateLog handles POST /api/groups/{id}/logs
func (h *LogHandler) CreateLog(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")

	if _, err := h.requireLogMember(groupID, userID); err != nil {
		jsonError(w, "group not found or access denied", http.StatusNotFound)
		return
	}

	var body struct {
		TaskTypeID  string `json:"task_type_id"`
		CompletedAt string `json:"completed_at"`
		Note        string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	body.TaskTypeID = strings.TrimSpace(body.TaskTypeID)
	if body.TaskTypeID == "" {
		jsonError(w, "task_type_id is required", http.StatusBadRequest)
		return
	}

	// Default completed_at to now if not provided.
	completedAt := strings.TrimSpace(body.CompletedAt)
	if completedAt == "" {
		completedAt = time.Now().UTC().Format(time.RFC3339)
	} else {
		// Validate the RFC3339 format.
		if _, err := time.Parse(time.RFC3339, completedAt); err != nil {
			jsonError(w, "completed_at must be RFC3339 format", http.StatusBadRequest)
			return
		}
	}

	// Verify task type belongs to this group.
	tt, err := h.db.GetTaskType(body.TaskTypeID, groupID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if tt == nil {
		jsonError(w, "task type not found", http.StatusNotFound)
		return
	}

	log, err := h.db.CreateTaskLog(groupID, body.TaskTypeID, userID, completedAt, body.Note)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(log)
}

// DeleteLog handles DELETE /api/groups/{id}/logs/{lid}
func (h *LogHandler) DeleteLog(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")
	lid := chi.URLParam(r, "lid")

	member, err := h.requireLogMember(groupID, userID)
	if err != nil {
		jsonError(w, "group not found or access denied", http.StatusNotFound)
		return
	}

	// Fetch the log to check ownership.
	logEntry, err := h.db.GetTaskLog(lid, groupID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if logEntry == nil {
		jsonError(w, "log not found", http.StatusNotFound)
		return
	}

	// Only the log owner or a group admin may delete.
	if logEntry.UserID != userID && member.Role != "admin" {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.db.DeleteTaskLog(lid, groupID); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Leaderboard handles GET /api/groups/{id}/leaderboard?period=week|month
func (h *LogHandler) Leaderboard(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")

	if _, err := h.requireLogMember(groupID, userID); err != nil {
		jsonError(w, "group not found or access denied", http.StatusNotFound)
		return
	}

	period := strings.TrimSpace(r.URL.Query().Get("period"))
	if period == "" {
		period = "week"
	}

	var start, end string
	switch period {
	case "month":
		start, end = db.CurrentMonthRange()
	default:
		start, end = db.CurrentWeekRange()
	}

	entries, err := h.db.GetLeaderboard(groupID, start, end)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if entries == nil {
		entries = []*db.LeaderboardEntry{}
	}

	jsonOK(w, map[string]any{
		"period":  period,
		"start":   start,
		"end":     end,
		"entries": entries,
	})
}
