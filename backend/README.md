# CampusConnect Backend

This is a minimal Node.js + Express backend for the CampusConnect static frontend. It uses a simple JSON file (`data.json`) as storage to keep setup minimal.

Features
- Signup (`POST /api/signup`) — returns JWT token
- Login (`POST /api/login`) — returns JWT token
- Profile (`GET /api/profile`) — requires Authorization header
- Blogs (`GET /api/blogs`, `POST /api/blogs`) — `POST` requires auth
- Challenges (`GET /api/challenges`, `POST /api/challenges`) — `POST` requires auth

Quick start

1. Open a terminal in `backend`.
2. Install dependencies:

```powershell
cd backend; npm install
```

3. Start server:

```powershell
npm start
```

By default the server listens on port `4000`. You can change it with `PORT` environment variable and change JWT secret with `JWT_SECRET`.

Example requests

- Signup:

  POST `/api/signup` { "name": "Alice", "email": "a@b.com", "password": "secret" }
- Login:

  POST `/api/login` { "email": "a@b.com", "password": "secret" }

Use the returned `token` as `Authorization: Bearer <token>` for protected endpoints.

Notes
- This is intentionally small and file-based for local development and prototyping.
- For production, use a proper database and stronger secret management.
