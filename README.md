# 💡 Expense Tracker - Full-Stack Personal Finance Suite

> A modern, full-stack personal finance application featuring an interactive **animated floor lamp login**, a multi-color **glassmorphic dashboard**, Chart.js visualizations, calendar expense tracking, and budget management.

![Tech Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20PostgreSQL%20%7C%20SQLite3%20%7C%20TailwindCSS-38bdf8?style=flat-square)
![Branding](https://img.shields.io/badge/Developed%20By-Badhon%20Paul-amber?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)

---

## 🌟 Key Highlights & Features

### 💡 1. Interactive Floor Lamp Login (`index.html`)
- **Initial State:** Minimalist dark room with an architectural floor lamp on the left. The login card is hidden on the right.
- **Physical Pull-Cord Switch:** Clicking the hanging cord triggers a mechanical click sound (synthesized via Web Audio API) and a tactile cord pull animation.
- **Volumetric Light Swipe Down:** The lamp shade illuminates, casting a smooth downward volumetric swipe of light down to the floor line with a radiant floor pool and floating magical sparkles.
- **Sequenced Staggered Entrance:** Once the light swipe illuminates the room, the dark glassmorphic login card smoothly glides in from the right with unblurring entrance animation.
- **Micro-Interactions & Success Animation:** Input focus glow, ripple buttons, password show/hide toggle, and a 1.5-second glowing checkmark modal with progress bar upon successful login.

### 📊 2. Multi-Color Glassmorphic Dashboard (`dashboard.html`)
- **Vibrant KPI Glass Cards:**
  - **Total Expenses:** Electric Cyan Glass with all-time total and count.
  - **This Month:** Lush Emerald Glass tracking current billing cycle.
  - **Today's Spending:** Royal Violet Glass highlighting daily transactions.
  - **Selected Period:** Sunset Amber Glass reflecting custom filter periods.
- **Interactive Click-to-Filter on KPI Cards:** Clicking any KPI card triggers a glowing outline, tactile bounce, and automatically filters the transactions table (e.g. clicking "This Month" filters transactions to the current month).
- **Active Filter Bar:** Visual filter pill appears when filtered, complete with a 1-click reset button.
- **Chart.js Visualizations:**
  - **Category Breakdown Doughnut:** Animated doughnut chart with center total spend and interactive legend pills.
  - **6-Month Spending Trends:** Bar chart tracking historical monthly expenses.
- **Expense History Table:** Live search, category dropdown filter, month filter, row hover slide animation, and modal dialogs for Adding, Editing, and Deleting transactions.

### 📅 3. Interactive Calendar View
- Visual monthly calendar grid showing daily spending color-coded pills:
  - 🟢 **Low (< ৳500):** Emerald badge
  - 🟡 **Medium (৳500 - ৳1500):** Amber badge
  - 🔴 **High (> ৳1500):** Rose badge
- Click any date cell to view itemized transactions or log a new expense for that specific day.

### 👤 4. User Profile & Monthly Budget Manager
- Customizable profile avatar with color swatch picker (Sky, Emerald, Violet, Amber, Rose).
- Lifetime expense statistics and transaction counters.
- **Monthly Budget Target Meter:** Visual multi-color progress meter calculating percentage utilized, remaining balance, and financial discipline advice.
- Password change modal and transaction history reset (with safety confirmation).

---

## 📁 Project Structure

```text
Expense Tracker/
├── database/
│   └── db.js             # Dual DB connector (PostgreSQL pool with SQLite transparent fallback)
├── public/               # Synced public web assets
│   ├── index.html        # Floor lamp animated login
│   ├── dashboard.html    # Main full-featured dashboard
│   └── script.js         # Unified client-side logic
├── routes/
│   ├── auth.js           # Authentication REST routes
│   └── expenses.js       # Expense CRUD REST routes
├── .env.example          # Sample environment variables
├── .gitignore            # Git ignore configuration
├── dashboard.html        # Dashboard view
├── index.html            # Main landing & animated login
├── package.json          # Node dependencies & npm scripts
├── script.js             # Client controller
├── server.js             # Express.js backend server with session authentication
└── README.md             # Project documentation
```

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, `express-session`, `bcryptjs`, CORS
- **Database:** PostgreSQL (Primary with auto-migration) with SQLite3 transparent fallback
- **Frontend:** Semantic HTML5, Tailwind CSS, Vanilla JavaScript, Chart.js, Lucide Icons
- **Audio:** Web Audio API (Synthesized mechanical pull-cord click sound)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/badhongit25/Expense-Tracker.git
cd Expense-Tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and adjust your credentials if using PostgreSQL (otherwise SQLite is used automatically):
```bash
cp .env.example .env
```

### 4. Start the Server
```bash
npm start
```

### 5. Access the Application
Open your browser and navigate to:
```text
http://localhost:3000
```

- **Demo Credentials:** `demo` / `password123` (or click the "Use Demo Account" quick button on the login card).

---

## 📄 License & Attribution

Developed with ❤️ by **badhon**.

Strictly branded: `developed by badhon`
