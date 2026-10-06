require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.user = user;
    next();
};


// 1. Sign Up Endpoint
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
        message: 'User registered successfully',
        user: data.user,
    });
});

// 2. Log In Endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(200).json({
        message: 'Login successful',
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: data.user,
    });
});


// Protected Profile Endpoint
app.get('/profile', requireAuth, (req, res) => {
    res.status(200).json({
        message: 'Welcome to your protected profile!',
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            last_sign_in_at: req.user.last_sign_in_at,
        },
    });
});


// 4. Logout Endpoint
app.post('/logout', requireAuth, async (req, res) => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ message: 'Logged out successfully' });
});


// 5. Refresh Token Endpoint
app.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    res.status(200).json({
        message: 'Token refreshed successfully',
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
    });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running and connected to Supabase on port ${PORT}`);
});