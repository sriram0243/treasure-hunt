const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  team_name: { type: String, required: true, unique: true },
  leader_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  member_count: { type: Number, default: 5 },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
  stage_order: [{
    position: { type: Number, required: true },
    stage_number: { type: Number, required: true }
  }],
  completed_stages: [{
    position: { type: Number, required: true },
    stage_number: { type: Number, required: true },
    qr_token: { type: String },
    completed_at: { type: Date, default: Date.now }
  }],
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', teamSchema);
