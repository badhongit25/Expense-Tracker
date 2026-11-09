/**
 * Main application logic for Trackr// Personal Expense & Commute Tracker
 */

// Global State
window.currentCurrencySymbol = '৳';
window.currentCurrencyCode = 'BDT';

const state = {
  expenses: [],
  filters: {
    category: 'all',
    search: '',
    month: 'this-month'
  },
  expenseToDelete: null
};

// Category icon mapper
const categoryIcons = {
  'Metro Rail': 'train',
  'Uber': 'car',
  'DIU Commute': 'bus',
  'Tuition Snacks': 'utensils',
  'Gadgets': 'laptop',
  'Others': 'package'
};

const categoryBadgeClasses = {
  'Metro Rail': 'badge-metro',
  'Uber': 'badge-uber',
  'DIU Commute': 'badge-diu',
  'Tuition Snacks': 'badge-tuition',
  'Gadgets': 'badge-gadgets',
  'Others': 'badge-others'
};

// Document Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initDefaults();
  initEventListeners();
  ChartController.init();
  refreshAllData();
});

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function initDefaults() {
  // Set today's date in add form
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('formDate');
  if (dateInput) dateInput.value = today;
}

function initEventListeners() {
  // Mobile sidebar toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const closeMobileMenuBtn = document.getElementById('closeMobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  const toggleSidebar = (show) => {
    if (show) {
      sidebar.classList.remove('-translate-x-full');
      backdrop.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      backdrop.classList.add('hidden');
    }
  };

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => toggleSidebar(true));
  if (closeMobileMenuBtn) closeMobileMenuBtn.addEventListener('click', () => toggleSidebar(false));
  if (backdrop) backdrop.addEventListener('click', () => toggleSidebar(false));

  // Navigation Links smooth scrolling & active state
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-sky-500/10', 'text-sky-400', 'border', 'border-sky-500/20', 'shadow-sm');
        el.classList.add('text-slate-400');
      });
      link.classList.remove('text-slate-400');
      link.classList.add('bg-sky-500/10', 'text-sky-400', 'border', 'border-sky-500/20', 'shadow-sm');

      const targetId = link.getAttribute('data-target');
      if (targetId) {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
      if (window.innerWidth < 768) {
        toggleSidebar(false);
      }
    });
  });

  // Currency Toggle buttons
  document.querySelectorAll('.currency-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.currency-toggle-btn').forEach(b => {
        b.classList.remove('bg-sky-500/20', 'text-sky-400', 'border', 'border-sky-500/30');
        b.classList.add('text-slate-400');
      });
      btn.classList.remove('text-slate-400');
      btn.classList.add('bg-sky-500/20', 'text-sky-400', 'border', 'border-sky-500/30');

      window.currentCurrencySymbol = btn.getAttribute('data-currency');
      window.currentCurrencyCode = btn.getAttribute('data-label');
      document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = window.currentCurrencySymbol);
      
      // Update tables and charts with new currency
      renderTable();
      refreshSummary();
    });
  });

  // Time Range Filter
  const timeFilter = document.getElementById('timeRangeFilter');
  if (timeFilter) {
    timeFilter.addEventListener('change', (e) => {
      state.filters.month = e.target.value;
      refreshAllData();
    });
  }

  // Table Category Filter
  const tableCategoryFilter = document.getElementById('tableCategoryFilter');
  if (tableCategoryFilter) {
    tableCategoryFilter.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      refreshTable();
    });
  }

  // Table Search Input with debounce
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.filters.search = e.target.value.trim();
        refreshTable();
      }, 250);
    });
  }

  // Quick Add Expense Form
  const inlineForm = document.getElementById('inlineExpenseForm');
  if (inlineForm) {
    inlineForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('formAmount').value);
      const category = document.getElementById('formCategory').value;
      const date = document.getElementById('formDate').value;
      const description = document.getElementById('formDescription').value.trim();

      if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
      }
      if (!date) {
        showToast('Please choose a valid date', 'error');
        return;
      }

      try {
        await API.createExpense({ amount, category, date, description });
        showToast('Expense recorded successfully!', 'success');
        
        // Reset form inputs except date
        document.getElementById('formAmount').value = '';
        document.getElementById('formDescription').value = '';
        
        refreshAllData();
      } catch (err) {
        showToast(err.message || 'Error recording expense', 'error');
      }
    });
  }

  // Refresh Button
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  if (refreshDataBtn) {
    refreshDataBtn.addEventListener('click', () => {
      refreshDataBtn.classList.add('animate-spin');
      refreshAllData().finally(() => {
        setTimeout(() => refreshDataBtn.classList.remove('animate-spin'), 500);
      });
    });
  }

  // Quick Modal Button ("Record Expense" in top bar)
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  if (openAddModalBtn) {
    openAddModalBtn.addEventListener('click', () => {
      const formSection = document.getElementById('form-section');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
        const amountInput = document.getElementById('formAmount');
        if (amountInput) amountInput.focus();
      }
    });
  }

  // Seed Demo Data Button
  const seedDemoDataBtn = document.getElementById('seedDemoDataBtn');
  if (seedDemoDataBtn) {
    seedDemoDataBtn.addEventListener('click', async () => {
      try {
        const res = await API.seedDemoData();
        showToast(res.message || 'Demo data loaded successfully!', 'info');
        refreshAllData();
      } catch (err) {
        showToast(err.message || 'Error seeding demo data', 'error');
      }
    });
  }

  // CSV Export Button
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportToCSV);
  }

  // Edit Expense Modal Handlers
  const closeEditModalBtn = document.getElementById('closeEditModalBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const editExpenseForm = document.getElementById('editExpenseForm');

  if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);

  if (editExpenseForm) {
    editExpenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editExpenseId').value;
      const amount = parseFloat(document.getElementById('editAmount').value);
      const category = document.getElementById('editCategory').value;
      const date = document.getElementById('editDate').value;
      const description = document.getElementById('editDescription').value.trim();

      try {
        await API.updateExpense(id, { amount, category, date, description });
        showToast('Expense updated successfully!', 'success');
        closeEditModal();
        refreshAllData();
      } catch (err) {
        showToast(err.message || 'Error updating expense', 'error');
      }
    });
  }

  // Delete Modal Handlers
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!state.expenseToDelete) return;
      try {
        await API.deleteExpense(state.expenseToDelete);
        showToast('Expense removed', 'info');
        closeDeleteModal();
        refreshAllData();
      } catch (err) {
        showToast(err.message || 'Error deleting expense', 'error');
      }
    });
  }
}

