package db

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

// DB wraps sql.DB with app-specific methods.
type DB struct {
	conn *sql.DB
}

// User represents an authenticated user.
type User struct {
	ID        string `json:"id"`
	GoogleID  string `json:"-"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	CreatedAt string `json:"created_at"`
}

// Group represents a worktrack group.
type Group struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	JoinCode    string `json:"join_code"`
	CreatedBy   string `json:"created_by"`
	CreatedAt   string `json:"created_at"`
	Role        string `json:"role,omitempty"`
}

// GroupMember represents a member of a group.
type GroupMember struct {
	UserID    string `json:"user_id"`
	UserName  string `json:"user_name"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
	JoinedAt  string `json:"joined_at"`
}

// TaskType represents a type of task within a group.
type TaskType struct {
	ID          string `json:"id"`
	GroupID     string `json:"group_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Points      int    `json:"points"`
	Active      bool   `json:"active"`
	CreatedAt   string `json:"created_at"`
}

// TaskLog records a completed task.
type TaskLog struct {
	ID             string `json:"id"`
	GroupID        string `json:"group_id"`
	TaskTypeID     string `json:"task_type_id"`
	TaskTypeName   string `json:"task_type_name"`
	TaskTypePoints int    `json:"task_type_points"`
	UserID         string `json:"user_id"`
	UserName       string `json:"user_name"`
	UserAvatarURL  string `json:"user_avatar_url"`
	CompletedAt    string `json:"completed_at"`
	Note           string `json:"note"`
	CreatedAt      string `json:"created_at"`
}

// LeaderboardEntry summarizes a user's contributions.
type LeaderboardEntry struct {
	UserID      string `json:"user_id"`
	UserName    string `json:"user_name"`
	AvatarURL   string `json:"avatar_url"`
	TotalPoints int    `json:"total_points"`
	TaskCount   int    `json:"task_count"`
}

// Init opens the SQLite database at path and runs schema migrations.
func Init(path string) (*DB, error) {
	conn, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	// Prevent "database is locked" errors with concurrent goroutines.
	conn.SetMaxOpenConns(1)

	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return db, nil
}

func (db *DB) migrate() error {
	stmts := []string{
		`PRAGMA journal_mode=WAL`,
		`PRAGMA foreign_keys=ON`,
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			google_id TEXT UNIQUE NOT NULL,
			email TEXT NOT NULL,
			name TEXT NOT NULL,
			avatar_url TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS groups (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			join_code TEXT UNIQUE NOT NULL,
			created_by TEXT NOT NULL REFERENCES users(id),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS group_members (
			id TEXT PRIMARY KEY,
			group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role TEXT NOT NULL DEFAULT 'member',
			joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(group_id, user_id)
		)`,
		`CREATE TABLE IF NOT EXISTS task_types (
			id TEXT PRIMARY KEY,
			group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			points INTEGER NOT NULL DEFAULT 1,
			active INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS task_logs (
			id TEXT PRIMARY KEY,
			group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
			task_type_id TEXT NOT NULL REFERENCES task_types(id),
			user_id TEXT NOT NULL REFERENCES users(id),
			completed_at DATETIME NOT NULL,
			note TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, s := range stmts {
		if _, err := db.conn.Exec(s); err != nil {
			preview := s
			if len(preview) > 40 {
				preview = preview[:40]
			}
			return fmt.Errorf("exec %q: %w", preview, err)
		}
	}
	return nil
}

// UpsertUser inserts or updates a user record by Google ID.
func (db *DB) UpsertUser(googleID, email, name, avatarURL string) (*User, error) {
	id := uuid.New().String()
	_, err := db.conn.Exec(`
		INSERT INTO users (id, google_id, email, name, avatar_url)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(google_id) DO UPDATE SET
			email = excluded.email,
			name = excluded.name,
			avatar_url = excluded.avatar_url`,
		id, googleID, email, name, avatarURL,
	)
	if err != nil {
		return nil, fmt.Errorf("upsert user: %w", err)
	}

	return db.getUserByGoogleID(googleID)
}

func (db *DB) getUserByGoogleID(googleID string) (*User, error) {
	u := &User{}
	err := db.conn.QueryRow(
		`SELECT id, google_id, email, name, avatar_url, created_at FROM users WHERE google_id = ?`,
		googleID,
	).Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.AvatarURL, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user by google_id: %w", err)
	}
	return u, nil
}

// GetUserByID returns a user by their primary key.
func (db *DB) GetUserByID(id string) (*User, error) {
	u := &User{}
	err := db.conn.QueryRow(
		`SELECT id, google_id, email, name, avatar_url, created_at FROM users WHERE id = ?`,
		id,
	).Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.AvatarURL, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

const joinCodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func generateJoinCode() (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = joinCodeChars[int(b[i])%len(joinCodeChars)]
	}
	return string(b), nil
}

// CreateGroup creates a new group with a unique join code and adds the creator as admin.
func (db *DB) CreateGroup(name, description, createdBy string) (*Group, error) {
	id := uuid.New().String()

	var code string
	for attempts := 0; attempts < 10; attempts++ {
		c, err := generateJoinCode()
		if err != nil {
			return nil, fmt.Errorf("generate join code: %w", err)
		}
		_, err = db.conn.Exec(
			`INSERT INTO groups (id, name, description, join_code, created_by) VALUES (?, ?, ?, ?, ?)`,
			id, name, description, c, createdBy,
		)
		if err == nil {
			code = c
			break
		}
		// If it's a unique constraint violation on join_code, retry.
		// Otherwise bubble the error.
		if attempts == 9 {
			return nil, fmt.Errorf("insert group: %w", err)
		}
	}

	if code == "" {
		return nil, fmt.Errorf("failed to generate unique join code")
	}

	// Add creator as admin.
	if err := db.AddGroupMember(id, createdBy, "admin"); err != nil {
		return nil, fmt.Errorf("add creator as admin: %w", err)
	}

	return db.GetGroupByID(id, createdBy)
}

// GetGroupByID returns a group by ID, including the requesting user's role.
func (db *DB) GetGroupByID(id, userID string) (*Group, error) {
	g := &Group{}
	var role sql.NullString
	err := db.conn.QueryRow(`
		SELECT g.id, g.name, g.description, g.join_code, g.created_by, g.created_at,
		       gm.role
		FROM groups g
		LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
		WHERE g.id = ?`,
		userID, id,
	).Scan(&g.ID, &g.Name, &g.Description, &g.JoinCode, &g.CreatedBy, &g.CreatedAt, &role)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get group by id: %w", err)
	}
	if role.Valid {
		g.Role = role.String
	}
	return g, nil
}

// GetGroupByJoinCode looks up a group by its join code.
func (db *DB) GetGroupByJoinCode(code string) (*Group, error) {
	g := &Group{}
	err := db.conn.QueryRow(
		`SELECT id, name, description, join_code, created_by, created_at FROM groups WHERE join_code = ?`,
		code,
	).Scan(&g.ID, &g.Name, &g.Description, &g.JoinCode, &g.CreatedBy, &g.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get group by join code: %w", err)
	}
	return g, nil
}

// ListGroupsForUser returns all groups a user belongs to, with their role.
func (db *DB) ListGroupsForUser(userID string) ([]*Group, error) {
	rows, err := db.conn.Query(`
		SELECT g.id, g.name, g.description, g.join_code, g.created_by, g.created_at,
		       gm.role
		FROM groups g
		JOIN group_members gm ON gm.group_id = g.id
		WHERE gm.user_id = ?
		ORDER BY g.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list groups: %w", err)
	}
	defer rows.Close()

	var groups []*Group
	for rows.Next() {
		g := &Group{}
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.JoinCode, &g.CreatedBy, &g.CreatedAt, &g.Role); err != nil {
			return nil, fmt.Errorf("scan group: %w", err)
		}
		groups = append(groups, g)
	}
	return groups, rows.Err()
}

