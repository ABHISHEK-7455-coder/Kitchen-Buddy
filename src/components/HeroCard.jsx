import { useState, useEffect } from "react";
import "../pages/styles/HeroCard.css";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// ─── Groq API ──────────────────────────────────────────────────────────────────
async function fetchIndianMealSuggestions(prefs) {
    const getVal = (v) => {
        if (!v) return "";
        if (Array.isArray(v)) return v.map(x => x.label || x).join(", ");
        return v.label || v;
    };

    const ctx = [
        prefs.diet && "Diet: " + getVal(prefs.diet),
        prefs.spice && "Spice level: " + getVal(prefs.spice),
        prefs.skill && "Skill: " + getVal(prefs.skill),
        prefs.cookTime && "Max cook time: " + getVal(prefs.cookTime),
        prefs.allergies?.length && "Allergies: " + getVal(prefs.allergies),
        prefs.dislikes?.length && "Dislikes: " + getVal(prefs.dislikes),
    ].filter(Boolean).join("\n") || "General food lover";

    const hour = new Date().getHours();
    const mealTime = hour < 11 ? "breakfast" : hour < 15 ? "lunch" : hour < 18 ? "snack" : "dinner";

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + GROQ_API_KEY,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 2000,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "You are a personal Indian chef AI. Respond ONLY with valid JSON in the exact shape requested. No markdown, no backticks, no extra text.",
                },
                {
                    role: "user",
                    content:
                        `User profile:
${ctx}

Suggest exactly 4 authentic Indian ${mealTime} dishes this person would love right now.
Use only real, well-known Indian home cooking dishes (e.g. biryani, dal tadka, aloo paratha, chole, rajma, palak paneer, butter chicken, dosa, poha, upma, khichdi, etc.).
Mix veg and non-veg. Pick dishes appropriate for ${mealTime}.

Return JSON in this exact shape:
{
  "dishes": [
    {
      "name": "Dish Name",
      "description": "One mouth-watering sentence about this dish",
      "time": "25 min",
      "calories": "380 kcal",
      "difficulty": "Easy",
      "isVeg": true,
      "cuisine": "North Indian",
      "emoji": "🍛",
      "ingredients": [
        "2 cups basmati rice, soaked for 20 minutes",
        "1 cup paneer, cut in 1-inch cubes",
        "2 tbsp ghee",
        "1 tsp cumin seeds",
        "1 large onion, finely sliced",
        "2 tomatoes, pureed",
        "1 tsp garam masala",
        "Salt to taste"
      ],
      "steps": [
        "Heat 2 tbsp ghee in a heavy-bottomed pan over medium flame, add 1 tsp cumin seeds and let them splutter for 30 seconds until fragrant.",
        "Add sliced onions and fry for 7-8 minutes stirring often until deep golden brown — this forms the flavour base.",
        "Pour in tomato puree, add garam masala, turmeric and salt, cook on medium heat for 5-6 minutes until oil separates.",
        "Add the main ingredient, toss to coat with masala, and cook for 3-4 minutes so it absorbs all the spices.",
        "Add 1/2 cup warm water, reduce heat to low, cover and simmer for 8 minutes until gravy thickens.",
        "Garnish with fresh coriander and serve hot with roti or rice."
      ]
    }
  ]
}

Rules:
- ingredients: exactly 7-8 items with precise quantities
- steps: exactly 5-6 steps, each at least 15 words with timing and technique
- Return all 4 dishes inside the dishes array`,
                },
            ],
        }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.dishes)) return parsed.dishes;
    const key = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
    return key ? parsed[key] : [];
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const CalendarIcon = () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const ChevronIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

