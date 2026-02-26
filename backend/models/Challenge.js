const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    starterCode: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    language: { type: String, default: 'cpp' },
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
