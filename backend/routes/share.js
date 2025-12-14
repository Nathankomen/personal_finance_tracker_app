const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// ================== ENV ==================
const SECRET_KEY = process.env.JWT_SECRET;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

if (!SECRET_KEY) {
    throw new Error('JWT_SECRET is not set in environment variables');
}
if (!GMAIL_USER || !GMAIL_PASS) {
    throw new Error('GMAIL_USER or GMAIL_PASS is not set in environment variables');
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

// ================== SEND EMAIL ==================
router.post('/send', authenticateToken, async (req, res) => {
    const { email, pdfBase64 } = req.body;

    if (!email || !pdfBase64) {
        return res.status(400).json({ error: 'Email and PDF data are required' });
    }

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_PASS
        }
    });

    try {
        const base64Content = pdfBase64.includes('base64,')
            ? pdfBase64.split('base64,')[1]
            : pdfBase64;

        await transporter.sendMail({
            from: `"Finance Tracker" <${GMAIL_USER}>`,
            to: email,
            subject: 'Your Finance Tracker Summary',
            text: 'Attached is your finance summary.',
            attachments: [
                {
                    filename: 'FinanceSummary.pdf',
                    content: base64Content,
                    encoding: 'base64'
                }
            ]
        });

        res.json({
            success: true,
            message: 'Email sent successfully'
        });

    } catch (err) {
        console.error('Email error:', err);
        res.status(500).json({
            error: 'Failed to send email'
        });
    }
});

module.exports = router;
