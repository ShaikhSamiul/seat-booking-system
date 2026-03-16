# 🎟️ VIP Seat Booking System

![Real-Time](https://img.shields.io/badge/Real--Time-WebSockets-blue?style=for-the-badge&logo=socket.io)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=nodedotjs)
![Redis](https://img.shields.io/badge/Redis-Upstash-red?style=for-the-badge&logo=redis)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-success?style=for-the-badge&logo=mongodb)

A highly resilient, highly concurrent full-stack web application that allows users to select, hold, and permanently book seats in real-time. Built to handle heavy network traffic without double-booking, utilizing distributed caching and WebSocket architecture.

**🔗 [View Live Demo](https://seat-booking-system-nu.vercel.app/)**

---

## ✨ Key Features

* **Real-Time Synchronization:** The seating grid updates instantly across all connected clients the millisecond a seat is locked, booked, or released using **Socket.io**.
* **Distributed Locking (Concurrency Control):** Uses **Redis** `SET NX EX` commands to create a temporary 5-minute hold on a seat during checkout, guaranteeing that two users cannot accidentally buy the same seat.
* **Auto-Release Mechanics:** If a user closes their browser, loses Wi-Fi, or lets their 5-minute timer expire, the server automatically scrubs their active Redis locks and releases the seat back to the public pool.
* **Passwordless Authentication:** A low-friction login/registration system designed to get users into the booking arena instantly using just an email and username.
* **Premium UI/UX:** Built with **Tailwind CSS** and **Framer Motion**, featuring responsive horizontally-scrolling grids for mobile, sliding ticket drawers, and crash-proof unmounting animations.

---

## 🏗️ Architecture: How it Works

This application utilizes a "Two-Database" hybrid architecture to optimize for both speed and permanence:

1.  **The High-Speed Cache (Redis):** Acts as the absolute source of truth for *temporary* actions. When a user clicks a seat, Redis creates an exclusive 300-second lock. If the lock is successful, the server broadcasts a `LOCKED` status to all other users.
2.  **The Permanent Store (MongoDB):** Acts as the absolute source of truth for *permanent* actions. When a user finalizes a checkout, the application writes the ticket to MongoDB, destroys the temporary Redis lock, and broadcasts a `BOOKED` status to the grid.

---

## 📱 Responsiveness

The application is fully optimized for all screen sizes. On mobile devices, the 10-column seating grid converts into a horizontally scrollable container to maintain touch-target size and prevent UI scaling issues.

---

## 💻 Tech Stack

**Frontend (Client)**
* React.js (Vite)
* Tailwind CSS (Styling)
* Framer Motion (Animations)
* Socket.io-client (Real-time network)

**Backend (Server)**
* Node.js & Express
* Socket.io (WebSocket Engine)
* Mongoose (MongoDB ODM)
* Redis (Caching & Distributed Locks)

---

## 🚀 Local Development Setup

To run this project locally, you will need Node.js installed, alongside access to a MongoDB instance (like Atlas) and a Redis instance (like Upstash).

### 1. Clone the repository

```bash
git clone [https://github.com/YOUR_USERNAME/vip-seat-booking.git](https://github.com/YOUR_USERNAME/vip-seat-booking.git)
cd vip-seat-booking
```

### 2. Setup the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
```

Start the server:

```bash
npm run dev
```

### 3. Setup the Frontend

Open a new terminal window:

```bash
cd client
npm install
```

Create a `.env` file in the `client` directory:

```env
VITE_BACKEND_URL=http://localhost:5000
```

Start the React application:

```bash
npm run dev
```



