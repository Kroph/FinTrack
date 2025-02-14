const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { pool, initDB } = require('./config/database');
const authRoutes = require('./routes/auth');
const incomeRoutes = require('./routes/income');
const expensesRoutes = require('./routes/expenses');

const app = express();
const port = process.env.PORT || 10000;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Production security headers
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        next();
    });
}

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://localhost:10000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'user_sessions'
    }),
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

// Routes
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.use('/api/auth', authRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expensesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === '57P01') {
        return res.status(503).json({
            success: false,
            error: 'Database connection failed'
        });
    }
    
    // Session errors
    if (err.name === 'SessionError') {
        return res.status(401).json({
            success: false,
            error: 'Session expired'
        });
    }
    
    // Generic error response
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message
    });
});

async function startServer() {
    try {
        console.log('Attempting to initialize database');
        await initDB();
        console.log('Database initialized successfully');

        app.listen(port, '0.0.0.0', () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();