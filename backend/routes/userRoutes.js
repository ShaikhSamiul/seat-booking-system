const express = require('express');
const User = require('../models/User'); 

/**
 * User Routes Module
 * This file handles user authentication and session management.
 * To reduce friction and get users into the VIP Arena faster, this 
 * implements a simplified, passwordless email/username authentication flow.
 */
const router = express.Router();

/**
 * @route   POST /api/users/
 * @desc    Registers a new user into the database.
 * @logic   Requires both a unique email and a unique username.
 */
router.post('/', async (req, res) => {
    try {
        const { username, email } = req.body;
        
        // Basic validation
        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email are required' });
        }

        // 1. Uniqueness Check (Email)
        // Prevent users from accidentally creating multiple accounts with the same email
        let user = await User.findOne({ email });

        if (user) {
            // Reject the registration and redirect them to the Login flow
            return res.status(409).json({ error: 'Email already exists. Please log in instead.' });
        }

        // 2. Create the new user document
        user = new User({ 
            username: username,
            email: email
        });
        
        // 3. Save to MongoDB
        await user.save();
        res.status(201).json(user);
        
    } catch (error) {
        console.error('Error handling user:', error);
        
        // 4. Uniqueness Check (Username)
        // If the email is new, but the username is already taken, MongoDB will 
        // throw a duplicate key error (code 11000) based on our schema definitions.
        if (error.code === 11000) {
            return res.status(409).json({ error: 'That username is already taken. Please choose another.' });
        }
        
        res.status(500).json({ error: 'Server error handling user registration' });
    }
});

/**
 * @route   POST /api/users/login
 * @desc    Authenticates a returning user using an email-only flow.
 * @logic   Simply verifies the email exists in the database and returns the user payload.
 */
router.post('/login', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // 1. Look up the user by their email index
        const user = await User.findOne({ email });

        // 2. If no matching document is found, reject the login attempt
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please sign up first.' });
        }

        // 3. Success! Return the user data to populate the React frontend state
        res.status(200).json(user);
        
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;