const mongoose = require('mongoose');

const huntSchema = new mongoose.Schema({
  status: { type: String, enum: ['LIVE', 'CLOSED'], default: 'LIVE' },
  winner_team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  winner_team_name: { type: String },
  winner_completed_at: { type: Date },
  started_at: { type: Date, default: Date.now },
  ended_at: { type: Date }
});

module.exports = mongoose.model('Hunt', huntSchema);
