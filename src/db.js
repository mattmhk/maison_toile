const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class Database {
  constructor(dbFilePath) {
    this.dbFilePath = dbFilePath;
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new sqlite3.Database(dbFilePath);
  }

  initialize() {
    this.db.serialize(() => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS reservations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          partySize INTEGER NOT NULL,
          notes TEXT,
          createdAt TEXT NOT NULL
        )`
      );

      this.db.run(
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`
      );

      // Default capacity per time slot
      this.db.run(
        `INSERT OR IGNORE INTO settings (key, value) VALUES ('capacity_per_slot', '30')`
      );
    });
  }

  getCapacityPerSlot() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT value FROM settings WHERE key = 'capacity_per_slot'`,
        (err, row) => {
          if (err) return reject(err);
          resolve(parseInt(row?.value || '30', 10));
        }
      );
    });
  }

  async getAvailability({ date, time }) {
    const capacity = await this.getCapacityPerSlot();
    const booked = await new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COALESCE(SUM(partySize), 0) as total FROM reservations WHERE date = ? AND time = ?`,
        [date, time],
        (err, row) => {
          if (err) return reject(err);
          resolve(parseInt(row?.total || 0, 10));
        }
      );
    });
    const remaining = Math.max(0, capacity - booked);
    return { capacity, booked, remaining };
  }

  createReservation({ name, email, phone, date, time, partySize, notes }) {
    const createdAt = new Date().toISOString();
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO reservations (name, email, phone, date, time, partySize, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, phone, date, time, partySize, notes, createdAt],
        function onResult(err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, name, email, phone, date, time, partySize, notes, createdAt });
        }
      );
    });
  }

  listReservations({ date = null }) {
    return new Promise((resolve, reject) => {
      if (date) {
        this.db.all(
          `SELECT * FROM reservations WHERE date = ? ORDER BY time ASC, createdAt DESC`,
          [date],
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
          }
        );
      } else {
        this.db.all(
          `SELECT * FROM reservations ORDER BY date DESC, time ASC`,
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
          }
        );
      }
    });
  }
}

module.exports = { Database };


