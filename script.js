/**
 * ============================================================
 * EXPENSE TRACKER - CLIENT-SIDE CONTROLLER
 * Full-stack personal expense suite with Chart.js, Calendar & Profile
 * Interactive Floor Lamp Login, Tactile Animations & Success Modal
 * ============================================================
 */

(function () {
  'use strict';

  // ------------------------------------------------------------
  // 1. DYNAMIC API CONFIGURATION & CORE UTILITIES
  // ------------------------------------------------------------

  const API_HOST = (window.location.hostname && window.location.hostname !== '') ? window.location.hostname : 'localhost';
  const API_BASE = (window.location.port === '3000') ? '' : `http://${API_HOST}:3000`;

  // ------------------------------------------------------------
  // IN-BROWSER PERSISTENT STORAGE ENGINE (ALWAYS-ONLINE ENGINE)
  // Guarantees 100% 24/7 uptime on GitHub Pages & offline environments
  // ------------------------------------------------------------
  const isGitHubPages = () => typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');

  function getMockSeedExpenses() {
    const today = new Date();
    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const daysAgo = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return fmt(d);
    };

    return [
      { id: 101, amount: 450, category: 'Food & Dining', date: fmt(today), description: 'Lunch combo with team' },
      { id: 102, amount: 150, category: 'Transportation', date: fmt(today), description: 'Metro rail card recharge' },
      { id: 103, amount: 1850, category: 'Groceries', date: daysAgo(1), description: 'Weekly groceries & fruits' },
      { id: 104, amount: 850, category: 'Entertainment', date: daysAgo(3), description: 'Cinema movie ticket & popcorn' },
      { id: 105, amount: 2200, category: 'Utilities', date: daysAgo(5), description: 'High-speed broadband bill' },
      { id: 106, amount: 3500, category: 'Shopping', date: daysAgo(8), description: 'USB-C hub & wireless mouse' },
      { id: 107, amount: 1500, category: 'Health & Fitness', date: daysAgo(12), description: 'Monthly gym membership' },
      { id: 108, amount: 620, category: 'Transportation', date: daysAgo(16), description: 'Uber ride across city' },
      { id: 109, amount: 980, category: 'Food & Dining', date: daysAgo(20), description: 'Dinner with college friends' },
      { id: 110, amount: 4500, category: 'Shopping', date: daysAgo(35), description: 'Mechanical keyboard upgrade' },
      { id: 111, amount: 1400, category: 'Utilities', date: daysAgo(42), description: 'Electricity & utility bills' },
      { id: 112, amount: 800, category: 'Groceries', date: daysAgo(65), description: 'Fresh kitchen supplies' },
      { id: 113, amount: 1200, category: 'Health & Fitness', date: daysAgo(95), description: 'Supplements and vitamins' }
    ];
  }

  function getMockExpenses() {
    try {
      const raw = localStorage.getItem('et_mock_expenses');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const initial = getMockSeedExpenses();
    try {
      localStorage.setItem('et_mock_expenses', JSON.stringify(initial));
    } catch (e) {}
    return initial;
  }

  function saveMockExpenses(list) {
    try {
      localStorage.setItem('et_mock_expenses', JSON.stringify(list));
    } catch (e) {}
  }

  function getMockUser() {
    try {
      const raw = localStorage.getItem('et_session_user');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      id: 1,
      username: 'demo',
      full_name: 'Badhon Paul',
      email: 'badhon@expensetracker.local',
      monthly_budget: 25000,
      avatar_color: 'emerald'
    };
  }

  function saveMockUser(u) {
    try {
      localStorage.setItem('et_session_user', JSON.stringify(u));
    } catch (e) {}
  }

  function createMockResponse(data, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status: status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data))
    };
  }

  async function mockApiHandler(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const urlObj = new URL(endpoint.startsWith('http') ? endpoint : `http://localhost${endpoint}`);
    const pathname = urlObj.pathname;
    let body = {};
    if (options.body) {
      try {
        body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      } catch (e) {}
    }

    // 1. Auth endpoints
    if (pathname === '/api/login') {
      const user = getMockUser();
      if (body.username === 'demo' || (body.username && body.password)) {
        user.username = body.username || 'demo';
        saveMockUser(user);
        localStorage.setItem('et_is_authenticated', 'true');
        return createMockResponse({ success: true, message: 'Logged in successfully!', user });
      }
      return createMockResponse({ success: false, message: 'Invalid username or password' }, 401);
    }

    if (pathname === '/api/register') {
      const user = {
        id: Date.now(),
        username: body.username || 'newuser',
        full_name: body.full_name || body.username || 'New User',
        email: body.email || `${body.username}@expensetracker.local`,
        monthly_budget: 20000,
        avatar_color: 'sky'
      };
      saveMockUser(user);
      localStorage.setItem('et_is_authenticated', 'true');
      return createMockResponse({ success: true, message: 'Registered successfully!', user });
    }

    if (pathname === '/api/logout') {
      localStorage.removeItem('et_is_authenticated');
      return createMockResponse({ success: true, message: 'Logged out successfully' });
    }

    if (pathname === '/api/me') {
      const isAuth = localStorage.getItem('et_is_authenticated') === 'true' || isGitHubPages();
      if (isAuth) {
        return createMockResponse({ authenticated: true, user: getMockUser() });
      }
      return createMockResponse({ authenticated: false }, 401);
    }

    // 2. Expenses list / create
    if (pathname === '/api/expenses') {
      const expenses = getMockExpenses();

      if (method === 'GET') {
        const month = urlObj.searchParams.get('month');
        const category = urlObj.searchParams.get('category');
        const search = urlObj.searchParams.get('search');

        let filtered = [...expenses];
        if (month && month !== 'all') {
          filtered = filtered.filter(e => e.date && e.date.startsWith(month));
        }
        if (category && category !== 'all') {
          filtered = filtered.filter(e => e.category === category);
        }
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(e => 
            (e.description && e.description.toLowerCase().includes(s)) ||
            (e.category && e.category.toLowerCase().includes(s)) ||
            (e.date && e.date.includes(s))
          );
        }
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        return createMockResponse({ success: true, data: filtered });
      }

      if (method === 'POST') {
        const newExp = {
          id: Date.now(),
          amount: parseFloat(body.amount) || 0,
          category: body.category || 'Others',
          date: body.date || new Date().toISOString().split('T')[0],
          description: body.description || ''
        };
        expenses.unshift(newExp);
        saveMockExpenses(expenses);
        return createMockResponse({ success: true, message: 'Expense added successfully!', data: newExp });
      }
    }

    // 3. Single Expense PUT / DELETE: /api/expenses/:id
    if (pathname.startsWith('/api/expenses/')) {
      const idStr = pathname.replace('/api/expenses/', '');
      const id = parseInt(idStr) || idStr;
      let expenses = getMockExpenses();

      if (method === 'PUT') {
        const idx = expenses.findIndex(e => String(e.id) === String(id));
        if (idx !== -1) {
          expenses[idx] = {
            ...expenses[idx],
            amount: parseFloat(body.amount) || expenses[idx].amount,
            category: body.category || expenses[idx].category,
            date: body.date || expenses[idx].date,
            description: (body.description !== undefined) ? body.description : expenses[idx].description
          };
          saveMockExpenses(expenses);
          return createMockResponse({ success: true, message: 'Expense updated successfully!', data: expenses[idx] });
        }
        return createMockResponse({ success: false, message: 'Expense not found' }, 404);
      }

      if (method === 'DELETE') {
        expenses = expenses.filter(e => String(e.id) !== String(id));
        saveMockExpenses(expenses);
        return createMockResponse({ success: true, message: 'Expense deleted successfully!' });
      }
    }

    // 4. Summary endpoint
    if (pathname === '/api/summary') {
      const expenses = getMockExpenses();
      const monthParam = urlObj.searchParams.get('month') || 'all';

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      let allTimeTotal = 0;
      let thisMonthTotal = 0;
      let thisMonthCount = 0;
      let todayTotal = 0;
      let todayCount = 0;

      const catMap = {};
      const trendMap = {};

      const monthsList = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        trendMap[key] = { month: key, total: 0, count: 0 };
        monthsList.push(key);
      }

      let filteredTotal = 0;
      let filteredCount = 0;

      expenses.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        allTimeTotal += amt;

        if (e.date) {
          if (e.date.startsWith(curMonthStr)) {
            thisMonthTotal += amt;
            thisMonthCount++;
          }
          if (e.date === todayStr) {
            todayTotal += amt;
            todayCount++;
          }
          const mKey = e.date.substring(0, 7);
          if (trendMap[mKey]) {
            trendMap[mKey].total += amt;
            trendMap[mKey].count++;
          }
        }

        let match = true;
        if (monthParam && monthParam !== 'all' && e.date && !e.date.startsWith(monthParam)) {
          match = false;
        }
        if (match) {
          filteredTotal += amt;
          filteredCount++;
          const c = e.category || 'Others';
          if (!catMap[c]) catMap[c] = { category: c, total: 0, count: 0 };
          catMap[c].total += amt;
          catMap[c].count++;
        }
      });

      const byCategory = Object.values(catMap).sort((a, b) => b.total - a.total);
      const monthlyTrends = monthsList.map(k => trendMap[k]);

      return createMockResponse({
        success: true,
        data: {
          allTimeTotal,
          allTimeCount: expenses.length,
          thisMonthTotal,
          thisMonthCount,
          todayTotal,
          todayCount,
          filteredTotal,
          filteredCount,
          byCategory,
          monthlyTrends
        }
      });
    }

    // 5. Calendar summary endpoint
    if (pathname === '/api/calendar-summary') {
      const expenses = getMockExpenses();
      const month = urlObj.searchParams.get('month') || new Date().toISOString().substring(0, 7);

      const dailyTotals = {};
      expenses.forEach(e => {
        if (e.date && e.date.startsWith(month)) {
          const amt = parseFloat(e.amount) || 0;
          dailyTotals[e.date] = (dailyTotals[e.date] || 0) + amt;
        }
      });
      return createMockResponse({ success: true, data: dailyTotals });
    }

    // 6. Profile endpoints
    if (pathname === '/api/profile') {
      const user = getMockUser();
      if (method === 'GET') {
        return createMockResponse({ success: true, user });
      }
      if (method === 'PUT') {
        if (body.full_name) user.full_name = body.full_name;
        if (body.email) user.email = body.email;
        if (body.monthly_budget !== undefined) user.monthly_budget = parseFloat(body.monthly_budget) || 0;
        if (body.avatar_color) user.avatar_color = body.avatar_color;
        saveMockUser(user);
        return createMockResponse({ success: true, message: 'Profile updated successfully!', user });
      }
    }

    if (pathname === '/api/profile/password') {
      return createMockResponse({ success: true, message: 'Password updated successfully!' });
    }

    if (pathname === '/api/profile/reset-expenses') {
      saveMockExpenses([]);
      return createMockResponse({ success: true, message: 'All expense records reset successfully!' });
    }

    return createMockResponse({ success: true, message: 'OK' });
  }

  /**
   * Always-Online Unified Fetch: Connects to backend, or gracefully falls back
   */
  async function apiFetch(endpoint, options = {}) {
    // If on GitHub Pages, immediately use in-browser engine for 100% offline 24/7 reliability
    if (isGitHubPages()) {
      return mockApiHandler(endpoint, options);
    }

    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const config = {
        credentials: 'include',
        ...options,
        headers
      };

      const res = await fetch(url, config);
      if (res.status < 500) {
        return res;
      }
      // If 5xx or server down, fallback to client engine
      return mockApiHandler(endpoint, options);
    } catch (err) {
      // If fetch failed completely (backend offline or blocked), seamlessly fallback
      return mockApiHandler(endpoint, options);
    }
  }

  /**
   * Safe JSON parser that avoids syntax crashes on HTML/404 errors
   */
  async function safeJson(response) {
    try {
      const data = await response.json();
      return data;
    } catch (e) {
      return {
        success: false,
        message: `HTTP ${response.status}: Unable to parse response from server.`
      };
    }
  }

  // Currency formatter
  function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Safe Lucide icon initializer
  function refreshIcons() {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }

  // Button Ripple Effect Micro-Interaction
  function initRippleEffect() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.ripple-btn');
      if (!btn) return;

      const circle = document.createElement('span');
      const diameter = Math.max(btn.clientWidth, btn.clientHeight);
      const radius = diameter / 2;
      const rect = btn.getBoundingClientRect();

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.className = 'btn-ripple';

      const existing = btn.querySelector('.btn-ripple');
      if (existing) existing.remove();

      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  }

  // Synthesized Mechanical Click Sound via Web Audio API (Zero external assets needed)
  function playClickSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // AudioContext may be restricted by autoplay policy until user gesture
    }
  }

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold shadow-xl border transition-all duration-300 transform translate-y-4 opacity-0 z-50';

    let iconName = 'info';
    if (type === 'success') {
      toast.classList.add('bg-emerald-950/90', 'border-emerald-500/30', 'text-emerald-200');
      iconName = 'check-circle-2';
    } else if (type === 'error') {
      toast.classList.add('bg-rose-950/90', 'border-rose-500/30', 'text-rose-200');
      iconName = 'alert-triangle';
    } else if (type === 'warning') {
      toast.classList.add('bg-amber-950/90', 'border-amber-500/30', 'text-amber-200');
      iconName = 'alert-circle';
    } else {
      toast.classList.add('bg-slate-900/90', 'border-slate-700/50', 'text-slate-200');
    }

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    refreshIcons();

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-4');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Category Colors and Badge Data
  const CATEGORY_META = {
    'Food & Dining': { color: 'amber', icon: 'utensils', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', chartColor: '#f59e0b' },
    'Transportation': { color: 'emerald', icon: 'train', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', chartColor: '#10b981' },
    'Groceries': { color: 'sky', icon: 'shopping-cart', badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20', chartColor: '#0ea5e9' },
    'Shopping': { color: 'violet', icon: 'shopping-bag', badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20', chartColor: '#8b5cf6' },
    'Utilities': { color: 'blue', icon: 'zap', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20', chartColor: '#3b82f6' },
    'Entertainment': { color: 'rose', icon: 'film', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20', chartColor: '#f43f5e' },
    'Health & Fitness': { color: 'teal', icon: 'heart-pulse', badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20', chartColor: '#14b8a6' },
    'Others': { color: 'slate', icon: 'package', badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20', chartColor: '#94a3b8' }
  };

  function getCategoryMeta(cat) {
    return CATEGORY_META[cat] || CATEGORY_META['Others'];
  }

  const AVATAR_GRADIENTS = {
    sky: 'from-sky-500 via-indigo-600 to-violet-600 shadow-sky-500/25',
    emerald: 'from-emerald-500 via-teal-600 to-cyan-600 shadow-emerald-500/25',
    violet: 'from-purple-500 via-violet-600 to-indigo-600 shadow-purple-500/25',
    amber: 'from-amber-500 via-orange-600 to-rose-600 shadow-amber-500/25',
    rose: 'from-rose-500 via-pink-600 to-red-600 shadow-rose-500/25'
  };

  // ------------------------------------------------------------
  // 2. INTERACTIVE FLOOR LAMP & LOGIN MODULE (index.html)
  // ------------------------------------------------------------
  function initAuthPage() {
    const lampLoginForm = document.getElementById('lampLoginForm');
    if (!lampLoginForm) return false;

    const pullCord = document.getElementById('lampPullCord');
    const pullCordHitbox = document.getElementById('pullCordClickTarget');
    const pullHintBanner = document.getElementById('pullHintBanner');

    const authAlert = document.getElementById('authAlert');
    const authAlertMsg = document.getElementById('authAlertMsg');
    const authAlertIcon = document.getElementById('authAlertIcon');
    const quickDemoBtn = document.getElementById('lampQuickDemoBtn');
    const togglePasswordBtn = document.getElementById('toggleLampPasswordBtn');
    const passwordInput = document.getElementById('lampPassword');
    const usernameInput = document.getElementById('lampUsername');

    // Success Modal Overlay Elements
    const successOverlay = document.getElementById('successAnimationOverlay');
    const successModalCard = document.getElementById('successModalCard');
    const successTitle = document.getElementById('successTitle');
    const successUsernameSpan = document.getElementById('successUsernameSpan');
    const successProgressBar = document.getElementById('successRedirectProgressBar');
    const successCheckBadge = document.getElementById('successCheckBadge');

    // Check if user is already authenticated
    apiFetch('/api/me')
      .then(res => safeJson(res))
      .then(data => {
        if (data && data.authenticated) {
          window.location.href = 'dashboard.html';
        }
      })
      .catch(() => {});

    function showAlert(msg, isError = true) {
      if (!authAlert) return;
      authAlert.classList.remove('hidden', 'bg-rose-950/80', 'border-rose-500/30', 'text-rose-200', 'bg-emerald-950/80', 'border-emerald-500/30', 'text-emerald-200');
      if (isError) {
        authAlert.classList.add('bg-rose-950/80', 'border-rose-500/30', 'text-rose-200');
        if (authAlertIcon) authAlertIcon.setAttribute('data-lucide', 'alert-circle');
      } else {
        authAlert.classList.add('bg-emerald-950/80', 'border-emerald-500/30', 'text-emerald-200');
        if (authAlertIcon) authAlertIcon.setAttribute('data-lucide', 'check-circle-2');
      }
      authAlertMsg.textContent = msg;
      refreshIcons();
    }

    function hideAlert() {
      if (authAlert) authAlert.classList.add('hidden');
    }

    /**
     * Toggle Floor Lamp ON / OFF with Pull-Cord Tactile Physics
     */
    function toggleLamp() {
      playClickSound();

      // Tactile pull cord animation
      if (pullCord) {
        pullCord.classList.add('pulling');
        setTimeout(() => {
          pullCord.classList.remove('pulling');
        }, 160);
      }

      const isNowOn = document.body.classList.toggle('lamp-is-on');

      // Hide hint banner after first interaction
      if (pullHintBanner) {
        pullHintBanner.classList.add('opacity-0', 'pointer-events-none');
      }

      if (isNowOn) {
        // Focus username field after lamp swipe and login card slide-in complete
        setTimeout(() => {
          if (usernameInput) usernameInput.focus();
        }, 1050);
      }
    }

    const lampShade = document.getElementById('lampShadeGroup');

    if (pullCord) pullCord.addEventListener('click', toggleLamp);
    if (pullCordHitbox) pullCordHitbox.addEventListener('click', toggleLamp);
    if (lampShade) lampShade.addEventListener('click', toggleLamp);
    if (pullHintBanner) {
      pullHintBanner.style.cursor = 'pointer';
      pullHintBanner.classList.remove('pointer-events-none');
      pullHintBanner.addEventListener('click', toggleLamp);
    }

    // Toggle password visibility
    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
        togglePasswordBtn.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}" class="w-4 h-4 transition-transform duration-200 scale-110 text-yellow-400"></i>`;
        refreshIcons();
      });
    }

    // Social Login Buttons Handlers
    document.querySelectorAll('.social-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const provider = btn.textContent.trim();
        showToast(`${provider} login initiated. You can also sign in directly using the form.`, 'info');
      });
    });

    /**
     * Trigger 1.5-second Celebratory Success Animation & Redirect
     */
    function triggerSuccessAnimation(username, title = 'Login Successful!') {
      if (!successOverlay || !successModalCard) {
        window.location.href = 'dashboard.html';
        return;
      }

      if (successTitle) successTitle.textContent = title;
      if (successUsernameSpan) successUsernameSpan.textContent = username;

      // Reset animation elements
      if (successProgressBar) {
        successProgressBar.style.width = '0%';
        successProgressBar.style.transition = 'none';
      }

      // Show overlay
      successOverlay.classList.remove('opacity-0', 'pointer-events-none');
      successOverlay.classList.add('opacity-100', 'pointer-events-auto');

      // Pop in card
      requestAnimationFrame(() => {
        successModalCard.classList.remove('scale-75', 'opacity-0');
        successModalCard.classList.add('scale-100', 'opacity-100');

        // Restart checkmark pop-in
        if (successCheckBadge) {
          successCheckBadge.classList.remove('animate-pop-in');
          void successCheckBadge.offsetWidth;
          successCheckBadge.classList.add('animate-pop-in');
        }

        // Animate 1.5s progress bar
        setTimeout(() => {
          if (successProgressBar) {
            successProgressBar.style.transition = 'width 1500ms linear';
            successProgressBar.style.width = '100%';
          }
        }, 50);
      });

      refreshIcons();

      // Hold for exactly 1.5 seconds, then smoothly redirect
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    }

    // Submit Lamp Login Form
    lampLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const username = usernameInput?.value?.trim();
      const password = passwordInput?.value;

      if (!username || !password) {
        showAlert('Please enter both your username and password.');
        return;
      }

      const submitBtn = document.getElementById('lampSubmitBtn');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-slate-950"></i><span>Signing in...</span>`;
      refreshIcons();

      try {
        const res = await apiFetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        const data = await safeJson(res);

        if (res.ok && data.success) {
          triggerSuccessAnimation(data.user.full_name || data.user.username, 'Login Successful!');
        } else {
          showAlert(data.message || 'Login failed. Please check your credentials.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
          refreshIcons();
        }
      } catch (err) {
        showAlert('Could not connect to server. Please verify backend is running on http://localhost:3000.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        refreshIcons();
      }
    });

    // Quick Demo Account Button
    if (quickDemoBtn) {
      quickDemoBtn.addEventListener('click', () => {
        // If lamp is not turned on, turn it on!
        if (!document.body.classList.contains('lamp-is-on')) {
          toggleLamp();
        }
        if (usernameInput) usernameInput.value = 'demo';
        if (passwordInput) passwordInput.value = 'password123';
        lampLoginForm.dispatchEvent(new Event('submit'));
      });
    }

    return true;
  }

  // ------------------------------------------------------------
  // 3. DASHBOARD, CALENDAR & PROFILE MODULE (dashboard.html)
  // ------------------------------------------------------------
  function initDashboardPage() {
    const dashboardView = document.getElementById('dashboardViewSection');
    if (!dashboardView) return false;

    let currentUser = null;
    let categoryChartInstance = null;
    let trendChartInstance = null;
    let cachedExpenses = [];
    let currentCalDate = new Date();
    let currentProfile = null;
    let selectedAvatarColor = 'sky';

    const tabDashboardBtn = document.getElementById('tabDashboardBtn');
    const tabCalendarBtn = document.getElementById('tabCalendarBtn');
    const tabProfileBtn = document.getElementById('tabProfileBtn');
    const quickProfileBtn = document.getElementById('quickProfileBtn');
    const navLogoBtn = document.getElementById('navLogoBtn');
    const calendarViewSection = document.getElementById('calendarViewSection');
    const profileViewSection = document.getElementById('profileViewSection');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    const navUsername = document.getElementById('navUsername');
    const userAvatar = document.getElementById('userAvatar');

    const kpiTotalAll = document.getElementById('kpiTotalAll');
    const kpiTotalCount = document.getElementById('kpiTotalCount');
    const kpiThisMonth = document.getElementById('kpiThisMonth');
    const kpiToday = document.getElementById('kpiToday');
    const kpiTodayCount = document.getElementById('kpiTodayCount');
    const kpiFilteredTotal = document.getElementById('kpiFilteredTotal');
    const kpiFilteredCount = document.getElementById('kpiFilteredCount');

    const searchInput = document.getElementById('searchExpensesInput');
    const filterCategorySelect = document.getElementById('filterCategorySelect');
    const filterMonthSelect = document.getElementById('filterMonthSelect');
    const expensesTableBody = document.getElementById('expensesTableBody');
    const expensesEmptyState = document.getElementById('expensesEmptyState');

    const addExpenseModal = document.getElementById('addExpenseModal');
    const editExpenseModal = document.getElementById('editExpenseModal');
    const dayDetailsModal = document.getElementById('dayDetailsModal');
    const resetExpensesModal = document.getElementById('resetExpensesModal');
    const addExpenseForm = document.getElementById('addExpenseForm');
    const editExpenseForm = document.getElementById('editExpenseForm');
    const editProfileForm = document.getElementById('editProfileForm');
    const changePasswordForm = document.getElementById('changePasswordForm');

    async function checkAuthSession() {
      try {
        const res = await apiFetch('/api/me');
        const data = await safeJson(res);
        if (!data || !data.authenticated) {
          window.location.href = 'index.html';
          return false;
        }
        currentUser = data.user;
        updateTopNavUserBadge(currentUser.full_name || currentUser.username, currentUser.avatar_color || 'sky');
        return true;
      } catch (e) {
        window.location.href = 'index.html';
        return false;
      }
    }

    function updateTopNavUserBadge(name, color = 'sky') {
      if (navUsername) navUsername.textContent = name;
      if (userAvatar) {
        userAvatar.textContent = (name[0] || 'U').toUpperCase();
        userAvatar.className = `w-8 h-8 rounded-xl bg-gradient-to-tr ${AVATAR_GRADIENTS[color] || AVATAR_GRADIENTS.sky} flex items-center justify-center text-xs font-mono font-bold text-white shadow-md`;
      }
    }

    async function handleLogout() {
      try {
        await apiFetch('/api/logout', { method: 'POST' });
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 300);
      } catch (e) {
        window.location.href = 'index.html';
      }
    }

    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (profileLogoutBtn) profileLogoutBtn.addEventListener('click', handleLogout);

    const kpiCardTotal = document.getElementById('kpiCardTotal');
    const kpiCardMonth = document.getElementById('kpiCardMonth');
    const kpiCardToday = document.getElementById('kpiCardToday');
    const kpiCardFiltered = document.getElementById('kpiCardFiltered');
    const activeFilterPillBar = document.getElementById('activeFilterPillBar');
    const activeFilterPillLabel = document.getElementById('activeFilterPillLabel');
    const clearQuickFilterBtn = document.getElementById('clearQuickFilterBtn');

    /**
     * Set active glowing outline and badge for selected KPI quick filter
     */
    function setActiveKpiCard(activeCard, filterLabel = '') {
      [kpiCardTotal, kpiCardMonth, kpiCardToday, kpiCardFiltered].forEach(c => {
        if (c) c.classList.remove('kpi-card-active');
      });

      if (activeCard) {
        activeCard.classList.add('kpi-card-active');
      }

      if (activeFilterPillBar && activeFilterPillLabel) {
        if (filterLabel) {
          activeFilterPillBar.classList.remove('hidden');
          activeFilterPillLabel.textContent = filterLabel;
        } else {
          activeFilterPillBar.classList.add('hidden');
        }
      }
    }

    // Quick Interactive Filters on KPI Cards
    if (kpiCardTotal) {
      kpiCardTotal.addEventListener('click', () => {
        playClickSound();
        if (filterMonthSelect) filterMonthSelect.value = 'all';
        if (filterCategorySelect) filterCategorySelect.value = 'all';
        if (searchInput) searchInput.value = '';
        setActiveKpiCard(kpiCardTotal, 'All Records (Full Lifetime)');
        loadDashboardSummary();
        loadExpensesTable();
        showToast('Viewing all-time expense records', 'info');
      });
    }

    if (kpiCardMonth) {
      kpiCardMonth.addEventListener('click', () => {
        playClickSound();
        const now = new Date();
        const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (filterMonthSelect) filterMonthSelect.value = curMonth;
        setActiveKpiCard(kpiCardMonth, `Current Month (${curMonth})`);
        loadDashboardSummary();
        loadExpensesTable();
        showToast('Filtered to current month expenses', 'success');
      });
    }

    if (kpiCardToday) {
      kpiCardToday.addEventListener('click', () => {
        playClickSound();
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        if (filterMonthSelect) filterMonthSelect.value = 'all';
        if (searchInput) searchInput.value = todayStr;
        setActiveKpiCard(kpiCardToday, `Today (${todayStr})`);
        loadExpensesTable();
        showToast(`Filtered to today's spending (${todayStr})`, 'warning');
      });
    }

    if (kpiCardFiltered) {
      kpiCardFiltered.addEventListener('click', () => {
        playClickSound();
        setActiveKpiCard(kpiCardFiltered, 'Custom Criteria');
        if (searchInput) {
          searchInput.focus();
          searchInput.classList.add('ring-2', 'ring-amber-400');
          setTimeout(() => searchInput.classList.remove('ring-2', 'ring-amber-400'), 1200);
        }
      });
    }

    if (clearQuickFilterBtn) {
      clearQuickFilterBtn.addEventListener('click', () => {
        playClickSound();
        if (filterMonthSelect) filterMonthSelect.value = 'all';
        if (filterCategorySelect) filterCategorySelect.value = 'all';
        if (searchInput) searchInput.value = '';
        setActiveKpiCard(null, '');
        loadDashboardSummary();
        loadExpensesTable();
        showToast('Filters cleared', 'info');
      });
    }

    /**
     * Enhanced Animated Tab Switcher with Silky Slide-up & Unblur
     */
    function switchTab(viewName) {
      playClickSound();

      // Hide all view sections
      [dashboardView, calendarViewSection, profileViewSection].forEach(s => {
        if (s) {
          s.classList.add('hidden');
          s.classList.remove('view-section-animated');
        }
      });

      // Reset all tab buttons to default inactive glass style
      [tabDashboardBtn, tabCalendarBtn, tabProfileBtn].forEach(b => {
        if (b) {
          b.className = 'tab-nav-btn ripple-btn flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all duration-300 active:scale-95';
        }
      });

      if (viewName === 'dashboard') {
        dashboardView.classList.remove('hidden');
        void dashboardView.offsetWidth; // trigger reflow for smooth animation
        dashboardView.classList.add('view-section-animated');

        if (tabDashboardBtn) {
          tabDashboardBtn.className = 'tab-nav-btn ripple-btn flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold transition-all duration-300 shadow-md shadow-sky-500/30 scale-105 active:scale-95';
        }
      } else if (viewName === 'calendar') {
        calendarViewSection.classList.remove('hidden');
        void calendarViewSection.offsetWidth;
        calendarViewSection.classList.add('view-section-animated');

        if (tabCalendarBtn) {
          tabCalendarBtn.className = 'tab-nav-btn ripple-btn flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold transition-all duration-300 shadow-md shadow-emerald-500/30 scale-105 active:scale-95';
        }
        renderCalendar();
      } else if (viewName === 'profile') {
        profileViewSection.classList.remove('hidden');
        void profileViewSection.offsetWidth;
        profileViewSection.classList.add('view-section-animated');

        if (tabProfileBtn) {
          tabProfileBtn.className = 'tab-nav-btn ripple-btn flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold transition-all duration-300 shadow-md shadow-violet-500/30 scale-105 active:scale-95';
        }
        loadUserProfile();
      }

      refreshIcons();
    }

    if (tabDashboardBtn) tabDashboardBtn.addEventListener('click', () => switchTab('dashboard'));
    if (tabCalendarBtn) tabCalendarBtn.addEventListener('click', () => switchTab('calendar'));
    if (tabProfileBtn) tabProfileBtn.addEventListener('click', () => switchTab('profile'));
    if (quickProfileBtn) quickProfileBtn.addEventListener('click', () => switchTab('profile'));
    if (navLogoBtn) navLogoBtn.addEventListener('click', () => switchTab('dashboard'));

    function populateMonthDropdown() {
      if (!filterMonthSelect) return;
      const today = new Date();
      filterMonthSelect.innerHTML = '<option value="all">All Time</option>';

      for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const val = `${y}-${m}`;
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = i === 0 ? `${label} (Current)` : label;
        if (i === 0) opt.selected = true;
        filterMonthSelect.appendChild(opt);
      }
    }

    // ------------------------------------------------------------
    // 4. CHART.JS RENDERING & DATA VISUALIZATION
    // ------------------------------------------------------------
    function renderCategoryChart(categoryBreakdown, filteredTotal) {
      const ctx = document.getElementById('categoryChart');
      const legendContainer = document.getElementById('categoryLegendList');
      const centerTotalEl = document.getElementById('chartCenterTotal');

      if (centerTotalEl) {
        centerTotalEl.textContent = formatCurrency(filteredTotal);
      }

      if (!ctx) return;

      if (categoryChartInstance) {
        categoryChartInstance.destroy();
      }

      if (!categoryBreakdown || categoryBreakdown.length === 0) {
        categoryChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['No Expenses'],
            datasets: [{
              data: [1],
              backgroundColor: ['rgba(51, 65, 85, 0.4)'],
              borderWidth: 0
            }]
          },
          options: {
            cutout: '76%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            responsive: true,
            maintainAspectRatio: false
          }
        });
        if (legendContainer) {
          legendContainer.innerHTML = '<div class="col-span-2 text-center text-slate-500 py-3">No expenses for this period</div>';
        }
        return;
      }

      const labels = categoryBreakdown.map(c => c.category);
      const dataValues = categoryBreakdown.map(c => c.total);
      const bgColors = categoryBreakdown.map(c => getCategoryMeta(c.category).chartColor);

      categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: dataValues,
            backgroundColor: bgColors,
            borderColor: '#0f172a',
            borderWidth: 3,
            hoverOffset: 6
          }]
        },
        options: {
          cutout: '74%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              titleColor: '#f8fafc',
              bodyColor: '#38bdf8',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              padding: 10,
              boxPadding: 4,
              callbacks: {
                label: function (context) {
                  const val = context.raw || 0;
                  const pct = filteredTotal > 0 ? ((val / filteredTotal) * 100).toFixed(1) : 0;
                  return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
                }
              }
            }
          }
        }
      });

      if (legendContainer) {
        legendContainer.innerHTML = categoryBreakdown.slice(0, 6).map(c => {
          const meta = getCategoryMeta(c.category);
          const pct = filteredTotal > 0 ? Math.round((c.total / filteredTotal) * 100) : 0;
          return `
            <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <div class="flex items-center space-x-2 truncate">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${meta.chartColor}"></span>
                <span class="text-slate-300 truncate">${c.category}</span>
              </div>
              <span class="text-slate-400 font-bold ml-1">${pct}%</span>
            </div>
          `;
        }).join('');
      }
    }

    function renderTrendChart(monthlyTrend) {
      const ctx = document.getElementById('trendChart');
      if (!ctx || !monthlyTrend) return;

      if (trendChartInstance) {
        trendChartInstance.destroy();
      }

      const labels = monthlyTrend.map(m => m.label);
      const dataValues = monthlyTrend.map(m => m.total);

      const canvasCtx = ctx.getContext('2d');
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, 250);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
      gradient.addColorStop(1, 'rgba(14, 165, 233, 0.15)');

      trendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Monthly Spending',
            data: dataValues,
            backgroundColor: gradient,
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 28,
            maxBarThickness: 38
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { family: 'Fira Code', size: 11 } }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: '#94a3b8',
                font: { family: 'Fira Code', size: 10 },
                callback: function (val) {
                  if (val >= 1000) return '৳' + (val / 1000).toFixed(0) + 'k';
                  return '৳' + val;
                }
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              titleColor: '#f8fafc',
              bodyColor: '#38bdf8',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: (ctx) => ` Total: ${formatCurrency(ctx.raw)}`
              }
            }
          }
        }
      });
    }

    // ------------------------------------------------------------
    // 5. FETCHING DATA & UPDATING DASHBOARD
    // ------------------------------------------------------------
    async function loadDashboardSummary() {
      try {
        const selectedMonth = filterMonthSelect ? filterMonthSelect.value : 'all';
        const res = await apiFetch(`/api/summary?month=${encodeURIComponent(selectedMonth)}`);
        const json = await safeJson(res);

        if (res.ok && json.success) {
          const d = json.data;
          if (kpiTotalAll) kpiTotalAll.textContent = formatCurrency(d.allTimeTotal);
          if (kpiTotalCount) kpiTotalCount.textContent = `${d.allTimeCount} record${d.allTimeCount === 1 ? '' : 's'} recorded`;
          if (kpiThisMonth) kpiThisMonth.textContent = formatCurrency(d.thisMonthTotal);
          if (kpiToday) kpiToday.textContent = formatCurrency(d.todayTotal);
          if (kpiTodayCount) kpiTodayCount.textContent = `${d.todayCount} transaction${d.todayCount === 1 ? '' : 's'} today`;
          if (kpiFilteredTotal) kpiFilteredTotal.textContent = formatCurrency(d.selectedMonthTotal);
          if (kpiFilteredCount) kpiFilteredCount.textContent = `${d.selectedMonthCount} transaction${d.selectedMonthCount === 1 ? '' : 's'}`;

          renderCategoryChart(d.categoryBreakdown, d.selectedMonthTotal);
          renderTrendChart(d.monthlyTrend);
        }
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      }
    }

    async function loadExpensesTable() {
      try {
        const month = filterMonthSelect ? filterMonthSelect.value : 'all';
        const category = filterCategorySelect ? filterCategorySelect.value : 'all';
        const search = searchInput ? searchInput.value.trim() : '';

        let url = `/api/expenses?month=${encodeURIComponent(month)}&category=${encodeURIComponent(category)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await apiFetch(url);
        const json = await safeJson(res);

        if (res.ok && json.success) {
          cachedExpenses = json.data;
          renderExpensesTable(cachedExpenses);
        }
      } catch (err) {
        console.error('Failed to load expenses table:', err);
      }
    }

    function renderExpensesTable(expenses) {
      if (!expensesTableBody) return;
      expensesTableBody.innerHTML = '';

      if (!expenses || expenses.length === 0) {
        if (expensesEmptyState) expensesEmptyState.classList.remove('hidden');
        return;
      }

      if (expensesEmptyState) expensesEmptyState.classList.add('hidden');

      expenses.forEach(exp => {
        const meta = getCategoryMeta(exp.category);
        const tr = document.createElement('tr');
        tr.className = 'table-row-hover transition-all duration-200 group border-b border-slate-800/60';

        tr.innerHTML = `
          <!-- Date -->
          <td class="py-3 px-3 whitespace-nowrap text-slate-300 font-mono text-[11px]">
            <div class="flex items-center space-x-1.5">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-500"></i>
              <span>${exp.date}</span>
            </div>
          </td>

          <!-- Category Badge -->
          <td class="py-3 px-3 whitespace-nowrap">
            <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${meta.badgeClass}">
              <i data-lucide="${meta.icon}" class="w-3 h-3"></i>
              <span>${exp.category}</span>
            </span>
          </td>

          <!-- Description -->
          <td class="py-3 px-3 text-slate-200">
            <span class="font-medium">${exp.description ? exp.description : '<span class="text-slate-500 italic">No description</span>'}</span>
          </td>

          <!-- Amount -->
          <td class="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-white text-sm">
            ${formatCurrency(exp.amount)}
          </td>

          <!-- Actions -->
          <td class="py-3 px-3 text-center whitespace-nowrap">
            <div class="inline-flex items-center space-x-1">
              <button 
                type="button" 
                data-action="edit" 
                data-id="${exp.id}" 
                title="Edit Expense" 
                class="ripple-btn p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition active:scale-90"
              >
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              <button 
                type="button" 
                data-action="delete" 
                data-id="${exp.id}" 
                title="Delete Expense" 
                class="ripple-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition active:scale-90"
              >
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        `;

        expensesTableBody.appendChild(tr);
      });

      refreshIcons();
    }

    // ------------------------------------------------------------
    // 6. CALENDAR VIEW CONTROLLER
    // ------------------------------------------------------------
    const calMonthDisplay = document.getElementById('calMonthDisplay');
    const calDaysGrid = document.getElementById('calendarDaysGrid');
    const calPrevMonthBtn = document.getElementById('calPrevMonthBtn');
    const calNextMonthBtn = document.getElementById('calNextMonthBtn');
    const calTodayBtn = document.getElementById('calTodayBtn');

    if (calPrevMonthBtn) {
      calPrevMonthBtn.addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() - 1);
        renderCalendar();
      });
    }

    if (calNextMonthBtn) {
      calNextMonthBtn.addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() + 1);
        renderCalendar();
      });
    }

    if (calTodayBtn) {
      calTodayBtn.addEventListener('click', () => {
        currentCalDate = new Date();
        renderCalendar();
      });
    }

    async function renderCalendar() {
      if (!calDaysGrid || !calMonthDisplay) return;

      const year = currentCalDate.getFullYear();
      const month = currentCalDate.getMonth();
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      calMonthDisplay.textContent = currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      let calendarData = {};
      try {
        const res = await apiFetch(`/api/calendar-summary?month=${monthStr}`);
        const json = await safeJson(res);
        if (json && json.success) {
          calendarData = json.data || {};
        }
      } catch (e) {
        console.error('Failed to fetch calendar data:', e);
      }

      calDaysGrid.innerHTML = '';

      const firstDayIndex = new Date(year, month, 1).getDay();
      const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      for (let x = firstDayIndex; x > 0; x--) {
        const dayNum = daysInPrevMonth - x + 1;
        const cell = document.createElement('div');
        cell.className = 'min-h-[85px] sm:min-h-[105px] p-2 rounded-xl bg-slate-900/30 border border-slate-800/40 text-slate-600 font-mono text-xs opacity-40 select-none';
        cell.innerHTML = `<span>${dayNum}</span>`;
        calDaysGrid.appendChild(cell);
      }

      for (let day = 1; day <= daysInCurrentMonth; day++) {
        const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dayStr === todayStr;
        const dayExpense = calendarData[dayStr];

        const cell = document.createElement('div');
        cell.className = `min-h-[85px] sm:min-h-[105px] p-2 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative active:scale-98 ${
          isToday ? 'bg-slate-900/90 border-sky-400/80 ring-1 ring-sky-400/50' : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
        }`;

        let topHtml = `
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold ${isToday ? 'text-sky-400 font-extrabold' : 'text-slate-300'}">${day}</span>
            ${isToday ? '<span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">TODAY</span>' : ''}
          </div>
        `;

        let expenseHtml = '';
        if (dayExpense && dayExpense.total > 0) {
          let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
          if (dayExpense.total > 1500) {
            badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
          } else if (dayExpense.total >= 500) {
            badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
          }

          expenseHtml = `
            <div class="mt-auto pt-1">
              <div class="px-1.5 py-1 rounded-lg border text-[10px] sm:text-xs font-mono font-bold truncate flex items-center justify-between ${badgeColor}">
                <span>${formatCurrency(dayExpense.total)}</span>
              </div>
              <span class="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">${dayExpense.count} item${dayExpense.count === 1 ? '' : 's'}</span>
            </div>
          `;
        } else {
          expenseHtml = `
            <div class="mt-auto text-[10px] text-slate-600 font-mono group-hover:text-slate-400 transition">
              + log
            </div>
          `;
        }

        cell.innerHTML = topHtml + expenseHtml;

        cell.addEventListener('click', () => {
          openDayDetailsModal(dayStr, dayExpense ? dayExpense.total : 0);
        });

        calDaysGrid.appendChild(cell);
      }

      const totalCellsRendered = firstDayIndex + daysInCurrentMonth;
      const targetCells = totalCellsRendered > 35 ? 42 : 35;
      const remainingCells = targetCells - totalCellsRendered;

      for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
        const cell = document.createElement('div');
        cell.className = 'min-h-[85px] sm:min-h-[105px] p-2 rounded-xl bg-slate-900/30 border border-slate-800/40 text-slate-600 font-mono text-xs opacity-40 select-none';
        cell.innerHTML = `<span>${nextDay}</span>`;
        calDaysGrid.appendChild(cell);
      }
    }

    async function openDayDetailsModal(dateStr, totalSpent) {
      if (!dayDetailsModal) return;

      const titleEl = document.getElementById('dayModalTitle');
      const subTitleEl = document.getElementById('dayModalSubtitle');
      const listEl = document.getElementById('dayTransactionsList');
      const dayAddBtn = document.getElementById('dayAddExpenseBtn');

      if (titleEl) titleEl.textContent = `Expenses for ${dateStr}`;
      if (subTitleEl) subTitleEl.textContent = `Loading...`;
      if (listEl) listEl.innerHTML = '<div class="py-6 text-center text-slate-400 font-mono text-xs">Fetching transactions...</div>';

      dayDetailsModal.classList.remove('hidden');

      if (dayAddBtn) {
        dayAddBtn.onclick = () => {
          dayDetailsModal.classList.add('hidden');
          openAddExpenseModal(dateStr);
        };
      }

      try {
        const res = await apiFetch(`/api/expenses?date=${dateStr}`);
        const json = await safeJson(res);

        if (res.ok && json.success) {
          const items = json.data;
          const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
          if (subTitleEl) subTitleEl.textContent = `Total: ${formatCurrency(sum)} (${items.length} record${items.length === 1 ? '' : 's'})`;

          if (items.length === 0) {
            listEl.innerHTML = `
              <div class="py-8 text-center space-y-2">
                <i data-lucide="calendar-x" class="w-8 h-8 mx-auto text-slate-600"></i>
                <p class="text-xs text-slate-400 font-mono">No expenses logged on this date yet.</p>
              </div>
            `;
          } else {
            listEl.innerHTML = items.map(it => {
              const meta = getCategoryMeta(it.category);
              return `
                <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <span class="p-2 rounded-lg border ${meta.badgeClass}">
                      <i data-lucide="${meta.icon}" class="w-4 h-4"></i>
                    </span>
                    <div>
                      <p class="text-xs font-semibold text-white">${it.description || it.category}</p>
                      <p class="text-[10px] font-mono text-slate-400">${it.category}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span class="text-xs font-mono font-bold text-white">${formatCurrency(it.amount)}</span>
                    <button class="ripple-btn p-1 rounded text-slate-400 hover:text-rose-400 active:scale-90" onclick="deleteExpenseDirect(${it.id})">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('');
          }
          refreshIcons();
        }
      } catch (e) {
        if (listEl) listEl.innerHTML = '<div class="py-4 text-center text-rose-400 text-xs">Error loading day details.</div>';
      }
    }

    const closeDayModalBtn = document.getElementById('closeDayModalBtn');
    const closeDayModalBtnBottom = document.getElementById('closeDayModalBtnBottom');
    if (closeDayModalBtn) closeDayModalBtn.addEventListener('click', () => dayDetailsModal.classList.add('hidden'));
    if (closeDayModalBtnBottom) closeDayModalBtnBottom.addEventListener('click', () => dayDetailsModal.classList.add('hidden'));

    // ------------------------------------------------------------
    // 7. USER PROFILE CONTROLLER
    // ------------------------------------------------------------
    async function loadUserProfile() {
      try {
        const res = await apiFetch('/api/profile');
        const json = await safeJson(res);

        if (res.ok && json.success) {
          currentProfile = json.profile;
          renderProfileData(currentProfile);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    }

    function renderProfileData(p) {
      if (!p) return;

      selectedAvatarColor = p.avatar_color || 'sky';

      const displayFullName = document.getElementById('profileDisplayFullName');
      const displayUsername = document.getElementById('profileDisplayUsername');
      const displayEmail = document.getElementById('profileDisplayEmail');
      const memberSince = document.getElementById('profileMemberSince');
      const bigAvatar = document.getElementById('profileBigAvatar');

      if (displayFullName) displayFullName.textContent = p.full_name || p.username;
      if (displayUsername) displayUsername.textContent = '@' + p.username;
      if (displayEmail) displayEmail.textContent = p.email || 'No email provided';

      if (memberSince && p.created_at) {
        const createdDate = new Date(p.created_at);
        memberSince.textContent = `Member since ${createdDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      }

      if (bigAvatar) {
        const initial = ((p.full_name || p.username)[0] || 'U').toUpperCase();
        bigAvatar.textContent = initial;
        bigAvatar.className = `w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr ${AVATAR_GRADIENTS[selectedAvatarColor] || AVATAR_GRADIENTS.sky} flex items-center justify-center text-3xl font-mono font-extrabold text-white border-2 border-white/10 flex-shrink-0`;
      }

      updateTopNavUserBadge(p.full_name || p.username, selectedAvatarColor);

      const statTotal = document.getElementById('profileStatTotal');
      const statCount = document.getElementById('profileStatCount');
      const statThisMonth = document.getElementById('profileStatThisMonth');

      if (statTotal) statTotal.textContent = formatCurrency(p.stats.allTimeTotal);
      if (statCount) statCount.textContent = `${p.stats.allTimeCount} record${p.stats.allTimeCount === 1 ? '' : 's'}`;
      if (statThisMonth) statThisMonth.textContent = formatCurrency(p.stats.thisMonthSpent);

      const progressBar = document.getElementById('budgetProgressBar');
      const spentText = document.getElementById('budgetSpentText');
      const targetText = document.getElementById('budgetTargetText');
      const remainingText = document.getElementById('budgetRemainingText');
      const pctBadge = document.getElementById('budgetPercentBadge');
      const adviceText = document.getElementById('budgetAdviceText');

      const budget = p.monthly_budget || 0;
      const spent = p.stats.thisMonthSpent || 0;
      const pct = p.stats.budgetPercentage || 0;
      const remaining = p.stats.budgetRemaining || 0;

      if (spentText) spentText.textContent = formatCurrency(spent);
      if (targetText) targetText.textContent = formatCurrency(budget);
      if (remainingText) remainingText.textContent = formatCurrency(remaining);

      if (pctBadge) {
        pctBadge.textContent = `${pct}% Utilized`;
        if (pct > 90) {
          pctBadge.className = 'text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30';
        } else if (pct >= 70) {
          pctBadge.className = 'text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30';
        } else {
          pctBadge.className = 'text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        }
      }

      if (progressBar) {
        progressBar.style.width = `${Math.min(100, pct)}%`;
        if (pct > 90) {
          progressBar.className = 'h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 transition-all duration-500';
        } else if (pct >= 70) {
          progressBar.className = 'h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 transition-all duration-500';
        } else {
          progressBar.className = 'h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 transition-all duration-500';
        }
      }

      if (adviceText) {
        if (budget === 0) {
          adviceText.textContent = 'Set your monthly budget in the form below to track your spending limits automatically.';
        } else if (pct > 90) {
          adviceText.textContent = `⚠️ Caution: You have reached ${pct}% of your monthly budget! Only ${formatCurrency(remaining)} remaining.`;
        } else if (pct >= 70) {
          adviceText.textContent = `Notice: You have used ${pct}% of your budget. Maintain control over remaining spending.`;
        } else {
          adviceText.textContent = `🎉 Excellent discipline! You are comfortably within your budget with ${formatCurrency(remaining)} left.`;
        }
      }

      const profFullName = document.getElementById('profFullName');
      const profEmail = document.getElementById('profEmail');
      const profUsername = document.getElementById('profUsername');
      const profMonthlyBudget = document.getElementById('profMonthlyBudget');

      if (profFullName) profFullName.value = p.full_name || '';
      if (profEmail) profEmail.value = p.email || '';
      if (profUsername) profUsername.value = p.username || '';
      if (profMonthlyBudget) profMonthlyBudget.value = p.monthly_budget || '';

      updateAvatarColorPickerUI(selectedAvatarColor);
      refreshIcons();
    }

    function updateAvatarColorPickerUI(color) {
      const picker = document.getElementById('avatarColorPicker');
      if (!picker) return;
      picker.querySelectorAll('button[data-color]').forEach(btn => {
        if (btn.dataset.color === color) {
          btn.className = `w-8 h-8 rounded-full bg-${btn.dataset.color}-500 border-2 border-white ring-2 ring-${btn.dataset.color}-400/60 transition scale-110`;
        } else {
          btn.className = `w-8 h-8 rounded-full bg-${btn.dataset.color}-500 border-2 border-transparent hover:border-white transition`;
        }
      });
    }

    const avatarColorPicker = document.getElementById('avatarColorPicker');
    if (avatarColorPicker) {
      avatarColorPicker.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-color]');
        if (!btn) return;
        selectedAvatarColor = btn.dataset.color;
        updateAvatarColorPickerUI(selectedAvatarColor);
      });
    }

    if (editProfileForm) {
      editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const full_name = document.getElementById('profFullName')?.value?.trim();
        const email = document.getElementById('profEmail')?.value?.trim();
        const monthly_budget = parseFloat(document.getElementById('profMonthlyBudget')?.value) || 0;
        const avatar_color = selectedAvatarColor;

        const submitBtn = document.getElementById('saveProfileBtn');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Saving Changes...</span>`;
        refreshIcons();

        try {
          const res = await apiFetch('/api/profile', {
            method: 'PUT',
            body: JSON.stringify({ full_name, email, monthly_budget, avatar_color })
          });
          const json = await safeJson(res);

          if (res.ok && json.success) {
            showToast('Profile updated successfully!', 'success');
            await loadUserProfile();
            await loadDashboardSummary();
          } else {
            showToast(json.message || 'Failed to update profile.', 'error');
          }
        } catch (err) {
          showToast('Network error while saving profile.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
          refreshIcons();
        }
      });
    }

    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmNewPassword = document.getElementById('confirmNewPassword')?.value;

        if (!currentPassword || !newPassword) {
          showToast('Please fill out all password fields.', 'error');
          return;
        }

        if (newPassword.length < 6) {
          showToast('New password must be at least 6 characters long.', 'error');
          return;
        }

        if (newPassword !== confirmNewPassword) {
          showToast('New passwords do not match.', 'error');
          return;
        }

        const submitBtn = document.getElementById('updatePasswordBtn');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Updating Password...</span>`;
        refreshIcons();

        try {
          const res = await apiFetch('/api/profile/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword, confirmPassword: confirmNewPassword })
          });
          const json = await safeJson(res);

          if (res.ok && json.success) {
            showToast('Password changed successfully!', 'success');
            changePasswordForm.reset();
          } else {
            showToast(json.message || 'Failed to update password.', 'error');
          }
        } catch (err) {
          showToast('Network error while updating password.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
          refreshIcons();
        }
      });
    }

    const openResetModalBtn = document.getElementById('openResetModalBtn');
    const cancelResetModalBtn = document.getElementById('cancelResetModalBtn');
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    const resetConfirmInput = document.getElementById('resetConfirmInput');

    if (openResetModalBtn) {
      openResetModalBtn.addEventListener('click', () => {
        if (resetConfirmInput) resetConfirmInput.value = '';
        if (resetExpensesModal) resetExpensesModal.classList.remove('hidden');
      });
    }

    if (cancelResetModalBtn && resetExpensesModal) {
      cancelResetModalBtn.addEventListener('click', () => resetExpensesModal.classList.add('hidden'));
    }

    if (confirmResetBtn) {
      confirmResetBtn.addEventListener('click', async () => {
        const typed = resetConfirmInput?.value?.trim();
        if (typed !== 'RESET') {
          showToast('Please type RESET in capital letters to confirm.', 'error');
          return;
        }

        try {
          const res = await apiFetch('/api/profile/reset-expenses', {
            method: 'POST',
            body: JSON.stringify({ confirmation: 'RESET' })
          });
          const json = await safeJson(res);

          if (res.ok && json.success) {
            showToast('All expense records have been wiped.', 'info');
            if (resetExpensesModal) resetExpensesModal.classList.add('hidden');
            await loadDashboardSummary();
            await loadExpensesTable();
            await loadUserProfile();
          } else {
            showToast(json.message || 'Failed to reset expenses.', 'error');
          }
        } catch (err) {
          showToast('Network error while resetting expenses.', 'error');
        }
      });
    }

    // ------------------------------------------------------------
    // 8. EXPENSE MANAGEMENT CRUD OPERATIONS
    // ------------------------------------------------------------
    function openAddExpenseModal(presetDate = null) {
      if (!addExpenseModal) return;
      if (addExpenseForm) addExpenseForm.reset();

      const dateInput = document.getElementById('addDate');
      if (dateInput) {
        dateInput.value = presetDate || new Date().toISOString().split('T')[0];
      }

      addExpenseModal.classList.remove('hidden');
      document.getElementById('addAmount')?.focus();
    }

    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const tableAddExpenseBtn = document.getElementById('tableAddExpenseBtn');
    const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
    const closeAddModalBtn = document.getElementById('closeAddModalBtn');
    const cancelAddModalBtn = document.getElementById('cancelAddModalBtn');

    if (openAddModalBtn) openAddModalBtn.addEventListener('click', () => openAddExpenseModal());
    if (tableAddExpenseBtn) tableAddExpenseBtn.addEventListener('click', () => openAddExpenseModal());
    if (emptyStateAddBtn) emptyStateAddBtn.addEventListener('click', () => openAddExpenseModal());
    if (closeAddModalBtn) closeAddModalBtn.addEventListener('click', () => addExpenseModal.classList.add('hidden'));
    if (cancelAddModalBtn) cancelAddModalBtn.addEventListener('click', () => addExpenseModal.classList.add('hidden'));

    if (addExpenseForm) {
      addExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const amount = document.getElementById('addAmount')?.value;
        const category = document.getElementById('addCategory')?.value;
        const date = document.getElementById('addDate')?.value;
        const description = document.getElementById('addDescription')?.value;

        if (!amount || parseFloat(amount) <= 0) {
          showToast('Please enter a valid amount greater than 0.', 'error');
          return;
        }

        const submitBtn = document.getElementById('submitAddExpenseBtn');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Saving...</span>`;
        refreshIcons();

        try {
          const res = await apiFetch('/api/expenses', {
            method: 'POST',
            body: JSON.stringify({ amount, category, date, description })
          });
          const json = await safeJson(res);

          if (res.ok && json.success) {
            showToast('Expense added successfully!', 'success');
            addExpenseModal.classList.add('hidden');
            addExpenseForm.reset();
            await loadDashboardSummary();
            await loadExpensesTable();
            if (!calendarViewSection.classList.contains('hidden')) {
              await renderCalendar();
            }
            if (!profileViewSection.classList.contains('hidden')) {
              await loadUserProfile();
            }
          } else {
            showToast(json.message || 'Failed to add expense.', 'error');
          }
        } catch (err) {
          showToast('Network error while saving expense.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
          refreshIcons();
        }
      });
    }

    function openEditExpenseModal(exp) {
      if (!editExpenseModal || !exp) return;
      document.getElementById('editExpenseId').value = exp.id;
      document.getElementById('editAmount').value = exp.amount;
      document.getElementById('editCategory').value = exp.category;
      document.getElementById('editDate').value = exp.date;
      document.getElementById('editDescription').value = exp.description || '';

      editExpenseModal.classList.remove('hidden');
      document.getElementById('editAmount')?.focus();
    }

    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', () => editExpenseModal.classList.add('hidden'));
    if (cancelEditModalBtn) cancelEditModalBtn.addEventListener('click', () => editExpenseModal.classList.add('hidden'));

    if (editExpenseForm) {
      editExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editExpenseId')?.value;
        const amount = document.getElementById('editAmount')?.value;
        const category = document.getElementById('editCategory')?.value;
        const date = document.getElementById('editDate')?.value;
        const description = document.getElementById('editDescription')?.value;

        if (!amount || parseFloat(amount) <= 0) {
          showToast('Please enter a valid amount greater than 0.', 'error');
          return;
        }

        const submitBtn = document.getElementById('submitEditExpenseBtn');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Updating...</span>`;
        refreshIcons();

        try {
          const res = await apiFetch(`/api/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ amount, category, date, description })
          });
          const json = await safeJson(res);

          if (res.ok && json.success) {
            showToast('Expense updated successfully!', 'success');
            editExpenseModal.classList.add('hidden');
            await loadDashboardSummary();
            await loadExpensesTable();
            if (!calendarViewSection.classList.contains('hidden')) {
              await renderCalendar();
            }
            if (!profileViewSection.classList.contains('hidden')) {
              await loadUserProfile();
            }
          } else {
            showToast(json.message || 'Failed to update expense.', 'error');
          }
        } catch (err) {
          showToast('Network error while updating expense.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
          refreshIcons();
        }
      });
    }

    window.deleteExpenseDirect = async function (id) {
      if (!confirm('Are you sure you want to delete this expense?')) return;
      try {
        const res = await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
        const json = await safeJson(res);
        if (res.ok && json.success) {
          showToast('Expense deleted successfully!', 'info');
          if (dayDetailsModal) dayDetailsModal.classList.add('hidden');
          await loadDashboardSummary();
          await loadExpensesTable();
          if (!calendarViewSection.classList.contains('hidden')) {
            await renderCalendar();
          }
          if (!profileViewSection.classList.contains('hidden')) {
            await loadUserProfile();
          }
        } else {
          showToast(json.message || 'Failed to delete expense.', 'error');
        }
      } catch (e) {
        showToast('Network error while deleting.', 'error');
      }
    };

    if (expensesTableBody) {
      expensesTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = parseInt(btn.dataset.id);

        if (action === 'edit') {
          const item = cachedExpenses.find(x => x.id === id);
          if (item) openEditExpenseModal(item);
        } else if (action === 'delete') {
          window.deleteExpenseDirect(id);
        }
      });
    }

    if (filterMonthSelect) {
      filterMonthSelect.addEventListener('change', () => {
        loadDashboardSummary();
        loadExpensesTable();
      });
    }

    if (filterCategorySelect) {
      filterCategorySelect.addEventListener('change', () => {
        loadExpensesTable();
      });
    }

    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadExpensesTable();
        }, 300);
      });
    }

    [addExpenseModal, editExpenseModal, dayDetailsModal, resetExpensesModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.classList.add('hidden');
        });
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        [addExpenseModal, editExpenseModal, dayDetailsModal, resetExpensesModal].forEach(m => m && m.classList.add('hidden'));
      }
    });

    checkAuthSession().then(authed => {
      if (authed) {
        populateMonthDropdown();
        loadDashboardSummary();
        loadExpensesTable();
      }
    });

    return true;
  }

  // ------------------------------------------------------------
  // 9. LIFECYCLE INITIALIZER
  // ------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    refreshIcons();
    initRippleEffect();
    initAuthPage();
    initDashboardPage();
  });

})();
