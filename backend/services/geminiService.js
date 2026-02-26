const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
let geminiModel = null;

if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Use gemini-2.5-flash (Gemini 2.5 Flash stable)
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('[Gemini] Dynamic DSA question generation enabled (gemini-2.5-flash)');
} else {
    console.log('[Gemini] No API key found — will use fallback challenges');
}

// Fallback challenge if Gemini is unavailable
const FALLBACK_CHALLENGE = {
    title: 'Sum of Array',
    difficulty: 'easy',
    description: 'Given an array of N integers, compute and print the sum of all elements.\n\nInput: Line 1 — integer N. Line 2 — N space-separated integers.\nOutput: A single integer representing the sum.',
    starterCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    for (int i = 0; i <= n; i++) {  // BUG 1: should be i < n\n        cin >> arr[i];\n    }\n\n    int sum = 1; // BUG 2: should be 0\n    for (int i = 1; i < n; i++) { // BUG 3: should be i = 0\n        sum += arr[i];\n    }\n\n    cout << sum << endl;\n    return 0;\n}`,
    testCases: [
        { input: '5\n1 2 3 4 5', expected: '15', hidden: false },
        { input: '3\n10 20 30', expected: '60', hidden: false },
        { input: '1\n42', expected: '42', hidden: false },
        { input: '4\n-1 -2 3 4', expected: '4', hidden: true },
        { input: '6\n0 0 0 0 0 0', expected: '0', hidden: true },
        { input: '2\n1000000 2000000', expected: '3000000', hidden: true },
    ],
};

const GEMINI_PROMPT = `You are a competitive programming question generator. Generate a RANDOM C++ coding problem.

RULES:
- Difficulty should be randomly either "easy" or "medium" (LeetCode-style).
- The problem must use standard input/output (cin/cout).
- The starter code MUST contain exactly THREE bugs (e.g., off-by-one errors, wrong operators, wrong initial values). Add a comment marking each one like "// BUG: should be ..."
- Generate exactly 6 test cases: first 3 visible (hidden: false), last 3 hidden (hidden: true).
- Test case expected values must be CORRECT (as if the bugs were fixed).
- DO NOT repeat common problems like "sum of array" or "two sum". Be creative — try problems about strings, sorting, counting, palindromes, matrices, frequency, GCD, prime numbers, binary search, stacks, etc.
- Keep input/output simple — single integers, arrays, or strings.

Return ONLY valid JSON (no markdown, no backticks, no extra text). The JSON schema:
{
  "title": "string",
  "difficulty": "easy" | "medium",
  "description": "string (include Input/Output format clearly)",
  "starterCode": "string (full C++ code with 3 bugs)",
  "testCases": [
    { "input": "string", "expected": "string", "hidden": false }
  ]
}`;

/**
 * Generates a dynamic challenge using Gemini API.
 * Falls back to FALLBACK_CHALLENGE on error or no API key.
 */
async function generateDynamicChallenge() {
    if (!geminiModel) {
        return FALLBACK_CHALLENGE;
    }

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await geminiModel.generateContent(GEMINI_PROMPT);
            const text = result.response.text();

            // Parse the JSON from Gemini's response (strip markdown fences if any)
            const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            const challenge = JSON.parse(cleaned);

            // Validate the response has required fields
            if (!challenge.title || !challenge.starterCode || !challenge.testCases || challenge.testCases.length < 3) {
                console.warn('[Gemini] Invalid response structure, using fallback');
                return FALLBACK_CHALLENGE;
            }

            // Ensure difficulty field exists
            if (!challenge.difficulty) challenge.difficulty = 'easy';

            console.log(`[Gemini] Generated: "${challenge.title}" (${challenge.difficulty})`);
            return challenge;
        } catch (err) {
            const msg = err.message || '';
            // Check if it's a rate limit error and we can retry
            const retryMatch = msg.match(/retry\s+in\s+([\d.]+)s/i);
            if (retryMatch && attempt < MAX_RETRIES) {
                const waitSec = Math.min(parseFloat(retryMatch[1]) + 1, 30);
                console.log(`[Gemini] Rate limited, retrying in ${waitSec}s (attempt ${attempt}/${MAX_RETRIES})`);
                await new Promise(r => setTimeout(r, waitSec * 1000));
            } else {
                console.error('[Gemini] Error generating challenge:', msg.substring(0, 200));
                return FALLBACK_CHALLENGE;
            }
        }
    }
    return FALLBACK_CHALLENGE;
}

module.exports = {
    generateDynamicChallenge,
    FALLBACK_CHALLENGE
};
