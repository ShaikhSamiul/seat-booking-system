const express = require('express');
const Seat = require('../models/Seat.js');

/**
 * Seat Routes Module
 * * This file handles all seat-related transactions. It uses a hybrid architecture:
 * 1. MongoDB: Acts as the absolute source of truth for permanent bookings.
 * 2. Redis: Acts as a high-speed, temporary cache to handle concurrency and 
 * prevent double-booking when users "hold" a seat during checkout.
 * * @param {Object} redisClient - The connected Redis instance.
 * @param {Object} io - The Socket.io server instance for real-time broadcasting.
 */
module.exports = (redisClient, io) => {
    const router = express.Router();

    /**
     * @route   GET /api/seats
     * @desc    Fetch the master grid of all seats.
     * @logic   Merges permanent data from MongoDB with temporary lock data from Redis
     * so the frontend always sees the most up-to-date state.
     */
    router.get('/', async(req, res)=>{
        try{
            // 1. Fetch the base state from MongoDB, sorted alphanumerically
            const seats = await Seat.find({}).sort({seatId: 1});

            // 2. Map over every seat to check if it has a temporary Redis lock
            const seatWithLocks = await Promise.all(seats.map(async(seat)=>{
                // If Mongo says it's permanently booked, ignore Redis entirely
                if(seat.status === 'BOOKED') return seat;

                // Check Redis to see if someone is currently holding this seat in their cart
                const heldByUserId = await redisClient.get(`hold:seat:${seat.seatId}`);

                if(heldByUserId){
                    // Inject the temporary LOCKED state for the frontend
                    return { ...seat.toObject(), status: 'LOCKED', heldBy: heldByUserId }
                }
                
                return seat; // Seat is truly AVAILABLE
            }));

            res.status(200).json(seatWithLocks);
        } catch(error){
            console.error('Error fetching seats:', error);
            res.status(500).json({error: 'Server error fetching seats'});
        }
    });

    /**
     * @route   POST /api/seats/lock
     * @desc    Temporarily holds a seat for 5 minutes during checkout.
     * @logic   Uses Redis NX (Not Exists) to ensure absolute concurrency control.
     */
    router.post('/lock', async(req, res)=>{
        const { seatId, userId } = req.body;

        try{
            // 1. Verify the seat exists and isn't permanently booked in Mongo
            const seat = await Seat.findOne({ seatId });
            if(!seat) return res.status(404).json({error: 'Seat not found'});
            if(seat.status === 'BOOKED'){
                return res.status(409).json({error: 'Seat is already permanently booked'})
            }

            // 2. Attempt to acquire the Redis Lock.
            // EX: 300 sets a 5-minute expiration time.
            // NX: true ensures this command ONLY succeeds if the key doesn't already exist.
            const lockAcquired = await redisClient.set(`hold:seat:${seatId}`, userId, {
                EX: 300,
                NX: true
            });

            // If another user grabbed the lock a millisecond before us, reject the request
            if(!lockAcquired){
                return res.status(409).json({error: 'Seat is currently being held by another user'});
            }

            // 3. Create a reverse lookup key. This allows the server to know exactly 
            //    which seat this user is holding if their socket disconnects unexpectedly.
            await redisClient.setEx(`active_user_hold:${userId}`, 300, seatId);

            // 4. Broadcast the change to all connected clients instantly
            io.emit('seatUpdated', { seatId, status: 'LOCKED' });   
            res.status(200).json({message: 'Seat locked successfully for 5 minutes', seatId});
            
        } catch(error){
            console.error('Error locking seat:', error);
            res.status(500).json({error: 'Server error while locking seat'});
        }
    });

    /**
     * @route   POST /api/seats/book
     * @desc    Converts a temporary Redis hold into a permanent MongoDB booking.
     */
    router.post('/book', async(req, res)=>{
        const { seatId, userId } = req.body;

        try{
            // Step 1: Security Check. Verify this specific user actually holds the Redis lock.
            const currentLockOwner = await redisClient.get(`hold:seat:${seatId}`);

            if(!currentLockOwner){
                return res.status(400).json({error: 'Checkout expired. You must lock the seat first.'});
            }

            if(currentLockOwner != userId){
                return res.status(403).json({error: 'The seat is locked by another user.'});
            }

            // Step 2: Update the permanent MongoDB record to lock it down forever
            const updatedSeat = await Seat.findOneAndUpdate(
                {seatId: seatId},
                {
                    status: 'BOOKED',
                    bookedBy: userId,
                    bookedAt: new Date()
                },
                {new: true}
            );

            // Step 3: Clean up cache. Delete both the main lock and the reverse lookup from Redis.
            await redisClient.del(`hold:seat:${seatId}`);
            await redisClient.del(`active_user_hold:${userId}`); 

            // Step 4: Broadcast the final state change
            io.emit('seatUpdated', { seatId, status: 'BOOKED' });
            res.status(200).json({message: 'Seat permanently booked!', seat:updatedSeat});
            
        } catch(error){
            console.error('Error booking seat:', error);
            res.status(500).json({error: 'Server error while booking seat'});
        }
    });

    /**
     * @route   POST /api/seats/unlock
     * @desc    Voluntarily releases a temporary Redis hold back into the pool.
     */
    router.post('/unlock', async (req, res) => {
        const { seatId, userId } = req.body;

        try {
            // Step 1: Check who owns the lock
            const currentLockOwner = await redisClient.get(`hold:seat:${seatId}`);
            
            // If there's no lock, or someone else owns it, reject the request securely
            if (!currentLockOwner || currentLockOwner !== userId) {
                return res.status(400).json({ error: 'Cannot unlock this seat.' });
            }

            // Step 2: Delete both Redis locks early
            await redisClient.del(`hold:seat:${seatId}`);
            await redisClient.del(`active_user_hold:${userId}`); 
            
            // Step 3: Tell all clients the seat is green again
            io.emit('seatUpdated', { seatId, status: 'AVAILABLE' });
            res.status(200).json({ message: 'Seat unlocked successfully', seatId });

        } catch (error) {
            console.error('Error unlocking seat:', error);
            res.status(500).json({ error: 'Server error while unlocking seat' });
        }
    });

    /**
     * @route   POST /api/seats/unbook
     * @desc    Releases a permanently purchased ticket back to the public pool.
     */
    router.post('/unbook', async (req, res) => {
        const { seatId, userId } = req.body;

        try {
            // 1. Find the seat in MongoDB
            const seat = await Seat.findOne({ seatId });
            
            // Security Check: Verify ownership. 
            // Note: We cast both to Strings to avoid Mongoose ObjectId strict-equality mismatch bugs.
            if (!seat || seat.status !== 'BOOKED' || String(seat.bookedBy) !== String(userId)) {
                return res.status(400).json({ error: 'Cannot release this seat. You may not own it.' });
            }

            // 2. Strip the user data and reset the MongoDB record
            await Seat.findOneAndUpdate(
                { seatId: seatId },
                { status: 'AVAILABLE', bookedBy: null, bookedAt: null },
                { new: true }
            );

            // 3. Broadcast to everyone that the seat is green again
            io.emit('seatUpdated', { seatId, status: 'AVAILABLE' });
            res.status(200).json({ message: 'Seat released successfully', seatId });
            
        } catch (error) {
            console.error('Error releasing booked seat:', error);
            res.status(500).json({ error: 'Server error while releasing seat' });
        }
    });

    return router;
}