// RefreshJoinCode generates a new unique join code for a group and returns it.
func (db *DB) RefreshJoinCode(groupID string) (string, error) {
	for attempts := 0; attempts < 10; attempts++ {
		code, err := generateJoinCode()
		if err != nil {
			return "", fmt.Errorf("generate join code: %w", err)
		}
		_, err = db.conn.Exec(`UPDATE groups SET join_code = ? WHERE id = ?`, code, groupID)
		if err == nil {
			return code, nil
		}
		// Unique constraint on join_code — retry with a new code.
	}
	return "", fmt.Errorf("failed to generate unique join code after retries")
}

// RemoveGroupMember removes a user from a group.
func (db *DB) RemoveGroupMember(groupID, userID string) error {
	_, err := db.conn.Exec(
		`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`,
		groupID, userID,
	)
	if err != nil {
		return fmt.Errorf("remove group member: %w", err)
	}
	return nil
}

// AddGroupMember adds a user to a group with the given role.
func (db *DB) AddGroupMember(groupID, userID, role string) error {
	id := uuid.New().String()
	_, err := db.conn.Exec(
		`INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)`,
		id, groupID, userID, role,
	)
	if err != nil {
		return fmt.Errorf("add group member: %w", err)
	}
	return nil
}

// GetGroupMember returns the membership record for a user in a group.
func (db *DB) GetGroupMember(groupID, userID string) (*GroupMember, error) {
	gm := &GroupMember{}
	err := db.conn.QueryRow(`
		SELECT u.id, u.name, u.avatar_url, gm.role, gm.joined_at
		FROM group_members gm
		JOIN users u ON u.id = gm.user_id
		WHERE gm.group_id = ? AND gm.user_id = ?`,
		groupID, userID,
	).Scan(&gm.UserID, &gm.UserName, &gm.AvatarURL, &gm.Role, &gm.JoinedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get group member: %w", err)
	}
	return gm, nil
}

