const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEFAULT_TOKENS = [
  'TH_STAGE1_MARK_9F8A3C12E45B67890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
  'TH_STAGE2_MARK_7E6D5C4B3A219876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876',
  'TH_STAGE3_MARK_1A2B3C4D5E6F7890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
  'TH_STAGE4_MARK_9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA',
  'TH_STAGE5_MARK_A1B2C3D4E5F67890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
  'TH_STAGE6_MARK_F0E9D8C7B6A543210987654321FEDCBA0987654321FEDCBA0987654321FEDCBA',
  'TH_STAGE7_MARK_TREASURE_UNLOCKED_FINAL_MARK_99887766554433221100AABBCCDDEEFF'
];

const DEFAULT_STAGES = [
  {
    stage_number: 1,
    title: "THE FIRST MARK",
    mission_description: "Your journey begins here. Locate the hidden mark in the central courtyard where knowledge sleeps.",
    clue_text: "The place where knowledge sleeps, and countless stories wait to be discovered. Search near the main library entrance."
  },
  {
    stage_number: 2,
    title: "CROSSROADS OF DESTINY",
    mission_description: "Seek the place where paths cross and students gather between hours.",
    clue_text: "Look where footsteps cross but nobody stays long — near the central clock tower quadrangle."
  },
  {
    stage_number: 3,
    title: "THE FORGE OF INNOVATION",
    mission_description: "Find the sanctuary of creation where ideas transform into reality.",
    clue_text: "Find the place where ideas become action — near the Engineering Laboratory building main foyer."
  },
  {
    stage_number: 4,
    title: "GATEWAY OF ORIGINS",
    mission_description: "Return to where every campus adventure begins.",
    clue_text: "Your next mark waits where many daily journeys begin — check near the North Gate administrative reception."
  },
  {
    stage_number: 5,
    title: "THE SENTINEL OVERLOOK",
    mission_description: "Ascend toward the high vantage point that watches over the green fields.",
    clue_text: "Seek the place that watches over the campus grounds — the amphitheater top balcony staircase."
  },
  {
    stage_number: 6,
    title: "THE FINAL THRESHOLD",
    mission_description: "One last sanctuary remains before the legendary treasure.",
    clue_text: "One final path remains before the treasure — search near the student sports complex trophy wall."
  },
  {
    stage_number: 7,
    title: "THE TREASURE SANCTUARY",
    mission_description: "The final mark is within reach! Scan to claim victory!",
    clue_text: "The treasure is here! You have proven your skill, endurance, and sharpness. Claim your glory!"
  }
];

const Stage = require('../models/Stage');
const User = require('../models/User');
const Hunt = require('../models/Hunt');
const AppSettings = require('../models/AppSettings');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/treasure_hunt';

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`🍃 Connected to MongoDB database successfully`);
    await autoSeedDB();
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
  }
}

const Question = require('../models/Question');

const DEFAULT_QUESTIONS = [
  {
    question_text: "What cardinal direction does a magnetic compass needle point toward?",
    options: ["South", "North", "East", "West"],
    correct_option_index: 1
  },
  {
    question_text: "How many total stages must a team complete in this Treasure Hunt?",
    options: ["5 Stages", "6 Stages", "7 Stages", "8 Stages"],
    correct_option_index: 2
  },
  {
    question_text: "Which campus location is traditionally known as the sanctuary where knowledge sleeps?",
    options: ["Main Library", "Sports Complex", "Dining Hall", "Auditorium"],
    correct_option_index: 0
  },
  {
    question_text: "What key tool is required to scan physical marks at landmark locations?",
    options: ["NFC Scanner", "QR Code Reader / Camera", "Bluetooth Radar", "Bar Code Wand"],
    correct_option_index: 1
  },
  {
    question_text: "What is the maximum number of wrong attempts allowed on this Stage 7 Quiz before team disqualification?",
    options: ["1 Attempt", "2 Attempts", "3 Attempts", "5 Attempts"],
    correct_option_index: 1
  },
  {
    question_text: "In nautical lore, what color flag is historically associated with pirate treasure ships?",
    options: ["Jolly Roger (Black & Skull)", "Royal Blue", "Crimson Red", "Golden Yellow"],
    correct_option_index: 0
  },
  {
    question_text: "What primary role in the team is authorized to control QR scanning during the hunt?",
    options: ["Any Team Member", "Team Leader Only", "Event Volunteer", "System Admin Only"],
    correct_option_index: 1
  },
  {
    question_text: "What is the ancient unit of measure traditionally used by sailors to measure ocean depth?",
    options: ["Fathom", "League", "Knot", "Cubits"],
    correct_option_index: 0
  },
  {
    question_text: "Which instrument was historically used by maritime explorers to navigate using the stars?",
    options: ["Sextant", "Barometer", "Thermometer", "Altimeter"],
    correct_option_index: 0
  },
  {
    question_text: "What awaits the winning team at the final destination upon unlocking Stage 7?",
    options: ["The Golden Treasure Chest", "A Silver Key", "A Wooden Scroll", "A Bronze Trophy"],
    correct_option_index: 0
  }
];

async function autoSeedDB() {
  try {
    // 1. Seed Stages
    for (let i = 0; i < DEFAULT_STAGES.length; i++) {
      const stg = DEFAULT_STAGES[i];
      const token = DEFAULT_TOKENS[i];
      await Stage.findOneAndUpdate(
        { stage_number: stg.stage_number },
        {
          stage_number: stg.stage_number,
          title: stg.title,
          mission_description: stg.mission_description,
          clue_text: stg.clue_text,
          qr_token: token
        },
        { upsert: true, new: true }
      );
    }

    // 2. Seed Admin User
    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    if (adminCount === 0) {
      const hash = bcrypt.hashSync('treasure2026', 10);
      await User.create({
        name: 'System Admin',
        username: 'admin',
        password_hash: hash,
        role: 'ADMIN'
      });
      console.log('✓ Seeded Default Admin User (username: admin, pass: treasure2026)');
    }

    // 3. Seed App Settings
    const settingsCount = await AppSettings.countDocuments();
    if (settingsCount === 0) {
      await AppSettings.create({
        min_team_members: 4,
        default_team_members: 5,
        max_team_members: 10,
        max_total_participants: 150
      });
      console.log('✓ Seeded Default App Settings');
    }

    // 4. Seed Global Hunt State
    const huntCount = await Hunt.countDocuments();
    if (huntCount === 0) {
      await Hunt.create({
        status: 'LIVE'
      });
      console.log('✓ Seeded Global Hunt State (LIVE)');
    }

    // 5. Seed Stage 7 Quiz Questions
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      await Question.insertMany(DEFAULT_QUESTIONS);
      console.log('✓ Seeded 10 Default Stage 7 Quiz Questions');
    }
  } catch (err) {
    console.error('Auto seed error:', err.message);
  }
}

connectDB();

module.exports = mongoose.connection;