// ─── Meal Detail Modal ────────────────────────────────────────────────────────
function MealModal({ meal, onClose }) {
    const [activeTab, setActiveTab] = useState("ingredients");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    if (!meal) return null;

    return (
        <div className="hc-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="hc-modal">

                {/* Header */}
                <div className="hc-modal-header">
                    <div className="hc-modal-emoji">{meal.emoji || "🍛"}</div>
                    <div className="hc-modal-header-info">
                        <span className="hc-modal-cuisine">{meal.cuisine}</span>
                        <h2 className="hc-modal-title">{meal.name}</h2>
                        <p className="hc-modal-desc">{meal.description}</p>
                    </div>
                    <button className="hc-modal-close" onClick={onClose}><CloseIcon /></button>
                </div>

                {/* Badges */}
                <div className="hc-modal-badges">
                    <span className="hc-badge hc-badge--time">⏱ {meal.time}</span>
                    <span className="hc-badge hc-badge--cal">🔥 {meal.calories}</span>
                    <span className="hc-badge hc-badge--diff">📊 {meal.difficulty}</span>
                    <span className={`hc-badge ${meal.isVeg ? "hc-badge--veg" : "hc-badge--nonveg"}`}>
                        {meal.isVeg ? "🌿 Veg" : "🍗 Non-Veg"}
                    </span>
                </div>

                {/* Tabs */}
                <div className="hc-modal-tabs">
                    <button
                        className={`hc-tab ${activeTab === "ingredients" ? "hc-tab--active" : ""}`}
                        onClick={() => setActiveTab("ingredients")}
                    >
                        🧂 Ingredients
                        <span className="hc-tab-count">{meal.ingredients?.length || 0}</span>
                    </button>
                    <button
                        className={`hc-tab ${activeTab === "steps" ? "hc-tab--active" : ""}`}
                        onClick={() => setActiveTab("steps")}
                    >
                        📋 Steps
                        <span className="hc-tab-count">{meal.steps?.length || 0}</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="hc-modal-body">
                    {activeTab === "ingredients" && (
                        <div className="hc-ingredients">
                            {(meal.ingredients || []).map((ing, i) => (
                                <div className="hc-ing-row" key={i}>
                                    <span className="hc-ing-dot" />
                                    <span className="hc-ing-text">{ing}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === "steps" && (
                        <div className="hc-steps">
                            {(meal.steps || []).map((step, i) => (
                                <div className="hc-step-row" key={i}>
                                    <div className="hc-step-num">{i + 1}</div>
                                    <p className="hc-step-text">{step}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Meal Card ────────────────────────────────────────────────────────────────
function MealCard({ meal, isActive, onClick }) {
    return (
        <div className={`hc-meal-card ${isActive ? "hc-meal-card--active" : ""}`} onClick={onClick}>
            <div className="hc-meal-card-emoji">{meal.emoji || "🍛"}</div>
            <div className="hc-meal-card-info">
                <span className={`hc-meal-veg-dot ${meal.isVeg ? "veg" : "nonveg"}`} />
                <h4 className="hc-meal-card-name">{meal.name}</h4>
                <div className="hc-meal-card-meta">
                    <span>⏱ {meal.time}</span>
                    <span>🔥 {meal.calories}</span>
                </div>
            </div>
            <ChevronIcon />
        </div>
    );
}

// ─── Main HeroCard ────────────────────────────────────────────────────────────
export default function HeroCard() {
    const prefs = (() => {
        try { return JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}"); }
        catch { return {}; }
    })();

    const userName = prefs.name || "Chef";

    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [modalMeal, setModalMeal] = useState(null);
    const [error, setError] = useState(null);

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
    });

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchIndianMealSuggestions(prefs)
            .then(suggestions => {
                setMeals(suggestions);
                setSelectedMeal(suggestions[0] || null);
                setLoading(false);
            })
            .catch(() => {
                setError("Couldn't load suggestions. Tap to retry.");
                setLoading(false);
            });
    }, []);

    const featured = selectedMeal || meals[0];

    return (
        <>
            {/* Greeting */}
            <div className="page-header">
                <div>
                    <h1 className="greeting__title">
                        {greeting}, <span>{userName}</span>
                    </h1>
                    <div className="greeting__date">
                        <CalendarIcon />
                        {today}
                    </div>
                </div>
            </div>

            {/* Hero Card */}
            <div className="hero-card">

                {/* Featured Panel */}
                <div className="hero-card__featured">
                    <div className="ai-badge">🤖 AI Suggestions · Indian</div>

                    {loading ? (
                        <div className="hero-card__loading">
                            <div className="hero-skeleton hero-skeleton--emoji" />
                            <div className="hero-skeleton hero-skeleton--title" />
                            <div className="hero-skeleton hero-skeleton--line" />
                            <div className="hero-skeleton hero-skeleton--line short" />
                        </div>
                    ) : error ? (
                        <div className="hero-card__error">
                            <p>{error}</p>
                            <button className="btn-primary" onClick={() => {
                                setLoading(true); setError(null);
                                fetchIndianMealSuggestions(prefs)
                                    .then(s => { setMeals(s); setSelectedMeal(s[0]); setLoading(false); })
                                    .catch(() => { setError("Couldn't load. Try again."); setLoading(false); });
                            }}>Retry</button>
                        </div>
                    ) : featured ? (
                        <>
                            <div className="hero-featured-emoji">{featured.emoji || "🍛"}</div>
                            <div className="hero-featured-cuisine">{featured.cuisine}</div>
                            <h2 className="hero-card__title">{featured.name}</h2>
                            <p className="hero-card__desc">{featured.description}</p>

                            <div className="hero-card__meta">
                                <div className="meta-item">⏱ {featured.time}</div>
                                <div className="meta-item">🔥 {featured.calories}</div>
                                <div className="meta-item">👨‍🍳 {featured.difficulty}</div>
                                <div className="meta-item">{featured.isVeg ? "🌿 Veg" : "🍗 Non-Veg"}</div>
                            </div>

                            <button className="btn-primary" onClick={() => setModalMeal(featured)}>
                                View Recipe
                            </button>
                        </>
                    ) : null}
                </div>

                {/* Suggestions List */}
                {!loading && !error && meals.length > 0 && (
                    <div className="hero-card__suggestions">
                        <p className="hero-suggestions-label">Today's picks</p>
                        {meals.map((meal, i) => (
                            <MealCard
                                key={i}
                                meal={meal}
                                isActive={selectedMeal?.name === meal.name}
                                onClick={() => setSelectedMeal(meal)}
                            />
                        ))}
                    </div>
                )}

                {/* Skeleton suggestions */}
                {loading && (
                    <div className="hero-card__suggestions">
                        <p className="hero-suggestions-label">Today's picks</p>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div className="hc-meal-card skeleton-card" key={i}>
                                <div className="hero-skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="hero-skeleton hero-skeleton--line" style={{ marginBottom: 6 }} />
                                    <div className="hero-skeleton hero-skeleton--line short" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalMeal && (
                <MealModal meal={modalMeal} onClose={() => setModalMeal(null)} />
            )}
        </>
    );
}