require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { registerSocketHandlers } = require('./game/SocketHandlers');

const app = express();
const server = http.createServer(app);

// ─── MIDDLEWARE ──────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── RATE LIMITERS ──────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false },
});

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'Too many accounts created from this IP. Please try again after an hour.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false },
});

// ─── SOCKET.IO ──────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

registerSocketHandlers(io);

// ─── REST API ROUTES ────────────────────────────────
const Challenge = require('./models/Challenge');
const TestCase = require('./models/TestCase');
const authRoutes = require('./routes/auth');

// Apply rate limiters to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Get a random challenge (used when a game room starts)
app.get('/api/challenges/random', async (req, res) => {
    try {
        const count = await Challenge.countDocuments();
        const randomIndex = Math.floor(Math.random() * count);
        const challenge = await Challenge.findOne().skip(randomIndex);
        if (!challenge) return res.status(404).json({ error: 'No challenges found' });

        const testCases = await TestCase.find({ challengeId: challenge._id });
        res.json({
            _id: challenge._id,
            title: challenge.title,
            description: challenge.description,
            starterCode: challenge.starterCode,
            difficulty: challenge.difficulty,
            testCases: testCases.map(tc => ({
                input: tc.input,
                expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
                isHidden: tc.isHidden,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all challenge titles (for listing)
app.get('/api/challenges', async (req, res) => {
    try {
        const challenges = await Challenge.find({}, 'title description difficulty');
        res.json(challenges);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GEMINI AI (Dynamic DSA Question Generation) ────
const { generateDynamicChallenge, FALLBACK_CHALLENGE } = require('./services/geminiService');

app.get('/api/challenges/generate', async (req, res) => {
    try {
        const challenge = await generateDynamicChallenge();
        res.json(challenge);
    } catch (err) {
        console.error('[Gemini Route Error]:', err);
        res.json(FALLBACK_CHALLENGE);
    }
});

// ─── WANDBOX API (Free Code Execution) ──────────────
const WANDBOX_API_URL = 'https://wandbox.org/api/compile.json';
console.log('[Wandbox] Real C++ code execution enabled (free, no API key)');

// Simple rate limiting for Wandbox (prevent overwhelming the free service)
let wandboxRequestQueue = [];
let wandboxProcessing = false;
const WANDBOX_DELAY_MS = 500; // 500ms between requests

async function queueWandboxRequest(fn) {
    return new Promise((resolve, reject) => {
        wandboxRequestQueue.push({ fn, resolve, reject });
        processWandboxQueue();
    });
}

async function processWandboxQueue() {
    if (wandboxProcessing || wandboxRequestQueue.length === 0) return;
    
    wandboxProcessing = true;
    const { fn, resolve, reject } = wandboxRequestQueue.shift();
    
    try {
        const result = await fn();
        resolve(result);
    } catch (err) {
        reject(err);
    }
    
    // Wait before processing next request
    setTimeout(() => {
        wandboxProcessing = false;
        processWandboxQueue();
    }, WANDBOX_DELAY_MS);
}

/**
 * Execute C++ code against a single test case via Wandbox API
 * Returns { passed, status, stdout, stderr, expected }
 * Includes retry logic for better reliability
 */
async function executeCode(sourceCode, stdin, expectedOutput) {
    const MAX_RETRIES = 2;
    let lastError = null;

    // Use queue to rate-limit requests
    return queueWandboxRequest(async () => {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await fetch(WANDBOX_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: sourceCode,
                        compiler: 'gcc-head',
                        options: '',
                        stdin: stdin,
                    }),
                    signal: AbortSignal.timeout(15000),
                });

                if (!response.ok) {
                    throw new Error(`Wandbox returned ${response.status}`);
                }

                const data = await response.json();

                // Wandbox returns:
                //   status: "0" (success) or non-zero
                //   program_output: stdout from the program
                //   compiler_error: compilation errors if any
                //   program_error: runtime stderr
                const compileError = data.compiler_error || '';
                const stdout = (data.program_output || '').trim();
                const stderr = data.program_error || '';
                const exitStatus = data.status;

                let status;
                let passed = false;

                if (compileError) {
                    status = 'Compile Error';
                } else if (exitStatus !== '0' && exitStatus !== 0) {
                    status = 'Runtime Error';
                } else if (stdout === expectedOutput.trim()) {
                    status = 'Accepted';
                    passed = true;
                } else {
                    status = 'Wrong Answer';
                }

                return {
                    passed,
                    status,
                    stdout,
                    stderr: compileError || stderr,
                    expected: expectedOutput,
                };
            } catch (err) {
                lastError = err;
                console.log(`[Wandbox] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${err.message}`);
                
                // Wait before retry (exponential backoff)
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        // All retries failed
        throw new Error(`Wandbox unavailable after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
    });
}

// ─── RUN CODE ENDPOINT ──────────────────────────────
app.post('/api/run-code', async (req, res) => {
    try {
        const { challengeId, code, testCases: dynamicTestCases } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Missing code' });
        }

        let testCasesToRun = [];

        // If client sends dynamic test cases (from Gemini), run those directly
        if (dynamicTestCases && Array.isArray(dynamicTestCases)) {
            testCasesToRun = dynamicTestCases.map(tc => ({
                input: tc.input || '',
                expectedOutput: tc.expected || tc.expectedOutput || '',
                isHidden: tc.hidden || tc.isHidden || false
            }));
        }
        // Otherwise try to find the static challenge in MongoDB
        else if (challengeId && !challengeId.startsWith('dynamic_')) {
            const challenge = await Challenge.findById(challengeId);
            if (!challenge) {
                return res.status(404).json({ error: 'Challenge not found' });
            }
            testCasesToRun = await TestCase.find({ challengeId });
        } else {
            return res.status(400).json({ error: 'Missing challengeId or testCases' });
        }

        const results = [];
        let allPassed = true;

        for (let i = 0; i < testCasesToRun.length; i++) {
            const tc = testCasesToRun[i];
            try {
                const result = await executeCode(code, tc.input, tc.expectedOutput);
                results.push({
                    testCase: i + 1,
                    passed: result.passed,
                    status: result.status,
                    isHidden: tc.isHidden,
                    input: tc.isHidden ? '[HIDDEN]' : tc.input,
                    expected: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
                    got: tc.isHidden
                        ? '[HIDDEN]'
                        : (result.stdout || result.stderr || 'No output'),
                });
                if (!result.passed) allPassed = false;
            } catch (execErr) {
                results.push({
                    testCase: i + 1,
                    passed: false,
                    status: 'Execution Error',
                    isHidden: tc.isHidden,
                    input: tc.isHidden ? '[HIDDEN]' : tc.input,
                    expected: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
                    got: 'Wandbox service unavailable — try again',
                });
                allPassed = false;
            }
        }

        res.json({
            passed: allPassed,
            totalTests: testCasesToRun.length,
            passedCount: results.filter(r => r.passed).length,
            results,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── MONGODB CONNECTION ─────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/among-bugs';

mongoose
    .connect(MONGO_URI)
    .then(() => console.log('[MongoDB] Connected successfully'))
    .catch((err) => console.error('[MongoDB] Connection error:', err.message));

// ─── START SERVER ───────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Server] Express + Socket.io running on port ${PORT}`);
    console.log(`[Server] Yjs y-websocket should be running separately on port ${process.env.YJS_PORT || 4444}`);
});
