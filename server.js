const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./config/database');
const authRoutes = require('./routes/auth');
const incomeRoutes = require('./routes/income');
const expensesRoutes = require('./routes/expenses');

const app = express();
const port = process.env.PORT || 8080;

// CORS configuration for deployment
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'https://fintrack-app.onrender.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // Enable in production
        sameSite: 'none', // Required for cross-origin cookies
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    proxy: true // Required when running behind a proxy
}));

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
    res.status(500).json({ 
        success: false, 
        error: 'Internal Server Error' 
    });
});

initDB().catch(console.error);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});