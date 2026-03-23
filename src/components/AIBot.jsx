/* eslint-disable */
import { useState, useEffect, useRef } from "react";
import "../pages/styles/AIBot.css";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const LS_SAVED_MEALS = "meallog_saved_meals";
const LS_DRAFT = "meallog_draft";
const LS_MEAL_PLANS = "mealPlans";

const ls = {
    get: (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } },
    set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { } },
};

function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
}

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
    "pasta": "pasta", "spaghetti": "pasta", "pizza": "pizza",
    "pav bhaji": "pav-bhaji", "bhaji": "pav-bhaji",
    "samosa": "samosa", "upma": "upma", "poha": "upma",
};

var FALLBACKS = [
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1567620905732-f81944a37bdb?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1555939594-58329b054e4f?w=400&h=300&fit=crop",
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

function fetchDishImageAsync(name, imgSearch) {
    if (IMG_CACHE.hasOwnProperty(name) && IMG_CACHE[name]) {
        return Promise.resolve(IMG_CACHE[name]);
    }
    const cat = getFoodishCategory(name);
    const tryFoodish = cat
        ? fetch("https://foodish-api.com/api/images/" + cat)
            .then(r => r.json())
            .then(d => (d && d.image) ? d.image : null)
            .catch(() => null)
        : Promise.resolve(null);

    const tryUnsplash = () => {
        const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
        if (!key || key === "undefined") return Promise.resolve(null);
        const q = encodeURIComponent((imgSearch || name) + " food dish");
        return fetch("https://api.unsplash.com/search/photos?query=" + q + "&per_page=1&orientation=landscape&client_id=" + key)
            .then(r => r.json())
            .then(d => {
                const url = d?.results?.[0]?.urls?.raw;
                return url ? url + "&w=400&h=300&fit=crop&auto=format&q=80" : null;
            })
            .catch(() => null);
    };

    return tryFoodish.then(url => {
        if (url) { IMG_CACHE[name] = url; return url; }
        return tryUnsplash().then(u => {
            const final = u || getFallback(name);
            IMG_CACHE[name] = final;
            return final;
        });
    });
}

async function saveToMealLog(dish, mealType) {
    const imageUrl = await fetchDishImageAsync(dish.name, dish.imgSearch).catch(() => getFallback(dish.name));
    const newMeal = {
        id: Date.now(),
        name: dish.name || "",
        description: dish.description || "",
        image: imageUrl || null,
        mealType: mealType || "Lunch",
        cookingTime: dish.time || "",
        difficulty: dish.difficulty || "Med",
        healthScore: 70,
        rating: 0,
        ingredients: Array.isArray(dish.ingredients) ? dish.ingredients : [],
        steps: Array.isArray(dish.steps)
            ? dish.steps.map((s, i) => {
                const text = typeof s === "string" ? s : (s.body || s.name || "");
                return { id: i + 1, name: text, time: null, status: "done", body: text };
            })
            : [],
    };
    const existing = ls.get(LS_SAVED_MEALS, []);
    ls.set(LS_SAVED_MEALS, [...existing, newMeal]);
    ls.set(LS_DRAFT, newMeal);
    return newMeal;
}

function saveToCalendar(dish, mealType, dateKey, addMeal) {
    const entry = {
        name: dish.name || "",
        time: dish.time || "",
        calories: dish.calories || (dish.nutrition && dish.nutrition.calories) || "",
        cuisine: dish.cuisine || "",
        description: dish.description || "",
        ingredients: dish.ingredients || [],
        steps: Array.isArray(dish.steps)
            ? dish.steps.map(s => typeof s === "string" ? s : (s.body || s))
            : [],
        isVeg: dish.isVeg ?? true,
        difficulty: dish.difficulty || "Med",
        source: "ai_bot",
    };
    if (typeof addMeal === "function") {
        addMeal(dateKey, mealType, entry);
    } else {
        const plans = ls.get(LS_MEAL_PLANS, {});
        plans[dateKey] = { ...(plans[dateKey] || {}), [mealType]: entry };
        ls.set(LS_MEAL_PLANS, plans);
    }
}

function askGroq(messages) {
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + GROQ_API_KEY },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 3500,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages,
        }),
    })
        .then(r => r.json())
        .then(data => {
            const text = data.choices?.[0]?.message?.content || "{}";
            return JSON.parse(text);
        });
}

