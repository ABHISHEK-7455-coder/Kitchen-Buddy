import { useState, useRef, useEffect } from "react";
import "../pages/styles/MealLog.css";

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_SAVED = "meallog_saved_meals";

// ─── Empty meal template ──────────────────────────────────────────────────────
const EMPTY_MEAL = {
    name: "",
    description: "",
    image: null,
    mealType: "",
    cookingTime: "",
    difficulty: "",
    healthScore: 70,
    rating: 0,
    ingredients: [],
    steps: [],
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
const ls = {
    get: (key, fallback) => {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
        catch { return fallback; }
    },
    set: (key, value) => {
        try { localStorage.setItem(key, JSON.stringify(value)); }
        catch { /* quota / SSR */ }
    },
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function getTodayLabel() {
    return new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function getMealTypeTime(type) {
    const MAP = { Breakfast: "08:30 AM", Lunch: "12:45 PM", Dinner: "07:15 PM", Snack: "03:00 PM" };
    return MAP[type] || "";
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    onClick={() => onChange?.(star)}
                    onMouseEnter={() => onChange && setHovered(star)}
                    onMouseLeave={() => onChange && setHovered(0)}
                    className={`star ${star <= (hovered || value) ? "active" : ""} ${onChange ? "clickable" : ""}`}
                >★</span>
            ))}
        </div>
    );
}

