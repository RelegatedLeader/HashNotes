const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(
  path.resolve(__dirname, '../db/notes.db'),
  (err) => {
    if (err) {
      console.error('Database connection error:', err);
    } else {
      console.log('Connected to SQLite database.');
      db.run('PRAGMA busy_timeout = 5000'); // Wait up to 5 seconds for locked database
    }
  }
);

// Run all database operations in serialized mode to avoid locking
db.serialize(() => {
  // Create Users and Notes tables if they don’t exist
  db.run(`CREATE TABLE IF NOT EXISTS Users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT UNIQUE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      text TEXT,
      FOREIGN KEY (user_id) REFERENCES Users(user_id)
  )`);
});

// Endpoint to create a new user and their first note, generating a unique hash
app.post('/new-user-note', (req, res) => {
  const { title, text } = req.body;
  const uniqueHash = crypto.randomBytes(16).toString('hex');

  // Serialize this sequence of operations to ensure orderly access
  db.serialize(() => {
    // Insert new user and get user_id
    db.run('INSERT INTO Users (hash) VALUES (?)', [uniqueHash], function (err) {
      if (err) {
        console.error('User creation error:', err);
        return res.status(500).json({ error: err.message });
      }
      const userId = this.lastID;

      // Insert the first note associated with the new user
      db.run(
        'INSERT INTO Notes (user_id, title, text) VALUES (?, ?, ?)',
        [userId, title, text],
        function (err) {
          if (err) {
            console.error('Note creation error:', err);
            return res.status(500).json({ error: err.message });
          }
          res.json({ id: this.lastID, hash: uniqueHash });
        }
      );
    });
  });
});

// Endpoint to add a new note for an existing user
app.post('/notes', (req, res) => {
  const { title, text, hash } = req.body;

  // Serialize to ensure smooth sequential access
  db.serialize(() => {
    // Get user_id based on the provided hash
    db.get('SELECT user_id FROM Users WHERE hash = ?', [hash], (err, row) => {
      if (err || !row) {
        console.error('User not found or query error:', err);
        return res.status(404).json({ error: 'User not found' });
      }

      // Insert new note with user_id
      db.run(
        'INSERT INTO Notes (user_id, title, text) VALUES (?, ?, ?)',
        [row.user_id, title, text],
        function (err) {
          if (err) {
            console.error('Error adding note:', err);
            return res.status(500).json({ error: err.message });
          }
          res.json({ id: this.lastID });
        }
      );
    });
  });
});

// Endpoint to get all notes associated with a specific hash
app.get('/notes/:hash', (req, res) => {
  const { hash } = req.params;

  // Serialize to avoid potential locking issues
  db.serialize(() => {
    // Find the user and fetch notes associated with their user_id
    db.get('SELECT user_id FROM Users WHERE hash = ?', [hash], (err, row) => {
      if (err || !row) {
        console.error('User not found or query error:', err);
        return res.status(404).json({ error: 'User not found' });
      }

      db.all(
        'SELECT id, title, text FROM Notes WHERE user_id = ?',
        [row.user_id],
        (err, rows) => {
          if (err) {
            console.error('Error fetching notes:', err);
            return res.status(500).json({ error: err.message });
          }
          res.json({ notes: rows });
        }
      );
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
