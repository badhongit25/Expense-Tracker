# 🚆 Trackr// - Personal Expense & Commute Tracker

> A modern, full-stack personal finance application built specifically for daily commuters and students with a sleek developer-first aesthetic (VS Code / Ubuntu Dark mode), glassmorphic components, real-time analytics, and SQLite persistence.

![Tech Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20express--session%20%7C%20bcryptjs%20%7C%20SQLite3%20%7C%20TailwindCSS-38bdf8?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)

---

## 📸 Core Features

- 🔐 **Complete Session Authentication**: Built-in authentication powered by `express-session`, cookie-based sessions, and `bcryptjs` salted password hashing.
- 🛡️ **Protected Dashboard**: Full route guards redirect unauthenticated users to `/login`. Only active logged-in users can access the dashboard and APIs.
- 👤 **Clean Modern Dark-Themed UI**: Register and Login pages styled with Tailwind CSS, glassmorphism cards, glowing focus states, password strength indicator, and live password match checking.
- 🚪 **Secure Session Logout**: One-click Logout buttons in desktop and mobile headers that safely destroy the server session and clear cookies.
- 🧪 **Pre-seeded Demo Account**: Ready-to-use demo credentials (`demo` / `password123`) with an "Auto Fill" button for immediate evaluation.
- 🌌 **Developer-First Glassmorphic Dark UI**: Deep space slate tones (`#080c14`), smooth backdrop blur, glowing neon borders, and monospace data typography.
- 🚆 **Commute Analytics Hub**: Dedicated focus on daily commute expenses (**Metro Rail**, **Uber**, **DIU Commute**) with auto-calculated commute ratios and trip frequency.
- 📊 **Interactive Category Doughnut Chart**: Powered by **Chart.js** with animated hover interactions, dynamic center spend indicator, and interactive custom badge legend.
- ⚡ **Instant CRUD & SQLite Database**: Create, Read, Update, and Delete transactions with instant local persistence using **SQLite3**.
- 🔍 **Live Search & Filter Engine**: Filter by predefined categories (*Metro Rail*, *Uber*, *DIU Commute*, *Tuition Snacks*, *Gadgets*, *Others*), search by description/note, or filter by month (*This Month*, *Last Month*, *All Time*).
- 💱 **Multi-Currency Toggle**: Instant toggle between Bangladeshi Taka (`৳ BDT`) and US Dollar (`$ USD`).
- 📥 **CSV Data Export**: Export your complete transaction history or filtered results straight to `.csv` format.
- 📱 **Fully Responsive App Shell**: Collapsible sidebar, mobile slide-out navigation drawer, and adaptable glass cards.

---

## 📁 Project Structure

```text
Expense Tracker/
├── database/
│   ├── db.js             # SQLite3 connection, schema init, async wrappers, seed data
│   └── expenses.db       # Auto-created SQLite database file
├── public/
│   ├── css/
│   │   └── style.css     # Glassmorphism, glow effects, badge styling & scrollbars
│   ├── js/
│   │   ├── api.js        # Frontend REST API client
│   │   ├── charts.js     # Chart.js doughnut chart instance & dynamic legend
│   │   └── app.js        # App state management, DOM logic, modals & toasts
│   └── index.html        # Main dashboard with Tailwind CSS & Lucide icons
├── routes/
│   └── expenses.js       # Express REST API routes (/api/expenses, /api/summary)
├── package.json          # Dependencies and npm scripts
├── server.js             # Express application entry point & static server
└── README.md             # Documentation
```

---

## 🛠️ Tech Stack

- **Frontend**:
  - Semantic HTML5
  - [Tailwind CSS](https://tailwindcss.com/) (Styling & layout)
  - [Chart.js](https://www.chartjs.org/) (Interactive data visualization)
  - [Lucide Icons](https://lucide.dev/) (Developer icons)
  - Vanilla JavaScript (Zero bloated frontend frameworks)
- **Backend**:
  - [Node.js](https://nodejs.org/) (Runtime)
  - [Express.js](https://expressjs.com/) (RESTful API & Static file server)
- **Database**:
  - [SQLite3](https://www.sqlite.org/) (Zero-config, fast, embedded file database)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine (`node -v` &ge; v18.x).

### 2. Install Dependencies
Dependencies (`express`, `sqlite3`, `cors`) are already configured in `package.json`. If installing on a new machine:
```bash
npm install
```

### 3. Start the Server
Run the production server:
```bash
npm start
```
Or run with auto-reload (development mode):
```bash
npm run dev
```

### 4. Open in Browser
Visit your browser at:
```text
http://localhost:3000
```

> **Note**: On first launch, the SQLite database (`database/expenses.db`) will be automatically created and populated with realistic sample transactions so the dashboard is immediately interactive!

---

## 📡 REST API & Authentication Reference

### 🔐 Authentication Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account (`username`, `password`), hashes with bcryptjs, creates session |
| `POST` | `/api/auth/login` | Verify credentials against SQLite `users` table and establish session |
| `POST` | `/api/auth/logout` | Destroy session, clear session cookie |
| `GET` | `/logout` | Convenience GET logout link, redirects to `/login` |
| `GET` | `/api/auth/me` | Check active session and return current user details |

### 📊 Expense Endpoints (Protected by Session)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/summary?month=this-month` | Aggregated monthly totals, commute ratios, and category breakdown for Chart.js |
| `GET` | `/api/expenses?category=...&search=...&month=...` | List expenses matching query filters |
| `POST` | `/api/expenses` | Add a new expense (`amount`, `category`, `date`, `description`) |
| `PUT` | `/api/expenses/:id` | Update an existing expense record |
| `DELETE` | `/api/expenses/:id` | Permanently delete an expense record |
| `POST` | `/api/expenses/seed` | Reset or seed realistic sample demo transactions |

---

## 🎨 Supported Expense Categories

- 🚆 **Metro Rail** (`MRT Line 6 passes, single journey tokens`)
- 🚗 **Uber** (`Uber Moto, UberX, ride shares`)
- 🚌 **DIU Commute** (`Campus shuttle, green garden transport`)
- 🍔 **Tuition Snacks** (`Evening cafeteria snacks, shawarma, tea`)
- 💻 **Gadgets** (`Cables, peripherals, hardware upgrades`)
- 📦 **Others** (`Stationery, books, miscellaneous`)
