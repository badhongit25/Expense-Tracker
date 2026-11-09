/**
 * API client module for Personal Expense & Commute Tracker
 * Handles all async communication with Express backend
 */
const API = {
  baseUrl: '/api',

  async getSummary(filterMonth = '') {
    const query = filterMonth ? `?month=${encodeURIComponent(filterMonth)}` : '';
    const res = await fetch(`${this.baseUrl}/summary${query}`);
    if (!res.ok) throw new Error('Failed to fetch summary data');
    return await res.json();
  },

  async getExpenses(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.month && filters.month !== 'all') params.append('month', filters.month);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${this.baseUrl}/expenses${query}`);
    if (!res.ok) throw new Error('Failed to fetch expenses list');
    return await res.json();
  },

  async createExpense(expense) {
    const res = await fetch(`${this.baseUrl}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create expense');
    return data;
  },

  async updateExpense(id, expense) {
    const res = await fetch(`${this.baseUrl}/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update expense');
    return data;
  },

  async deleteExpense(id) {
    const res = await fetch(`${this.baseUrl}/expenses/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete expense');
    return data;
  },

  async seedDemoData() {
    const res = await fetch(`${this.baseUrl}/expenses/seed`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to seed demo data');
    return data;
  }
};
