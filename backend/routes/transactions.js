const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your_secret_key'; // Use environment variable in production

// --- Middleware: authenticate JWT ---
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.userId = decoded.userId;
        next();
    });
}

// --- Get all transactions ---
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Add transaction ---
router.post('/', authenticateToken, async (req, res) => {
    const { description, amount, type, category } = req.body;
    if (!description || !amount || !type || !category) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const [result] = await db.execute(
            'INSERT INTO transactions (user_id, description, amount, type, category) VALUES (?, ?, ?, ?, ?)',
            [req.userId, description, amount, type.toLowerCase(), category]
        );
        res.json({ success: true, transactionId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Delete transaction ---
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Get monthly/yearly summary ---
router.get('/summary', authenticateToken, async (req, res) => {
    const { period } = req.query;
    let query = '';

    if (period === 'monthly') {
        query = `
            SELECT 
                MONTH(created_at) AS month, 
                SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS total_income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS total_expense
            FROM transactions
            WHERE user_id = ?
            GROUP BY MONTH(created_at)
            ORDER BY MONTH(created_at) ASC
        `;
    } else if (period === 'yearly') {
        query = `
            SELECT 
                YEAR(created_at) AS year, 
                SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS total_income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS total_expense
            FROM transactions
            WHERE user_id = ?
            GROUP BY YEAR(created_at)
            ORDER BY YEAR(created_at) ASC
        `;
    } else {
        return res.status(400).json({ error: 'Invalid period. Use "monthly" or "yearly".' });
    }

    try {
        const [rows] = await db.execute(query, [req.userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
