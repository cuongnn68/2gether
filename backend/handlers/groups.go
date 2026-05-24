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

// GroupHandler handles group-related endpoints.
type GroupHandler struct {
	db *db.DB
}

// NewGroupHandler constructs a GroupHandler.
func NewGroupHandler(database *db.DB) *GroupHandler {
	return &GroupHandler{db: database}
}

// requireAdmin returns an error if the user is not an admin of the group.
func (h *GroupHandler) requireAdmin(groupID, userID string) error {
	member, err := h.db.GetGroupMember(groupID, userID)
	if err != nil {
		return err
	}
	if member == nil || member.Role != "admin" {
		return errors.New("admin access required")
	}
	return nil
}

// requireMember returns an error if the user is not a member of the group.
func (h *GroupHandler) requireMember(groupID, userID string) error {
	member, err := h.db.GetGroupMember(groupID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("not a member of this group")
	}
	return nil
}

// ListMyGroups handles GET /api/groups
func (h *GroupHandler) ListMyGroups(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groups, err := h.db.ListGroupsForUser(userID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if groups == nil {
		groups = []*db.Group{}
	}
	jsonOK(w, groups)
}

// CreateGroup handles POST /api/groups
func (h *GroupHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
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

	group, err := h.db.CreateGroup(body.Name, body.Description, userID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(group)
}

// JoinGroup handles POST /api/groups/join
func (h *GroupHandler) JoinGroup(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var body struct {
		JoinCode string `json:"join_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	code := strings.TrimSpace(strings.ToUpper(body.JoinCode))
	if code == "" {
		jsonError(w, "join_code is required", http.StatusBadRequest)
		return
	}

	group, err := h.db.GetGroupByJoinCode(code)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if group == nil {
		jsonError(w, "group not found", http.StatusNotFound)
		return
	}

	// Check if already a member.
	existing, err := h.db.GetGroupMember(group.ID, userID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if existing != nil {
		jsonError(w, "already a member of this group", http.StatusConflict)
		return
	}

	if err := h.db.AddGroupMember(group.ID, userID, "member"); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Return group with role.
	g, err := h.db.GetGroupByID(group.ID, userID)
	if err != nil || g == nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(g)
}

// GetGroup handles GET /api/groups/{id}
func (h *GroupHandler) GetGroup(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")

	// Must be a member.
	if err := h.requireMember(groupID, userID); err != nil {
		jsonError(w, "group not found or access denied", http.StatusNotFound)
		return
	}

	group, err := h.db.GetGroupByID(groupID, userID)
	if err != nil || group == nil {
		jsonError(w, "group not found", http.StatusNotFound)
		return
	}

	members, err := h.db.ListGroupMembers(groupID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if members == nil {
		members = []*db.GroupMember{}
	}

	jsonOK(w, map[string]any{
		"group":   group,
		"members": members,
	})
}

// RefreshJoinCode handles POST /api/groups/{id}/refresh-code
func (h *GroupHandler) RefreshJoinCode(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")

	if err := h.requireAdmin(groupID, userID); err != nil {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	code, err := h.db.RefreshJoinCode(groupID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, map[string]string{"join_code": code})
}

// KickMember handles DELETE /api/groups/{id}/members/{uid}
func (h *GroupHandler) KickMember(w http.ResponseWriter, r *http.Request) {
	callerID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")
	targetID := chi.URLParam(r, "uid")

	if err := h.requireAdmin(groupID, callerID); err != nil {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}
	if callerID == targetID {
		jsonError(w, "you cannot remove yourself from the group", http.StatusBadRequest)
		return
	}

	if err := h.db.RemoveGroupMember(groupID, targetID); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// UpdateGroup handles PUT /api/groups/{id}
func (h *GroupHandler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	groupID := chi.URLParam(r, "id")

	// Must be an admin.
	if err := h.requireAdmin(groupID, userID); err != nil {
		jsonError(w, "admin access required", http.StatusForbidden)
		return
	}

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
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

	group, err := h.db.UpdateGroup(groupID, body.Name, body.Description)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if group == nil {
		jsonError(w, "group not found", http.StatusNotFound)
		return
	}
	group.Role = "admin"

	jsonOK(w, group)
}
