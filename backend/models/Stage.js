const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  stage_number: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  mission_description: { type: String, required: true },
  clue_text: { type: String, required: true },
  qr_token: { type: String, required: true },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Stage', stageSchema);
