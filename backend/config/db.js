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
    question_text: "🧠 The Forgetful Learner\nI travel backward through many layers.\nWith every step, I become smaller and smaller,\nuntil the earliest layers barely learn anything.\nWhat problem am I?",
    options: ["Overfitting", "Vanishing Gradient", "Data Leakage", "Class Imbalance"],
    correct_option_index: 1
  },
  {
    question_text: "👁️ The Watcher\nI don't read every word equally.\nWhen one word needs another, I decide how strongly they should be connected.\nI am the reason a Transformer can focus on the important parts of a sentence.\nWho am I?",
    options: ["Pooling", "Self-Attention", "Dropout", "Clustering"],
    correct_option_index: 1
  },
  {
    question_text: "🕵️ The Hidden Identity\n“The student dropped the glass because it was slippery.”\nI must discover what “it” represents.\nI don't translate it or tokenize it—I resolve its identity.\nWhat am I?",
    options: ["Stemming", "Coreference Resolution", "Sentiment Analysis", "Tokenization"],
    correct_option_index: 1
  },
  {
    question_text: "🎭 The Perfect Student\nI score almost perfectly on questions I've already seen.\nBut when you give me a new question, I struggle badly.\nI learned the examples rather than the underlying pattern.\nWhat happened to me?",
    options: ["Underfitting", "Overfitting", "Normalization", "Regularization"],
    correct_option_index: 1
  },
  {
    question_text: "⚔️ The Two Rivals\nOne of us creates something that looks real.\nThe other tries to expose the fake.\nWe compete, but our competition makes the creator better.\nWhat are we?",
    options: ["CNN", "GAN", "LSTM", "KNN"],
    correct_option_index: 1
  },
  {
    question_text: "🎯 The Rare Target\nImagine 1000 patients.\n990 are healthy and 10 have a disease.\nAn AI calls everyone healthy and proudly announces 99% accuracy.\nWhat hidden problem does this reveal?",
    options: ["Class Imbalance", "Vanishing Gradient", "Data Augmentation", "Feature Scaling"],
    correct_option_index: 0
  },
  {
    question_text: "👻 The Confident Liar\nI can speak fluently.\nI can sound extremely confident.\nBut sometimes I create facts, people, or events that never existed.\nWhat am I demonstrating?",
    options: ["AI Hallucination", "Transfer Learning", "Underfitting", "Clustering"],
    correct_option_index: 0
  },
  {
    question_text: "🧩 The Memory Keeper\nI have gates but no doors.\nI can decide what information to forget, what to keep, and what to reveal.\nI am especially useful when information arrives as a sequence.\nWho am I?",
    options: ["CNN", "LSTM", "PCA", "SVM"],
    correct_option_index: 1
  },
  {
    question_text: "🔓 The Accidental Cheat\nI was supposed to be tested on questions I had never seen.\nSomehow, information from those questions entered my learning process.\nMy score became suspiciously high.\nWhat went wrong?",
    options: ["Data Leakage", "Dropout", "Underfitting", "Gradient Clipping"],
    correct_option_index: 0
  },
  {
    question_text: "👑 The Shape Shifter — FINAL\nTwo groups cannot be separated by a simple straight line.\nInstead of forcing the line to change, I secretly change the space in which the data is viewed.\nSuddenly, separation becomes possible.\nWhat trick am I using?",
    options: ["Kernel Trick", "Dropout", "Backpropagation", "One-Hot Encoding"],
    correct_option_index: 0
  }
];

async function syncDefaultQuestions() {
  try {
    const existing = await Question.find();
    // Check if DB is empty or still contains old questions
    const isOldSet = existing.length === 0 || existing.some(q => 
      q.question_text.includes("cardinal direction") ||
      q.question_text.includes("magnetic compass") ||
      q.question_text.includes("How many total stages") ||
      q.question_text.includes("sanctuary where knowledge sleeps") ||
      q.question_text.includes("maximum number of wrong attempts") ||
      q.question_text.includes("Jolly Roger")
    );

    if (isOldSet) {
      console.log('🔄 Syncing Stage 7 Quiz Questions: Purging old questions and inserting 10 new AI riddles...');
      await Question.deleteMany({});
      const newQuestions = await Question.insertMany(DEFAULT_QUESTIONS);
      console.log('✓ Successfully synced 10 new Stage 7 AI Riddle questions to MongoDB');
      return newQuestions;
    }
    return existing;
  } catch (err) {
    console.error('Error syncing quiz questions:', err.message);
    return [];
  }
}

async function autoSeedDB() {
  try {
    // 1. Seed Stages ONLY if no stages exist in the database yet
    const stageCount = await Stage.countDocuments();
    if (stageCount === 0) {
      for (let i = 0; i < DEFAULT_STAGES.length; i++) {
        const stg = DEFAULT_STAGES[i];
        const token = DEFAULT_TOKENS[i];
        await Stage.create({
          stage_number: stg.stage_number,
          title: stg.title,
          mission_description: stg.mission_description,
          clue_text: stg.clue_text,
          qr_token: token
        });
      }
      console.log('✓ Seeded 7 Default Stages');
    }

    // 2. Seed / Update Admin User
    const hash = bcrypt.hashSync('pokemon', 10);
    await User.findOneAndUpdate(
      { role: 'ADMIN' },
      {
        name: 'Sriram',
        username: 'sriram',
        password_hash: hash,
        role: 'ADMIN'
      },
      { upsert: true, new: true }
    );
    console.log('✓ Admin User updated (username: sriram, pass: pokemon)');

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

    // 5. Seed Stage 7 Quiz Questions (Clear old questions and insert new 10 Stage 7 questions)
    await syncDefaultQuestions();
  } catch (err) {
    console.error('Auto seed error:', err.message);
  }
}

connectDB();

module.exports = mongoose.connection;
module.exports.syncDefaultQuestions = syncDefaultQuestions;
module.exports.DEFAULT_QUESTIONS = DEFAULT_QUESTIONS;
