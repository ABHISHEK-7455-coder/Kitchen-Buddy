import { useState } from "react";
import "../pages/styles/CalendarView.css";

// ── Data ──────────────────────────────────────────────────────
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const MEALS = {
    2: { B: "Oatmeal", L: "Salad Bowl", D: "Pasta" },
    3: { B: "Poached Eggs", L: "Miso Soup", D: "Salmon Fillet" },
    4: { B: "Smoothie", D: "Ribeye Steak" },
    5: { B: "Pancakes" },
};

const GROCERY_ITEMS = [
    "Whole Milk (1L)",
    "Organic Spinach",
    "Avocado (3 units)",
];

const RECIPES = [
    {
        id: 1,
        name: "Quinoa Buddha Bowl",
        time: "15m",
        rating: "4.8",
        badge: "quick",
        img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
    },
    {
        id: 2,
        name: "Hearty Lentil Soup",
        time: "35m",
        rating: "4.9",
        badge: "warm",
        img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
    },
];

// ── Helpers ───────────────────────────────────────────────────
function getMealType(key) {
    if (key === "B") return "breakfast";
    if (key === "L") return "lunch";
    return "dinner";
}

function getMealIcon(key) {
    if (key === "B") return "🌅";
    if (key === "L") return "🥗";
    return "🍽️";
}

// ── CalDay ────────────────────────────────────────────────────
function CalDay({ date, inactive, isToday, meals }) {
    return (
        <div className={`cal-day${inactive ? " inactive" : ""}${isToday ? " today" : ""}`}>
            <div className={`day-num${isToday ? " today-label" : ""}`}>
                {isToday ? `${date} (Today)` : date}
            </div>

            {meals &&
                ["B", "L", "D"].map((key) =>
                    meals[key] ? (
                        <button key={key} className={`meal-tag ${getMealType(key)}`}>
                            <span className="meal-icon">{getMealIcon(key)}</span>
                            {key}: {meals[key]}
                        </button>
                    ) : key === "L" && isToday ? (
                        <button key={key} className="add-slot">+ Lunch Slot</button>
                    ) : null
                )}
        </div>
    );
}

