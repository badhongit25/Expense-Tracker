const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.resolve(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'expenses.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper functions for Promise-based async queries
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Initialize schema and seed data
const initDatabase = async () => {
  try {
    // Create users table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create expenses table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if users table is empty, seed initial demo account
    const userRow = await dbGet('SELECT COUNT(*) as count FROM users');
    if (userRow && userRow.count === 0) {
      console.log('Users table empty. Seeding demo user account (demo / password123)...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await dbRun('INSERT INTO users (username, password) VALUES (?, ?)', ['demo', hashedPassword]);
      console.log('✅ Default demo user created.');
    }

    // Check if expenses table is empty, then seed initial realistic sample data
    const row = await dbGet('SELECT COUNT(*) as count FROM expenses');
    if (row && row.count === 0) {
      console.log('Database empty. Seeding initial sample expenses...');
      await seedSampleData();
    }
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  }
};

// User data access helpers
const findUserByUsername = async (username) => {
  return await dbGet('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username.trim()]);
};

const findUserById = async (id) => {
  return await dbGet('SELECT id, username, created_at FROM users WHERE id = ?', [id]);
};

const createUser = async (username, hashedPassword) => {
  return await dbRun('INSERT INTO users (username, password) VALUES (?, ?)', [username.trim(), hashedPassword]);
};

const getAllUsers = async () => {
  return await dbAll('SELECT id, username, created_at FROM users ORDER BY id ASC');
};

const seedSampleData = async () => {
  const today = new Date();
  
  const formatDate = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().split('T')[0];
  };

  const sampleData = [
    { amount: 60.00, category: 'Metro Rail', date: formatDate(0), description: 'MRT Line 6: Agargaon to Motijheel' },
    { amount: 120.00, category: 'Tuition Snacks', date: formatDate(0), description: 'Chicken Shawarma & Cold Coffee' },
    { amount: 45.00, category: 'DIU Commute', date: formatDate(1), description: 'Campus Shuttle Bus Pass' },
    { amount: 320.00, category: 'Uber', date: formatDate(2), description: 'Uber Moto ride from Dhanmondi to Mirpur' },
    { amount: 60.00, category: 'Metro Rail', date: formatDate(3), description: 'MRT Line 6: Uttara to Farmgate' },
    { amount: 850.00, category: 'Gadgets', date: formatDate(4), description: 'USB-C Fast Charging Braided Cable' },
    { amount: 45.00, category: 'DIU Commute', date: formatDate(5), description: 'DIU Green Garden Route Return' },
    { amount: 150.00, category: 'Tuition Snacks', date: formatDate(6), description: 'Evening milk tea and bakery snacks' },
    { amount: 280.00, category: 'Uber', date: formatDate(7), description: 'Uber Car share during heavy rain' },
    { amount: 60.00, category: 'Metro Rail', date: formatDate(8), description: 'MRT Line 6: Motijheel to Agargaon' },
    { amount: 210.00, category: 'Others', date: formatDate(10), description: 'Notebooks and gel pens from stationary' }
  ];

  for (const item of sampleData) {
    await dbRun(
      'INSERT INTO expenses (amount, category, date, description) VALUES (?, ?, ?, ?)',
      [item.amount, item.category, item.date, item.description]
    );
  }
  console.log(`Seeded ${sampleData.length} initial sample expenses.`);
};

// Auto-run init
initDatabase();

module.exports = {
  db,
  dbAll,
  dbGet,
  dbRun,
  findUserByUsername,
  findUserById,
  createUser,
  getAllUsers,
  seedSampleData
};
