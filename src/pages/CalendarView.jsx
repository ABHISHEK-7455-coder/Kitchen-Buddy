import { useState } from "react";
import "./styles/CalendarView.css";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getMealType(key) {
    if (key === "Breakfast") return "breakfast";
    if (key === "Lunch") return "lunch";
    return "dinner";
}

function getMealIcon(key) {
    if (key === "Breakfast") return "🌅";
    if (key === "Lunch") return "🥗";
    return "🍽️";
}

export default function CalendarView({ mealPlans, addMeal }) {

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState("month");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [mealType, setMealType] = useState(null);
    const [mealInput, setMealInput] = useState("");

    const changeMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const changeDay = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + direction);
        setCurrentDate(newDate);
    };

    const generateMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        for (let i = 0; i < firstDay; i++) days.push({ date: null, inactive: true });
        for (let i = 1; i <= daysInMonth; i++) days.push({ date: i, inactive: false });

        return days;
    };

    const generateWeek = () => {
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - currentDate.getDay());
        const week = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            week.push({ date: d.getDate(), month: d.getMonth() });
        }
        return week;
    };

    const getKey = (date) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
        return d.toISOString().split("T")[0];
    };

    const openMealModal = (date, type) => {
        const key = getKey(date);
        setSelectedDay(date);
        setMealType(type);
        const existingMeal = mealPlans[key]?.[type]?.name || "";
        setMealInput(existingMeal);
        setModalOpen(true);
    };

    const saveMeal = () => {
        if (!selectedDay || !mealType) return;
        const key = getKey(selectedDay);
        const prevMeal = mealPlans[key]?.[mealType] || {};
        addMeal(key, mealType, { ...prevMeal, name: mealInput });
        setModalOpen(false);
    };

    const today = new Date().getDate();
    const monthDays = generateMonth();
    const weekDays = generateWeek();

    return (
        <div className="calendarView-container">
            <div className="layout">
                <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
                    <p className="sidebar__section-label">Views</p>
                    <div className="sidebar__views">
                        <button className={`view-btn ${viewMode === "month" ? "active" : ""}`} onClick={() => setViewMode("month")}>📅 Monthly View</button>
                        <button className={`view-btn ${viewMode === "week" ? "active" : ""}`} onClick={() => setViewMode("week")}>📊 Weekly View</button>
                    </div>
                    <div className="kitchen-tip">
                        <p className="tip-label">Kitchen Tip</p>
                        <p className="tip-text">Prep veggies on Sunday to save cooking time.</p>
                    </div>
                </aside>

                <main className="main">
                    <div className="calendar">
                        <div className="calendar__header">
                            <h1 className="calendar__title">
                                {currentDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </h1>
                            <div className="calendar__controls">
                                <button className="nav-arrow" onClick={() => changeMonth(-1)}>«</button>
                                <button className="nav-arrow" onClick={() => changeDay(-1)}>‹</button>
                                <button className="today-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
                                <button className="nav-arrow" onClick={() => changeDay(1)}>›</button>
                                <button className="nav-arrow" onClick={() => changeMonth(1)}>»</button>
                            </div>
                        </div>

                        <div className="calendar__day-headers">{DAYS.map(d => <div key={d} className="day-header">{d}</div>)}</div>

                        <div className="calendar__grid">
                            {(viewMode === "month" ? monthDays : weekDays).map((day, i) => {
                                if (!day.date) return <div key={i} className="cal-day inactive"></div>;
                                const key = getKey(day.date);
                                const dayMeals = mealPlans[key];

                                return (
                                    <div key={i} className={`cal-day ${day.date === today ? "today" : ""}`}>
                                        <div className="day-num">{day.date}</div>
                                        {["Breakfast", "Lunch", "Dinner"].map(type => {
                                            const meal = dayMeals?.[type];
                                            return meal?.name ? (
                                                <button key={type} className={`meal-tag ${getMealType(type)}`} onClick={() => openMealModal(day.date, type)}>
                                                    <span className="meal-icon">{getMealIcon(type)}</span>{meal.name}
                                                </button>
                                            ) : (
                                                <button key={type} className="add-slot" onClick={() => openMealModal(day.date, type)}>+ {type}</button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="meal-modal">
                        <h3>Edit {mealType}</h3>
                        <input type="text" placeholder="Enter meal name" value={mealInput} onChange={(e) => setMealInput(e.target.value)} />
                        <div className="modal-buttons">
                            <button onClick={saveMeal}>Save</button>
                            <button onClick={() => setModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}