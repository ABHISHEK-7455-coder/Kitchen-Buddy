import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../pages/styles/MealPlan.css";

// ─── localStorage key ─────────────────────────────────────────────────────────
const LS_KEY = "mealplan_meals";

// ─── Default empty slots ──────────────────────────────────────────────────────
const DEFAULT_MEALS = [
    { id: "breakfast", label: "Breakfast", emoji: "🍳", name: "", time: "", calories: "", image: null, instructions: "", notes: "" },
    { id: "lunch", label: "Lunch", emoji: "🥗", name: "", time: "", calories: "", image: null, instructions: "", notes: "" },
    { id: "dinner", label: "Dinner", emoji: "🍽️", name: "", time: "", calories: "", image: null, instructions: "", notes: "" },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────
const ls = {
    get: (key, fallback) => {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
        catch { return fallback; }
    },
    set: (key, val) => {
        try { localStorage.setItem(key, JSON.stringify(val)); }
        catch { }
    },
};

// ─── Image Upload Modal ───────────────────────────────────────────────────────
function ImageUploadModal({ onConfirm, onClose }) {
    const [tab, setTab] = useState("file");
    const [url, setUrl] = useState("");
    const [err, setErr] = useState("");
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { onConfirm(reader.result); onClose(); };
        reader.readAsDataURL(file);
    };

    const handleUrl = () => {
        const t = url.trim();
        if (!t) { setErr("Please enter a URL."); return; }
        try { new URL(t); } catch { setErr("Invalid URL."); return; }
        onConfirm(t);
        onClose();
    };

    return (
        <div className="mp-modal-backdrop" onClick={onClose}>
            <div className="mp-modal-box" onClick={e => e.stopPropagation()}>
                <div className="mp-modal-header">
                    <span>Add Image</span>
                    <button className="mp-modal-close" onClick={onClose}>×</button>
                </div>
                <div className="mp-tab-row">
                    {[{ k: "file", l: "📁 Upload" }, { k: "url", l: "🔗 URL" }].map(t => (
                        <button
                            key={t.k}
                            className={`mp-tab ${tab === t.k ? "active" : ""}`}
                            onClick={() => { setTab(t.k); setErr(""); }}
                        >{t.l}</button>
                    ))}
                </div>
                {tab === "file" && (
                    <div className="mp-file-zone" onClick={() => fileRef.current?.click()}>
                        <span className="mp-file-icon">📷</span>
                        <span>Click to browse</span>
                        <span className="mp-file-hint">JPG, PNG, WEBP</span>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
                    </div>
                )}
                {tab === "url" && (
                    <div className="mp-url-group">
                        <input
                            autoFocus
                            value={url}
                            onChange={e => { setUrl(e.target.value); setErr(""); }}
                            onKeyDown={e => e.key === "Enter" && handleUrl()}
                            placeholder="https://..."
                            className={`mp-url-input ${err ? "error" : ""}`}
                        />
                        {err && <span className="mp-url-err">{err}</span>}
                        <button className="mp-btn-primary" onClick={handleUrl}>Use URL</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Single Meal Card ─────────────────────────────────────────────────────────
function MealCard({ meal, onSave }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(meal);
    const [showImgModal, setShowImgModal] = useState(false);
    const cardRef = useRef(null);

    // Keep draft in sync if parent meal object changes (e.g. first LS load)
    useEffect(() => { setDraft(meal); }, [meal]);

    // Outside-click handler — commits save
    useEffect(() => {
        if (!editing) return;
        const handler = (e) => {
            const clickedInsideCard = cardRef.current?.contains(e.target);
            const clickedInsideModal = !!e.target.closest(".mp-modal-backdrop");
            if (!clickedInsideCard && !clickedInsideModal) {
                commitSave(draft);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [editing, draft]);

    const commitSave = (d) => {
        onSave(d);
        setEditing(false);
    };

    const set = (key, val) => setDraft(prev => ({ ...prev, [key]: val }));

    return (
        <>
            {showImgModal && (
                <ImageUploadModal
                    onConfirm={src => set("image", src)}
                    onClose={() => setShowImgModal(false)}
                />
            )}

            <div
                ref={cardRef}
                className={`mp-card ${editing ? "editing" : ""} ${!meal.name && !meal.image ? "empty" : ""}`}
                onClick={() => { if (!editing) setEditing(true); }}
            >
                {/* Label */}
                <div className="mp-card-label">{meal.label}</div>

                {/* Thumbnail */}
                <div
                    className="mp-card-thumb"
                    onClick={e => { if (editing) { e.stopPropagation(); setShowImgModal(true); } }}
                >
                    {draft.image ? (
                        <>
                            <img src={draft.image} alt={draft.label} className="mp-card-img" />
                            {editing && (
                                <div className="mp-card-img-overlay"><span>📷 Change</span></div>
                            )}
                        </>
                    ) : (
                        <div className="mp-card-emoji-wrap">
                            <span className="mp-card-emoji">{meal.emoji}</span>
                            {editing && <span className="mp-add-photo-hint">📷 Add photo</span>}
                        </div>
                    )}
                </div>

                {/* Name */}
                {editing ? (
                    <input
                        autoFocus
                        className="mp-input mp-name-input"
                        value={draft.name}
                        onChange={e => set("name", e.target.value)}
                        placeholder={`${meal.label} dish name...`}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <div className={`mp-card-name ${!meal.name ? "mp-placeholder" : ""}`}>
                        {meal.name || `Add ${meal.label}...`}
                    </div>
                )}

                {/* Time & Calories */}
                {editing ? (
                    <div className="mp-inline-row" onClick={e => e.stopPropagation()}>
                        <input
                            className="mp-input mp-small-input"
                            value={draft.time}
                            onChange={e => set("time", e.target.value)}
                            placeholder="Time (8:30 AM)"
                        />
                        <input
                            className="mp-input mp-small-input"
                            type="number"
                            value={draft.calories}
                            onChange={e => set("calories", e.target.value)}
                            placeholder="kcal"
                            min={0}
                        />
                    </div>
                ) : (
                    <div className="mp-card-info">
                        {meal.time || meal.calories
                            ? <>{meal.time}{meal.time && meal.calories ? " • " : ""}{meal.calories ? `${meal.calories} kcal` : ""}</>
                            : <span className="mp-placeholder">Time • Calories</span>
                        }
                    </div>
                )}

                {/* Instructions + Notes + Actions — only in edit mode */}
                {editing && (
                    <div className="mp-edit-extra" onClick={e => e.stopPropagation()}>
                        <textarea
                            className="mp-textarea"
                            value={draft.instructions}
                            onChange={e => set("instructions", e.target.value)}
                            placeholder="Preparation instructions..."
                            rows={2}
                        />
                        <textarea
                            className="mp-textarea"
                            value={draft.notes}
                            onChange={e => set("notes", e.target.value)}
                            placeholder="Notes (spices, nutrients, etc.)"
                            rows={2}
                        />
                        <div className="mp-card-actions">
                            <button
                                className="mp-btn-save"
                                onClick={e => { e.stopPropagation(); commitSave(draft); }}
                            >✓ Save</button>
                            <button
                                className="mp-btn-cancel"
                                onClick={e => { e.stopPropagation(); setDraft(meal); setEditing(false); }}
                            >Cancel</button>
                        </div>
                    </div>
                )}

                {/* Hover hint */}
                {!editing && <div className="mp-edit-hint">✏️ Click to edit</div>}
            </div>
        </>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MealPlan({ mealPlans, addMeal }) {
    const [meals, setMeals] = useState(() => ls.get(LS_KEY, DEFAULT_MEALS));
    const navigate = useNavigate();

    useEffect(() => { ls.set(LS_KEY, meals); }, [meals]);

    const handleSave = (updatedMeal) => {
        // Update local meal plan state
        setMeals(prev => prev.map(m => m.id === updatedMeal.id ? updatedMeal : m));

        // Sync to CalendarView — use today's LOCAL date as the key (YYYY-MM-DD)
        if (addMeal) {
            const now = new Date();
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            // CalendarView stores meals under mealPlans[dateKey][MealType]
            // label is "Breakfast" / "Lunch" / "Dinner" — matches CalendarView's type keys
            addMeal(todayKey, updatedMeal.label, {
                name: updatedMeal.name,
                time: updatedMeal.time,
                calories: updatedMeal.calories,
                image: updatedMeal.image,
                instructions: updatedMeal.instructions,
                notes: updatedMeal.notes,
            });
        }
    };

    return (
        <div>
            <div className="section-header">
                <h2 className="section-title">Today's Meal Plan</h2>
                <button className="view-week-btn" onClick={() => navigate("/planner")}>View Week</button>
            </div>

            <div className="meal-cards">
                {meals.map(meal => (
                    <MealCard key={meal.id} meal={meal} onSave={handleSave} />
                ))}
            </div>
        </div>
    );
}