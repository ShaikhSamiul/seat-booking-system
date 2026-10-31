# 📖 API Documentation

This document describes all REST API endpoints and WebSocket events supported by the VIP Seat Booking backend.

---

## 🌐 Base Configuration

* **Local Base URL:** `http://localhost:5000`
* **Content-Type:** `application/json` (for all POST requests)
* **Authentication Scheme:** Direct `userId` parameter passing (session ID persisted in client `localStorage`).

---

## 🚦 System & Health Endpoints

### 1. Wakeup Ping
Used for deployment cold-start polling and uptime monitoring.

* **Method:** `GET`
* **Path:** `/wakeup`
* **Authentication:** None

#### Response (200 OK)
```json
{
  "status": "API is running",
  "databases": "Connected"
}
```

---

## 💺 Seat Reservation Endpoints (`/api/seats`)

### 2. Fetch All Seats (Grid State)
Fetches the complete grid of 50 seats. Combines permanent bookings from MongoDB with active temporary holds from Redis.

* **Method:** `GET`
* **Path:** `/api/seats`

#### Response (200 OK)
```json
[
  {
    "_id": "66f10a82b9a12c001f44a801",
    "seatId": "A1",
    "status": "AVAILABLE",
    "bookedBy": null,
    "bookedAt": null,
    "createdAt": "2026-10-31T12:00:00.000Z",
    "updatedAt": "2026-10-31T12:00:00.000Z"
  },
  {
    "_id": "66f10a82b9a12c001f44a802",
    "seatId": "A2",
    "status": "LOCKED",
    "bookedBy": null,
    "bookedAt": null,
    "heldBy": "66f1099ab9a12c001f44a7f0"
  },
  {
    "_id": "66f10a82b9a12c001f44a803",
    "seatId": "A3",
    "status": "BOOKED",
    "bookedBy": "66f1099ab9a12c001f44a7f0",
    "bookedAt": "2026-10-31T12:05:00.000Z"
  }
]
```

---

### 3. Temporarily Hold a Seat (Lock)
Creates an exclusive 5-minute lock on a seat in Redis using `SET NX EX 300`.

* **Method:** `POST`
* **Path:** `/api/seats/lock`

#### Request Body
```json
{
  "seatId": "A1",
  "userId": "66f1099ab9a12c001f44a7f0"
}
```

#### Response (200 OK)
```json
{
  "message": "Seat locked successfully for 5 minutes",
  "seatId": "A1"
}
```

#### Error Responses
| Status | Reason | Payload Example |
| :--- | :--- | :--- |
| `404 Not Found` | Seat identifier does not exist in MongoDB | `{"error": "Seat not found"}` |
| `409 Conflict` | Seat is already permanently booked | `{"error": "Seat is already permanently booked"}` |
| `409 Conflict` | Another user holds the active Redis lock | `{"error": "Seat is currently being held by another user"}` |
| `500 Server Error` | Database or Redis failure | `{"error": "Server error while locking seat"}` |

---

### 4. Permanently Book a Seat (Checkout)
Converts an existing Redis hold into a permanent booking in MongoDB. Verifies that the requesting user owns the active lock.

* **Method:** `POST`
* **Path:** `/api/seats/book`

#### Request Body
```json
{
  "seatId": "A1",
  "userId": "66f1099ab9a12c001f44a7f0"
}
```

#### Response (200 OK)
```json
{
  "message": "Seat permanently booked!",
  "seat": {
    "_id": "66f10a82b9a12c001f44a801",
    "seatId": "A1",
    "status": "BOOKED",
    "bookedBy": "66f1099ab9a12c001f44a7f0",
    "bookedAt": "2026-10-31T12:10:00.000Z",
    "createdAt": "2026-10-31T12:00:00.000Z",
    "updatedAt": "2026-10-31T12:10:00.000Z"
  }
}
```

#### Error Responses
| Status | Reason | Payload Example |
| :--- | :--- | :--- |
| `400 Bad Request` | Lock has expired or was never acquired | `{"error": "Checkout expired. You must lock the seat first."}` |
| `403 Forbidden` | Lock is held by a different `userId` | `{"error": "The seat is locked by another user."}` |
| `500 Server Error` | Database failure during write | `{"error": "Server error while booking seat"}` |

---

### 5. Voluntarily Unlock a Held Seat
Releases an active Redis hold early, returning the seat to the pool.

