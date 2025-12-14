    const mysql = require('mysql2/promise');
    require('dotenv').config();

    async function testDb() {
    const db = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const [rows] = await db.query('SELECT NOW() AS now');
        console.log('DB connected:', rows);
    } catch (err) {
        console.error('DB connection error:', err);
    }
    }

    testDb();
