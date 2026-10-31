# 📚 VIP Seat Booking System — Developer Documentation Hub

Welcome to the internal engineering documentation for the **VIP Seat Booking System**. This documentation is structured to provide an immediate, deep reference for maintaining, refactoring, and expanding the codebase.

---

## 🗂️ Documentation Directory

| Document | Purpose & Key Topics |
| :--- | :--- |
| **[SYSTEM_OVERVIEW.md](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/docs/SYSTEM_OVERVIEW.md)** | High-level system architecture, technology stack, directory structure, and end-to-end user journeys. |
| **[ARCHITECTURE_AND_CONCURRENCY.md](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/docs/ARCHITECTURE_AND_CONCURRENCY.md)** | Deep dive into distributed locking (`SET NX EX`), two-database synchronization (Redis + MongoDB), race condition prevention, and WebSocket lifecycle management. |
| **[API_DOCUMENTATION.md](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/docs/API_DOCUMENTATION.md)** | Complete specification of REST endpoints, HTTP status codes, request/response contracts, and WebSocket event payloads. |
| **[DATABASE_SCHEMA.md](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/docs/DATABASE_SCHEMA.md)** | Mongoose schemas ([`Seat`](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/backend/models/Seat.js), [`User`](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/backend/models/User.js)), Redis key patterns & TTLs, seeding scripts, and seat state machine. |
| **[FRONTEND_GUIDE.md](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/docs/FRONTEND_GUIDE.md)** | React 19 architecture, [`SeatDashboard.jsx`](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/client/src/components/SeatDashboard.jsx) breakdown, optimistic state transitions, cold-start handling, and Tailwind CSS v4 styling. |
| **[DEV_WORKFLOW_AND_TROUBLESHOOTING.md](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/docs/DEV_WORKFLOW_AND_TROUBLESHOOTING.md)** | Development environment configuration, environment variables, known architectural constraints, CORS troubleshooting, and safety checklists. |

---

## ⚡ Quick Architecture Summary

```
                       +---------------------------------------+
                       |          React 19 Frontend            |
                       |       (Vite + Tailwind CSS v4)        |
                       +-------------------+-------------------+
                                           |
                    HTTP Requests          |   WebSocket Events
                    (Fetch API)            |   (Socket.io-client)
                                           |
                                           v
                       +-------------------+-------------------+
                       |         Node.js Express Server        |
                       |          (Socket.io + CORS)           |
                       +---------+-------------------+---------+
                                 |                   |
            Temporary Holds      |                   |  Permanent Bookings
            Distributed Locks    |                   |  User Accounts
            (TTL 300s)           v                   v  (Persistent)
                       +---------+---------+   +-----+---------+
                       |   Upstash Redis   |   | MongoDB Atlas |
                       |    (In-Memory)    |   |  (Permanent)  |
                       +-------------------+   +---------------+
```

---

## 📌 Critical System Rules

1. **Temporary State vs. Permanent State**:
   - `LOCKED` is **never stored in MongoDB**. It exists strictly as a temporary Redis key (`hold:seat:<seatId>`) with a 300-second TTL.
   - MongoDB only persists `AVAILABLE` and `BOOKED` states.
2. **Reverse Lock Tracking**:
   - Whenever a seat lock is created, a reverse key `active_user_hold:<userId>` is created simultaneously. This guarantees $O(1)$ cleanup when a socket disconnects.
3. **Single Active Hold per User**:
   - The current architecture maps one active hold per user ID via `active_user_hold:<userId>`. Selecting another seat while one is held overwrites the reverse key unless explicitly handled.
4. **CORS Whitelist Constraint**:
   - In [`backend/server.js`](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/backend/server.js), CORS is locked to `https://seat-booking-system-nu.vercel.app`. For local development against `localhost:5173`, CORS needs to accept the local dev origin or environment-based origins.