// Data Fetching & Sync
async function refreshAllData() {
  await Promise.all([
    refreshSummary(),
    refreshTable()
  ]);
}

async function refreshSummary() {
  try {
    const summary = await API.getSummary(state.filters.month);
    
    // KPI Cards
    const monthTotalEl = document.getElementById('metricMonthTotal');
    const commuteTotalEl = document.getElementById('metricCommuteTotal');
    const nonCommuteTotalEl = document.getElementById('metricNonCommuteTotal');
    const countEl = document.getElementById('metricCount');
    const avgSpendEl = document.getElementById('metricAvgSpend');
    const commutePercentBadge = document.getElementById('metricCommutePercentBadge');
    
    const sidebarPercent = document.getElementById('sidebarCommutePercent');
    const sidebarBar = document.getElementById('sidebarCommuteBar');

    const total = Number(summary.totalAmount || 0);
    const commuteTotal = Number(summary.commuteTotal || 0);
    const nonCommuteTotal = Math.max(0, total - commuteTotal);
    const count = Number(summary.count || 0);
    const avg = count > 0 ? (total / count) : 0;
    const commuteRatio = total > 0 ? ((commuteTotal / total) * 100).toFixed(0) : 0;

    if (monthTotalEl) monthTotalEl.textContent = total.toFixed(2);
    if (commuteTotalEl) commuteTotalEl.textContent = commuteTotal.toFixed(2);
    if (nonCommuteTotalEl) nonCommuteTotalEl.textContent = nonCommuteTotal.toFixed(2);
    if (countEl) countEl.textContent = count;
    if (avgSpendEl) avgSpendEl.textContent = avg.toFixed(2);
    if (commutePercentBadge) commutePercentBadge.textContent = `${commuteRatio}%`;
    if (sidebarPercent) sidebarPercent.textContent = `${commuteRatio}%`;
    if (sidebarBar) sidebarBar.style.width = `${Math.min(100, commuteRatio)}%`;

    // Commute Hub
    const commuteHubTotal = document.getElementById('commuteHubTotal');
    if (commuteHubTotal) commuteHubTotal.textContent = commuteTotal.toFixed(2);

    const metroData = summary.commuteBreakdown?.['Metro Rail'] || { total: 0, count: 0 };
    const uberData = summary.commuteBreakdown?.['Uber'] || { total: 0, count: 0 };
    const diuData = summary.commuteBreakdown?.['DIU Commute'] || { total: 0, count: 0 };

    const metroTotalEl = document.getElementById('metroTotalAmount');
    const metroCountEl = document.getElementById('metroTripsCount');
    const uberTotalEl = document.getElementById('uberTotalAmount');
    const uberCountEl = document.getElementById('uberTripsCount');
    const diuTotalEl = document.getElementById('diuTotalAmount');
    const diuCountEl = document.getElementById('diuTripsCount');

    if (metroTotalEl) metroTotalEl.textContent = Number(metroData.total).toFixed(2);
    if (metroCountEl) metroCountEl.textContent = `${metroData.count} trips`;
    if (uberTotalEl) uberTotalEl.textContent = Number(uberData.total).toFixed(2);
    if (uberCountEl) uberCountEl.textContent = `${uberData.count} rides`;
    if (diuTotalEl) diuTotalEl.textContent = Number(diuData.total).toFixed(2);
    if (diuCountEl) diuCountEl.textContent = `${diuData.count} passes`;

    // Update Doughnut / Pie Chart
    ChartController.update(summary.categoryBreakdown || [], total);

  } catch (err) {
    console.error('Error fetching summary:', err);
  }
}

