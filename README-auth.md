# Google Authentication Setup

This document explains how to set up Google Sign-In for the Pennywise application.

## Overview

Pennywise uses Google Sign-In with the following flow:
1. User clicks "Sign in with Google" on the frontend
2. Google Identity Services shows the sign-in popup
3. After successful authentication, Google returns an ID token (JWT)
4. Frontend sends this ID token to the backend (`POST /auth/google`)
5. Backend validates the ID token against Google's public keys
6. Backend creates/updates local user record and issues an HttpOnly session cookie
7. Frontend uses credentials include to send the cookie with subsequent requests

## Prerequisites

- A Google Cloud account
- Access to Google Cloud Console (https://console.cloud.google.com)

## A) Google Cloud Setup (Manual Steps)

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top of the page
3. Click "New Project"
4. Enter project name: `pennywise` (or your preferred name)
5. Click "Create"
6. Wait for the project to be created, then select it

### 2. Enable Google Identity Services

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Identity Toolkit API"
3. Click on it and click "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace organization)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: `Pennywise`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add the following scopes:
   - `openid`
   - `email`
   - `profile`
8. Click "Update" and then "Save and Continue"
9. On the "Test users" page, add your email if in testing mode
10. Click "Save and Continue"

### 4. Create OAuth Client ID

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application" as the application type
4. Set a name: `Pennywise Web Client`
5. Add **Authorized JavaScript origins**:
   - For development: `http://localhost:3000`, `http://localhost:5173`
   - For production: `https://your-domain.com`
6. Add **Authorized redirect URIs**:
   - For development: `http://localhost:3000`, `http://localhost:5173`
   - For production: `https://your-domain.com`
7. Click "Create"
8. **Copy the Client ID** - you'll need this for both frontend and backend

## B) Environment Configuration

### Backend (.NET)

Add the Google Client ID to your configuration. You can use either:

**Option 1: Environment Variable (recommended for production)**
```bash
export Authentication__Google__ClientId="your-google-client-id.apps.googleusercontent.com"
```

**Option 2: appsettings.json (for development)**
```json
{
  "Authentication": {
    "Google": {
      "ClientId": "your-google-client-id.apps.googleusercontent.com"
    }
  }
}
```

**Option 3: appsettings.Development.json**
```json
{
  "Authentication": {
    "Google": {
      "ClientId": "your-google-client-id.apps.googleusercontent.com"
    }
  }
}
```

### Frontend (React)

Create a `.env.local` file in `frontend/pennywise-ui/`:

```bash
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_API_URL=http://localhost:8080
```

Or set environment variables:
```bash
export VITE_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
export VITE_API_URL="http://localhost:8080"
```

## C) Development URLs

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Frontend (Docker/Nginx) | http://localhost:3000 |
| Backend API | http://localhost:8080 |

## D) API Endpoints

### POST /auth/google
Sign in with Google ID token.

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "pictureUrl": "https://lh3.googleusercontent.com/..."
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid Google ID token"
}
```

### GET /api/me
Get current authenticated user.

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "pictureUrl": "https://lh3.googleusercontent.com/..."
}
```

**Response (401 Unauthorized):** When not authenticated

### POST /auth/logout
Sign out the current user.

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

## E) Cookie Configuration

The authentication cookie is configured as follows:

| Property | Development | Production |
|----------|-------------|------------|
| Cookie Name | `pennywise_auth` | `pennywise_auth` |
| HttpOnly | `true` | `true` |
| Secure | `false` (SameAsRequest) | `true` |
| SameSite | `Lax` | `None` |
| Expires | 7 days (sliding) | 7 days (sliding) |

## F) Security Considerations

1. **Token Validation**: The backend validates:
   - Token signature using Google's public keys (JWKS)
   - Issuer is `accounts.google.com` or `https://accounts.google.com`
   - Audience matches your configured Client ID
   - Token is not expired

2. **HttpOnly Cookies**: Auth cookies cannot be accessed via JavaScript, preventing XSS attacks

3. **CORS**: Backend is configured to only allow specific origins and requires credentials

4. **Secure Cookies**: In production, cookies are only sent over HTTPS

## G) Troubleshooting

### "Invalid Google ID token" error
- Verify the Google Client ID is the same in frontend and backend
- Check if the token has expired (Google ID tokens are short-lived)
- Ensure the JavaScript origin is correctly configured in Google Cloud Console

### Cookie not being set
- Check browser dev tools Network tab for the Set-Cookie header
- Ensure `credentials: 'include'` is set in frontend fetch calls
- Verify CORS is configured to allow credentials

### CORS errors
- Ensure the frontend origin is in the allowed origins list
- Check that `AllowCredentials()` is called in CORS policy
- Verify SameSite cookie policy matches your setup

### Google Sign-In button not appearing
- Verify `VITE_GOOGLE_CLIENT_ID` is set
- Check browser console for Google Sign-In errors
- Ensure the JavaScript origin is whitelisted in Google Cloud Console

## H) Testing

### Test Cases

1. **Happy Path**: Sign in → cookie set → `/api/me` returns 200
2. **Invalid Token**: Send bogus token → `/auth/google` returns 401
3. **Logout**: After logout → `/api/me` returns 401
4. **User Persistence**: Login twice with same Google account → same local user id
