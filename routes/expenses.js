const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun, seedSampleData } = require('../database/db');

const ALLOWED_CATEGORIES = [
  'Metro Rail',
  'Uber',
  'DIU Commute',
  'Tuition Snacks',
  'Gadgets',
  'Others'
];

// Helper: Calculate date range for month filters
const getMonthDateRange = (monthFilter) => {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed

  if (monthFilter === 'last-month') {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  } else if (monthFilter && monthFilter.match(/^\d{4}-\d{2}$/)) {
    const [y, m] = monthFilter.split('-').map(Number);
    year = y;
    month = m - 1;
  } else if (monthFilter === 'all') {
    return null;
  }

  // Format YYYY-MM
  const monthStr = String(month + 1).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  
  // Last day of month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  return { startDate, endDate };
};

/**
 * GET /api/summary
 * Aggregates KPIs, category breakdown for Chart.js, and commute totals
 */
router.get('/summary', async (req, res) => {
  try {
    const { month } = req.query;
    const dateRange = getMonthDateRange(month || 'this-month');

    let dateClause = '';
    const dateParams = [];

    if (dateRange) {
      dateClause = 'WHERE date >= ? AND date <= ?';
      dateParams.push(dateRange.startDate, dateRange.endDate);
    }

    // 1. Overall Total and Count
    const totalRow = await dbGet(`
      SELECT 
        COALESCE(SUM(amount), 0) AS totalAmount,
        COUNT(id) AS count
      FROM expenses
      ${dateClause}
    `, dateParams);

    // 2. Commute Total
    const commuteClause = dateClause 
      ? `${dateClause} AND category IN ('Metro Rail', 'Uber', 'DIU Commute')`
      : `WHERE category IN ('Metro Rail', 'Uber', 'DIU Commute')`;
    
    const commuteRow = await dbGet(`
      SELECT 
        COALESCE(SUM(amount), 0) AS commuteTotal
      FROM expenses
      ${commuteClause}
    `, dateParams);

    // 3. Category Breakdown for Chart.js
    const categoryRows = await dbAll(`
      SELECT 
        category,
        COALESCE(SUM(amount), 0) AS total,
        COUNT(id) AS count
      FROM expenses
      ${dateClause}
      GROUP BY category
      ORDER BY total DESC
    `, dateParams);

    // 4. Commute Breakdown (Metro Rail, Uber, DIU Commute)
    const commuteDetails = await dbAll(`
      SELECT 
        category,
        COALESCE(SUM(amount), 0) AS total,
        COUNT(id) AS count
      FROM expenses
      ${commuteClause}
      GROUP BY category
    `, dateParams);

    const commuteBreakdown = {
      'Metro Rail': { total: 0, count: 0 },
      'Uber': { total: 0, count: 0 },
      'DIU Commute': { total: 0, count: 0 }
    };

    commuteDetails.forEach(row => {
      if (commuteBreakdown[row.category]) {
        commuteBreakdown[row.category] = {
          total: Number(row.total),
          count: Number(row.count)
        };
      }
    });

    res.json({
      totalAmount: Number(totalRow.totalAmount),
      count: Number(totalRow.count),
      commuteTotal: Number(commuteRow.commuteTotal),
      categoryBreakdown: categoryRows.map(r => ({
        category: r.category,
        total: Number(r.total),
        count: Number(r.count)
      })),
      commuteBreakdown
    });
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: 'Failed to calculate summary metrics' });
  }
});

/**
 * GET /api/expenses
 * Retrieve list of expenses with optional category, search, and month filters
 */
router.get('/expenses', async (req, res) => {
  try {
    const { category, search, month } = req.query;

    const conditions = [];
    const params = [];

    // Date range filter
    const dateRange = getMonthDateRange(month || 'this-month');
    if (dateRange) {
      conditions.push('date >= ? AND date <= ?');
      params.push(dateRange.startDate, dateRange.endDate);
    }

    // Category filter
    if (category && category !== 'all' && ALLOWED_CATEGORIES.includes(category)) {
      conditions.push('category = ?');
      params.push(category);
    }

    // Search filter
    if (search && search.trim()) {
      conditions.push('(description LIKE ? OR category LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM expenses ${whereClause} ORDER BY date DESC, id DESC`;

    const rows = await dbAll(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to retrieve expenses' });
  }
});

/**
 * POST /api/expenses
 * Create a new expense entry
 */
router.post('/expenses', async (req, res) => {
  try {
    const { amount, category, date, description } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
    }

    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    const desc = (description || '').trim();

    const result = await dbRun(
      'INSERT INTO expenses (amount, category, date, description) VALUES (?, ?, ?, ?)',
      [parsedAmount, category, date, desc]
    );

    const newExpense = await dbGet('SELECT * FROM expenses WHERE id = ?', [result.id]);
    res.status(201).json(newExpense);
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

/**
 * PUT /api/expenses/:id
 * Update an existing expense entry
 */
router.put('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, category, date, description } = req.body;

    const existing = await dbGet('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
    }

    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    const desc = (description || '').trim();

    await dbRun(
      'UPDATE expenses SET amount = ?, category = ?, date = ?, description = ? WHERE id = ?',
      [parsedAmount, category, date, desc, id]
    );

    const updated = await dbGet('SELECT * FROM expenses WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense entry
 */
router.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbGet('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await dbRun('DELETE FROM expenses WHERE id = ?', [id]);
    res.json({ message: 'Expense deleted successfully', id: Number(id) });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

/**
 * POST /api/expenses/seed
 * Re-seed sample demo data
 */
router.post('/expenses/seed', async (req, res) => {
  try {
    await seedSampleData();
    res.json({ message: 'Sample demo data seeded successfully' });
  } catch (err) {
    console.error('Error seeding data:', err);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

module.exports = router;
