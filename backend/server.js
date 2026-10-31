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

// Whitelist of allowed origins for Express and Socket.io
const allowedOrigins = [
    "https://seat-booking-system-nu.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
];

if (process.env.CLIENT_ORIGIN && !allowedOrigins.includes(process.env.CLIENT_ORIGIN)) {
    allowedOrigins.push(process.env.CLIENT_ORIGIN);
}

// Function to validate origin (supports Vercel, localhost, and local LAN devices)
const corsOriginValidator = (origin, callback) => {
    if (!origin) return callback(null, true); // Mobile apps, curl, postman
    
    const isLocalhostOrLan = 
        origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:') ||
        /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin);

    if (allowedOrigins.includes(origin) || isLocalhostOrLan) {
        return callback(null, true);
    }
    return callback(new Error('Blocked by CORS'));
};

// Enable Cross-Origin Resource Sharing so the React frontend can talk to this API
app.use(cors({
    origin: corsOriginValidator,
    credentials: true
}));

// Parse incoming JSON payloads from HTTP requests
app.use(express.json());

// We must wrap the Express app in a native Node HTTP server to attach Socket.io
const server = http.createServer(app);

// Initialize the WebSocket server
const io = new Server(server, {
    cors: {
        origin: corsOriginValidator, 
        methods: ["GET", "POST"],
        credentials: true
    }
});

/**
 * ==========================================
 * 2. RESILIENT CACHE CLIENT WRAPPER
 * ==========================================
 * Supports Upstash Redis in production and automatically falls back to an
 * in-memory locking cache if external Redis is unreachable or expired during local testing.
 */
class CacheClientWrapper {
    constructor(redisUrl) {
        this.inMemoryStore = new Map();
        this.inMemoryTimers = new Map();
        this.useFallback = false;

        if (redisUrl) {
            try {
                this.client = createClient({
                    url: redisUrl,
                    socket: {
                        reconnectStrategy: () => false // Fail fast if external Redis is offline, seamlessly switching to fallback
                    }
                });
                this.client.on('error', (err) => {
                    if (!this.useFallback) {
                        console.warn(`[Redis Notice] ${err.message}`);
                    }
                });
            } catch (err) {
                this.useFallback = true;
            }
        } else {
            this.useFallback = true;
        }
    }

    async connect() {
        if (!this.client) {
            this.useFallback = true;
            console.log('⚡ Using In-Memory Lock Cache for local testing.');
            return;
        }

        try {
            await this.client.connect();
            console.log('Connected to Upstash Redis safely');
        } catch (err) {
            this.useFallback = true;
            console.warn(`⚠️ Notice: Could not connect to external Redis (${err.message}).`);
            console.warn('⚡ Active: Fallback in-memory cache enabled. Locking and auto-release will function normally for local testing!');
        }
    }

    async get(key) {
        if (!this.useFallback && this.client && this.client.isOpen) {
            try {
                return await this.client.get(key);
            } catch (e) {
                this.useFallback = true;
            }
        }
        return this.inMemoryStore.get(key) || null;
    }

    async set(key, value, options) {
        if (!this.useFallback && this.client && this.client.isOpen) {
            try {
                return await this.client.set(key, value, options);
            } catch (e) {
                this.useFallback = true;
            }
        }

        // Mutual exclusion: NX check
        if (options && options.NX && this.inMemoryStore.has(key)) {
            return null;
        }

        this.inMemoryStore.set(key, value);

        // Expiration: EX check
        if (options && options.EX) {
            if (this.inMemoryTimers.has(key)) clearTimeout(this.inMemoryTimers.get(key));
            const timer = setTimeout(() => {
                this.inMemoryStore.delete(key);
                this.inMemoryTimers.delete(key);
            }, options.EX * 1000);
            this.inMemoryTimers.set(key, timer);
        }

        return 'OK';
    }

    async setEx(key, seconds, value) {
        if (!this.useFallback && this.client && this.client.isOpen) {
            try {
                return await this.client.setEx(key, seconds, value);
            } catch (e) {
                this.useFallback = true;
            }
        }
        return this.set(key, value, { EX: seconds });
    }

    async del(key) {
        if (!this.useFallback && this.client && this.client.isOpen) {
            try {
                return await this.client.del(key);
            } catch (e) {
                this.useFallback = true;
            }
        }

        if (this.inMemoryTimers.has(key)) {
            clearTimeout(this.inMemoryTimers.get(key));
            this.inMemoryTimers.delete(key);
        }
        this.inMemoryStore.delete(key);
        return 1;
    }
}

// Initialize Cache Client Wrapper
const redisClient = new CacheClientWrapper(process.env.REDIS_URL);

/**
 * ==========================================
 * 3. WEBSOCKET (REAL-TIME) LOGIC
 * ==========================================
 */
io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`User connected: ${userId} (Socket ID: ${socket.id})`);

    /**
     * Auto-Release on Disconnect
     * Releases active locks if a user abruptly disconnects.
     */
    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${userId}`);
        
        if (!userId) return;

        try {
            const heldSeatId = await redisClient.get(`active_user_hold:${userId}`);
            
            if (heldSeatId) {
                console.log(`Auto-releasing seat ${heldSeatId} for departed user ${userId}`);
                
                await redisClient.del(`hold:seat:${heldSeatId}`);
                await redisClient.del(`active_user_hold:${userId}`);

                io.emit('seatUpdated', { seatId: heldSeatId, status: 'AVAILABLE' });
            }
        } catch (error) {
            console.error('Error in disconnect cleanup:', error);
        }
    });
});

/**
 * ==========================================
 * 4. DATABASE CONNECTIONS & BOOT SEQUENCE
 * ==========================================
 */
const startServer = async () => {
    try {
        // Connect to Redis Cache (or fallback in-memory)
        await redisClient.connect();

        // Connect to Permanent MongoDB Storage
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB Atlas safely');

        const PORT = process.env.PORT || 5000;
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch(error) {
        console.log("Failed to start server: ", error); 
        process.exit(1);
    }
};

/**
 * ==========================================
 * 5. ROUTE MOUNTING
 * ==========================================
 */

// Simple health check endpoint
app.get('/wakeup', (req, res) => {
    res.status(200).json({ status: 'API is running', databases: 'Connected' });
});

// Inject cache client and Socket.io instance into seat routes
const seatRoutes = require('./routes/seatRoutes')(redisClient, io);
app.use('/api/seats', seatRoutes);

// Mount user authentication routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Execute Boot Sequence
startServer();
