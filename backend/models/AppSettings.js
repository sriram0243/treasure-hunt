const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  min_team_members: { type: Number, default: 4 },
  default_team_members: { type: Number, default: 5 },
  max_team_members: { type: Number, default: 10 },
  max_total_participants: { type: Number, default: 150 },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AppSettings', appSettingsSchema);
