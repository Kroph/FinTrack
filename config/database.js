const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render's PostgreSQL
    }
});

async function initDB() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS income (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                amount NUMERIC(10, 2) NOT NULL,
                description TEXT,
                date DATE NOT NULL DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                amount NUMERIC(10, 2) NOT NULL,
                description TEXT,
                date DATE NOT NULL DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                token VARCHAR(500) NOT NULL,
                device_id VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, device_id)
            );
        `);
    } finally {
        client.release();
    }
}

module.exports = { pool, initDB };