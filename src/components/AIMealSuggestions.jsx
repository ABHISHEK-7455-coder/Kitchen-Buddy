/* eslint-disable */
import { useState, useEffect, useRef } from "react";
import "../pages/styles/AIMealSuggestions.css";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// ─── Same image system as AIFoodFeed ─────────────────────────────────────────
var IMG_CACHE = {};

var FOODISH_MAP = {
    "biryani": "biryani", "rice": "biryani", "pulao": "biryani",
    "burger": "burger", "sandwich": "burger",
    "butter chicken": "butter-chicken", "murgh makhani": "butter-chicken", "chicken curry": "butter-chicken",
    "roti": "chapati", "chapati": "chapati", "paratha": "chapati", "naan": "chapati",
    "dal makhani": "dal-makhani", "dal": "dal-makhani", "lentil": "dal-makhani",
    "dosa": "dosa", "idli": "idly", "idly": "idly",
    "fried rice": "fried-rice", "noodles": "fried-rice",
    "paneer": "kadai-paneer", "kadai": "kadai-paneer", "palak": "kadai-paneer",
    "pakoda": "pakode", "pakora": "pakode",
    "pasta": "pasta", "spaghetti": "pasta",
    "pizza": "pizza",
    "pav bhaji": "pav-bhaji", "bhaji": "pav-bhaji",
    "samosa": "samosa", "upma": "upma", "poha": "upma",
};

var FALLBACKS = [
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1567620905732-f81944a37bdb?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1546069596-600bbec60b03?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1555939594-58329b054e4f?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop",
];

function getFallback(name) {
    var h = 0;
    for (var i = 0; i < (name || "").length; i++) h += name.charCodeAt(i) * (i + 1);
    return FALLBACKS[Math.abs(h) % FALLBACKS.length];
}

function getFoodishCategory(name) {
    var n = (name || "").toLowerCase();
    for (var key in FOODISH_MAP) { if (n.indexOf(key) !== -1) return FOODISH_MAP[key]; }
    return null;
}

function fetchDishImage(name, imgSearch, cb) {
    if (IMG_CACHE.hasOwnProperty(name)) { cb(IMG_CACHE[name]); return; }
    var cat = getFoodishCategory(name);
    if (cat) {
        fetch("https://foodish-api.com/api/images/" + cat)
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.image) { IMG_CACHE[name] = d.image; cb(d.image); }
                else tryUnsplash(name, imgSearch, cb);
            })
            .catch(function () { tryUnsplash(name, imgSearch, cb); });
    } else { tryUnsplash(name, imgSearch, cb); }
}

function tryUnsplash(name, imgSearch, cb) {
    var key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!key || key === "undefined") { IMG_CACHE[name] = null; cb(null); return; }
    var q = encodeURIComponent((imgSearch || name) + " food dish");
    fetch("https://api.unsplash.com/search/photos?query=" + q + "&per_page=1&orientation=landscape&client_id=" + key)
        .then(function (r) { return r.json(); })
        .then(function (d) {
            var url = d && d.results && d.results[0] && d.results[0].urls && d.results[0].urls.raw;
            var final = url ? url + "&w=400&h=300&fit=crop&auto=format&q=80" : null;
            IMG_CACHE[name] = final; cb(final);
        })
        .catch(function () { IMG_CACHE[name] = null; cb(null); });
}

// ─── DishImage ────────────────────────────────────────────────────────────────
function DishImage({ name, imgSearch, className }) {
    var init = (IMG_CACHE.hasOwnProperty(name) && IMG_CACHE[name]) ? IMG_CACHE[name] : getFallback(name);
    var s = useState(init); var src = s[0]; var setSrc = s[1];
    var fetched = useRef(false);

    useEffect(function () {
        if (!name || fetched.current) return;
        if (IMG_CACHE.hasOwnProperty(name) && IMG_CACHE[name]) { setSrc(IMG_CACHE[name]); return; }
        fetched.current = true;
        fetchDishImage(name, imgSearch, function (url) { if (url) setSrc(url); });
    }, [name]);

    return (
        <img src={src} alt={name} className={className} loading="lazy"
            onError={function (e) { e.target.onerror = null; e.target.src = getFallback(name); }} />
    );
}

// ─── Groq API ─────────────────────────────────────────────────────────────────
function askGroq(sys, usr) {
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + GROQ_API_KEY },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 4000,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
        }),
    })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "{}";
            return JSON.parse(text);
        });
}