// ─── Image Upload Modal ───────────────────────────────────────────────────────
function ImageUploadModal({ onConfirm, onClose }) {
    const [tab, setTab] = useState("file");
    const [urlInput, setUrlInput] = useState("");
    const [urlError, setUrlError] = useState("");
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { onConfirm(reader.result); onClose(); };
        reader.readAsDataURL(file);
    };

    const handleUrl = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) { setUrlError("Please enter a URL."); return; }
        try { new URL(trimmed); } catch { setUrlError("Invalid URL format."); return; }
        onConfirm(trimmed);
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add Meal Image</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="tab-switcher">
                    {[{ key: "file", label: "📁 Upload File" }, { key: "url", label: "🔗 Image URL" }].map(t => (
                        <button
                            key={t.key}
                            className={`tab-btn ${tab === t.key ? "active" : ""}`}
                            onClick={() => { setTab(t.key); setUrlError(""); }}
                        >{t.label}</button>
                    ))}
                </div>

                {tab === "file" && (
                    <div className="file-drop-zone" onClick={() => fileRef.current?.click()}>
                        <span className="file-drop-icon">📷</span>
                        <span className="file-drop-label">Click to browse image</span>
                        <span className="file-drop-hint">JPG, PNG, WEBP supported</span>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
                    </div>
                )}

                {tab === "url" && (
                    <div className="url-input-group">
                        <input
                            autoFocus
                            value={urlInput}
                            onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && handleUrl()}
                            placeholder="https://example.com/image.jpg"
                            className={`url-input ${urlError ? "error" : ""}`}
                        />
                        {urlError && <span className="url-error">{urlError}</span>}
                        <button className="btn-primary full-width" onClick={handleUrl}>Use this URL</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Saved Meals Drawer ───────────────────────────────────────────────────────
function SavedMealsDrawer({ savedMeals, onSelect, onDelete, onClose }) {
    return (
        <div className="drawer-backdrop" onClick={onClose}>
            <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                    <div>
                        <h2>Saved Meals</h2>
                        <p>{savedMeals.length} {savedMeals.length === 1 ? "entry" : "entries"} logged</p>
                    </div>
                    <button className="drawer-close" onClick={onClose}>×</button>
                </div>

                <div className="drawer-list">
                    {savedMeals.length === 0 ? (
                        <div className="drawer-empty">
                            <span>🍽️</span>
                            <strong>No saved meals yet</strong>
                            <p>Fill out the form and hit<br />"Save Meal" to log a meal</p>
                        </div>
                    ) : (
                        savedMeals.map((m) => (
                            <div key={m.id} className="drawer-item">
                                {m.image
                                    ? <img src={m.image} alt={m.name} className="drawer-thumb" />
                                    : <div className="drawer-thumb-placeholder">🍳</div>
                                }
                                <div className="drawer-item-info" onClick={() => { onSelect(m); onClose(); }}>
                                    <div className="drawer-item-name">{m.name || "Untitled Meal"}</div>
                                    <div className="drawer-item-desc">{m.description || "No description"}</div>
                                    <div className="drawer-item-meta">
                                        <span className="meal-type-badge">{m.mealType}</span>
                                        {m.cookingTime && <span className="drawer-time">⏱ {m.cookingTime} mins</span>}
                                    </div>
                                </div>
                                <div className="drawer-item-actions">
                                    <button className="btn-load" onClick={() => { onSelect(m); onClose(); }}>Load</button>
                                    <button className="btn-delete" onClick={() => onDelete(m.id)}>Delete</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MealLog() {
    const [meal, setMeal] = useState({ ...EMPTY_MEAL });
    const [savedMeals, setSavedMeals] = useState(() => ls.get(LS_SAVED, []));
    const [newIngredient, setNewIngredient] = useState("");
    const [showIngredientInput, setShowIngredientInput] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saved" | "updated"

    useEffect(() => { ls.set(LS_SAVED, savedMeals); }, [savedMeals]);

    // ── Field helpers ─────────────────────────────────────────────────────────
    const setField = (key, value) => {
        setSaveStatus("idle");
        setMeal((prev) => ({ ...prev, [key]: value }));
    };

    // ── Ingredients ───────────────────────────────────────────────────────────
    const addIngredient = () => {
        if (!newIngredient.trim()) return;
        setField("ingredients", [...meal.ingredients, newIngredient.trim()]);
        setNewIngredient("");
        setShowIngredientInput(false);
    };
    const removeIngredient = (name) =>
        setField("ingredients", meal.ingredients.filter((i) => i !== name));

    // ── Steps ─────────────────────────────────────────────────────────────────
    const addStep = () => {
        const newId = (meal.steps[meal.steps.length - 1]?.id ?? 0) + 1;
        setField("steps", [...meal.steps, { id: newId, name: `Step ${newId}`, time: null, status: "pending", body: "" }]);
    };
    const updateStep = (id, changes) =>
        setField("steps", meal.steps.map((s) => s.id === id ? { ...s, ...changes } : s));
    const removeStep = (id) =>
        setField("steps", meal.steps.filter((s) => s.id !== id));
    const cycleStatus = (step) => {
        const cycle = { pending: "in-progress", "in-progress": "done", done: "pending" };
        updateStep(step.id, { status: cycle[step.status] });
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = () => {
        if (!meal.name.trim()) { alert("Please enter a meal name before saving."); return; }
        if (meal.id) {
            const updated = { ...meal };
            setSavedMeals((prev) => prev.map((m) => m.id === meal.id ? updated : m));
            setMeal(updated);
            setSaveStatus("updated");
        } else {
            const newMeal = { ...meal, id: Date.now() };
            setSavedMeals((prev) => [...prev, newMeal]);
            setMeal(newMeal);
            setSaveStatus("saved");
        }
        setTimeout(() => setSaveStatus("idle"), 2500);
    };

    const loadMeal = (m) => { setMeal({ ...m }); setSaveStatus("idle"); };

    const deleteMeal = (id) => {
        setSavedMeals((prev) => prev.filter((m) => m.id !== id));
        if (meal.id === id) { setMeal({ ...EMPTY_MEAL }); setSaveStatus("idle"); }
    };

    const handleDiscard = () => { setMeal({ ...EMPTY_MEAL }); setSaveStatus("idle"); };

    // ── Helpers for left panel list ───────────────────────────────────────────
    // Current meal counts as first entry if it has a name; rest from savedMeals
    const loggedEntries = savedMeals.filter((m) => m.id !== meal.id);
    const allEntries = meal.id
        ? savedMeals
        : meal.name
            ? [{ ...meal, _current: true }, ...savedMeals]
            : savedMeals;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="ml-root">
            {showDrawer && (
                <SavedMealsDrawer
                    savedMeals={savedMeals}
                    onSelect={loadMeal}
                    onDelete={deleteMeal}
                    onClose={() => setShowDrawer(false)}
                />
            )}
            {showImageModal && (
                <ImageUploadModal
                    onConfirm={(src) => setField("image", src)}
                    onClose={() => setShowImageModal(false)}
                />
            )}

            <div className="page-container">
                <div className="main-grid">

                    {/* ══════════════════════════════════════
                        LEFT COLUMN — Daily Log list
                    ══════════════════════════════════════ */}
                    <div className="left-col">

                        {/* Daily Log Header */}
                        <div className="meal-log-header">
                            <div className="page-header-left">
                                <h1>Daily Log</h1>
                                <div className="log-date">
                                    <span>{getTodayLabel()}</span>
                                    <button
                                        className="log-date-icon"
                                        onClick={() => setShowDrawer(true)}
                                        title="View all saved meals"
                                    >📋</button>
                                </div>
                            </div>
                        </div>

                        {/* Meal Entry Cards */}
                        <div className="meal-entries">
                            {savedMeals.map((m) => {
                                const timeStr = getMealTypeTime(m.mealType);
                                const isActive = meal.id === m.id;
                                return (
                                    <div
                                        key={m.id}
                                        className={`meal-entry ${isActive ? "active" : ""}`}
                                        onClick={() => loadMeal(m)}
                                    >
                                        {m.image
                                            ? <img src={m.image} alt={m.name} className="meal-entry-thumb" />
                                            : <div className="meal-entry-thumb-placeholder">🍳</div>
                                        }
                                        <div className="meal-entry-info">
                                            <div className="meal-entry-type">
                                                {m.mealType || "Meal"}
                                                {timeStr && ` · ${timeStr}`}
                                            </div>
                                            <div className="meal-entry-name">{m.name || "Untitled Meal"}</div>
                                            <div className="meal-entry-tags">
                                                {m.nutrition?.calories && (
                                                    <span className="entry-tag">{m.nutrition.calories} kcal</span>
                                                )}
                                                {/* Show first ingredient as a tag if available */}
                                                {!m.nutrition?.calories && m.ingredients?.[0] && (
                                                    <span className="entry-tag gray">{m.ingredients[0]}</span>
                                                )}
                                                {m.difficulty && (
                                                    <span className="entry-tag gray">{m.difficulty}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Log Another Meal / New Meal */}
                            <button className="log-another-btn" onClick={handleDiscard}>
                                <span className="plus-circle">+</span>
                                Log Another Meal
                            </button>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════
                        RIGHT COLUMN — Meal Detail / Editor
                    ══════════════════════════════════════ */}
                    <div className="right-col">

                        {/* Hero Image */}
                        <div className="detail-hero" onClick={() => setShowImageModal(true)}>
                            {meal.image ? (
                                <>
                                    <img src={meal.image} alt={meal.name} />
                                    <div className="detail-hero-overlay" />
                                    <div className="detail-hero-meta">
                                        {meal.mealType && (
                                            <span className="detail-meal-type-badge">{meal.mealType}</span>
                                        )}
                                        {meal.cookingTime && (
                                            <span className="detail-time-badge">⏱ {meal.cookingTime} mins</span>
                                        )}
                                        <div className="detail-meal-name">{meal.name || "Untitled Meal"}</div>
                                    </div>
                                    <span className="detail-hero-change">📷 Change photo</span>
                                </>
                            ) : (
                                <div className="detail-hero-placeholder">
                                    <span>📷</span>
                                    <span>Click to add meal photo</span>
                                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Upload a file or paste a URL</span>
                                </div>
                            )}
                        </div>

                        {/* Meal Name + Description */}
                        <div className="detail-edit-row">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                                <input
                                    className="detail-name-input"
                                    value={meal.name}
                                    onChange={(e) => setField("name", e.target.value)}
                                    placeholder="Meal name..."
                                />
                                <StarRating value={meal.rating} onChange={(v) => setField("rating", v)} />
                            </div>
                            <textarea
                                className="detail-desc-input"
                                value={meal.description}
                                onChange={(e) => setField("description", e.target.value)}
                                placeholder="Add a short description of your dish..."
                                rows={2}
                            />
                        </div>

                        {/* Meal Properties inline row */}
                        <div className="meal-properties-row">
                            <div className="prop-group">
                                <label>Meal Type</label>
                                <div className="select-wrap">
                                    <span className="select-icon">🍴</span>
                                    <select value={meal.mealType} onChange={(e) => setField("mealType", e.target.value)}>
                                        <option value="">Select…</option>
                                        {["Breakfast", "Lunch", "Dinner", "Snack"].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="prop-group">
                                <label>Cooking Time</label>
                                <div className="cooking-time-box">
                                    <span className="time-icon">⏱</span>
                                    <input
                                        type="number"
                                        value={meal.cookingTime}
                                        onChange={(e) => setField("cookingTime", e.target.value)}
                                        placeholder="0"
                                        min={1}
                                        className="cooking-time-input"
                                    />
                                    <span className="time-unit">mins</span>
                                </div>
                            </div>

                            <div className="prop-group">
                                <label>Difficulty</label>
                                <div className="difficulty-btns">
                                    {["Easy", "Med", "Hard"].map((d) => (
                                        <button
                                            key={d}
                                            className={`diff-btn ${meal.difficulty === d ? "active" : ""}`}
                                            onClick={() => setField("difficulty", d)}
                                        >{d}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Two-column: Ingredients + Cooking Steps */}
                        <div className="detail-panels">

                            {/* Ingredients Panel */}
                            <div className="panel">
                                <div className="panel-header">
                                    <div className="panel-title">
                                        <span className="panel-title-icon">🍴</span>
                                        Ingredients
                                    </div>
                                    <button className="panel-edit-btn" title="Edit" onClick={() => setShowIngredientInput(v => !v)}>
                                        ✏️
                                    </button>
                                </div>

                                <div className="ingredients-list">
                                    {meal.ingredients.length === 0 && !showIngredientInput && (
                                        <div className="empty-ingredients">
                                            No ingredients yet — click ✏️ to add
                                        </div>
                                    )}

                                    {/* Show as rows with quantity placeholder */}
                                    {meal.ingredients.map((name, idx) => (
                                        <div className="ingredient-row" key={name + idx}>
                                            <div className="ingredient-left">
                                                <span className="ing-dot" />
                                                <span className="ing-name">{name}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span className="ing-qty">—</span>
                                                <button
                                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13 }}
                                                    onClick={() => removeIngredient(name)}
                                                    title="Remove"
                                                >✕</button>
                                            </div>
                                        </div>
                                    ))}

                                    {showIngredientInput && (
                                        <div className="ingredient-input-row">
                                            <input
                                                autoFocus
                                                value={newIngredient}
                                                onChange={(e) => setNewIngredient(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && addIngredient()}
                                                placeholder="Ingredient name..."
                                                className="ingredient-text-input"
                                            />
                                            <button className="btn-add-small" onClick={addIngredient}>Add</button>
                                            <button className="btn-cancel-small" onClick={() => { setShowIngredientInput(false); setNewIngredient(""); }}>✕</button>
                                        </div>
                                    )}
                                </div>

                                <button className="add-ingredient-row" onClick={() => setShowIngredientInput(v => !v)}>
                                    + Add Ingredient
                                </button>
                            </div>

                            {/* Cooking Steps Panel */}
                            <div className="panel">
                                <div className="panel-header">
                                    <div className="panel-title">
                                        <span className="panel-title-icon">📋</span>
                                        Cooking Steps
                                    </div>
                                    <button className="panel-edit-btn" title="Add step" onClick={addStep}>✏️</button>
                                </div>

                                {meal.steps.length === 0 && (
                                    <div className="empty-steps">
                                        <span>🍳</span>
                                        <span>No steps yet</span>
                                        <span>Add steps to track your process</span>
                                    </div>
                                )}

                                <div className="steps-list">
                                    {meal.steps.map((step) => (
                                        <div className="step-row" key={step.id}>
                                            <button
                                                className={`step-circle ${step.status}`}
                                                onClick={() => cycleStatus(step)}
                                                title="Click to change status"
                                            >{step.id}</button>

                                            <div className={`step-content ${step.status}`}>
                                                <div className="step-top">
                                                    <textarea
                                                        className={`step-name-input ${step.status === "pending" ? "pending-text" : ""}`}
                                                        value={step.name}
                                                        onChange={(e) => updateStep(step.id, { name: e.target.value })}
                                                        rows={2}
                                                    />
                                                    {step.status === "in-progress" && (
                                                        <span className="step-badge-inprogress">In Progress</span>
                                                    )}
                                                    {step.status === "done" && (
                                                        <input
                                                            className="step-time-input"
                                                            value={step.time || ""}
                                                            onChange={(e) => updateStep(step.id, { time: e.target.value })}
                                                            placeholder="Time (e.g. 10:15 AM)"
                                                        />
                                                    )}
                                                    <button
                                                        className="step-remove-btn"
                                                        onClick={() => removeStep(step.id)}
                                                        title="Remove step"
                                                    >×</button>
                                                </div>

                                                {step.status === "in-progress" && (
                                                    <div className="step-actions">
                                                        <button title="Add photo">📷</button>
                                                        <button title="Voice note">🎙</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button className="add-step-btn" onClick={addStep}>
                                    <span className="plus-icon">＋</span> Add Next Step
                                </button>
                            </div>
                        </div>

                        {/* Footer action bar */}
                        <div className="detail-footer">
                            <div className="footer-left">
                                <button className="btn-clear-all" onClick={handleDiscard}>
                                    🗑 Clear All
                                </button>
                            </div>
                            <div className="footer-right">
                                <button className="btn-save-draft" onClick={() => setShowDrawer(true)}>
                                    Save as Draft
                                </button>
                                <button
                                    className={`btn-save-meal ${saveStatus !== "idle" ? "success" : ""}`}
                                    onClick={handleSave}
                                >
                                    {saveStatus !== "idle"
                                        ? <><span className="save-check">✓</span> {saveStatus === "updated" ? "Updated!" : "Saved!"}</>
                                        : <><span className="save-check">✓</span> Save Meal</>
                                    }
                                </button>
                            </div>
                        </div>

                    </div>{/* end right-col */}
                </div>{/* end main-grid */}
            </div>{/* end page-container */}

            {/* Page Footer */}
            <footer className="page-footer">
                <span className="footer-brand">Aelia Health AI</span>
                <nav className="footer-links">
                    <a href="#">Privacy</a>
                    <a href="#">Terms</a>
                    <a href="#">Support</a>
                    <a href="#">API</a>
                </nav>
                <span className="footer-copy">© 2024 Aelia Health AI. The Ethereal Sanctuary for Nutrition.</span>
            </footer>
        </div>
    );
}