const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// session
app.use(session({
    secret: process.env.SESSION_SECRET || 'password',
    resave: false,
    saveUninitialized: false, // avoid storing empty session
    cookie: { maxAge: 86400000 }, // expiration time: 1 day
    name: ''
  }));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
  });

// Export the app instead of listening here
module.exports = app;