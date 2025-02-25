const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? {
        rejectUnauthorized: false
    } : false
};

const pool = new Pool(connectionConfig);

async function connectWithRetry(retries = 5) {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to database');
        client.release();
        return true;
    } catch (err) {
        console.error(`Failed to connect to database. Retries left: ${retries}`);
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            return connectWithRetry(retries - 1);
        }
        throw new Error('Failed to connect to database after multiple retries');
    }
}

async function initDB() {
    console.log('Attempting to connect to the database...');
    await connectWithRetry();
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                verification_code VARCHAR(6),
                verification_code_expires TIMESTAMP,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL,
                description TEXT,
                date DATE NOT NULL DEFAULT CURRENT_DATE,
                type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
                category VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(500) NOT NULL,
                device_id VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, device_id)
            );

            CREATE TABLE IF NOT EXISTS "user_sessions" (
                "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL
            );

            CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire");
        `);

        console.log('Database initialized successfully.');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { pool, initDB };