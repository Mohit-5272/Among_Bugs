const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'among-bugs-secret-2026';

// ─── SIGNUP ─────────────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        const { username, password, dob, codeforcesId, leetcodeId, codechefId } = req.body;

        if (!username || !password || !dob) {
            return res.status(400).json({ error: 'Username, password, and date of birth are required' });
        }

        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        const user = await User.create({
            username,
            password,
            dob: new Date(dob),
            codeforcesId: codeforcesId || '',
            leetcodeId: leetcodeId || '',
            codechefId: codechefId || '',
        });

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                dob: user.dob,
                codeforcesId: user.codeforcesId || '',
                leetcodeId: user.leetcodeId || '',
                codechefId: user.codechefId || '',
                gamesPlayed: user.gamesPlayed,
                civilianWins: user.civilianWins,
                impostorWins: user.impostorWins,
                highestLevel: user.highestLevel,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── LOGIN ──────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                dob: user.dob,
                codeforcesId: user.codeforcesId || '',
                leetcodeId: user.leetcodeId || '',
                codechefId: user.codechefId || '',
                gamesPlayed: user.gamesPlayed,
                civilianWins: user.civilianWins,
                impostorWins: user.impostorWins,
                highestLevel: user.highestLevel,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET USER STATS ─────────────────────────────────
router.get('/stats/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            username: user.username,
            gamesPlayed: user.gamesPlayed,
            wins: user.wins,
            losses: user.losses,
            civilianWins: user.civilianWins,
            impostorWins: user.impostorWins,
            highestLevel: user.highestLevel,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
