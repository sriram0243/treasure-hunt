const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER'], required: true },
  team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
