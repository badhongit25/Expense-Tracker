const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Load environment variables (.env)
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {
    // Ignore if file is not found
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 1. DATABASE CONFIGURATION (POSTGRESQL WITH SQLITE FALLBACK)
// ============================================================
let dbType = 'postgres'; // 'postgres' or 'sqlite'
let pgPool = null;
let sqliteDb = null;

// Initialize PostgreSQL pool
const poolConfig = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD || 'badhon680@',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  connectionTimeoutMillis: 5000,
};

pgPool = new Pool(poolConfig);
pgPool.on('error', (err) => {
  console.error('⚠️ PostgreSQL pool background error:', err.message);
});

// SQLite initialization helper
function initSqliteFallback() {
  dbType = 'sqlite';
  const dbDir = path.join(__dirname, 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'expenses.db');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Failed to connect to SQLite fallback:', err.message);
    } else {
      console.log('📦 Connected to SQLite fallback database at:', dbPath);
      setupSqliteTables();
    }
  });
}

function setupSqliteTables() {
  sqliteDb.serialize(async () => {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        email TEXT,
        monthly_budget REAL DEFAULT 0,
        avatar_color TEXT DEFAULT 'sky',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrations for SQLite if columns don't exist
    const alterCols = [
      'ALTER TABLE users ADD COLUMN full_name TEXT',
      'ALTER TABLE users ADD COLUMN email TEXT',
      'ALTER TABLE users ADD COLUMN monthly_budget REAL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN avatar_color TEXT DEFAULT "sky"'
    ];
    alterCols.forEach(cmd => {
      sqliteDb.run(cmd, () => {});
    });

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed demo user
    sqliteDb.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
      if (!err && row && row.count === 0) {
        const hashed = await bcrypt.hash('password123', 10);
        sqliteDb.run(
          'INSERT INTO users (username, password, full_name, email, monthly_budget, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
          ['demo', hashed, 'Demo User', 'demo@expensetracker.local', 25000, 'sky'],
          function (err) {
            if (!err) {
              console.log('✅ SQLite: Demo user seeded (demo / password123)');
              seedSampleExpenses(this.lastID);
            }
          }
        );
      }
    });
  });
}