function buildPrefsContext() {
    try {
        const p = JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}");
        const getVal = v => {
            if (!v) return "";
            if (Array.isArray(v)) return v.map(x => x.label || x).join(", ");
            return v.label || v;
        };
        const lines = [];
        if (p.name) lines.push("User name: " + p.name);
        if (p.country) lines.push("Country: " + getVal(p.country));
        if (p.diet) lines.push("Diet: " + getVal(p.diet));
        if (p.spice) lines.push("Spice level: " + getVal(p.spice));
        if (p.cuisines) lines.push("Favourite cuisines: " + getVal(p.cuisines));
        if (p.skill) lines.push("Cooking skill: " + getVal(p.skill));
        if (p.cookTime) lines.push("Max cook time: " + getVal(p.cookTime));
        if (p.allergies && p.allergies.length) lines.push("Allergies: " + getVal(p.allergies));
        if (p.dislikes && p.dislikes.length) lines.push("Dislikes: " + getVal(p.dislikes));
        return lines.join("\n") || "General food lover";
    } catch { return "General food lover"; }
}

function buildSystemPrompt() {
    return `You are Kitchen Buddy's friendly AI meal assistant. You help users:
1. Get meal suggestions for Breakfast, Lunch, or Dinner
2. Add meals directly to their Meal Log and Meal Plan calendar
3. Answer cooking questions

User profile:
${buildPrefsContext()}

RESPONSE FORMAT — always reply with ONLY valid JSON in this shape:
{
  "message": "your friendly reply text shown to user",
  "action": null | "suggest" | "confirm_add" | "add_meal",
  "dishes": [],
  "pendingMeal": null,
  "pendingMealType": null,
  "pendingDate": null
}

ACTION RULES:
- "suggest": user asked for meal ideas → put 3-4 dish objects in "dishes"
- "confirm_add": you want to confirm before adding → ask in "message", set pendingMeal/pendingMealType/pendingDate
- "add_meal": user confirmed, add this meal → set pendingMeal (full dish object), pendingMealType, pendingDate (YYYY-MM-DD, use today if not specified)
- null: general chat, no action

DISH OBJECT shape (for suggest and add_meal):
{
  "name": "Dish Name",
  "description": "One sentence description",
  "cuisine": "Indian",
  "time": "20 min",
  "difficulty": "Easy",
  "isVeg": true,
  "calories": "350 kcal",
  "imgSearch": "2-3 word food photography term e.g. 'paneer curry bowl'",
  "ingredients": ["2 cups basmati rice","1 cup paneer cubed","2 tbsp oil","1 tsp cumin seeds","1 onion finely chopped","2 tomatoes pureed","1 tsp garam masala"],
  "steps": [
    "Heat 2 tbsp oil in a deep pan over medium flame, add 1 tsp cumin seeds and let them splutter for 30 seconds until fragrant.",
    "Add finely chopped onions and sauté for 5-6 minutes stirring frequently until they turn golden brown.",
    "Add tomato puree, garam masala, turmeric and salt, cook for 4-5 minutes until oil separates from the masala.",
    "Add the main ingredient, stir well to coat with the masala and cook for 3-4 minutes on medium heat.",
    "Add water or stock as needed, cover and simmer on low heat for 8-10 minutes until fully cooked through.",
    "Garnish with fresh coriander leaves and serve hot with rice or bread."
  ]
}

CRITICAL RULES FOR STEPS:
- Every step must be a COMPLETE detailed sentence of at least 15 words
- Include exact quantities, temperatures, timings, and technique in each step
- Always include 5-6 steps minimum
- ingredients must have 6-8 items with quantities
- Never truncate any field

PERSONALITY: Warm, concise, friendly. Use 1-2 emojis max per message. Keep messages short.
Never ask more than one question at a time.
Today's date: ${todayKey()}`;
}

