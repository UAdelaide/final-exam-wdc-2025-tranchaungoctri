const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user (simple signup)
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO Users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

// POST log in
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query(`
      SELECT user_id, username, role FROM Users
      WHERE username = ? AND password_hash = ?
    `, [username, password]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Unknown username or password' });
    }

    // Save user info in session after login
    req.session.user = {
      id: rows[0].user_id,
      username: rows[0].username,
      role: rows[0].role
    };

    res.json({ user: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST log out (ends session and erases cookie, return to login form)
router.post('/logout', (req, res) => {
  // End session
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    // Clear cookie data
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ message: 'Logged out successfully' });
  });
});

// GET dog by owner
router.get('/dogs/mine', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const ownerId = req.session.user.id;

  try {
    const [rows] = await db.query('SELECT dog_id, name FROM Dogs WHERE owner_id = ?', [ownerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch dogs' });
  }
});

// GET all dogs with random photo (in index.html)
async function loadDogs() {
  try {
    const res = await fetch('/api/users/dogs');
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to load dogs');
    }
    const dogsData = await res.json();

    // Fetch random images for all dogs
    const dogsWithImages = await Promise.all(
      dogsData.map(async (dog) => {
        try {
          const imgRes = await fetch('https://dog.ceo/api/breeds/image/random');
          if (!imgRes.ok) throw new Error('Failed to fetch dog image');
          const imgData = await imgRes.json();
          return { ...dog, image: imgData.message }; // message contains the image URL
        } catch {
          return { ...dog, image: 'https://via.placeholder.com/100x80?text=No+Image' };
        }
      })
    );

    dogs.value = dogsWithImages;
  } catch (err) {
    error.value = err.message;
  }
}

module.exports = router;