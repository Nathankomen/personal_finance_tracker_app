// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const SECRET_KEY = 'your_secret_key'; // use process.env.SECRET_KEY in production

// ------------------ Multer config ------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// ------------------ REGISTER ------------------
router.post('/register', upload.single('profile_picture'), async (req, res) => {
    const { name, email, password } = req.body;

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // check if email already exists
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const profilePicture = req.file ? req.file.filename : null;

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, profile_picture) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, profilePicture]
        );

        res.json({
            success: true,
            message: 'Registration successful',
            userId: result.insertId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ------------------ LOGIN ------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (!rows.length) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign(
            { userId: user.id },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            token,
            userId: user.id,
            name: user.name,
            profile_picture: user.profile_picture
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ------------------ GET PROFILE ------------------
router.get('/profile/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const [rows] = await db.execute(
            'SELECT id, name, email, profile_picture FROM users WHERE id = ?',
            [userId]
        );

        if (!rows.length) return res.status(404).json({ error: 'User not found' });

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
