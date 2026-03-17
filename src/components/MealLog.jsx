import { useState } from "react";
import "../pages/styles/MealLog.css";

const INITIAL_INGREDIENTS = [
    "Whole Wheat Flour",
    "Grated Paneer",
    "Green Chilies",
    "Ginger Paste",
    "Garam Masala",
    "Coriander Leaves",
    "Ghee",
];

const INITIAL_STEPS = [
    {
        id: 1,
        name: "Dough Preparation",
        time: "10:15 AM",
        status: "done",
        body: "Kneaded the whole wheat dough with a pinch of salt and warm water until soft and elastic. Resting for 15 mins.",
    },
    {
        id: 2,
        name: "Stuffing Preparation",
        time: "10:30 AM",
        status: "done",
        body: "Mixed grated paneer with chopped green chilies, ginger paste, garam masala, and fresh coriander. Smells divine!",
    },
    {
        id: 3,
        name: "Rolling & Stuffing",
        time: null,
        status: "in-progress",
        body: "Add your notes here... Rolling out small discs and placing stuffing in center.",
    },
    {
        id: 4,
        name: "Tawa Frying",
        time: null,
        status: "pending",
        body: null,
    },
];

export default function MealLog() {
    const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS);
    const [steps, setSteps] = useState(INITIAL_STEPS);
    const [difficulty, setDifficulty] = useState("Med");
    const [mealType, setMealType] = useState("Lunch");
    const [newIngredient, setNewIngredient] = useState("");
    const [showIngredientInput, setShowIngredientInput] = useState(false);

    const removeIngredient = (name) => {
        setIngredients((prev) => prev.filter((i) => i !== name));
    };

    const addIngredient = () => {
        if (newIngredient.trim()) {
            setIngredients((prev) => [...prev, newIngredient.trim()]);
            setNewIngredient("");
            setShowIngredientInput(false);
        }
    };

    const addStep = () => {
        const newId = steps.length + 1;
        setSteps((prev) => [
            ...prev,
            {
                id: newId,
                name: `Step ${newId}`,
                time: null,
                status: "pending",
                body: null,
            },
        ]);
    };

    return (
        <div>

            {/* PAGE */}
            <div className="page-container">
                {/* Breadcrumb */}
                <div className="breadcrumb">
                    <a href="#">Dashboard</a>
                    <span>›</span>
                    <a href="#">Meal Log</a>
                    <span>›</span>
                    <span style={{ color: "#555" }}>New Entry</span>
                </div>

                {/* Page Header */}
                <div className="meal-log-header">
                    <div className="page-header-left">
                        <h1>Log Your Meal</h1>
                        <p>
                            Record your culinary masterpiece:{" "}
                            <span>Paneer Paratha</span>
                        </p>
                    </div>
                    <div className="header-actions">
                        <button className="btn-discard">Discard</button>
                        <button className="btn-save">Save Entry</button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="main-grid">
                    {/* LEFT COLUMN */}
                    <div className="left-col">
                        {/* Recipe Card */}
                        <div className="recipe-card">
                            <div className="recipe-image-wrap">
                                <img
                                    src="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80"
                                    alt="Paneer Paratha"
                                />
                                <button className="camera-btn">📷</button>
                            </div>
                            <div className="recipe-info">
                                <div className="recipe-title-row">
                                    <h2>Paneer Paratha</h2>
                                    <div className="stars">
                                        {"★★★★★".split("").map((s, i) => (
                                            <span key={i}>{s}</span>
                                        ))}
                                    </div>
                                </div>
                                <p className="recipe-desc">
                                    Soft, whole wheat flatbread stuffed with a spiced paneer (Indian
                                    cottage cheese) filling. Perfectly golden and crispy on the outside.
                                </p>
                            </div>
                        </div>

                        {/* Meal Properties */}
                        <div className="meal-properties">
                            <div className="meal-properties-label">Meal Properties</div>
                            <div className="props-grid">
                                {/* Meal Type */}
                                <div className="prop-group">
                                    <label>Meal Type</label>
                                    <div className="select-wrap">
                                        <span className="select-icon">🍴</span>
                                        <select
                                            value={mealType}
                                            onChange={(e) => setMealType(e.target.value)}
                                        >
                                            <option>Breakfast</option>
                                            <option>Lunch</option>
                                            <option>Dinner</option>
                                            <option>Snack</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Cooking Time */}
                                <div className="prop-group">
                                    <label>Cooking Time</label>
                                    <div className="cooking-time-box">
                                        <span className="time-icon">⏱</span>
                                        <span>45 mins</span>
                                    </div>
                                </div>

                                {/* Difficulty */}
                                <div className="prop-group">
                                    <label>Difficulty</label>
                                    <div className="difficulty-btns">
                                        {["Easy", "Med", "Hard"].map((d) => (
                                            <button
                                                key={d}
                                                className={`diff-btn${difficulty === d ? " active" : ""}`}
                                                onClick={() => setDifficulty(d)}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Health Score */}
                                <div className="prop-group">
                                    <label>Health Score</label>
                                    <div className="health-score-row">
                                        <div className="health-bar">
                                            <div
                                                className="health-bar-fill"
                                                style={{ width: "85%" }}
                                            />
                                        </div>
                                        <span className="health-score-num">8.5/10</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="right-col">
                        {/* Ingredients Panel */}
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-title">
                                    <span className="title-icon">🧂</span>
                                    Ingredients Used
                                </div>
                                <button
                                    className="add-ingredient-btn"
                                    onClick={() => setShowIngredientInput((v) => !v)}
                                >
                                    + Add Ingredient
                                </button>
                            </div>

                            <div className="ingredients-list">
                                {ingredients.map((name) => (
                                    <div className="ingredient-tag" key={name}>
                                        {name}
                                        <button onClick={() => removeIngredient(name)}>✕</button>
                                    </div>
                                ))}
                                {showIngredientInput && (
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <input
                                            autoFocus
                                            value={newIngredient}
                                            onChange={(e) => setNewIngredient(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && addIngredient()}
                                            placeholder="Ingredient name..."
                                            style={{
                                                border: "1px solid #f0d5c8",
                                                borderRadius: 20,
                                                padding: "6px 12px",
                                                fontSize: 13,
                                                outline: "none",
                                            }}
                                        />
                                        <button
                                            onClick={addIngredient}
                                            style={{
                                                background: "#e8622a",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 20,
                                                padding: "6px 14px",
                                                fontSize: 13,
                                                cursor: "pointer",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Add
                                        </button>
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
                                <span className="timeline-header-meta">Auto-saved 2 mins ago</span>
                            </div>

                            <div className="timeline-steps">
                                {steps.map((step) => (
                                    <div className="timeline-step" key={step.id}>
                                        <div
                                            className={`step-number ${step.status}`}
                                        >
                                            {step.id}
                                        </div>
                                        <div
                                            className={`step-content ${step.status}`}
                                        >
                                            <div className="step-top">
                                                <span
                                                    className={`step-name${step.status === "pending" ? " pending-text" : ""}`}
                                                >
                                                    {step.name}
                                                </span>
                                                {step.time && (
                                                    <span className="step-time">{step.time}</span>
                                                )}
                                                {step.status === "in-progress" && (
                                                    <span className="step-badge-inprogress">In Progress</span>
                                                )}
                                            </div>

                                            {step.status === "pending" ? (
                                                <div className="step-waiting">Waiting for step {step.id - 1} to complete...</div>
                                            ) : (
                                                <p className={`step-body${!step.time && step.status !== "in-progress" ? " placeholder" : ""}`}>
                                                    {step.body}
                                                </p>
                                            )}

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

                            <div style={{ marginTop: 16 }}>
                                <button className="add-step-btn" onClick={addStep}>
                                    <span className="plus-icon">＋</span>
                                    Add Next Step
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}