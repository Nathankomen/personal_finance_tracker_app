const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',        // MySQL username
    password: '',        // MySQL password
    database: 'finance_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    port: 3307,
    queueLimit: 0
});

module.exports = db;
