package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"worktrack/db"
	"worktrack/middleware"

	"github.com/go-chi/chi/v5"
)

// TaskHandler handles task-type endpoints.
type TaskHandler struct {
	db *db.DB
}

// NewTaskHandler constructs a TaskHandler.
func NewTaskHandler(database *db.DB) *TaskHandler {
	return &TaskHandler{db: database}
}

// requireTaskAdmin checks that the user is an admin of the given group.
func (h *TaskHandler) requireTaskAdmin(groupID, userID string) error {
	member, err := h.db.GetGroupMember(groupID, userID)
	if err != nil {
		return err
	}
	if member == nil || member.Role != "admin" {
		return errors.New("admin access required")
	}
	return nil
}

// requireTaskMember checks that the user is a member of the given group.
func (h *TaskHandler) requireTaskMember(groupID, userID string) error {
	member, err := h.db.GetGroupMember(groupID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("not a member of this group")
	}
	return nil
}

// ListTaskTypes handles GET /api/groups/{id}/task-types
func (h *TaskHandler) ListTaskTypes(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")

	if err := h.requireTaskMember(groupID, userID); err != nil {
		jsonError(w, "group not found or access denied", http.StatusNotFound)
		return
	}

	// Admins can request all (including inactive) with ?all=true
	all := r.URL.Query().Get("all") == "true"
	if all {
		member, _ := h.db.GetGroupMember(groupID, userID)
		if member == nil || member.Role != "admin" {
			all = false
		}
	}

	types, err := h.db.ListTaskTypes(groupID, all)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if types == nil {
		types = []*db.TaskType{}
	}
	jsonOK(w, types)
}

// CreateTaskType handles POST /api/groups/{id}/task-types
func (h *TaskHandler) CreateTaskType(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")

	if err := h.requireTaskAdmin(groupID, userID); err != nil {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Points      int    `json:"points"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}
	if body.Points < 1 {
		body.Points = 1
	}

	tt, err := h.db.CreateTaskType(groupID, body.Name, body.Description, body.Points)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(tt)
}

// UpdateTaskType handles PUT /api/groups/{id}/task-types/{tid}
func (h *TaskHandler) UpdateTaskType(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")
	tid := chi.URLParam(r, "tid")

	if err := h.requireTaskAdmin(groupID, userID); err != nil {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	// Verify task type exists in this group.
	existing, err := h.db.GetTaskType(tid, groupID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if existing == nil {
		jsonError(w, "task type not found", http.StatusNotFound)
		return
	}

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Points      int    `json:"points"`
		Active      bool   `json:"active"`
	}
	// Initialise Active to true (current value) so omitted field doesn't reset it.
	body.Active = existing.Active
	body.Points = existing.Points
	body.Name = existing.Name
	body.Description = existing.Description

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}
	if body.Points < 1 {
		body.Points = 1
	}

	tt, err := h.db.UpdateTaskType(tid, groupID, body.Name, body.Description, body.Points, body.Active)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if tt == nil {
		jsonError(w, "task type not found", http.StatusNotFound)
		return
	}

	jsonOK(w, tt)
}

// DeleteTaskType handles DELETE /api/groups/{id}/task-types/{tid}
func (h *TaskHandler) DeleteTaskType(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")
	tid := chi.URLParam(r, "tid")

	if err := h.requireTaskAdmin(groupID, userID); err != nil {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	// Verify task type exists in this group.
	existing, err := h.db.GetTaskType(tid, groupID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if existing == nil {
		jsonError(w, "task type not found", http.StatusNotFound)
		return
	}

	if err := h.db.DeleteTaskType(tid, groupID); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
