const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TestCase', testCaseSchema);
