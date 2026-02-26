/**
 * Seed script: Populate MongoDB from data/challenges.json
 * Run with: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Challenge = require('./models/Challenge');
const TestCase = require('./models/TestCase');
const challengeData = require('./data/challenges.json');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/among-bugs';

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('[Seed] Connected to MongoDB');

        // Clear existing data
        await Challenge.deleteMany({});
        await TestCase.deleteMany({});
        console.log('[Seed] Cleared existing challenges and test cases');

        for (const ch of challengeData) {
            const challenge = await Challenge.create({
                title: ch.title,
                description: ch.description,
                starterCode: ch.starting_code,
                difficulty: ch.time_limit <= 300 ? 'medium' : 'hard',
                language: ch.language,
            });

            for (const tc of ch.test_cases) {
                await TestCase.create({
                    challengeId: challenge._id,
                    input: tc.input_data,
                    expectedOutput: tc.expected_output,
                    isHidden: tc.is_hidden,
                });
            }

            console.log(`[Seed] ✔ "${ch.title}" — ${ch.test_cases.length} test cases`);
        }

        console.log(`\n[Seed] Done! Seeded ${challengeData.length} challenges.`);
        process.exit(0);
    } catch (err) {
        console.error('[Seed] Error:', err.message);
        process.exit(1);
    }
}

seed();
