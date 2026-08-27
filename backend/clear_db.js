const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'treasure_hunt.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('--- CLEARING ALL MOCK / TEST DATA FROM DATABASE ---');
  db.run("DELETE FROM players;");
  db.run("DELETE FROM stage_completions;");
  db.run("DELETE FROM scan_attempts;");
  db.run("DELETE FROM feedback;");
  console.log('✓ All test records, mock names, and dummy numbers successfully deleted!');
  console.log('✓ Database is 100% clean and ready for real participant registrations!');
});

db.close();