// ListGroupMembers returns all members of a group with user info.
func (db *DB) ListGroupMembers(groupID string) ([]*GroupMember, error) {
	rows, err := db.conn.Query(`
		SELECT u.id, u.name, u.avatar_url, gm.role, gm.joined_at
		FROM group_members gm
		JOIN users u ON u.id = gm.user_id
		WHERE gm.group_id = ?
		ORDER BY gm.joined_at ASC`,
		groupID,
	)
	if err != nil {
		return nil, fmt.Errorf("list group members: %w", err)
	}
	defer rows.Close()

	var members []*GroupMember
	for rows.Next() {
		gm := &GroupMember{}
		if err := rows.Scan(&gm.UserID, &gm.UserName, &gm.AvatarURL, &gm.Role, &gm.JoinedAt); err != nil {
			return nil, fmt.Errorf("scan group member: %w", err)
		}
		members = append(members, gm)
	}
	return members, rows.Err()
}

// UpdateGroup updates the name and description of a group.
func (db *DB) UpdateGroup(id, name, description string) (*Group, error) {
	_, err := db.conn.Exec(
		`UPDATE groups SET name = ?, description = ? WHERE id = ?`,
		name, description, id,
	)
	if err != nil {
		return nil, fmt.Errorf("update group: %w", err)
	}
	// Return without a specific userID for role; caller can re-fetch if needed.
	g := &Group{}
	err = db.conn.QueryRow(
		`SELECT id, name, description, join_code, created_by, created_at FROM groups WHERE id = ?`,
		id,
	).Scan(&g.ID, &g.Name, &g.Description, &g.JoinCode, &g.CreatedBy, &g.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("fetch updated group: %w", err)
	}
	return g, nil
}

// CreateTaskType adds a new task type to a group.
func (db *DB) CreateTaskType(groupID, name, description string, points int) (*TaskType, error) {
	id := uuid.New().String()
	_, err := db.conn.Exec(
		`INSERT INTO task_types (id, group_id, name, description, points) VALUES (?, ?, ?, ?, ?)`,
		id, groupID, name, description, points,
	)
	if err != nil {
		return nil, fmt.Errorf("create task type: %w", err)
	}
	return db.GetTaskType(id, groupID)
}

