const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); 

/**
 * User Routes Module
 * Handles user authentication with bcrypt password hashing and session management.
 */
const router = express.Router();

/**
 * @route   POST /api/users/
 * @desc    Registers a new user into the database with hashed password.
 * @logic   Requires unique email, unique username, and a password (min 6 characters).
 */
router.post('/', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedUsername = username.trim();

        // 1. Uniqueness Check (Email)
        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            return res.status(409).json({ error: 'Email already exists. Please log in instead.' });
        }

        // 2. Hash the password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create the new user document
        user = new User({ 
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword
        });
        
        // 4. Save to MongoDB
        await user.save();

        // 5. Return sanitized user payload (exclude password)
        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
        
    } catch (error) {
        console.error('Error handling user registration:', error);
        
        // Uniqueness Check (Username)
        if (error.code === 11000) {
            return res.status(409).json({ error: 'That username is already taken. Please choose another.' });
        }
        
        res.status(500).json({ error: 'Server error handling user registration' });
    }
});

/**
 * @route   POST /api/users/login
 * @desc    Authenticates a user via email and password.
 * @logic   Verifies the email exists and compares password hash via bcrypt.
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Look up user by email
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({ error: 'No account registered with this email address' });
        }

        // 2. Check if account has a password set (guards against legacy seeded data)
        if (!user.password) {
            return res.status(400).json({ error: 'Account has no password set. Please create a new account.' });
        }

        // 3. Compare password hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect password. Please check your credentials and try again.' });
        }

        // 4. Return sanitized user data (exclude password)
        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
        
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;
