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
                    <div
                        className="file-drop-zone"
                        onClick={() => fileRef.current?.click()}
                    >
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
                            <p>Fill out the form and hit<br />"Save Entry" to log a meal</p>
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
    // Form always starts empty — only populates when user loads a saved meal
    const [meal, setMeal] = useState({ ...EMPTY_MEAL });
    const [savedMeals, setSavedMeals] = useState(() => ls.get(LS_SAVED, []));
    const [newIngredient, setNewIngredient] = useState("");
    const [showIngredientInput, setShowIngredientInput] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saved" | "updated"

    // Persist saved meals list whenever it changes
    useEffect(() => { ls.set(LS_SAVED, savedMeals); }, [savedMeals]);

    // ── Field helpers ─────────────────────────────────────────────────────────────
    const setField = (key, value) => {
        setSaveStatus("idle");
        setMeal((prev) => ({ ...prev, [key]: value }));
    };

    // ── Ingredients ───────────────────────────────────────────────────────────────
    const addIngredient = () => {
        if (!newIngredient.trim()) return;
        setField("ingredients", [...meal.ingredients, newIngredient.trim()]);
        setNewIngredient("");
        setShowIngredientInput(false);
    };
    const removeIngredient = (name) =>
        setField("ingredients", meal.ingredients.filter((i) => i !== name));

    // ── Steps ─────────────────────────────────────────────────────────────────────
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

    // ── Save ──────────────────────────────────────────────────────────────────────
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

    // ── Load saved meal ───────────────────────────────────────────────────────────
    const loadMeal = (m) => { setMeal({ ...m }); setSaveStatus("idle"); };

    // ── Delete saved meal ─────────────────────────────────────────────────────────
    const deleteMeal = (id) => {
        setSavedMeals((prev) => prev.filter((m) => m.id !== id));
        // If the currently loaded meal is deleted, reset the form to empty
        if (meal.id === id) {
            setMeal({ ...EMPTY_MEAL });
            setSaveStatus("idle");
        }
    };

    // ── Discard / Clear ───────────────────────────────────────────────────────────
    const handleDiscard = () => {
        setMeal({ ...EMPTY_MEAL });
        setSaveStatus("idle");
    };

    // ─────────────────────────────────────────────────────────────────────────────
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

                {/* Page Header */}
                <div className="meal-log-header">
                    <div className="page-header-left">
                        <h1>Log Your Meal</h1>
                        <p>
                            {meal.name
                                ? <>Record your culinary masterpiece: <em>{meal.name}</em></>
                                : "Start by entering your meal details below"}
                        </p>
                    </div>
                    <div className="header-actions">
                        <button className="btn-discard" onClick={handleDiscard}>Clear</button>
                        <button
                            className={`meal-btn-save ${saveStatus !== "idle" ? "success" : ""}`}
                            onClick={handleSave}
                        >Save Meal</button>
                        <button
                            className="btn-saved-meals"
                            onClick={() => setShowDrawer(true)}
                        >
                            📋 Saved Meals
                            {savedMeals.length > 0 && <span className="saved-count">{savedMeals.length}</span>}
                        </button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="main-grid">

                    {/* ── LEFT COLUMN ── */}
                    <div className="left-col">

                        {/* Recipe Card */}
                        <div className="recipe-card">
                            <div className="recipe-image-wrap" onClick={() => setShowImageModal(true)}>
                                {meal.image ? (
                                    <>
                                        <img src={meal.image} alt={meal.name} />
                                        <div className="image-overlay">
                                            <span>📷 Change photo</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="image-placeholder">
                                        <span className="img-ph-icon">📷</span>
                                        <span className="img-ph-label">Click to add meal photo</span>
                                        <span className="img-ph-hint">Upload a file or paste a URL</span>
                                    </div>
                                )}
                            </div>

                            <div className="recipe-info">
                                <div className="recipe-title-row">
                                    <input
                                        className="recipe-name-input"
                                        value={meal.name}
                                        onChange={(e) => setField("name", e.target.value)}
                                        placeholder="Meal name..."
                                    />
                                    <StarRating value={meal.rating} onChange={(v) => setField("rating", v)} />
                                </div>
                                <textarea
                                    className="recipe-desc-input"
                                    value={meal.description}
                                    onChange={(e) => setField("description", e.target.value)}
                                    placeholder="Add a short description of your dish..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* Meal Properties */}
                        <div className="meal-properties">
                            <div className="meal-properties-label">Meal Properties</div>
                            <div className="props-grid">

                                <div className="prop-group">
                                    <label>Meal Type</label>
                                    <div className="select-wrap">
                                        <span className="select-icon">🍴</span>
                                        <select value={meal.mealType} onChange={(e) => setField("mealType", e.target.value)}>
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
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN ── */}
                    <div className="right-col">

                        {/* Ingredients Panel */}
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-title">
                                    <span className="title-icon">🧂</span>
                                    Ingredients Used
                                    {meal.ingredients.length > 0 && (
                                        <span className="count-badge">{meal.ingredients.length}</span>
                                    )}
                                </div>
                                <button className="add-ingredient-btn" onClick={() => setShowIngredientInput((v) => !v)}>
                                    + Add Ingredient
                                </button>
                            </div>

                            <div className="ingredients-list">
                                {meal.ingredients.length === 0 && !showIngredientInput && (
                                    <div className="empty-ingredients">
                                        No ingredients yet — click "Add Ingredient" to start
                                    </div>
                                )}
                                {meal.ingredients.map((name) => (
                                    <div className="ingredient-tag" key={name}>
                                        {name}
                                        <button onClick={() => removeIngredient(name)}>✕</button>
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
                                        <button className="btn-cancel-small" onClick={() => { setShowIngredientInput(false); setNewIngredient(""); }}>Cancel</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cooking Timeline Panel */}
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-title">
                                    <span className="title-icon">📈</span>
                                    Cooking Timeline
                                </div>
                            </div>

                            {meal.steps.length === 0 && (
                                <div className="empty-steps">
                                    <span>🍳</span>
                                    <span>No cooking steps yet</span>
                                    <span>Add steps below to track your cooking process</span>
                                </div>
                            )}

                            <div className="timeline-steps">
                                {meal.steps.map((step) => (
                                    <div className="timeline-step" key={step.id}>
                                        <button
                                            className={`step-number ${step.status}`}
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
                </div>
            </div>
        </div>
    );
}