// Convert '?' placeholder SQL into '$1, $2' for PostgreSQL
function formatPgQuery(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

// Unified Database Query Runner
async function queryAll(sql, params = []) {
  if (dbType === 'postgres') {
    const formatted = formatPgQuery(sql);
    const res = await pgPool.query(formatted, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

async function queryOne(sql, params = []) {
  if (dbType === 'postgres') {
    const formatted = formatPgQuery(sql);
    const res = await pgPool.query(formatted, params);
    return res.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
}

async function execute(sql, params = []) {
  if (dbType === 'postgres') {
    const formatted = formatPgQuery(sql);
    const res = await pgPool.query(formatted, params);
    return { rowCount: res.rowCount, rows: res.rows };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

// Seed sample expenses for rich initial visualization
async function seedSampleExpenses(userId) {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');

    const sampleExpenses = [
      { amount: 120.00, category: 'Transportation', date: `${yyyy}-${mm}-02`, description: 'Metro Rail travel card recharge' },
      { amount: 450.00, category: 'Food & Dining', date: `${yyyy}-${mm}-03`, description: 'Lunch with university peers' },
      { amount: 1850.00, category: 'Groceries', date: `${yyyy}-${mm}-05`, description: 'Weekly supermarket groceries' },
      { amount: 250.00, category: 'Transportation', date: `${yyyy}-${mm}-07`, description: 'Uber ride from campus' },
      { amount: 3200.00, category: 'Utilities', date: `${yyyy}-${mm}-08`, description: 'Broadband internet & electric bill' },
      { amount: 350.00, category: 'Entertainment', date: `${yyyy}-${mm}-09`, description: 'Cineplex movie ticket' },
      { amount: 75.00, category: 'Food & Dining', date: `${yyyy}-${mm}-09`, description: 'Coffee & snacks' },
      { amount: 1500.00, category: 'Shopping', date: `${yyyy}-${mm}-10`, description: 'Mechanical keyboard accessories' },
      { amount: 140.00, category: 'Transportation', date: `${yyyy}-${mm}-12`, description: 'Express commute ticket' },
      { amount: 600.00, category: 'Health & Fitness', date: `${yyyy}-${mm}-14`, description: 'Vitamins and pharmacy items' },
      { amount: 220.00, category: 'Food & Dining', date: `${yyyy}-${mm}-15`, description: 'Evening dine-out' },
    ];

    for (const exp of sampleExpenses) {
      if (dbType === 'postgres') {
        await pgPool.query(
          'INSERT INTO expenses (user_id, amount, category, date, description) VALUES ($1, $2, $3, $4, $5)',
          [userId, exp.amount, exp.category, exp.date, exp.description]
        );
      } else {
        await execute(
          'INSERT INTO expenses (user_id, amount, category, date, description) VALUES (?, ?, ?, ?, ?)',
          [userId, exp.amount, exp.category, exp.date, exp.description]
        );
      }
    }
    console.log(`✅ Sample expenses successfully seeded for user #${userId}`);
  } catch (err) {
    console.error('Error seeding sample expenses:', err.message);
  }
}

// Database Connection & Schema Verification
async function initDatabase() {
  try {
    const client = await pgPool.connect();
    console.log('✅ Connected to PostgreSQL database successfully!');

    try {
      // 1. Users Table with profile fields
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          full_name VARCHAR(150),
          email VARCHAR(150),
          monthly_budget NUMERIC(12, 2) DEFAULT 0,
          avatar_color VARCHAR(30) DEFAULT 'sky',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Ensure profile columns exist if table was already created
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(30) DEFAULT 'sky';
      `);

      // 2. Expenses Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          amount NUMERIC(12, 2) NOT NULL,
          category VARCHAR(100) NOT NULL,
          date DATE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ PostgreSQL tables verified: users, expenses');

      // 3. Seed demo user if empty
      const userRes = await client.query('SELECT id, full_name FROM users WHERE username = $1', ['demo']);
      let demoUserId;
      if (userRes.rows.length === 0) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const ins = await client.query(
          'INSERT INTO users (username, password, full_name, email, monthly_budget, avatar_color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          ['demo', hashedPassword, 'Badhon Paul', 'badhon@expensetracker.local', 20000, 'sky']
        );
        demoUserId = ins.rows[0].id;
        console.log('✅ Demo user seeded (demo / password123)');
      } else {
        demoUserId = userRes.rows[0].id;
        // Ensure demo user has a full_name if null
        if (!userRes.rows[0].full_name) {
          await client.query(
            "UPDATE users SET full_name = 'Badhon Paul', email = 'badhon@expensetracker.local', monthly_budget = 20000, avatar_color = 'sky' WHERE id = $1",
            [demoUserId]
          );
        }
      }

      // Check if demo user has expenses; if not, seed realistic expenses
      const expRes = await client.query('SELECT COUNT(*) as count FROM expenses WHERE user_id = $1', [demoUserId]);
      if (parseInt(expRes.rows[0].count, 10) === 0) {
        await seedSampleExpenses(demoUserId);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('⚠️ PostgreSQL connection failed:', err.message);
    console.log('🔄 Gracefully falling back to SQLite database engine...');
    initSqliteFallback();
  }
}

// Run DB setup with try-catch
initDatabase();

// ============================================================
// 2. MIDDLEWARE CONFIGURATION
// ============================================================
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'expense_sid',
  secret: process.env.SESSION_SECRET || 'expense_tracker_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // true if HTTPS
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Serve static frontend assets
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Authentication guard middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please sign in.'
  });
}

// ============================================================
// 3. AUTHENTICATION API ROUTES
// ============================================================

/**
 * POST /api/register
 * Creates a new user account with hashed password
 */
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, full_name, email } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ success: false, message: 'Username must be between 3 and 30 characters.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check if username already exists
    const existing = await queryOne('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username is already taken. Please choose another.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const cleanFullName = full_name ? full_name.trim() : cleanUsername;
    const cleanEmail = email ? email.trim() : '';

    let newUser;
    if (dbType === 'postgres') {
      const result = await pgPool.query(
        'INSERT INTO users (username, password, full_name, email, monthly_budget, avatar_color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, full_name, email, monthly_budget, avatar_color, created_at',
        [cleanUsername, hashedPassword, cleanFullName, cleanEmail, 20000, 'sky']
      );
      newUser = result.rows[0];
    } else {
      const ins = await execute(
        'INSERT INTO users (username, password, full_name, email, monthly_budget, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
        [cleanUsername, hashedPassword, cleanFullName, cleanEmail, 20000, 'sky']
      );
      newUser = { id: ins.lastID, username: cleanUsername, full_name: cleanFullName, email: cleanEmail, monthly_budget: 20000, avatar_color: 'sky', created_at: new Date() };
    }

    // Seed welcoming sample expenses for the new user
    await seedSampleExpenses(newUser.id);

    // Establish session
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      full_name: newUser.full_name,
      avatar_color: newUser.avatar_color
    };

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      user: req.session.user
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create account.' });
  }
});

/**
 * POST /api/login
 * Validates credentials and creates session
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Both username and password are required.' });
    }

    const cleanUsername = username.trim();
    const user = await queryOne('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Session initialization error.' });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        full_name: user.full_name || user.username,
        avatar_color: user.avatar_color || 'sky'
      };

      return res.json({
        success: true,
        message: 'Logged in successfully!',
        user: req.session.user
      });
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

/**
 * POST /api/logout
 * Destroys session
 */
app.post('/api/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Logout failed.' });
      }
      res.clearCookie('expense_sid');
      return res.json({ success: true, message: 'Logged out successfully.' });
    });
  } else {
    res.clearCookie('expense_sid');
    return res.json({ success: true, message: 'Already logged out.' });
  }
});

/**
 * GET /api/me
 * Checks session state
 */
app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      authenticated: true,
      user: req.session.user
    });
  }
  return res.json({
    authenticated: false,
    user: null
  });
});

// ============================================================
// 4. USER PROFILE MANAGEMENT APIS
// ============================================================

/**
 * GET /api/profile
 * Returns detailed profile data including statistics and monthly budget progress
 */
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await queryOne(
      'SELECT id, username, full_name, email, monthly_budget, avatar_color, CAST(created_at AS TEXT) as created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Aggregated stats
    const totalRow = await queryOne(
      'SELECT COALESCE(SUM(amount), 0) as total, COUNT(id) as count FROM expenses WHERE user_id = ?',
      [userId]
    );

    const thisMonthRow = await queryOne(
      'SELECT COALESCE(SUM(amount), 0) as total, COUNT(id) as count FROM expenses WHERE user_id = ? AND CAST(date AS TEXT) LIKE ?',
      [userId, `${currentMonth}%`]
    );

    const budget = parseFloat(user.monthly_budget || 0);
    const thisMonthSpent = parseFloat(thisMonthRow?.total || 0);
    const remaining = Math.max(0, budget - thisMonthSpent);
    const pct = budget > 0 ? Math.min(100, (thisMonthSpent / budget) * 100) : 0;

    return res.json({
      success: true,
      profile: {
        id: user.id,
        username: user.username,
        full_name: user.full_name || user.username,
        email: user.email || '',
        monthly_budget: budget,
        avatar_color: user.avatar_color || 'sky',
        created_at: user.created_at,
        stats: {
          allTimeTotal: parseFloat(totalRow?.total || 0),
          allTimeCount: parseInt(totalRow?.count || 0),
          thisMonthSpent: thisMonthSpent,
          thisMonthCount: parseInt(thisMonthRow?.count || 0),
          budgetRemaining: remaining,
          budgetPercentage: parseFloat(pct.toFixed(1))
        }
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

/**
 * PUT /api/profile
 * Updates full_name, email, monthly_budget, avatar_color
 */
app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { full_name, email, monthly_budget, avatar_color } = req.body;

    const cleanFullName = full_name ? full_name.trim() : '';
    const cleanEmail = email ? email.trim() : '';
    const budgetNum = parseFloat(monthly_budget) || 0;
    const validColors = ['sky', 'emerald', 'violet', 'amber', 'rose'];
    const chosenColor = validColors.includes(avatar_color) ? avatar_color : 'sky';

    if (dbType === 'postgres') {
      await pgPool.query(
        'UPDATE users SET full_name = $1, email = $2, monthly_budget = $3, avatar_color = $4 WHERE id = $5',
        [cleanFullName, cleanEmail, budgetNum, chosenColor, userId]
      );
    } else {
      await execute(
        'UPDATE users SET full_name = ?, email = ?, monthly_budget = ?, avatar_color = ? WHERE id = ?',
        [cleanFullName, cleanEmail, budgetNum, chosenColor, userId]
      );
    }

    // Update session
    req.session.user.full_name = cleanFullName;
    req.session.user.avatar_color = chosenColor;

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      profile: {
        full_name: cleanFullName,
        email: cleanEmail,
        monthly_budget: budgetNum,
        avatar_color: chosenColor
      }
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

/**
 * PUT /api/profile/password
 * Changes user password with current password verification
 */
app.put('/api/profile/password', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const user = await queryOne('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password.' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    if (dbType === 'postgres') {
      await pgPool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNew, userId]);
    } else {
      await execute('UPDATE users SET password = ? WHERE id = ?', [hashedNew, userId]);
    }

    return res.json({
      success: true,
      message: 'Password changed successfully!'
    });
  } catch (err) {
    console.error('Password change error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

/**
 * POST /api/profile/reset-expenses
 * Clears all transaction history for the logged-in user
 */
app.post('/api/profile/reset-expenses', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { confirmation } = req.body;

    if (confirmation !== 'RESET') {
      return res.status(400).json({ success: false, message: 'Please type RESET to confirm expense history deletion.' });
    }

    await execute('DELETE FROM expenses WHERE user_id = ?', [userId]);

    return res.json({
      success: true,
      message: 'All expense records have been reset successfully.'
    });
  } catch (err) {
    console.error('Reset expenses error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to reset expense records.' });
  }
});

// ============================================================
// 5. EXPENSE MANAGEMENT REST APIS
// ============================================================

/**
 * GET /api/expenses
 * Lists expenses with optional filters: month, category, date, search
 */
app.get('/api/expenses', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { month, category, date, search, limit } = req.query;

    let sql = 'SELECT id, amount, category, CAST(date AS TEXT) as date, description, created_at FROM expenses WHERE user_id = ?';
    const params = [userId];

    // Filter by specific date
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      sql += ' AND CAST(date AS TEXT) = ?';
      params.push(date);
    }
    // Or filter by month (YYYY-MM)
    else if (month && month !== 'all' && /^\d{4}-\d{2}$/.test(month)) {
      sql += ' AND CAST(date AS TEXT) LIKE ?';
      params.push(`${month}%`);
    }

    // Filter by Category
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    // Filter by Search Query
    if (search && search.trim()) {
      sql += ' AND (LOWER(description) LIKE ? OR LOWER(category) LIKE ?)';
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY date DESC, id DESC';

    if (limit && parseInt(limit) > 0) {
      sql += ` LIMIT ${parseInt(limit)}`;
    }

    const expenses = await queryAll(sql, params);

    // Ensure amounts are parsed as numbers
    const formatted = expenses.map(e => ({
      ...e,
      amount: parseFloat(e.amount)
    }));

    return res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    console.error('Fetch expenses error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch expenses.' });
  }
});

/**
 * POST /api/expenses
 * Adds a new expense
 */
app.post('/api/expenses', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { amount, category, date, description } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid expense amount greater than 0 is required.' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const cleanDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date))
      ? date
      : new Date().toISOString().split('T')[0];

    const cleanDesc = description ? description.trim() : '';

    let newExpense;
    if (dbType === 'postgres') {
      const ins = await pgPool.query(
        'INSERT INTO expenses (user_id, amount, category, date, description) VALUES ($1, $2, $3, $4, $5) RETURNING id, amount, category, CAST(date AS TEXT) as date, description, created_at',
        [userId, numAmount, category.trim(), cleanDate, cleanDesc]
      );
      newExpense = ins.rows[0];
    } else {
      const ins = await execute(
        'INSERT INTO expenses (user_id, amount, category, date, description) VALUES (?, ?, ?, ?, ?)',
        [userId, numAmount, category.trim(), cleanDate, cleanDesc]
      );
      newExpense = {
        id: ins.lastID,
        user_id: userId,
        amount: numAmount,
        category: category.trim(),
        date: cleanDate,
        description: cleanDesc,
        created_at: new Date()
      };
    }

    newExpense.amount = parseFloat(newExpense.amount);

    return res.status(201).json({
      success: true,
      message: 'Expense added successfully!',
      data: newExpense
    });
  } catch (err) {
    console.error('Add expense error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to add expense.' });
  }
});

/**
 * PUT /api/expenses/:id
 * Edits an existing expense
 */
app.put('/api/expenses/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const expenseId = parseInt(req.params.id);
    const { amount, category, date, description } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid expense amount greater than 0 is required.' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const cleanDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date))
      ? date
      : new Date().toISOString().split('T')[0];

    const cleanDesc = description ? description.trim() : '';

    // Verify ownership
    const existing = await queryOne('SELECT id FROM expenses WHERE id = ? AND user_id = ?', [expenseId, userId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense not found or unauthorized.' });
    }

    if (dbType === 'postgres') {
      const updateRes = await pgPool.query(
        'UPDATE expenses SET amount = $1, category = $2, date = $3, description = $4 WHERE id = $5 AND user_id = $6 RETURNING id, amount, category, CAST(date AS TEXT) as date, description, created_at',
        [numAmount, category.trim(), cleanDate, cleanDesc, expenseId, userId]
      );
      const updated = updateRes.rows[0];
      updated.amount = parseFloat(updated.amount);
      return res.json({
        success: true,
        message: 'Expense updated successfully!',
        data: updated
      });
    } else {
      await execute(
        'UPDATE expenses SET amount = ?, category = ?, date = ?, description = ? WHERE id = ? AND user_id = ?',
        [numAmount, category.trim(), cleanDate, cleanDesc, expenseId, userId]
      );
      return res.json({
        success: true,
        message: 'Expense updated successfully!',
        data: { id: expenseId, amount: numAmount, category: category.trim(), date: cleanDate, description: cleanDesc }
      });
    }
  } catch (err) {
    console.error('Update expense error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update expense.' });
  }
});

/**
 * DELETE /api/expenses/:id
 * Deletes an existing expense
 */
app.delete('/api/expenses/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const expenseId = parseInt(req.params.id);

    const existing = await queryOne('SELECT id FROM expenses WHERE id = ? AND user_id = ?', [expenseId, userId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense not found or unauthorized.' });
    }

    await execute('DELETE FROM expenses WHERE id = ? AND user_id = ?', [expenseId, userId]);

    return res.json({
      success: true,
      message: 'Expense deleted successfully!'
    });
  } catch (err) {
    console.error('Delete expense error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete expense.' });
  }
});

/**
 * GET /api/summary
 * Aggregates statistics, KPIs, category breakdown for Chart.js, and monthly trends
 */
app.get('/api/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const monthFilter = req.query.month || currentMonth;

    // 1. Total All-time Expenses
    const totalAllRow = await queryOne(
      'SELECT COALESCE(SUM(amount), 0) as total, COUNT(id) as count FROM expenses WHERE user_id = ?',
      [userId]
    );

    // 2. This Month's Expenses
    const thisMonthRow = await queryOne(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND CAST(date AS TEXT) LIKE ?',
      [userId, `${currentMonth}%`]
    );

    // 3. Today's Expenses
    const todayRow = await queryOne(
      'SELECT COALESCE(SUM(amount), 0) as total, COUNT(id) as count FROM expenses WHERE user_id = ? AND CAST(date AS TEXT) = ?',
      [userId, todayStr]
    );

    // 4. Selected Month Total
    let selectedMonthClause = '';
    const selectedParams = [userId];
    if (monthFilter !== 'all') {
      selectedMonthClause = ' AND CAST(date AS TEXT) LIKE ?';
      selectedParams.push(`${monthFilter}%`);
    }
    const selectedMonthRow = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(id) as count FROM expenses WHERE user_id = ? ${selectedMonthClause}`,
      selectedParams
    );

    // 5. Category Breakdown for Chart.js (Doughnut)
    const categoryRows = await queryAll(
      `SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(id) as count 
       FROM expenses 
       WHERE user_id = ? ${selectedMonthClause} 
       GROUP BY category 
       ORDER BY total DESC`,
      selectedParams
    );

    // 6. Last 6 Months Spending Trend
    const trendMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      trendMonths.push({ month: mStr, label });
    }

    const trendData = [];
    for (const m of trendMonths) {
      const row = await queryOne(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND CAST(date AS TEXT) LIKE ?',
        [userId, `${m.month}%`]
      );
      trendData.push({
        month: m.month,
        label: m.label,
        total: parseFloat(row?.total || 0)
      });
    }

    return res.json({
      success: true,
      data: {
        allTimeTotal: parseFloat(totalAllRow?.total || 0),
        allTimeCount: parseInt(totalAllRow?.count || 0),
        thisMonthTotal: parseFloat(thisMonthRow?.total || 0),
        todayTotal: parseFloat(todayRow?.total || 0),
        todayCount: parseInt(todayRow?.count || 0),
        selectedMonth: monthFilter,
        selectedMonthTotal: parseFloat(selectedMonthRow?.total || 0),
        selectedMonthCount: parseInt(selectedMonthRow?.count || 0),
        categoryBreakdown: categoryRows.map(c => ({
          category: c.category,
          total: parseFloat(c.total),
          count: parseInt(c.count)
        })),
        monthlyTrend: trendData
      }
    });
  } catch (err) {
    console.error('Summary error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate summary.' });
  }
});

/**
 * GET /api/calendar-summary
 * Aggregates daily spending for interactive visual calendar view
 */
app.get('/api/calendar-summary', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetMonth = req.query.month || currentMonth;

    const rows = await queryAll(
      `SELECT CAST(date AS TEXT) as date, COALESCE(SUM(amount), 0) as total, COUNT(id) as count 
       FROM expenses 
       WHERE user_id = ? AND CAST(date AS TEXT) LIKE ? 
       GROUP BY date 
       ORDER BY date ASC`,
      [userId, `${targetMonth}%`]
    );

    // Map by date string YYYY-MM-DD
    const calendarMap = {};
    rows.forEach(r => {
      calendarMap[r.date] = {
        total: parseFloat(r.total),
        count: parseInt(r.count)
      };
    });

    return res.json({
      success: true,
      month: targetMonth,
      data: calendarMap
    });
  } catch (err) {
    console.error('Calendar summary error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch calendar data.' });
  }
});

// ============================================================
// 6. PAGE ROUTES & FALLBACKS
// ============================================================

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all route falls back to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Expense Tracker running at: http://localhost:${PORT}`);
  console.log(`💾 Database Engine: ${dbType.toUpperCase()}`);
  console.log(`🔐 Sessions: Active (express-session)`);
  console.log(`👤 Demo Account: demo / password123`);
  console.log(`======================================================\n`);
});

module.exports = server;
