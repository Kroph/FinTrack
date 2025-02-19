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

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
    } else {
        console.log('Successfully connected to database');
        release();
    }
});

// Rest of your code remains the same...

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
    } else {
        console.log('Successfully connected to database');
        release();
    }
});

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

async function connectWithRetry(retries = MAX_RETRIES) {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to database');
        client.release();
        return true;
    } catch (err) {
        console.error(`Failed to connect to database. Retries left: ${retries}`);
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
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
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL,
                CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
            );

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                verification_code VARCHAR(6),
                verification_code_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Migration for existing tables
            DO $$ 
            BEGIN 
                -- Drop verification_token if it exists
                IF EXISTS (
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'verification_token'
                ) THEN 
                    ALTER TABLE users DROP COLUMN verification_token;
                END IF;

                -- Add new columns if they don't exist
                BEGIN
                    ALTER TABLE users 
                    ADD COLUMN verification_code VARCHAR(6),
                    ADD COLUMN verification_code_expires TIMESTAMP;
                EXCEPTION
                    WHEN duplicate_column THEN 
                        NULL;
                END;
            END $$;

            -- Rest of your table creation code...
            CREATE TABLE IF NOT EXISTS income (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL,
                description TEXT,
                date DATE NOT NULL DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL,
                description TEXT,
                date DATE NOT NULL DEFAULT CURRENT_DATE,
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
        `);

        console.log('Database initialized successfully.');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function testDatabaseConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Database test query result:', result.rows[0]);
        client.release();
        return true;
    } catch (err) {
        console.error('Database test failed:', err);
        return false;
    }
}

module.exports = { pool, initDB, testDatabaseConnection };