// ─── User prefs builder ───────────────────────────────────────────────────────
function buildCtx(prefs) {
    function getVal(v) {
        if (!v) return "";
        if (Array.isArray(v)) return v.map(function (x) { return x.label || x; }).join(", ");
        return v.label || v;
    }
    var lines = [];
    if (prefs.name) lines.push("Name: " + prefs.name);
    if (prefs.country) lines.push("Country: " + getVal(prefs.country));
    if (prefs.region) lines.push("Region: " + getVal(prefs.region));
    if (prefs.diet) lines.push("Diet: " + getVal(prefs.diet));
    if (prefs.spice) lines.push("Spice level: " + getVal(prefs.spice));
    if (prefs.cuisines) lines.push("Favourite cuisines: " + getVal(prefs.cuisines));
    if (prefs.skill) lines.push("Cooking skill: " + getVal(prefs.skill));
    if (prefs.cookTime) lines.push("Max cook time: " + getVal(prefs.cookTime));
    if (prefs.dislikes && prefs.dislikes.length) lines.push("Dislikes: " + getVal(prefs.dislikes));
    if (prefs.allergies && prefs.allergies.length) lines.push("Allergies: " + getVal(prefs.allergies));
    return lines.join("\n") || "General food lover";
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonSuggCard() {
    return (
        <div className="ams-card ams-skeleton">
            <div className="ams-card-img-wrap ams-skeleton-img" />
            <div className="ams-card-body">
                <div className="ams-skeleton-line ams-skeleton-title" />
                <div className="ams-skeleton-line ams-skeleton-sub" />
                <div className="ams-skeleton-line ams-skeleton-meta" />
            </div>
        </div>
    );
}

// ─── Dish Detail Modal ────────────────────────────────────────────────────────
function DishModal({ dish, onClose, onAddPlan }) {
    useEffect(function () {
        document.body.style.overflow = "hidden";
        return function () { document.body.style.overflow = ""; };
    }, []);

    if (!dish) return null;
    var nutr = dish.nutrition || {};

    return (
        <div className="ams-modal-backdrop" onClick={onClose}>
            <div className="ams-modal-sheet" onClick={function (e) { e.stopPropagation(); }}>
                <button className="ams-modal-close" onClick={onClose}>×</button>

                {/* Image */}
                <div className="ams-modal-img-wrap">
                    <DishImage name={dish.name} imgSearch={dish.imgSearch} className="ams-modal-img" />
                    <div className="ams-modal-img-overlay" />
                    <div className="ams-modal-badges">
                        <span className={"ams-badge " + (dish.isVeg ? "veg" : "nonveg")}>
                            {dish.isVeg ? "🌿 Veg" : "🍗 Non-Veg"}
                        </span>
                        <span className="ams-badge neutral">⏱ {dish.time}</span>
                        <span className="ams-badge neutral">📊 {dish.difficulty}</span>
                    </div>
                </div>

                <div className="ams-modal-body">
                    <div className="ams-modal-cuisine">{dish.cuisine}</div>
                    <h2 className="ams-modal-title">{dish.name}</h2>
                    <p className="ams-modal-desc">{dish.description}</p>

                    {/* Nutrition */}
                    {(nutr.calories || nutr.protein) && (
                        <div className="ams-nutrition-row">
                            {[
                                { icon: "🔥", label: "Calories", val: nutr.calories },
                                { icon: "💪", label: "Protein", val: nutr.protein },
                                { icon: "🌾", label: "Carbs", val: nutr.carbs },
                                { icon: "💧", label: "Fat", val: nutr.fat },
                            ].map(function (r) {
                                if (!r.val) return null;
                                return (
                                    <div className="ams-nutr-item" key={r.label}>
                                        <span className="ams-nutr-icon">{r.icon}</span>
                                        <span className="ams-nutr-val">{r.val}</span>
                                        <span className="ams-nutr-label">{r.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Ingredients */}
                    {dish.ingredients && dish.ingredients.length > 0 && (
                        <div className="ams-modal-section">
                            <h3 className="ams-modal-section-title">🧂 Ingredients</h3>
                            <div className="ams-ingredients-wrap">
                                {dish.ingredients.map(function (ing, i) {
                                    return <span className="ams-ingredient-chip" key={i}>{ing}</span>;
                                })}
                            </div>
                        </div>
                    )}

                    {/* Steps */}
                    {dish.steps && dish.steps.length > 0 && (
                        <div className="ams-modal-section">
                            <h3 className="ams-modal-section-title">👨‍🍳 How to Cook</h3>
                            <ol className="ams-steps-list">
                                {dish.steps.map(function (step, i) {
                                    return (
                                        <li className="ams-step-item" key={i}>
                                            <span className="ams-step-num">{i + 1}</span>
                                            <span className="ams-step-text">{step}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    )}

                    {/* Add to plan */}
                    <button
                        className="ams-modal-add-btn"
                        onClick={function () { onAddPlan(dish); onClose(); }}
                    >
                        📅 Add to Meal Plan
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Single suggestion card ───────────────────────────────────────────────────
function SuggCard({ dish, index, onClick, onAddPlan }) {
    return (
        <div
            className="ams-card"
            style={{ animationDelay: (index * 0.07) + "s" }}
            onClick={function () { onClick(dish); }}
        >
            <div className="ams-card-img-wrap">
                <DishImage name={dish.name} imgSearch={dish.imgSearch} className="ams-card-img" />
                <div className="ams-card-img-overlay" />
                <span className={"ams-card-veg-dot " + (dish.isVeg ? "veg" : "nonveg")}>
                    {dish.isVeg ? "🌿" : "🍗"}
                </span>
            </div>
            <div className="ams-card-body">
                <div className="ams-card-name">{dish.name}</div>
                <div className="ams-card-meta">
                    <span>⏱ {dish.time}</span>
                    {dish.nutrition && dish.nutrition.calories && <span>🔥 {dish.nutrition.calories}</span>}
                </div>
                <button
                    className="ams-card-add-btn"
                    onClick={function (e) { e.stopPropagation(); onAddPlan(dish); }}
                    title="Add to Meal Plan"
                >+ Plan</button>
            </div>
        </div>
    );
}

// ─── AddToPlan mini-modal ─────────────────────────────────────────────────────
function AddToPlanModal({ dish, mealType, onConfirm, onClose, addMeal }) {
    var now = new Date();
    var todayKey = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

    var days = [];
    for (var i = 0; i < 7; i++) {
        var d = new Date(); d.setDate(d.getDate() + i);
        var k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        days.push({ key: k, label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) });
    }

    var ds = useState(todayKey); var selDate = ds[0]; var setSelDate = ds[1];
    var ms = useState(mealType || "Breakfast"); var selMeal = ms[0]; var setSelMeal = ms[1];

    function confirm() {
        addMeal(selDate, selMeal, {
            name: dish.name, time: dish.time,
            calories: dish.nutrition && dish.nutrition.calories,
            cuisine: dish.cuisine, description: dish.description,
            ingredients: dish.ingredients, steps: dish.steps,
            isVeg: dish.isVeg, difficulty: dish.difficulty, source: "ai_suggestions",
        });
        onConfirm(dish.name, selMeal, days.find(function (d) { return d.key === selDate; }).label);
        onClose();
    }

    return (
        <div className="ams-atp-backdrop" onClick={onClose}>
            <div className="ams-atp-box" onClick={function (e) { e.stopPropagation(); }}>
                <div className="ams-atp-header">
                    <span>Add <strong>{dish.name}</strong> to plan</span>
                    <button className="ams-atp-close" onClick={onClose}>×</button>
                </div>

                <div className="ams-atp-label">📅 Day</div>
                <div className="ams-atp-day-row">
                    {days.map(function (d) {
                        return (
                            <button key={d.key}
                                className={"ams-atp-day-btn " + (selDate === d.key ? "active" : "")}
                                onClick={function () { setSelDate(d.key); }}
                            >{d.label}</button>
                        );
                    })}
                </div>

                <div className="ams-atp-label">🍴 Meal Slot</div>
                <div className="ams-atp-meal-row">
                    {["Breakfast", "Lunch", "Dinner"].map(function (m) {
                        return (
                            <button key={m}
                                className={"ams-atp-meal-btn " + (selMeal === m ? "active" : "")}
                                onClick={function () { setSelMeal(m); }}
                            >{m}</button>
                        );
                    })}
                </div>

                <button className="ams-atp-confirm" onClick={confirm}>✓ Add to {selMeal}</button>
            </div>
        </div>
    );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onHide }) {
    useEffect(function () {
        var t = setTimeout(onHide, 3000);
        return function () { clearTimeout(t); };
    }, []);
    return <div className="ams-toast">✅ {message}</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIMealSuggestions({ addMeal, mealPlans }) {
    // Suggestions keyed by meal type
    var s1 = useState({ Breakfast: [], Lunch: [], Dinner: [] });
    var suggestions = s1[0]; var setSuggestions = s1[1];

    var s2 = useState(true); var loading = s2[0]; var setLoading = s2[1];
    var s3 = useState(null); var selected = s3[0]; var setSelected = s3[1];
    var s4 = useState(null); var planDish = s4[0]; var setPlanDish = s4[1];
    var s5 = useState(null); var planMealType = s5[0]; var setPlanMealType = s5[1];
    var s6 = useState(""); var toast = s6[0]; var setToast = s6[1];
    var s7 = useState(false); var errored = s7[0]; var setErrored = s7[1];

    // Load user prefs
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}"); } catch (e) { }

    function fetchSuggestions() {
        setLoading(true); setErrored(false);

        var ctx = buildCtx(prefs);
        var today = new Date().toLocaleDateString("en-US", { weekday: "long" });

        var sys = [
            "You are Kitchen Buddy's AI chef. Respond ONLY as JSON.",
            "CRITICAL: Only suggest widely recognised, commonly cooked home dishes.",
            "Each dish needs: id, name, cuisine, description (1 sentence), time, difficulty,",
            "isVeg (boolean), nutrition:{calories,protein,carbs,fat}, ingredients (5-7 items),",
            "steps (4-5 steps), imgSearch (2-3 word photo term, never the dish name).",
        ].join("\n");

        var usr = "User profile:\n" + ctx + "\n\nToday is " + today + ".\n" +
            "Suggest 4 dishes each for Breakfast, Lunch, and Dinner — 12 total.\n" +
            "Mix veg and non-veg. Make them feel fresh and appetising for today.\n" +
            "Return ONLY this shape:\n" +
            "{\"Breakfast\":[4 dishes],\"Lunch\":[4 dishes],\"Dinner\":[4 dishes]}";

        askGroq(sys, usr)
            .then(function (data) {
                var b = Array.isArray(data.Breakfast) ? data.Breakfast : [];
                var l = Array.isArray(data.Lunch) ? data.Lunch : [];
                var d = Array.isArray(data.Dinner) ? data.Dinner : [];

                // Ensure we have exactly 4 per slot (trim if AI returned more)
                setSuggestions({
                    Breakfast: b.slice(0, 4),
                    Lunch: l.slice(0, 4),
                    Dinner: d.slice(0, 4),
                });
                setLoading(false);
            })
            .catch(function () { setErrored(true); setLoading(false); });
    }

    // Fetch once on mount
    useEffect(function () { fetchSuggestions(); }, []);

    function handleAddPlan(dish, mealType) {
        setPlanDish(dish);
        setPlanMealType(mealType || null);
    }

    function handleConfirm(dishName, mealSlot, dayLabel) {
        setToast(dishName + " added to " + mealSlot + " on " + dayLabel + "!");
    }

    var MEAL_TYPES = [
        { key: "Breakfast", emoji: "🌅", color: "#f59e0b" },
        { key: "Lunch", emoji: "☀️", color: "#10b981" },
        { key: "Dinner", emoji: "🌙", color: "#6366f1" },
    ];

    return (
        <div className="ams-root">
            {/* Header */}
            <div className="ams-header">
                <div className="ams-header-left">
                    <h2 className="ams-title">✨ Today's </h2>
                    <p className="ams-subtitle">
                        {prefs.name ? "Personalised for you, " + prefs.name : "Personalised just for you"}
                    </p>
                </div>
                <button
                    className={"ams-refresh-btn " + (loading ? "spinning" : "")}
                    onClick={fetchSuggestions}
                    disabled={loading}
                    title="Refresh suggestions"
                >
                    {loading ? "⏳" : "🔄"} {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {/* Error state */}
            {errored && !loading && (
                <div className="ams-error">
                    <span>Couldn't load suggestions.</span>
                    <button onClick={fetchSuggestions}>🔄 Retry</button>
                </div>
            )}

            {/* One row per meal type */}
            {MEAL_TYPES.map(function (mt) {
                var dishes = suggestions[mt.key] || [];
                return (
                    <div className="ams-meal-section" key={mt.key}>
                        <div className="ams-meal-label" style={{ "--ml-color": mt.color }}>
                            <span className="ams-meal-emoji">{mt.emoji}</span>
                            <span>{mt.key}</span>
                        </div>
                        <div className="ams-scroll-row">
                            {loading
                                ? [0, 1, 2, 3].map(function (i) { return <SkeletonSuggCard key={i} />; })
                                : dishes.map(function (dish, i) {
                                    return (
                                        <SuggCard
                                            key={dish.id || i}
                                            dish={dish}
                                            index={i}
                                            onClick={setSelected}
                                            onAddPlan={function (d) { handleAddPlan(d, mt.key); }}
                                        />
                                    );
                                })
                            }
                        </div>
                    </div>
                );
            })}

            {/* Dish detail modal */}
            {selected && (
                <DishModal
                    dish={selected}
                    onClose={function () { setSelected(null); }}
                    onAddPlan={function (d) { setSelected(null); handleAddPlan(d, null); }}
                />
            )}

            {/* Add to plan modal */}
            {planDish && (
                <AddToPlanModal
                    dish={planDish}
                    mealType={planMealType}
                    addMeal={addMeal}
                    onConfirm={handleConfirm}
                    onClose={function () { setPlanDish(null); setPlanMealType(null); }}
                />
            )}

            {/* Toast */}
            {toast && <Toast message={toast} onHide={function () { setToast(""); }} />}
        </div>
    );
}