* **Method:** `POST`
* **Path:** `/api/seats/unlock`

#### Request Body
```json
{
  "seatId": "A1",
  "userId": "66f1099ab9a12c001f44a7f0"
}
```

#### Response (200 OK)
```json
{
  "message": "Seat unlocked successfully",
  "seatId": "A1"
}
```

#### Error Responses
| Status | Reason | Payload Example |
| :--- | :--- | :--- |
| `400 Bad Request` | No active lock, or user is not the lock owner | `{"error": "Cannot unlock this seat."}` |
| `500 Server Error` | Redis command failure | `{"error": "Server error while unlocking seat"}` |

---

### 6. Release a Booked Ticket (Unbook)
Allows a ticket holder to surrender their confirmed booking and reset the seat to `AVAILABLE`.

* **Method:** `POST`
* **Path:** `/api/seats/unbook`

#### Request Body
```json
{
  "seatId": "A1",
  "userId": "66f1099ab9a12c001f44a7f0"
}
```

#### Response (200 OK)
```json
{
  "message": "Seat released successfully",
  "seatId": "A1"
}
```

#### Error Responses
| Status | Reason | Payload Example |
| :--- | :--- | :--- |
| `400 Bad Request` | Seat not found, not booked, or user does not own it | `{"error": "Cannot release this seat. You may not own it."}` |
| `500 Server Error` | MongoDB update failure | `{"error": "Server error while releasing seat"}` |

---

## 👤 User & Auth Endpoints (`/api/users`)

### 7. Register User
Creates a new user account with unique username, email, and a secure password (hashed with bcrypt, 10 rounds).

* **Method:** `POST`
* **Path:** `/api/users/`

#### Request Body
```json
{
  "username": "AlexVip",
  "email": "alex@example.com",
  "password": "SecretPassword123"
}
```

#### Response (201 Created)
```json
{
  "_id": "66f1099ab9a12c001f44a7f0",
  "username": "AlexVip",
  "email": "alex@example.com",
  "createdAt": "2026-10-31T12:00:00.000Z",
  "updatedAt": "2026-10-31T12:00:00.000Z"
}
```

#### Error Responses
| Status | Reason | Payload Example |
| :--- | :--- | :--- |
| `400 Bad Request` | Missing `username`, `email`, or `password` | `{"error": "Username, email, and password are required"}` |
| `400 Bad Request` | Password under 6 characters | `{"error": "Password must be at least 6 characters long"}` |
| `409 Conflict` | Email already registered | `{"error": "Email already exists. Please log in instead."}` |
| `409 Conflict` | Username already taken (MongoDB 11000) | `{"error": "That username is already taken. Please choose another."}` |
| `500 Server Error` | Server error during save | `{"error": "Server error handling user registration"}` |

---

### 8. Login User
Authenticates a registered user using their email and password.

* **Method:** `POST`
* **Path:** `/api/users/login`

#### Request Body
```json
{
  "email": "alex@example.com",
  "password": "SecretPassword123"
}
```

#### Response (200 OK)
```json
{
  "_id": "66f1099ab9a12c001f44a7f0",
  "username": "AlexVip",
  "email": "alex@example.com",
  "createdAt": "2026-10-31T12:00:00.000Z",
  "updatedAt": "2026-10-31T12:00:00.000Z"
}
```

#### Error Responses
| Status | Reason | Payload Example |
| :--- | :--- | :--- |
| `400 Bad Request` | Missing `email` or `password` | `{"error": "Email and password are required"}` |
| `401 Unauthorized` | Invalid email or incorrect password | `{"error": "Invalid email or password"}` |
| `500 Server Error` | Server query failure | `{"error": "Server error during login"}` |

---

## 📡 WebSocket Event Reference

### Client Connection
The client must supply the user ID in the connection handshake query:
```javascript
const socket = io(API_URL, {
  query: { userId: "66f1099ab9a12c001f44a7f0" }
});
```

### Server-to-Client Broadcasts

#### Event: `seatUpdated`
Emitted globally to all connected sockets whenever a seat changes state.

```typescript
interface SeatUpdatedPayload {
  seatId: string; // e.g. "A1", "C5"
  status: 'AVAILABLE' | 'LOCKED' | 'BOOKED';
}
```

**Example Payload:**
```json
{
  "seatId": "B4",
  "status": "LOCKED"
}
```

