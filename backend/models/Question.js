const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question_text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correct_option_index: { type: Number, required: true, min: 0, max: 3 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', questionSchema);