// GetTaskType returns a task type by ID and group ID.
func (db *DB) GetTaskType(id, groupID string) (*TaskType, error) {
	tt := &TaskType{}
	var active int
	err := db.conn.QueryRow(
		`SELECT id, group_id, name, description, points, active, created_at FROM task_types WHERE id = ? AND group_id = ?`,
		id, groupID,
	).Scan(&tt.ID, &tt.GroupID, &tt.Name, &tt.Description, &tt.Points, &active, &tt.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get task type: %w", err)
	}
	tt.Active = active == 1
	return tt, nil
}

// ListTaskTypes returns task types for a group. When includeInactive is true, inactive types are included.
func (db *DB) ListTaskTypes(groupID string, includeInactive bool) ([]*TaskType, error) {
	q := `SELECT id, group_id, name, description, points, active, created_at FROM task_types WHERE group_id = ? ORDER BY name ASC`
	if !includeInactive {
		q = `SELECT id, group_id, name, description, points, active, created_at FROM task_types WHERE group_id = ? AND active = 1 ORDER BY name ASC`
	}
	rows, err := db.conn.Query(q, groupID)
	if err != nil {
		return nil, fmt.Errorf("list task types: %w", err)
	}
	defer rows.Close()

	var types []*TaskType
	for rows.Next() {
		tt := &TaskType{}
		var active int
		if err := rows.Scan(&tt.ID, &tt.GroupID, &tt.Name, &tt.Description, &tt.Points, &active, &tt.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan task type: %w", err)
		}
		tt.Active = active == 1
		types = append(types, tt)
	}
	return types, rows.Err()
}

// UpdateTaskType updates a task type.
func (db *DB) UpdateTaskType(id, groupID, name, description string, points int, active bool) (*TaskType, error) {
	activeInt := 0
	if active {
		activeInt = 1
	}
	_, err := db.conn.Exec(
		`UPDATE task_types SET name = ?, description = ?, points = ?, active = ? WHERE id = ? AND group_id = ?`,
		name, description, points, activeInt, id, groupID,
	)
	if err != nil {
		return nil, fmt.Errorf("update task type: %w", err)
	}
	return db.GetTaskType(id, groupID)
}

// DeleteTaskType soft-deletes a task type by setting active=0.
func (db *DB) DeleteTaskType(id, groupID string) error {
	_, err := db.conn.Exec(
		`UPDATE task_types SET active = 0 WHERE id = ? AND group_id = ?`,
		id, groupID,
	)
	if err != nil {
		return fmt.Errorf("delete task type: %w", err)
	}
	return nil
}

// CreateTaskLog records a completed task and returns it with joined data.
func (db *DB) CreateTaskLog(groupID, taskTypeID, userID, completedAt, note string) (*TaskLog, error) {
	id := uuid.New().String()
	_, err := db.conn.Exec(
		`INSERT INTO task_logs (id, group_id, task_type_id, user_id, completed_at, note) VALUES (?, ?, ?, ?, ?, ?)`,
		id, groupID, taskTypeID, userID, completedAt, note,
	)
	if err != nil {
		return nil, fmt.Errorf("create task log: %w", err)
	}
	return db.GetTaskLog(id, groupID)
}

// GetTaskLog returns a task log entry with joined user and task type info.
func (db *DB) GetTaskLog(id, groupID string) (*TaskLog, error) {
	tl := &TaskLog{}
	err := db.conn.QueryRow(`
		SELECT tl.id, tl.group_id, tl.task_type_id, tt.name, tt.points,
		       tl.user_id, u.name, u.avatar_url,
		       tl.completed_at, tl.note, tl.created_at
		FROM task_logs tl
		JOIN task_types tt ON tt.id = tl.task_type_id
		JOIN users u ON u.id = tl.user_id
		WHERE tl.id = ? AND tl.group_id = ?`,
		id, groupID,
	).Scan(
		&tl.ID, &tl.GroupID, &tl.TaskTypeID, &tl.TaskTypeName, &tl.TaskTypePoints,
		&tl.UserID, &tl.UserName, &tl.UserAvatarURL,
		&tl.CompletedAt, &tl.Note, &tl.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get task log: %w", err)
	}
	return tl, nil
}