// ── App ───────────────────────────────────────────────────────
export default function CalendarView() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState("Monthly View");
    const [activeNav, setActiveNav] = useState("Planner");
    const [checked, setChecked] = useState({});

    const toggleCheck = (item) =>
        setChecked((prev) => ({ ...prev, [item]: !prev[item] }));

    const closeSidebar = () => setSidebarOpen(false);

    // Build calendar rows: row 0 = 24..30 (inactive), row 1 = 1..7, row 2 = 8..14
    const rows = [
        { dates: [24, 25, 26, 27, 28, 29, 30], inactive: true },
        { dates: [1, 2, 3, 4, 5, 6, 7], inactive: false },
        { dates: [8, 9, 10, 11, 12, 13, 14], inactive: false },
    ];

    return (
        <div className="app">
            {/* ── Header ── */}
            <header className="header">
                <button className="hamburger" onClick={() => setSidebarOpen((o) => !o)}>
                    <span /><span /><span />
                </button>

                <a className="header__logo" href="#">
                    <div className="logo-icon">🍳</div>
                    <span className="logo-text">Kitchen Buddy</span>
                </a>

                <nav className="header__nav">
                    {["Dashboard", "Planner", "Recipes", "Grocery List"].map((item) => (
                        <button
                            key={item}
                            className={`nav-link${activeNav === item ? " active" : ""}`}
                            onClick={() => setActiveNav(item)}
                        >
                            {item}
                        </button>
                    ))}
                </nav>

                <div className="header__search">
                    <span>🔍</span>
                    <input type="text" placeholder="Search recipes..." />
                </div>

                <div className="header__actions">
                    <button className="icon-btn">🔔</button>
                    <div className="avatar">👩</div>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="layout">
                {/* Overlay */}
                <div
                    className={`sidebar-overlay${sidebarOpen ? " show" : ""}`}
                    onClick={closeSidebar}
                />

                {/* ── Sidebar ── */}
                <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
                    {/* Views */}
                    <div>
                        <p className="sidebar__section-label">Views</p>
                        <div className="sidebar__views">
                            {[
                                { label: "Monthly View", icon: "📅" },
                                { label: "Weekly View", icon: "📊" },
                                { label: "Meal Goals", icon: "🎯" },
                            ].map(({ label, icon }) => (
                                <button
                                    key={label}
                                    className={`view-btn${activeView === label ? " active" : ""}`}
                                    onClick={() => { setActiveView(label); closeSidebar(); }}
                                >
                                    <span className="icon">{icon}</span>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grocery */}
                    <div className="sidebar__grocery">
                        <div className="grocery-header">
                            <p className="sidebar__section-label">Grocery List</p>
                            <button className="see-all">See All</button>
                        </div>
                        {GROCERY_ITEMS.map((item) => (
                            <div key={item} className="grocery-item">
                                <input
                                    type="checkbox"
                                    checked={!!checked[item]}
                                    onChange={() => toggleCheck(item)}
                                />
                                <span style={checked[item] ? { textDecoration: "line-through", color: "#9CA3AF" } : {}}>
                                    {item}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Kitchen Tip */}
                    <div className="kitchen-tip">
                        <p className="tip-label">Kitchen Tip</p>
                        <p className="tip-text">
                            Prep your veggies on Sundays to save up to 45 mins daily during the week!
                        </p>
                    </div>
                </aside>

                {/* ── Main ── */}
                <main className="main">
                    <div className="calendar">
                        {/* Calendar Header */}
                        <div className="calendar__header">
                            <h1 className="calendar__title">October 2023</h1>
                            <div className="calendar__controls">
                                <button className="nav-arrow">‹</button>
                                <button className="today-btn">Today</button>
                                <button className="nav-arrow">›</button>
                            </div>
                            <button className="quick-add-btn">
                                ＋ Quick Add Meal
                            </button>
                        </div>

                        {/* Day Headers */}
                        <div className="calendar__day-headers">
                            {DAYS.map((d) => (
                                <div key={d} className="day-header">{d}</div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="calendar__grid">
                            {rows.map((row, ri) =>
                                row.dates.map((date) => (
                                    <CalDay
                                        key={`${ri}-${date}`}
                                        date={date}
                                        inactive={row.inactive}
                                        isToday={date === 3 && !row.inactive}
                                        meals={MEALS[date]}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </main>

                {/* ── Right Panel ── */}
                <aside className="right-panel">
                    {/* Meal Goals */}
                    <div>
                        <p className="panel-title">Meal Goals</p>
                        <div className="goal-item">
                            <p className="goal-label">Weekly Target</p>
                            <p className="goal-value">5/7 Meatless Dinners</p>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: "71%" }} />
                            </div>
                        </div>
                        <div className="goal-item">
                            <p className="goal-label">Calories Intake</p>
                            <p className="goal-value">1,850 / 2,100 kcal</p>
                            <div className="progress-bar">
                                <div className="progress-fill blue" style={{ width: "88%" }} />
                            </div>
                        </div>
                    </div>

                    {/* Recommended Recipes */}
                    <div>
                        <p className="panel-title">Recommended Recipes</p>
                        {RECIPES.map((recipe) => (
                            <div key={recipe.id} className="recipe-card">
                                <div className="recipe-img-wrap">
                                    <img src={recipe.img} alt={recipe.name} />
                                    <span className={`recipe-badge ${recipe.badge}`}>
                                        {recipe.badge.toUpperCase()}
                                    </span>
                                </div>
                                <div className="recipe-info">
                                    <p className="recipe-name">{recipe.name}</p>
                                    <div className="recipe-meta">
                                        <span>⏱ {recipe.time}</span>
                                        <span>⭐ {recipe.rating}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
}