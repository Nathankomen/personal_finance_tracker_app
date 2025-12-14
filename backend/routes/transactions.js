const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// ================== ENV ==================
const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
    throw new Error('JWT_SECRET is not set in environment variables');
}

// ================== AUTH MIDDLEWARE ==================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied' });
    }

    // Supports: "Bearer TOKEN" or just "TOKEN"
    const token = authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : authHeader;

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.userId = decoded.userId;
        next();
    });
}

// ================== GET ALL TRANSACTIONS ==================
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT * 
             FROM transactions 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ================== ADD TRANSACTION ==================
router.post('/', authenticateToken, async (req, res) => {
    const { description, amount, type, category } = req.body;

    if (!description || !amount || !type || !category) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const [result] = await db.execute(
            `INSERT INTO transactions 
             (user_id, description, amount, type, category) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                req.userId,
                description,
                amount,
                type.toLowerCase(),
                category
            ]
        );

        res.json({
            success: true,
            transactionId: result.insertId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add transaction' });
    }
});

// ================== DELETE TRANSACTION ==================
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        await db.execute(
            'DELETE FROM transactions WHERE id = ? AND user_id = ?',
            [id, req.userId]
        );

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

// ================== SUMMARY (MONTHLY / YEARLY) ==================
router.get('/summary', authenticateToken, async (req, res) => {
    const { period } = req.query;
    let query;

    if (period === 'monthly') {
        query = `
            SELECT 
                MONTH(created_at) AS month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
            FROM transactions
            WHERE user_id = ?
            GROUP BY MONTH(created_at)
            ORDER BY MONTH(created_at)
        `;
    } else if (period === 'yearly') {
        query = `
            SELECT 
                YEAR(created_at) AS year,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
            FROM transactions
            WHERE user_id = ?
            GROUP BY YEAR(created_at)
            ORDER BY YEAR(created_at)
        `;
    } else {
        return res.status(400).json({
            error: 'Invalid period. Use "monthly" or "yearly".'
        });
    }

    try {
        const [rows] = await db.execute(query, [req.userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load summary' });
    }
});

module.exports = router;
