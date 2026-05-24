package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"worktrack/db"
	wkmiddleware "worktrack/middleware"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// AuthHandler handles authentication via Google OAuth2.
type AuthHandler struct {
	db          *db.DB
	oauth       *oauth2.Config
	secret      string
	frontendURL string
}

// NewAuthHandler constructs an AuthHandler reading config from environment variables.
func NewAuthHandler(database *db.DB) *AuthHandler {
	frontendURL := getenv("FRONTEND_URL", "http://localhost:5173")
	secret := getenv("JWT_SECRET", "change-me-in-production")
	redirectURL := getenv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/auth/google/callback")

	oauthCfg := &oauth2.Config{
		ClientID:     getenv("GOOGLE_CLIENT_ID", ""),
		ClientSecret: getenv("GOOGLE_CLIENT_SECRET", ""),
		RedirectURL:  redirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return &AuthHandler{
		db:          database,
		oauth:       oauthCfg,
		secret:      secret,
		frontendURL: frontendURL,
	}
}

// GoogleLogin initiates the Google OAuth2 flow.
func (h *AuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	// Generate random state value.
	stateBytes := make([]byte, 16)
	if _, err := rand.Read(stateBytes); err != nil {
		jsonError(w, "failed to generate state", http.StatusInternalServerError)
		return
	}
	state := base64.URLEncoding.EncodeToString(stateBytes)

	// Store state in an HttpOnly cookie (valid for 5 minutes).
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		HttpOnly: true,
		MaxAge:   300,
		SameSite: http.SameSiteLaxMode,
	})

	url := h.oauth.AuthCodeURL(state, oauth2.AccessTypeOnline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// GoogleCallback handles the OAuth2 redirect from Google.
func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	// Validate state cookie.
	cookie, err := r.Cookie("oauth_state")
	if err != nil {
		jsonError(w, "missing state cookie", http.StatusBadRequest)
		return
	}
	if r.URL.Query().Get("state") != cookie.Value {
		jsonError(w, "state mismatch", http.StatusBadRequest)
		return
	}

	// Clear the state cookie.
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})

	// Exchange code for token.
	code := r.URL.Query().Get("code")
	if code == "" {
		jsonError(w, "missing code", http.StatusBadRequest)
		return
	}

	token, err := h.oauth.Exchange(context.Background(), code)
	if err != nil {
		jsonError(w, "failed to exchange code", http.StatusInternalServerError)
		return
	}

	// Fetch user info from Google.
	client := h.oauth.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		jsonError(w, "failed to fetch user info", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID        string `json:"id"`
		Email     string `json:"email"`
		Name      string `json:"name"`
		Picture   string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		jsonError(w, "failed to parse user info", http.StatusInternalServerError)
		return
	}

	// Upsert user in DB.
	user, err := h.db.UpsertUser(userInfo.ID, userInfo.Email, userInfo.Name, userInfo.Picture)
	if err != nil || user == nil {
		jsonError(w, "failed to save user", http.StatusInternalServerError)
		return
	}

	// Create JWT (30 days).
	claims := jwt.MapClaims{
		"sub": user.ID,
		"exp": time.Now().Add(30 * 24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := jwtToken.SignedString([]byte(h.secret))
	if err != nil {
		jsonError(w, "failed to sign token", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("%s?token=%s", h.frontendURL, signed), http.StatusTemporaryRedirect)
}

// Me returns the currently authenticated user.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := wkmiddleware.GetUserID(r.Context())
	if userID == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.db.GetUserByID(userID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if user == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	jsonOK(w, user)
}
