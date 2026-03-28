import { useState, useEffect } from "react";
import "../pages/styles/HeroCard.css";

// ─── Groq key (same one used in AIFoodFeed) ───────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

async function fetchAISuggestion(prefs) {
    const getVal = (v) => {
        if (!v) return "";
        if (Array.isArray(v)) return v.map(x => x.label || x).join(", ");
        return v.label || v;
    };

    const ctx = [
        prefs.country && "Country: " + getVal(prefs.country),
        prefs.region && "Region: " + getVal(prefs.region),
        prefs.diet && "Diet: " + getVal(prefs.diet),
        prefs.spice && "Spice: " + getVal(prefs.spice),
        prefs.skill && "Skill: " + getVal(prefs.skill),
        prefs.cookTime && "Max cook time: " + getVal(prefs.cookTime),
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
            max_tokens: 400,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "You are a personal chef AI. Respond ONLY with a JSON object — no markdown.",
                },
                {
                    role: "user",
                    content:
                        "User profile:\n" + ctx +
                        "\n\nSuggest ONE perfect " + mealTime + " dish for right now." +
                        "\nReturn JSON: {\"name\":\"...\",\"time\":\"...\",\"calories\":\"...\",\"level\":\"...\",\"description\":\"...\",\"ingredients\":[\"...\",\"...\"],\"steps\":[\"step1\",\"step2\",\"step3\"]}",
                },
            ],
        }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    return JSON.parse(text);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const CalendarIcon = () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const PlayIcon = () => (
    <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
        <polygon points="5,3 19,12 5,21" />
    </svg>
);

const BookmarkIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroCard() {

    // ── Read name + prefs from onboarding localStorage ────────────────────────
    const prefs = (() => {
        try { return JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}"); }
        catch (e) { return {}; }
    })();

    const userName = prefs.name || "Chef";

    const [meal, setMeal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
    });

    // Greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

    // Fetch AI suggestion on mount
    useEffect(() => {
        setLoading(true);
        fetchAISuggestion(prefs)
            .then(suggestion => {
                setMeal(suggestion);
                setLoading(false);
            })
            .catch(() => {
                // fallback if AI fails
                setMeal({
                    name: "Avocado Toast with Poached Egg",
                    time: "10 mins",
                    calories: "350 kcal",
                    level: "Beginner",
                    description: "A quick, nutritious meal perfect for any time of day.",
                    ingredients: ["Avocado", "Eggs", "Bread", "Salt", "Pepper"],
                    steps: [
                        "Toast the bread slices until golden.",
                        "Mash avocado with salt and pepper.",
                        "Spread avocado on toast.",
                        "Poach the egg in simmering water.",
                        "Place egg on toast and serve."
                    ]
                });
                setLoading(false);
            });
    }, []);

    const handleBookmark = () => {
        const saved = JSON.parse(localStorage.getItem("bookmarks") || "[]");
        saved.push(meal);
        localStorage.setItem("bookmarks", JSON.stringify(saved));
        setBookmarked(true);
    };

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
                <div className="hero-card__image">
                    {loading ? "⏳" : "🍽️"}
                </div>

                <div className="hero-card__content">
                    <div className="ai-badge">
                        🤖 AI Suggestion
                    </div>

                    {loading ? (
                        <div className="hero-card__loading">
                            <div className="hero-skeleton hero-skeleton--title" />
                            <div className="hero-skeleton hero-skeleton--line" />
                            <div className="hero-skeleton hero-skeleton--line short" />
                        </div>
                    ) : (
                        <>
                            <h2 className="hero-card__title">{meal?.name}</h2>

                            <p className="hero-card__desc">
                                {meal?.description || (
                                    <>Personalised for you based on your preferences. <span>Ready to cook?</span></>
                                )}
                            </p>

                            <div className="hero-card__meta">
                                <div className="meta-item">⏱ {meal?.time}</div>
                                <div className="meta-item">🔥 {meal?.calories}</div>
                                <div className="meta-item">👨‍🍳 {meal?.level}</div>
                            </div>

                            <div className="hero-card__actions">
                                <button className="start-cooking" onClick={() => setShowModal(true)}>
                                    <PlayIcon />
                                    Start Cooking
                                </button>
                                <div
                                    className="btn-bookmark"
                                    onClick={handleBookmark}
                                    style={bookmarked ? { background: "#FFE5CC", borderColor: "var(--orange)" } : {}}
                                >
                                    <BookmarkIcon />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Ingredients Modal */}
            {showModal && (
                <div className="cook-modal" onClick={() => setShowModal(false)}>
                    <div className="cook-content" onClick={e => e.stopPropagation()}>
                        <h2>{meal?.name}</h2>

                        <div>
                            <h4>Ingredients</h4>
                            <ul>
                                {meal?.ingredients?.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4>Cooking Steps</h4>
                            <ol>
                                {meal?.steps?.map((step, i) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>
                        </div>

                        <button onClick={() => setShowModal(false)} className="btn-primary">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}