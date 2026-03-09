const mysql = require('mysql2');

// Create MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,              // ADD THIS LINE
    user: 'root',
    password: 'root',
    database: 'bookmycampus',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL database');
    connection.release();
});

module.exports = pool.promise();