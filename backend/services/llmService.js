const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// ─── GROQ (Primary) ─────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY;
let groqClient = null;

if (GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
    console.log('[Groq] Fallback DSA question generation enabled (llama-3.3-70b-versatile)');
} else {
    console.log('[Groq] No API key found — will try Gemini fallback');
}

// ─── GEMINI (Fallback) ──────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let geminiModel = null;

if (GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: "You are a fast JSON API. Generate simple, short LeetCode 'easy' C++ questions. Write minimal code. Prioritize speed. Return ONLY valid JSON."
    });
    console.log('[Gemini] \u26A1 Primary DSA question generation enabled (gemini-2.5-flash) [Fast Mode]');
} else {
    console.log('[Gemini] No API key found \u2014 will use hardcoded fallback only');
}

// ─── FALLBACK CHALLENGE ─────────────────────────────
const FALLBACK_CHALLENGE = {
    title: 'Sum of Array',
    difficulty: 'easy',
    description: 'Given an array of N integers, compute and print the sum of all elements.\n\nInput: Line 1 — integer N. Line 2 — N space-separated integers.\nOutput: A single integer representing the sum.',
    starterCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    for (int i = 0; i <= n; i++) {  // BUG: Off-by-one error. Loop goes out of bounds → Fix: change <= to <\n        cin >> arr[i];\n    }\n\n    int sum = 1; // BUG: Wrong initial value. Sum starts at 1 instead of 0 → Fix: change 1 to 0\n    for (int i = 1; i < n; i++) { // BUG: Skips first element. Loop starts at 1 → Fix: change i = 1 to i = 0\n        sum += arr[i];\n    }\n\n    cout << sum << endl;\n    return 0;\n}`,
    referenceCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    for (int i = 0; i < n; i++) {\n        cin >> arr[i];\n    }\n\n    int sum = 0;\n    for (int i = 0; i < n; i++) {\n        sum += arr[i];\n    }\n\n    cout << sum << endl;\n    return 0;\n}`,
    testCases: [
        { input: '5\n1 2 3 4 5', expected: '15', hidden: false },
        { input: '3\n10 20 30', expected: '60', hidden: false },
        { input: '1\n42', expected: '42', hidden: true },
    ],
};

// ─── PROMPT ─────────────────────────────────────────
const DSA_PROMPT = `Generate a RANDOM simple C++ coding problem. Be concise.

RULES:
- Topics: arrays, strings. Difficulty: "easy".
- Use cin/cout. Keep code SHORT (under 30 lines).
- starterCode: exactly 3 bugs with comments like: // BUG: [type]. [what's wrong] → Fix: [fix]
- referenceCode: EXACT COPY of starterCode with ONLY the 3 bug lines fixed. Same algorithm, same variables, same structure. Just fix the bugs and remove BUG comments.
- Generate exactly 3 test cases: first 2 visible (hidden: false), last 1 hidden (hidden: true).
- Keep input/output simple — single integers or small arrays.

Return ONLY valid JSON:
{"title":"string","difficulty":"easy","description":"string","starterCode":"string","referenceCode":"string","testCases":[{"input":"string","expected":"string","hidden":false}]}`;

// ─── WANDBOX PRE-COMPUTATION ────────────────────────
/**
 * Run the reference solution against each test case on Wandbox
 * and overwrite the expected output with the real compiler output.
 * Falls back to the LLM's guessed outputs if Wandbox fails.
 */
async function precomputeTestCases(referenceCode, testCases) {
    const startTime = Date.now();
    console.log(`[Wandbox] Pre-computing ${testCases.length} test cases with reference solution...`);
    console.log(`[Wandbox] Reference code preview (first 200 chars):\n${referenceCode.substring(0, 200)}`);

    // Run test cases concurrently to drastically reduce waiting time
    const promises = testCases.map(async (tc, i) => {
        try {
            const response = await axios.post(
                'https://wandbox.org/api/compile.json',
                {
                    code: referenceCode,
                    compiler: 'gcc-head',
                    options: '',
                    stdin: tc.input,
                },
                { timeout: 15000 }
            );

            const data = response.data;
            const compileError = data.compiler_error || '';
            const stdout = (data.program_output || '').trim();
            const exitStatus = data.status;

            if (compileError) {
                if (i === 0) console.warn(`[Wandbox] Reference code compile error:\n${compileError.substring(0, 500)}`);
                return null;
            } else if (exitStatus !== '0' && exitStatus !== 0) {
                console.warn(`[Wandbox] TC${i + 1}: Runtime error (exit ${exitStatus})`);
                return null;
            } else {
                return stdout;
            }
        } catch (err) {
            console.warn(`[Wandbox] TC${i + 1}: API error — ${err.message}`);
            return null;
        }
    });

    const executionResults = await Promise.allSettled(promises);
    
    let overwritten = 0;
    executionResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value !== null) {
            const stdout = result.value;
            const oldExpected = testCases[i].expected;
            testCases[i].expected = stdout;
            if (oldExpected !== stdout) {
                console.log(`[Wandbox] TC${i + 1}: Corrected "${oldExpected.substring(0,20)}" → "${stdout.substring(0,20)}"`);
            }
            overwritten++;
        }
    });

    const elapsed = Date.now() - startTime;
    console.log(`[Wandbox] Pre-computation done: ${overwritten}/${testCases.length} outputs verified in ${elapsed}ms`);

    return testCases;
}

// ─── GROQ GENERATION ────────────────────────────────
async function generateWithGroq() {
    const startTime = Date.now();
    const chatCompletion = await groqClient.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: 'You are a JSON-only competitive programming question generator. You must respond with ONLY valid JSON, no markdown fences or extra text.',
            },
            {
                role: 'user',
                content: DSA_PROMPT,
            },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.9,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
    });

    const text = chatCompletion.choices[0]?.message?.content || '';
    const challenge = JSON.parse(text);
    const elapsed = Date.now() - startTime;

    // Validate
    if (!challenge.title || !challenge.starterCode || !challenge.testCases || challenge.testCases.length < 3) {
        throw new Error('Invalid response structure from Groq');
    }
    if (!challenge.difficulty) challenge.difficulty = 'easy';

    console.log(`[Groq] ⚡ Generated: "${challenge.title}" (${challenge.difficulty}) in ${elapsed}ms`);
    return challenge;
}

// ─── GEMINI GENERATION (Fallback) ───────────────────
async function generateWithGemini() {
    const startTime = Date.now();
    const result = await geminiModel.generateContent(DSA_PROMPT);
    const text = result.response.text();
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    // Custom parsing to handle unescaped newlines inside JSON strings if they occur
    let challenge;
    try {
        challenge = JSON.parse(cleaned);
    } catch (e) {
        console.warn('[Gemini] Strict JSON parse failed, trying relaxed parse...');
        // Relaxed parsing strategy: wrap the code blocks properly if needed
        challenge = eval(`(${cleaned})`); 
    }
    
    const elapsed = Date.now() - startTime;

    if (!challenge.title || !challenge.starterCode || !challenge.testCases || challenge.testCases.length < 3) {
        throw new Error('Invalid response structure from Gemini');
    }
    if (!challenge.difficulty) challenge.difficulty = 'easy';

    console.log(`[Gemini] Generated: "${challenge.title}" (${challenge.difficulty}) in ${elapsed}ms`);
    return challenge;
}

// ─── MAIN: Gemini → Groq → Fallback → Pre-compute ──
async function generateDynamicChallenge() {
    let challenge = null;

    // Try Gemini first (best quality)
    if (geminiModel) {
        const MAX_RETRIES = 2;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                challenge = await generateWithGemini();
                break;
            } catch (err) {
                const msg = err.message || '';
                const retryMatch = msg.match(/retry\s+in\s+([\d.]+)s/i);
                if (retryMatch && attempt < MAX_RETRIES) {
                    const waitSec = Math.min(parseFloat(retryMatch[1]) + 1, 30);
                    console.log(`[Gemini] Rate limited, retrying in ${waitSec}s (attempt ${attempt}/${MAX_RETRIES})`);
                    await new Promise(r => setTimeout(r, waitSec * 1000));
                } else {
                    console.warn(`[Gemini] Failed: ${msg.substring(0, 150)}`);
                    console.log('[Gemini] Falling back to Groq...');
                }
            }
        }
    }

    // Try Groq as fallback
    if (!challenge && groqClient) {
        try {
            challenge = await generateWithGroq();
        } catch (err) {
            console.warn(`[Groq] Failed: ${err.message.substring(0, 150)}`);
        }
    }

    // Final fallback
    if (!challenge) {
        console.log('[Fallback] Using hardcoded challenge');
        challenge = { ...FALLBACK_CHALLENGE, testCases: FALLBACK_CHALLENGE.testCases.map(tc => ({ ...tc })) };
    }

    // ─── PRE-COMPUTE expected outputs via Wandbox ────
    const refCode = challenge.referenceCode;
    if (refCode) {
        try {
            challenge.testCases = await precomputeTestCases(refCode, challenge.testCases);
        } catch (err) {
            console.warn(`[Wandbox] Pre-computation failed, using LLM outputs: ${err.message}`);
        }
    } else {
        console.warn('[Wandbox] No referenceCode provided by LLM — using LLM-guessed expected outputs');
    }

    return challenge;
}

module.exports = {
    generateDynamicChallenge,
    FALLBACK_CHALLENGE,
};
