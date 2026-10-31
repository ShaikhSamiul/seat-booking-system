# 🛠️ Development Workflow, Pitfalls & Troubleshooting

This document outlines local environment setup, critical design caveats, known edge cases, and safety checklists for making changes to this codebase.

---

## ⚙️ Environment Variables Reference

### Backend ([`backend/.env`](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/backend/.env))
| Variable | Description | Example / Format |
| :--- | :--- | :--- |
| `PORT` | Local HTTP port for Express | `5001` (Changed from 5000 due to Windows port exclusion) |
| `MONGO_URI` | MongoDB Atlas replica-set connection string | `mongodb://user:pass@host:27017/?ssl=true&replicaSet=...` |
| `REDIS_URL` | Upstash Redis connection string (with TLS) | `rediss://default:password@host.upstash.io:6379` |

### Client ([`client/.env`](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/client/.env))
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` | URL where the backend is reachable | `http://localhost:5001` (Local) / `https://render-url` (Prod) |

---

## 🚀 Running the Project Locally

### 1. Start the Backend
```powershell
cd backend
npm install
npm run dev
```
* Runs with `nodemon server.js` on port `5001`.
* Listens on `0.0.0.0` to permit testing from mobile devices on the same Wi-Fi.

### 2. Start the Frontend
```powershell
cd client
npm install
npm run dev
```
* Vite will launch on `http://localhost:5173` (or next open port) with `--host` enabled.

### 3. Resetting / Seeding Database
```powershell
cd backend
node seed.js
```
* Resets all 50 seats to `AVAILABLE`.

---

## ⚠️ Known Gotchas & Architectural Caveats

### 1. CORS Configuration (Pre-configured for Local & Production)
[`backend/server.js`](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/backend/server.js) uses a dynamic origin validator that permits:
* Production: `https://seat-booking-system-nu.vercel.app`
* Local Development: `http://localhost:5173`, `http://localhost:5174`, `http://localhost:3000`, `http://127.0.0.1:*`
* Local LAN Devices: any local network IP (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`) for mobile testing.
* Optional override via `CLIENT_ORIGIN` in `.env`.

### 2. Single Active Hold per User Limitation
* The reverse lookup key `active_user_hold:<userId>` stores a single `seatId`.
* If a user opens the app in two tabs or initiates a second lock before the first expires, the reverse lookup key gets overwritten by the second seat ID.
* If you plan to support **multi-seat cart reservations**, `active_user_hold:<userId>` should be upgraded from a Redis `String` to a Redis `Set` (`SADD`, `SREM`, `SMEMBERS`).

### 3. Disconnect Behavior with Multiple Tabs
* Because the WebSocket registers `socket.on('disconnect')` against the `userId`, if a user opens the app in two browser tabs and closes *one* tab, the backend may auto-release the seat held in the remaining open tab.
* To avoid this in future iterations, track connection count per user in Redis (`INCR active_connections:<userId>`) or map locks to unique socket session IDs rather than raw user IDs.

### 4. Passwordless Authentication Storage
* User authentication is stored in browser `localStorage` as:
  - `seat_booking_user_id`
  - `seat_booking_user_name`
  - `seat_booking_user_email`
* There are no cryptographic JWTs or server-side session cookies. If the user's `localStorage` is cleared, they will be logged out on reload.

---

## 🔍 Troubleshooting Guide

### Issue: "Failed to lock seat" or HTTP 409 Conflict
* **Cause:** Another user holds the Redis lock, or MongoDB already lists the seat as `BOOKED`.
* **Resolution:** Wait for the 5-minute timer to expire, or run `GET /api/seats` to confirm current state.

### Issue: "Wait for a minute as the Render backend is starting"
* **Cause:** The Render free-tier instance was idle and spun down.
* **Resolution:** This is normal behavior. The client automatically polls `/wakeup` until the instance completes its cold start (typically 40–70 seconds).

### Issue: MongoDB Duplicate Key Error (Code 11000)
* **Cause:** Attempting to register a username or email that already exists.
* **Resolution:** Usernames and emails are strictly unique. Switch to Login mode or choose a distinct username.

### Issue: "Redis Client Error: getaddrinfo ENOTFOUND ...upstash.io"
* **Cause:** The Upstash free-tier database hostname in `backend/.env` has expired or been removed due to inactivity.
* **Resolution:** Create a free database in [Upstash Console](https://console.upstash.com/), copy the TLS connection string (`rediss://...`), and update `REDIS_URL` in `backend/.env`. Local Redis (`redis://localhost:6379`) can also be used.

---

## ✅ Pre-Modification Safety Checklist

Before modifying any booking or locking code, verify:
- [ ] Redis commands maintain atomicity (`SET NX EX`). Never split lock check and lock creation into separate async calls.
- [ ] Any modification to `POST /api/seats/lock` updates the reverse lookup key `active_user_hold:<userId>`.
- [ ] Any modification to `POST /api/seats/book` or `POST /api/seats/unlock` deletes **both** Redis keys (`hold:seat:<seatId>` and `active_user_hold:<userId>`).
- [ ] All seat state changes emit the `seatUpdated` WebSocket event to maintain real-time UI synchronization.
- [ ] Database updates to `Seat.status` only write `'AVAILABLE'` or `'BOOKED'` (never `'LOCKED'`).

