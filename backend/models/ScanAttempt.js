const mongoose = require('mongoose');

const scanAttemptSchema = new mongoose.Schema({
  team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team_name: { type: String },
  user_name: { type: String },
  role: { type: String },
  scanned_token: { type: String, required: true },
  is_success: { type: Boolean, default: false },
  stage_number: { type: Number },
  message: { type: String },
  scanned_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScanAttempt', scanAttemptSchema);
