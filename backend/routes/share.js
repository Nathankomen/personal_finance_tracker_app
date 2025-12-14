const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your_secret_key'; // same as auth

function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.userId = decoded.userId;
        next();
    });
}

router.post('/send', authenticateToken, async (req, res) => {
    const { email, pdfBase64 } = req.body;
    if (!email || !pdfBase64) return res.status(400).json({ error: 'Email and PDF data are required' });

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.GMAIL_USER,  // set in .env
            pass: process.env.GMAIL_PASS   // Gmail App Password
        }
    });

    try {
        const base64Content = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;

        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Your Finance Tracker Summary',
            text: 'Attached is your finance summary.',
            attachments: [{
                filename: 'FinanceSummary.pdf',
                content: base64Content,
                encoding: 'base64'
            }]
        });

        res.json({ success: true, message: 'Email sent successfully' });
    } catch (err) {
        console.error('Email error:', err);
        res.status(500).json({ error: 'Failed to send email: ' + err.message });
    }
});

module.exports = router;
