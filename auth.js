const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

// Admin secret key - only known to authorized administrators
const ADMIN_SECRET_KEY = 'admin@123';

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, secretKey } = req.body;

        // Validate fields
        if (!name || !email || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Validate role
        const validRoles = ['admin', 'student', 'faculty'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid role selected' 
            });
        }

        // Validate admin secret key
        if (role === 'admin') {
            if (!secretKey || secretKey !== ADMIN_SECRET_KEY) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid admin secret key. Contact the system administrator.'
                });
            }
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email format' 
            });
        }

        // Check if email already exists
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert user into database
        await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, password_hash, role]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Registration successful' 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration' 
        });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password, secretKey } = req.body;

        // Validate fields
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Find user by email
        const [users] = await db.query(
            'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        const user = users[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Validate admin secret key for admin users
        if (user.role === 'admin') {
            if (!secretKey || secretKey !== ADMIN_SECRET_KEY) {
                return res.status(403).json({
                    success: false,
                    message: 'Admin secret key is required and must be correct to login as admin.'
                });
            }
        }

        // Return user info (excluding password hash)
        res.status(200).json({ 
            success: true, 
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

module.exports = router;
