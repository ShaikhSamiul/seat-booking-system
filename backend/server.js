require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io');

/**
 * ==========================================
 * 1. SERVER INITIALIZATION & MIDDLEWARE
 * ==========================================
 */
const app = express();

// Enable Cross-Origin Resource Sharing so the React frontend can talk to this API
app.use(cors({
    origin: "https://seat-booking-system-nu.vercel.app"
}));
// Parse incoming JSON payloads from HTTP requests
app.use(express.json());

// We must wrap the Express app in a native Node HTTP server to attach Socket.io
const server = http.createServer(app);

// Initialize the WebSocket server
const io = new Server(server, {
    cors: {
        // NOTE: Currently set to "*" for local mobile testing. 
        // During deployment, this should be restricted to your specific Vercel URL.
        origin: "https://seat-booking-system-nu.vercel.app", 
        methods: ["GET", "POST"]
    }
});

/**
 * ==========================================
 * 2. WEBSOCKET (REAL-TIME) LOGIC
 * ==========================================
 */
io.on('connection', (socket) => {
    // Extract the userId passed from the React frontend during the initial connection
    const userId = socket.handshake.query.userId;
    console.log(`User connected: ${userId} (Socket ID: ${socket.id})`);

    /**
     * Resiliency Feature: Auto-Release on Disconnect
     * If a user holds a seat but suddenly loses WiFi or closes their browser tab,
     * this listener catches the disconnect event and automatically scrubs their 
     * temporary locks from Redis so the seat doesn't get stuck in a "Held" state forever.
     */
    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${userId}`);
        
        if (!userId) return;

        try {
            // 1. Check Redis to see if this specific user left behind an active lock
            const heldSeatId = await redisClient.get(`active_user_hold:${userId}`);
            
            if (heldSeatId) {
                console.log(`Auto-releasing seat ${heldSeatId} for departed user ${userId}`);
                
                // 2. Delete both the primary seat lock and the reverse lookup key
                await redisClient.del(`hold:seat:${heldSeatId}`);
                await redisClient.del(`active_user_hold:${userId}`);

                // 3. Instantly notify all remaining connected users that the seat is free
                io.emit('seatUpdated', { seatId: heldSeatId, status: 'AVAILABLE' });
            }
        } catch (error) {
            console.error('Error in disconnect cleanup:', error);
        }
    });
});

/**
 * ==========================================
 * 3. DATABASE CONNECTIONS (REDIS & MONGODB)
 * ==========================================
 */

// Initialize Upstash Redis Client for high-speed temporary locking
const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error: ', err));
redisClient.on('connect', () => console.log('Connected to Upstash Redis safely'));

/**
 * Main Boot Sequence
 * Ensures both databases are fully connected before the server starts accepting traffic.
 */
const startServer = async () => {
    try {
        // Connect to Redis Cache
        await redisClient.connect();

        // Connect to Permanent MongoDB Storage
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB Atlas safely');

        const PORT = process.env.PORT || 5000;
        
        // CRITICAL: We call listen on the `server` (HTTP + WebSockets), NOT `app` (HTTP only)
        // '0.0.0.0' allows the server to accept traffic from devices on the local network (like mobile testing)
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch(error) {
        console.log("Failed to start server: ", error); 
        process.exit(1); // Force exit if database connections fail
    }
};

/**
 * ==========================================
 * 4. ROUTE MOUNTING
 * ==========================================
 */

// Simple health check endpoint for deployment monitoring
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'API is running', databases: 'Connected' });
});

// Inject the active Redis client and Socket.io instance into the seat routes
const seatRoutes = require('./routes/seatRoutes')(redisClient, io);
app.use('/api/seats', seatRoutes);

// Mount standard user authentication routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Execute Boot Sequence
startServer();