// ListTaskLogs returns task logs for a group filtered by date range.
// start and end are "YYYY-MM-DD" strings.
func (db *DB) ListTaskLogs(groupID, start, end string) ([]*TaskLog, error) {
	rows, err := db.conn.Query(`
		SELECT tl.id, tl.group_id, tl.task_type_id, tt.name, tt.points,
		       tl.user_id, u.name, u.avatar_url,
		       tl.completed_at, tl.note, tl.created_at
		FROM task_logs tl
		JOIN task_types tt ON tt.id = tl.task_type_id
		JOIN users u ON u.id = tl.user_id
		WHERE tl.group_id = ?
		  AND date(tl.completed_at) >= date(?)
		  AND date(tl.completed_at) <= date(?)
		ORDER BY tl.completed_at DESC`,
		groupID, start, end,
	)
	if err != nil {
		return nil, fmt.Errorf("list task logs: %w", err)
	}
	defer rows.Close()

	var logs []*TaskLog
	for rows.Next() {
		tl := &TaskLog{}
		if err := rows.Scan(
			&tl.ID, &tl.GroupID, &tl.TaskTypeID, &tl.TaskTypeName, &tl.TaskTypePoints,
			&tl.UserID, &tl.UserName, &tl.UserAvatarURL,
			&tl.CompletedAt, &tl.Note, &tl.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan task log: %w", err)
		}
		logs = append(logs, tl)
	}
	return logs, rows.Err()
}

// DeleteTaskLog removes a task log entry.
func (db *DB) DeleteTaskLog(id, groupID string) error {
	_, err := db.conn.Exec(
		`DELETE FROM task_logs WHERE id = ? AND group_id = ?`,
		id, groupID,
	)
	if err != nil {
		return fmt.Errorf("delete task log: %w", err)
	}
	return nil
}

// GetLeaderboard returns point totals per user for a group within a date range.
// start and end are "YYYY-MM-DD" strings.
func (db *DB) GetLeaderboard(groupID, start, end string) ([]*LeaderboardEntry, error) {
	rows, err := db.conn.Query(`
		SELECT u.id, u.name, u.avatar_url,
		       COALESCE(SUM(tt.points), 0) AS total_points,
		       COUNT(tl.id) AS task_count
		FROM group_members gm
		JOIN users u ON u.id = gm.user_id
		LEFT JOIN task_logs tl ON tl.user_id = u.id
		       AND tl.group_id = ?
		       AND date(tl.completed_at) >= date(?)
		       AND date(tl.completed_at) <= date(?)
		LEFT JOIN task_types tt ON tt.id = tl.task_type_id
		WHERE gm.group_id = ?
		GROUP BY u.id, u.name, u.avatar_url
		ORDER BY total_points DESC, u.name ASC`,
		groupID, start, end, groupID,
	)
	if err != nil {
		return nil, fmt.Errorf("get leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*LeaderboardEntry
	for rows.Next() {
		e := &LeaderboardEntry{}
		if err := rows.Scan(&e.UserID, &e.UserName, &e.AvatarURL, &e.TotalPoints, &e.TaskCount); err != nil {
			return nil, fmt.Errorf("scan leaderboard entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// currentWeekRange returns Monday and Sunday of the current ISO week as "YYYY-MM-DD".
func CurrentWeekRange() (start, end string) {
	now := time.Now()
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7 // Sunday = 7 in ISO week
	}
	monday := now.AddDate(0, 0, -(weekday - 1))
	sunday := monday.AddDate(0, 0, 6)
	return monday.Format("2006-01-02"), sunday.Format("2006-01-02")
}

// CurrentMonthRange returns the first and last day of the current month.
func CurrentMonthRange() (start, end string) {
	now := time.Now()
	firstDay := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastDay := firstDay.AddDate(0, 1, -1)
	return firstDay.Format("2006-01-02"), lastDay.Format("2006-01-02")
}