async function refreshTable() {
  try {
    const expenses = await API.getExpenses(state.filters);
    state.expenses = expenses;
    renderTable();
  } catch (err) {
    console.error('Error fetching table expenses:', err);
    const tbody = document.getElementById('expensesTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-rose-400 font-mono">
            Error loading expenses. Ensure the backend server is running.
          </td>
        </tr>
      `;
    }
  }
}

function renderTable() {
  const tbody = document.getElementById('expensesTableBody');
  const countLabel = document.getElementById('tableRecordCount');
  if (!tbody) return;

  const currency = window.currentCurrencySymbol || '৳';

  if (!state.expenses || state.expenses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center text-slate-500 font-mono">
          <div class="flex flex-col items-center justify-center space-y-2">
            <i data-lucide="inbox" class="w-8 h-8 text-slate-600"></i>
            <span class="text-sm text-slate-400">No transactions recorded</span>
            <span class="text-xs text-slate-600">Use the form above or click "Seed Data" to load demo records.</span>
          </div>
        </td>
      </tr>
    `;
    if (countLabel) countLabel.textContent = 'Showing 0 transactions';
    initIcons();
    return;
  }

  let html = '';
  state.expenses.forEach(item => {
    const iconName = categoryIcons[item.category] || 'tag';
    const badgeClass = categoryBadgeClasses[item.category] || 'badge-others';
    const formattedAmount = Number(item.amount).toFixed(2);

    html += `
      <tr class="hover:bg-slate-800/40 transition-colors group">
        <!-- Date -->
        <td class="py-3 px-4 text-slate-300 font-medium whitespace-nowrap">
          ${item.date}
        </td>

        <!-- Category -->
        <td class="py-3 px-4 whitespace-nowrap">
          <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${badgeClass}">
            <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
            <span>${item.category}</span>
          </span>
        </td>

        <!-- Description -->
        <td class="py-3 px-4 text-slate-300 max-w-xs truncate">
          ${item.description ? escapeHtml(item.description) : '<span class="text-slate-600 italic">No notes</span>'}
        </td>

        <!-- Amount -->
        <td class="py-3 px-4 text-right font-bold text-white whitespace-nowrap">
          <span class="text-slate-400 text-xs font-normal mr-0.5">${currency}</span>${formattedAmount}
        </td>

        <!-- Actions -->
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <div class="flex items-center justify-center space-x-1">
            <button 
              onclick="openEditModal(${item.id})" 
              title="Edit Transaction" 
              class="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition"
            >
              <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button 
              onclick="openDeleteModal(${item.id})" 
              title="Delete Transaction" 
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  if (countLabel) countLabel.textContent = `Showing ${state.expenses.length} transaction${state.expenses.length === 1 ? '' : 's'}`;
  initIcons();
}

// Edit Modal Functions
window.openEditModal = function(id) {
  const expense = state.expenses.find(e => e.id === id);
  if (!expense) return;

  document.getElementById('editExpenseId').value = expense.id;
  document.getElementById('editAmount').value = expense.amount;
  document.getElementById('editCategory').value = expense.category;
  document.getElementById('editDate').value = expense.date;
  document.getElementById('editDescription').value = expense.description || '';

  const modal = document.getElementById('editModal');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    modal.querySelector('.transform').classList.remove('scale-95');
    modal.querySelector('.transform').classList.add('scale-100');
  }, 10);
};

function closeEditModal() {
  const modal = document.getElementById('editModal');
  modal.classList.add('opacity-0');
  modal.querySelector('.transform').classList.remove('scale-100');
  modal.querySelector('.transform').classList.add('scale-95');
  setTimeout(() => modal.classList.add('hidden'), 200);
}

// Delete Modal Functions
window.openDeleteModal = function(id) {
  state.expenseToDelete = id;
  const modal = document.getElementById('deleteModal');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    modal.querySelector('.transform').classList.remove('scale-95');
    modal.querySelector('.transform').classList.add('scale-100');
  }, 10);
};

function closeDeleteModal() {
  state.expenseToDelete = null;
  const modal = document.getElementById('deleteModal');
  modal.classList.add('opacity-0');
  modal.querySelector('.transform').classList.remove('scale-100');
  modal.querySelector('.transform').classList.add('scale-95');
  setTimeout(() => modal.classList.add('hidden'), 200);
}

// CSV Export
function exportToCSV() {
  if (!state.expenses || state.expenses.length === 0) {
    showToast('No data to export', 'info');
    return;
  }

  const headers = ['ID', 'Date', 'Category', 'Description', 'Amount'];
  const rows = state.expenses.map(e => [
    e.id,
    `"${e.date}"`,
    `"${e.category}"`,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    e.amount
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' 
    + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('CSV downloaded successfully!', 'success');
}

// Sleek Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const typeStyles = {
    success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
    error: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
    info: 'bg-slate-900/95 border-sky-500/40 text-sky-200'
  };

  const icons = {
    success: 'check-circle',
    error: 'alert-triangle',
    info: 'info'
  };

  toast.className = `flex items-center space-x-2.5 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-xs font-mono transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto ${typeStyles[type] || typeStyles.info}`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  initIcons();

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Auto dismiss
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3200);
}

// Utility: HTML sanitization
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