// ─── Dish Detail Modal ────────────────────────────────────────────────────────
function DishDetailModal({ dish, mealType, onAdd, onClose }) {
    const [imgSrc, setImgSrc] = useState(null);
    const [activeTab, setActiveTab] = useState("ingredients");

    useEffect(() => {
        fetchDishImageAsync(dish.name, dish.imgSearch)
            .then(setImgSrc)
            .catch(() => setImgSrc(getFallback(dish.name)));
    }, [dish.name]);

    const steps = Array.isArray(dish.steps) ? dish.steps : [];
    const ingredients = Array.isArray(dish.ingredients) ? dish.ingredients : [];

    return (
        <div className="dish-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="dish-modal">

                {/* Hero image */}
                <div className="dish-modal-hero">
                    {imgSrc
                        ? <img src={imgSrc} alt={dish.name} />
                        : <div className="dish-modal-hero-placeholder">🍽️</div>
                    }
                    <button className="dish-modal-close" onClick={onClose}>×</button>
                    <div className="dish-modal-hero-overlay">
                        <h2 className="dish-modal-title">{dish.name}</h2>
                        <p className="dish-modal-desc">{dish.description}</p>
                    </div>
                </div>

                {/* Meta badges */}
                <div className="dish-modal-meta">
                    <span className="dish-meta-badge">{dish.isVeg ? "🌿 Veg" : "🍗 Non-Veg"}</span>
                    <span className="dish-meta-badge">⏱ {dish.time}</span>
                    <span className="dish-meta-badge">🔥 {dish.calories}</span>
                    <span className="dish-meta-badge">📊 {dish.difficulty}</span>
                    {dish.cuisine && <span className="dish-meta-badge">🌍 {dish.cuisine}</span>}
                </div>

                {/* Tabs */}
                <div className="dish-modal-tabs">
                    <button
                        className={`dish-tab-btn ${activeTab === "ingredients" ? "active" : ""}`}
                        onClick={() => setActiveTab("ingredients")}
                    >
                        🧂 Ingredients
                        <span className="dish-tab-count">{ingredients.length}</span>
                    </button>
                    <button
                        className={`dish-tab-btn ${activeTab === "steps" ? "active" : ""}`}
                        onClick={() => setActiveTab("steps")}
                    >
                        📋 Steps
                        <span className="dish-tab-count">{steps.length}</span>
                    </button>
                </div>

                {/* Tab content */}
                <div className="dish-modal-body">
                    {activeTab === "ingredients" && (
                        <div className="dish-modal-ingredients">
                            {ingredients.length === 0
                                ? <p className="dish-modal-empty">No ingredients listed.</p>
                                : ingredients.map((ing, i) => (
                                    <div className="dish-ing-row" key={i}>
                                        <span className="dish-ing-dot" />
                                        <span className="dish-ing-text">{ing}</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                    {activeTab === "steps" && (
                        <div className="dish-modal-steps">
                            {steps.length === 0
                                ? <p className="dish-modal-empty">No steps listed.</p>
                                : steps.map((step, i) => (
                                    <div className="dish-step-row" key={i}>
                                        <div className="dish-step-num">{i + 1}</div>
                                        <p className="dish-step-text">
                                            {typeof step === "string" ? step : (step.body || step.name || "")}
                                        </p>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="dish-modal-footer">
                    <button className="dish-modal-cancel" onClick={onClose}>Maybe Later</button>
                    <button
                        className="dish-modal-add"
                        onClick={() => { onAdd(dish, mealType); onClose(); }}
                    >
                        + Add to {mealType || "Meal Log"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="bot-msg-row">
            <div className="bot-avatar">🍳</div>
            <div className="bot-bubble typing-bubble">
                <span /><span /><span />
            </div>
        </div>
    );
}

// ─── Dish chip — name is now clickable ────────────────────────────────────────
function DishChip({ dish, mealType, onAdd, onViewDetail }) {
    return (
        <div className="bot-dish-chip">
            <div className="bot-dish-chip-info" onClick={() => onViewDetail(dish, mealType)} title="Tap to see full recipe">
                <div className="bot-dish-chip-name">
                    {dish.name}
                    <span className="dish-chip-peek">👁 View recipe</span>
                </div>
                <div className="bot-dish-chip-meta">
                    {dish.isVeg ? "🌿 Veg" : "🍗 Non-Veg"} · ⏱ {dish.time} · 🔥 {dish.calories}
                </div>
            </div>
            <button className="bot-dish-chip-add" onClick={() => onAdd(dish, mealType)}>
                + Add
            </button>
        </div>
    );
}

// ─── Chat message ─────────────────────────────────────────────────────────────
function ChatMessage({ msg, onAddDish, onViewDetail }) {
    const isBot = msg.role === "bot";
    return (
        <div className={isBot ? "bot-msg-row" : "user-msg-row"}>
            {isBot && <div className="bot-avatar">🍳</div>}
            <div className={isBot ? "bot-bubble" : "user-bubble"}>
                <p className="bubble-text">{msg.content}</p>

                {isBot && msg.dishes && msg.dishes.length > 0 && (
                    <div className="bot-dish-list">
                        {msg.dishes.map((d, i) => (
                            <DishChip
                                key={i}
                                dish={d}
                                mealType={msg.mealType}
                                onAdd={onAddDish}
                                onViewDetail={onViewDetail}
                            />
                        ))}
                    </div>
                )}

                {isBot && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="bot-quick-replies">
                        {msg.quickReplies.map((qr, i) => (
                            <button key={i} className="bot-quick-btn" onClick={() => qr.onClick()}>
                                {qr.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main AIBot ───────────────────────────────────────────────────────────────
export default function AIBot({ addMeal }) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [unread, setUnread] = useState(0);
    const [detailDish, setDetailDish] = useState(null); // { dish, mealType }

    const historyRef = useRef([]);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const recRef = useRef(null);
    const greetedRef = useRef(false);

    useEffect(() => {
        if (greetedRef.current) return;
        greetedRef.current = true;
        let prefs = {};
        try { prefs = JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}"); } catch { }
        const name = prefs.name ? ", " + prefs.name : "";
        pushBotMsg(
            "Hey" + name + "! 👋 I'm your Kitchen Buddy. I can suggest meals, add them to your log & plan. What would you like?",
            null, null, [
            { label: "🌅 Breakfast ideas", onClick: () => sendMessage("Suggest breakfast ideas") },
            { label: "☀️ Lunch ideas", onClick: () => sendMessage("Suggest lunch ideas") },
            { label: "🌙 Dinner ideas", onClick: () => sendMessage("Suggest dinner ideas") },
        ]
        );
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => {
        if (open) { setTimeout(() => inputRef.current?.focus(), 150); setUnread(0); }
    }, [open]);

    function pushBotMsg(content, dishes, mealType, quickReplies) {
        setMessages(prev => [...prev, { role: "bot", content, dishes: dishes || [], mealType, quickReplies: quickReplies || [] }]);
        if (!open) setUnread(n => n + 1);
    }

    function handleViewDetail(dish, mealType) {
        setDetailDish({ dish, mealType });
    }

    function handleAddDish(dish, mealType) {
        const mt = mealType || "Lunch";
        pushBotMsg(
            'Add "' + dish.name + '" to your ' + mt + ' for today?',
            null, null,
            [
                { label: "✅ Yes, add it!", onClick: () => confirmAdd(dish, mt, todayKey()) },
                { label: "❌ No thanks", onClick: () => pushBotMsg("No problem! Let me know if you want something else 😊") },
            ]
        );
    }

    async function confirmAdd(dish, mealType, dateKey) {
        await saveToMealLog(dish, mealType);
        saveToCalendar(dish, mealType, dateKey, addMeal);
        pushBotMsg(
            '✅ "' + dish.name + '" added to your ' + mealType + ' Meal Log and Calendar for today!',
            null, null,
            [
                { label: "🌅 More breakfast", onClick: () => sendMessage("Suggest breakfast ideas") },
                { label: "☀️ More lunch", onClick: () => sendMessage("Suggest lunch ideas") },
                { label: "🌙 More dinner", onClick: () => sendMessage("Suggest dinner ideas") },
            ]
        );
    }

    async function sendMessage(text) {
        const userText = (text || input).trim();
        if (!userText || loading) return;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userText }]);
        historyRef.current.push({ role: "user", content: userText });
        setLoading(true);
        try {
            const groqMessages = [
                { role: "system", content: buildSystemPrompt() },
                ...historyRef.current.slice(-12),
            ];
            const res = await askGroq(groqMessages);
            const botText = res.message || "I'm not sure about that. Try asking for meal suggestions!";
            const action = res.action || null;
            const dishes = Array.isArray(res.dishes) ? res.dishes : [];
            const pending = res.pendingMeal || null;
            const pendingMT = res.pendingMealType || "Lunch";
            const pendingDate = res.pendingDate || todayKey();
            historyRef.current.push({ role: "assistant", content: botText });

            if (action === "suggest") {
                const lower = userText.toLowerCase();
                const mt = lower.includes("breakfast") ? "Breakfast"
                    : lower.includes("lunch") ? "Lunch"
                        : lower.includes("dinner") ? "Dinner"
                            : pendingMT;
                pushBotMsg(botText, dishes, mt);
            } else if (action === "confirm_add" && pending) {
                pushBotMsg(botText, null, null, [
                    { label: "✅ Yes, add it!", onClick: () => confirmAdd(pending, pendingMT, pendingDate) },
                    { label: "❌ No thanks", onClick: () => pushBotMsg("Got it! What else can I help with?") },
                ]);
            } else if (action === "add_meal" && pending) {
                confirmAdd(pending, pendingMT, pendingDate);
            } else {
                const qr = dishes.length === 0 ? [
                    { label: "🌅 Breakfast ideas", onClick: () => sendMessage("Suggest breakfast ideas") },
                    { label: "☀️ Lunch ideas", onClick: () => sendMessage("Suggest lunch ideas") },
                    { label: "🌙 Dinner ideas", onClick: () => sendMessage("Suggest dinner ideas") },
                ] : [];
                pushBotMsg(botText, dishes, pendingMT, qr);
            }
        } catch (e) {
            pushBotMsg("Oops, something went wrong. Please try again! 🙏");
        }
        setLoading(false);
    }

    function toggleVoice() {
        if (listening) { recRef.current?.stop(); setListening(false); return; }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { alert("Voice input requires Chrome."); return; }
        const rec = new SR();
        rec.lang = "en-US"; rec.interimResults = false;
        rec.onstart = () => setListening(true);
        rec.onend = () => setListening(false);
        rec.onerror = () => setListening(false);
        rec.onresult = (e) => {
            const t = e.results[0][0].transcript;
            setInput(t);
            setTimeout(() => sendMessage(t), 100);
        };
        rec.start();
        recRef.current = rec;
    }

    return (
        <>
            {/* Dish detail modal — outside bot-panel so it overlays the whole page */}
            {detailDish && (
                <DishDetailModal
                    dish={detailDish.dish}
                    mealType={detailDish.mealType}
                    onAdd={handleAddDish}
                    onClose={() => setDetailDish(null)}
                />
            )}

            {open && (
                <div className="bot-panel">
                    <div className="bot-header">
                        <div className="bot-header-left">
                            <div className="bot-header-avatar">🍳</div>
                            <div>
                                <div className="bot-header-name">Kitchen Buddy AI</div>
                                <div className="bot-header-status">
                                    <span className="bot-status-dot" />
                                    {loading ? "Thinking..." : "Online"}
                                </div>
                            </div>
                        </div>
                        <button className="bot-header-close" onClick={() => setOpen(false)}>×</button>
                    </div>

                    <div className="bot-messages">
                        {messages.map((msg, i) => (
                            <ChatMessage
                                key={i}
                                msg={msg}
                                onAddDish={handleAddDish}
                                onViewDetail={handleViewDetail}
                            />
                        ))}
                        {loading && <TypingIndicator />}
                        <div ref={bottomRef} />
                    </div>

                    <div className="bot-input-row">
                        <input
                            ref={inputRef}
                            className="bot-input"
                            placeholder="Ask me anything about meals..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        />
                        <button
                            className={"bot-voice-btn " + (listening ? "listening" : "")}
                            onClick={toggleVoice}
                            title={listening ? "Stop listening" : "Voice input"}
                        >{listening ? "⏹" : "🎙"}</button>
                        <button
                            className="bot-send-btn"
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || loading}
                        >➤</button>
                    </div>
                </div>
            )}

            <button
                className={"bot-bubble-btn " + (open ? "open" : "")}
                onClick={() => setOpen(o => !o)}
                title="Kitchen Buddy AI"
            >
                {open ? "✕" : "🍳"}
                {!open && unread > 0 && <span className="bot-unread-badge">{unread}</span>}
            </button>
        </>
    );
}