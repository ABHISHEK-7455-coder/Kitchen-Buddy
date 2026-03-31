/* eslint-disable */
import { useState, useEffect, useRef } from "react";
import "./styles/IngredientSuggest.css";

// ─── Keys ─────────────────────────────────────────────────────────────────────
var GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
var UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

// ─── Groq ─────────────────────────────────────────────────────────────────────
function askGroq(sys, usr) {
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + GROQ_API_KEY,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 3000,
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: sys },
                { role: "user", content: usr },
            ],
        }),
    })
        .then(function (r) {
            if (!r.ok) return r.json().then(function (e) { throw new Error(e && e.error && e.error.message || "HTTP " + r.status); });
            return r.json();
        })
        .then(function (data) {
            var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "{}";
            var parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed;
            var key = Object.keys(parsed).find(function (k) { return Array.isArray(parsed[k]); });
            return key ? parsed[key] : [];
        });
}

// ─── Image system ─────────────────────────────────────────────────────────────
var IMG_CACHE = {};

function fetchDishImage(cacheKey, searchTerm, callback) {
    if (IMG_CACHE.hasOwnProperty(cacheKey)) { callback(IMG_CACHE[cacheKey]); return; }
    if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === "YOUR_UNSPLASH_ACCESS_KEY_HERE") {
        IMG_CACHE[cacheKey] = null; callback(null); return;
    }
    var q = encodeURIComponent(searchTerm || cacheKey);
    fetch("https://api.unsplash.com/search/photos?query=" + q + "&per_page=1&orientation=landscape&content_filter=high&client_id=" + UNSPLASH_ACCESS_KEY)
        .then(function (r) { return r.json(); })
        .then(function (d) {
            var photo = d && d.results && d.results[0];
            if (photo && photo.urls && photo.urls.raw) {
                var url = photo.urls.raw + "&w=600&h=360&fit=crop&auto=format&q=80";
                IMG_CACHE[cacheKey] = url; callback(url);
            } else { IMG_CACHE[cacheKey] = null; callback(null); }
        })
        .catch(function () { IMG_CACHE[cacheKey] = null; callback(null); });
}

var FALLBACKS = [
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1567620905732-f81944a37bdb?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1546069596-600bbec60b03?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1555939594-58329b054e4f?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&h=360&fit=crop",
    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&h=360&fit=crop",
];

function getFallback(name) {
    var h = 0;
    for (var i = 0; i < (name || "").length; i++) h += name.charCodeAt(i) * (i + 1);
    return FALLBACKS[Math.abs(h) % FALLBACKS.length];
}

function DishImage(props) {
    var dish = props.dish;
    var name = dish.name || "";
    var imgSearch = dish.imgSearch || name;
    var cls = props.className || "";
    var initSrc = IMG_CACHE.hasOwnProperty(name) && IMG_CACHE[name] ? IMG_CACHE[name] : getFallback(name);
    var s = useState(initSrc); var src = s[0]; var setSrc = s[1];
    var fetchedRef = useRef(false);
    useEffect(function () {
        if (!name) return;
        if (IMG_CACHE.hasOwnProperty(name) && IMG_CACHE[name]) { setSrc(IMG_CACHE[name]); return; }
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchDishImage(name, imgSearch, function (url) { if (url) setSrc(url); });
    }, [name]);
    return (
        <img src={src} alt={name} className={cls} loading="lazy"
            onError={function (e) { e.target.onerror = null; e.target.src = getFallback(name); }} />
    );
}

// ─── Icon ─────────────────────────────────────────────────────────────────────
function Icon(props) {
    var n = (props.n || "fa-circle").replace(/fa-solid\s*/g, "").replace(/fa-regular\s*/g, "").trim();
    var parts = n.split(/\s+/).filter(Boolean);
    return <i className={["fa-solid", parts[0], parts.slice(1).join(" "), props.cls || ""].filter(Boolean).join(" ")} aria-hidden="true" />;
}

// ─── Popular ingredient suggestions ──────────────────────────────────────────
var POPULAR = [
    "Chicken Breast", "Avocado", "Spinach", "Greek Yogurt", "Sweet Potato",
    "Salmon", "Eggs", "Kale", "Quinoa", "Tomatoes",
    "Garlic", "Onions", "Lentils", "Mushrooms", "Paneer",
];

// ─── Card image heights ────────────────────────────────────────────────────────
var HEIGHTS = [200, 220, 190, 230, 210, 200, 215, 195];

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard(props) {
    var h = HEIGHTS[props.index % HEIGHTS.length];
    return (
        <div className="is-dish-card skeleton" style={{ "--ch": h + "px" }}>
            <div className="is-skel-img" style={{ height: h + "px" }} />
            <div className="is-card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="is-skel-line" style={{ height: 10, width: "45%", borderRadius: 4 }} />
                <div className="is-skel-line" style={{ height: 16, width: "80%", borderRadius: 4 }} />
                <div className="is-skel-line" style={{ height: 12, width: "65%", borderRadius: 4 }} />
                <div className="is-skel-line" style={{ height: 12, width: "40%", borderRadius: 4 }} />
            </div>
        </div>
    );
}

// ─── Add to Plan Modal ────────────────────────────────────────────────────────
function AddToPlanModal(props) {
    var dish = props.dish;
    var mealPlans = props.mealPlans || {};
    var onClose = props.onClose;

    var days = [];
    for (var i = 0; i < 7; i++) {
        var d = new Date(); d.setDate(d.getDate() + i);
        var dateKey = d.toISOString().split("T")[0];
        var label = i === 0 ? "Today" : i === 1 ? "Tomorrow"
            : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        days.push({ dateKey: dateKey, label: label });
    }

    var ds = useState(days[0].dateKey); var selDate = ds[0]; var setSelDate = ds[1];
    var ms = useState("Breakfast"); var selMeal = ms[0]; var setSelMeal = ms[1];

    var MEAL_TYPES = [
        { key: "Breakfast", icon: "fa-sun", color: "#f59e0b" },
        { key: "Lunch", icon: "fa-cloud-sun", color: "#10b981" },
        { key: "Dinner", icon: "fa-moon", color: "#6366f1" },
    ];

    function isTaken(dk, mt) {
        return mealPlans[dk] && mealPlans[dk][mt] && mealPlans[dk][mt].name;
    }

    useEffect(function () {
        document.body.style.overflow = "hidden";
        return function () { document.body.style.overflow = ""; };
    }, []);

    return (
        <div className="is-atp-backdrop" onClick={onClose}>
            <div className="is-atp-modal" onClick={function (e) { e.stopPropagation(); }}>

                <div className="is-atp-header">
                    <div className="is-atp-dish-row">
                        <div className="is-atp-thumb"><DishImage dish={dish} className="is-atp-thumb-img" /></div>
                        <div>
                            <p className="is-atp-adding-label">Adding to plan</p>
                            <h3 className="is-atp-dish-name">{dish.name}</h3>
                            <div className="is-atp-meta">
                                <span><Icon n="fa-clock" /> {dish.time}</span>
                                <span><Icon n="fa-fire" /> {dish.nutrition && dish.nutrition.calories}</span>
                                <span className={"is-veg-tag " + (dish.isVeg ? "veg" : "nonveg")}>
                                    <Icon n={dish.isVeg ? "fa-leaf" : "fa-drumstick-bite"} />
                                    {dish.isVeg ? "Veg" : "Non-Veg"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button className="is-atp-close" type="button" onClick={onClose}><Icon n="fa-xmark" /></button>
                </div>

                <div className="is-atp-section">
                    <p className="is-atp-label"><Icon n="fa-calendar" /> Choose Day</p>
                    <div className="is-atp-days">
                        {days.map(function (day) {
                            return (
                                <button key={day.dateKey} type="button"
                                    className={"is-atp-day " + (selDate === day.dateKey ? "active" : "")}
                                    onClick={function () { setSelDate(day.dateKey); }}>
                                    {day.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="is-atp-section">
                    <p className="is-atp-label"><Icon n="fa-utensils" /> Choose Slot</p>
                    <div className="is-atp-slots">
                        {MEAL_TYPES.map(function (m) {
                            var taken = isTaken(selDate, m.key);
                            var takenName = taken && mealPlans[selDate] && mealPlans[selDate][m.key] && mealPlans[selDate][m.key].name;
                            return (
                                <button key={m.key} type="button"
                                    style={{ "--sc": m.color }}
                                    className={"is-atp-slot " + (selMeal === m.key ? "active" : "") + (taken ? " taken" : "")}
                                    onClick={function () { setSelMeal(m.key); }}>
                                    <Icon n={m.icon} cls="is-slot-icon" />
                                    <span className="is-slot-key">{m.key}</span>
                                    {taken && <span className="is-slot-taken">{takenName}</span>}
                                    {!taken && <span className="is-slot-empty">Empty</span>}
                                </button>
                            );
                        })}
                    </div>
                    {isTaken(selDate, selMeal) && (
                        <p className="is-atp-warn"><Icon n="fa-triangle-exclamation" /> Replaces existing meal</p>
                    )}
                </div>

                <div className="is-atp-footer">
                    <button className="is-atp-cancel" type="button" onClick={onClose}>Cancel</button>
                    <button className="is-atp-confirm" type="button"
                        onClick={function () { props.onConfirm(selDate, selMeal, dish); onClose(); }}>
                        <Icon n="fa-calendar-plus" /> Add to {selMeal}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Dish Card ────────────────────────────────────────────────────────────────
// Chooses tag pill color based on tag text
function tagColor(tag) {
    var t = (tag || "").toLowerCase();
    if (t.includes("protein") || t.includes("veg") || t.includes("salad") || t.includes("healthy")) return "green";
    if (t.includes("carb") || t.includes("pasta") || t.includes("rice") || t.includes("grain")) return "blue";
    if (t.includes("spicy") || t.includes("curry") || t.includes("hot")) return "orange";
    return "gray";
}

function DishCard(props) {
    var dish = props.dish;
    var index = props.index;
    var onClick = props.onClick;
    var onAddPlan = props.onAddPlan;
    var featured = props.featured || false;
    var h = HEIGHTS[index % HEIGHTS.length];

    var userIngs = props.userIngredients || [];
    var haveCount = dish.ingredients
        ? dish.ingredients.filter(function (ing) {
            return userIngs.some(function (u) {
                return ing.toLowerCase().includes(u.toLowerCase()) || u.toLowerCase().includes(ing.toLowerCase());
            });
        }).length
        : 0;
    var totalIngs = dish.ingredients ? dish.ingredients.length : 0;
    var matchPct = totalIngs > 0 ? Math.round((haveCount / totalIngs) * 100) : 0;

    var nutr = dish.nutrition || {};

    return (
        <div
            className={"is-dish-card" + (featured ? " featured" : "")}
            style={featured ? {} : { "--ch": h + "px", animationDelay: (index * 0.06) + "s" }}
            onClick={function () { onClick(dish); }}
        >
            {/* Image */}
            <div className="is-card-img-wrap">
                <DishImage dish={dish} className="is-card-img" />
                <div className="is-card-top">
                    <span className={"is-match-badge " + (matchPct >= 80 ? "high" : matchPct >= 50 ? "mid" : "low")}>
                        {matchPct}% MATCH
                    </span>
                    {dish.mealLabel && <span className="is-card-corner-tag">{dish.mealLabel}</span>}
                </div>
            </div>

            {/* Body */}
            <div className="is-card-body">
                {/* Tag pills */}
                {dish.tags && dish.tags.length > 0 && (
                    <div className="is-card-tags">
                        {dish.tags.slice(0, 2).map(function (tag, i) {
                            return (
                                <span key={i} className={"is-tag-pill " + tagColor(tag)}>
                                    {tag.toUpperCase()}
                                </span>
                            );
                        })}
                    </div>
                )}

                <span className="is-card-cuisine">{dish.cuisine}</span>
                <h3 className="is-card-name">{dish.name}</h3>
                <p className="is-card-desc">{dish.description}</p>

                {/* Calories + Time for featured */}
                {featured && nutr.calories && (
                    <div className="is-card-stats">
                        <div className="is-stat">
                            <span className="is-stat-val">{nutr.calories}</span>
                            <span className="is-stat-label">Calories</span>
                        </div>
                        <div className="is-stat">
                            <span className="is-stat-val">{dish.time}</span>
                            <span className="is-stat-label">Time</span>
                        </div>
                    </div>
                )}

                {/* Missing ingredients for non-featured */}
                {!featured && dish.missingIngredients && dish.missingIngredients.length > 0 && (
                    <div className="is-missing-row">
                        <Icon n="fa-cart-shopping" cls="is-missing-icon" />
                        <span>Need: {dish.missingIngredients.slice(0, 3).join(", ")}
                            {dish.missingIngredients.length > 3 ? " +" + (dish.missingIngredients.length - 3) + " more" : ""}
                        </span>
                    </div>
                )}

                {/* Meta row */}
                {!featured && (
                    <div className="is-card-meta">
                        <span><Icon n="fa-clock" /> {dish.time}</span>
                        <span><Icon n="fa-signal" /> {dish.difficulty}</span>
                        <span className={"is-veg-dot " + (dish.isVeg ? "veg" : "nonveg")}>
                            <Icon n={dish.isVeg ? "fa-leaf" : "fa-drumstick-bite"} />
                            {dish.isVeg ? " Veg" : " Non-Veg"}
                        </span>
                    </div>
                )}

                <hr className="is-card-divider" />

                <div className="is-card-actions">
                    <button type="button" className="is-view-recipe-btn"
                        onClick={function (e) { e.stopPropagation(); onClick(dish); }}>
                        View Full Recipe <Icon n="fa-arrow-right" />
                    </button>
                    <button type="button" className="is-bookmark-btn"
                        onClick={function (e) { e.stopPropagation(); onAddPlan(dish); }}
                        title="Add to Meal Plan">
                        <Icon n="fa-bookmark" />
                    </button>
                </div>

                {/* Match row for non-featured */}
                {!featured && (
                    <div className="is-card-match-row">
                        <span className="is-match-text">{matchPct}% Match</span>
                        <span className={"is-veg-dot " + (dish.isVeg ? "veg" : "nonveg")}>
                            <Icon n={dish.isVeg ? "fa-leaf" : "fa-drumstick-bite"} />
                            {dish.isVeg ? " Veg" : " Non-Veg"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── AI Innovation Card ───────────────────────────────────────────────────────
function AICard() {
    return (
        <div className="is-dish-card ai-card" style={{ animationDelay: "0.42s" }}>
            <div className="is-card-body" style={{ padding: "24px" }}>
                <div className="is-ai-tag"><Icon n="fa-wand-magic-sparkles" /> AI INNOVATION</div>
                <h3 className="is-card-name">"The Signature Stew"</h3>
                <p className="is-card-desc" style={{ color: "rgba(255,255,255,.65)" }}>
                    NutriAI just created a brand new recipe based on your unique pantry signature. Optimised for gut health and mental clarity.
                </p>
                <button className="is-try-btn" type="button">
                    Try Experimental Recipe <Icon n="fa-arrow-right" />
                </button>
            </div>
        </div>
    );
}

// ─── Dish Detail Modal ────────────────────────────────────────────────────────
function DishModal(props) {
    var dish = props.dish;
    var onClose = props.onClose;
    var onAddPlan = props.onAddPlan;
    var userIngs = props.userIngredients || [];

    useEffect(function () {
        document.body.style.overflow = "hidden";
        return function () { document.body.style.overflow = ""; };
    }, []);

    if (!dish) return null;
    var nutr = dish.nutrition || {};

    return (
        <div className="is-modal-backdrop" onClick={onClose}>
            <div className="is-modal-sheet" onClick={function (e) { e.stopPropagation(); }}>
                <button className="is-modal-close" type="button" onClick={onClose}><Icon n="fa-xmark" /></button>

                <div className="is-modal-img-wrap">
                    <DishImage dish={dish} className="is-modal-img" />
                    <div className="is-modal-img-overlay" />
                    <div className="is-modal-badges">
                        <span className={"is-dish-badge " + (dish.isVeg ? "veg" : "nonveg")}>
                            <Icon n={dish.isVeg ? "fa-leaf" : "fa-drumstick-bite"} />
                            {dish.isVeg ? "Vegetarian" : "Non-Veg"}
                        </span>
                        <span className="is-dish-badge neutral"><Icon n="fa-clock" /> {dish.time}</span>
                        <span className="is-dish-badge neutral"><Icon n="fa-signal" /> {dish.difficulty}</span>
                    </div>
                </div>

                <div className="is-modal-body">
                    <div className="is-modal-cuisine">{dish.cuisine}</div>
                    <h2 className="is-modal-title">{dish.name}</h2>
                    <p className="is-modal-desc">{dish.description}</p>

                    <div className="is-modal-nutr">
                        {[
                            { icon: "fa-fire", label: "Calories", val: nutr.calories },
                            { icon: "fa-dumbbell", label: "Protein", val: nutr.protein },
                            { icon: "fa-wheat-awn", label: "Carbs", val: nutr.carbs },
                            { icon: "fa-droplet", label: "Fat", val: nutr.fat },
                        ].map(function (r) {
                            return (
                                <div className="is-nutr-item" key={r.label}>
                                    <Icon n={r.icon} cls="is-nutr-icon" />
                                    <span className="is-nutr-val">{r.val || "—"}</span>
                                    <span className="is-nutr-label">{r.label}</span>
                                </div>
                            );
                        })}
                    </div>

                    {dish.ingredients && dish.ingredients.length > 0 && (
                        <div className="is-modal-section">
                            <h3 className="is-modal-section-title"><Icon n="fa-list-ul" /> Ingredients</h3>
                            <div className="is-modal-ings">
                                {dish.ingredients.map(function (ing, i) {
                                    var have = userIngs.some(function (u) {
                                        return ing.toLowerCase().includes(u.toLowerCase()) || u.toLowerCase().includes(ing.toLowerCase());
                                    });
                                    return (
                                        <span key={i} className={"is-ing-chip " + (have ? "have" : "need")}>
                                            <Icon n={have ? "fa-circle-check" : "fa-cart-shopping"} />
                                            {ing}
                                        </span>
                                    );
                                })}
                            </div>
                            <div className="is-ing-legend">
                                <span className="is-legend-have"><Icon n="fa-circle-check" /> You have it</span>
                                <span className="is-legend-need"><Icon n="fa-cart-shopping" /> Need to buy</span>
                            </div>
                        </div>
                    )}

                    {dish.steps && dish.steps.length > 0 && (
                        <div className="is-modal-section">
                            <h3 className="is-modal-section-title"><Icon n="fa-list-ol" /> How to Cook</h3>
                            <ol className="is-steps-list">
                                {dish.steps.map(function (step, i) {
                                    return (
                                        <li className="is-step-item" key={i}>
                                            <span className="is-step-num">{i + 1}</span>
                                            <span className="is-step-text">{step}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    )}

                    <div className="is-modal-actions">
                        <button className="is-btn-add" type="button"
                            onClick={function () { onAddPlan(dish); onClose(); }}>
                            <Icon n="fa-calendar-plus" /> Add to Meal Plan
                        </button>
                        <button className="is-btn-save" type="button"><Icon n="fa-bookmark" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast(props) {
    useEffect(function () {
        var t = setTimeout(props.onHide, 3000);
        return function () { clearTimeout(t); };
    }, []);
    return (
        <div className="is-toast">
            <Icon n="fa-circle-check" cls="is-toast-icon" />
            <span>{props.message}</span>
        </div>
    );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
var NAV_LINKS = ["Home", "AI Meals", "Ingredients", "Meal Log", "Planner", "Pantry"];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IngredientSuggest(props) {
    var addMeal = props.addMeal;
    var mealPlans = props.mealPlans || {};

    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}"); } catch (e) { }

    var i1 = useState(function () {
        try { return JSON.parse(localStorage.getItem("is_ingredients") || "[]"); } catch (e) { return []; }
    });
    var ingredients = i1[0]; var setIngredients = i1[1];

    var i2 = useState(""); var inputVal = i2[0]; var setInputVal = i2[1];
    var inputRef = useRef(null);

    var s1 = useState(function () {
        try { return JSON.parse(localStorage.getItem("is_dishes") || "[]"); } catch (e) { return []; }
    });
    var dishes = s1[0]; var setDishes = s1[1];

    var s2 = useState(false); var loading = s2[0]; var setLoading = s2[1];
    var s3 = useState(""); var errMsg = s3[0]; var setErrMsg = s3[1];
    var s4 = useState(null); var selected = s4[0]; var setSelected = s4[1];
    var s5 = useState(null); var planDish = s5[0]; var setPlanDish = s5[1];
    var s6 = useState(""); var toast = s6[0]; var setToast = s6[1];
    var s7 = useState("all"); var filter = s7[0]; var setFilter = s7[1];

    var s8 = useState(function () {
        try { return localStorage.getItem("is_searched") === "true"; } catch (e) { return false; }
    });
    var searched = s8[0]; var setSearched = s8[1];

    useEffect(function () {
        try { localStorage.setItem("is_ingredients", JSON.stringify(ingredients)); } catch (e) { }
    }, [ingredients]);
    useEffect(function () {
        try { localStorage.setItem("is_dishes", JSON.stringify(dishes)); } catch (e) { }
    }, [dishes]);
    useEffect(function () {
        try { localStorage.setItem("is_searched", String(searched)); } catch (e) { }
    }, [searched]);

    // ── Add / remove ingredient ────────────────────────────────────────────────
    function addIngredient(val) {
        var trimmed = (val || inputVal).trim();
        if (!trimmed) return;
        if (ingredients.indexOf(trimmed) !== -1) { setInputVal(""); return; }
        setIngredients(function (prev) { return prev.concat(trimmed); });
        setInputVal("");
    }

    function removeIngredient(ing) {
        setIngredients(function (prev) { return prev.filter(function (i) { return i !== ing; }); });
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addIngredient();
        }
        if (e.key === "Backspace" && inputVal === "" && ingredients.length > 0) {
            setIngredients(function (prev) { return prev.slice(0, -1); });
        }
    }

    // ── Get AI suggestions ─────────────────────────────────────────────────────
    function getSuggestions() {
        if (ingredients.length === 0) return;
        setLoading(true); setErrMsg(""); setDishes([]); setSearched(true);

        var getVal = function (v) {
            if (!v) return "";
            if (Array.isArray(v)) return v.map(function (x) { return x.label || x; }).join(", ");
            return v.label || v;
        };

        var ctx = [
            prefs.diet && "Diet: " + getVal(prefs.diet),
            prefs.cuisine && "Cuisine: " + getVal(prefs.cuisines),
            prefs.spice && "Spice: " + getVal(prefs.spice),
            prefs.country && "Country: " + getVal(prefs.country),
        ].filter(Boolean).join(", ") || "General food lover";

        var sys = [
            "You are NutriAI's chef. Respond ONLY as JSON: {\"dishes\": [...]}",
            "",
            "CRITICAL RULE — Only suggest widely recognised, home-cookable dishes.",
            "",
            "Each dish object must have ALL these fields:",
            "  id (unique string), name, cuisine,",
            "  description (2 mouth-watering sentences),",
            "  time (like '25 min'), difficulty (Easy/Medium/Hard), isVeg (boolean),",
            "  nutrition ({calories, protein, carbs, fat} as strings with units),",
            "  ingredients (array of ALL ingredients needed, 6-10 strings),",
            "  missingIngredients (ingredients NOT in the user's provided list),",
            "  steps (4-6 simple cooking steps),",
            "  tags (2-3 strings like 'High Protein', 'Low Carb', 'Quick'),",
            "  imgSearch (2-3 word food photography term for Unsplash)",
            "",
            "Sort by fewest missing ingredients first.",
            "Mix veg and non-veg dishes. Make descriptions sound delicious."
        ].join("\n");

        var usr = "User has: " + ingredients.join(", ") + "\n"
            + "Profile: " + ctx + "\n\n"
            + "Suggest 12 dishes. List ALL ingredients needed. "
            + "missingIngredients = those NOT in [" + ingredients.join(", ") + "]. "
            + "Sort by fewest missing. Return {\"dishes\":[12 objects]}";

        askGroq(sys, usr)
            .then(function (r) {
                if (!Array.isArray(r) || r.length === 0) {
                    setErrMsg("No suggestions found. Try adding more ingredients.");
                } else {
                    setDishes(r.slice(0, 12));
                }
                setLoading(false);
            })
            .catch(function (e) {
                setErrMsg("AI error: " + e.message);
                setLoading(false);
            });
    }

    // ── Add to planner ─────────────────────────────────────────────────────────
    function handleConfirmAdd(dateKey, mealType, dish) {
        var meal = {
            name: dish.name, time: dish.time,
            calories: dish.nutrition && dish.nutrition.calories,
            cuisine: dish.cuisine, description: dish.description,
            ingredients: dish.ingredients, steps: dish.steps,
            isVeg: dish.isVeg, difficulty: dish.difficulty,
            source: "ingredient_suggest",
        };
        addMeal(dateKey, mealType, meal);
        var d = new Date(dateKey + "T00:00:00");
        var isToday = dateKey === new Date().toISOString().split("T")[0];
        var dayLabel = isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "long" });
        setToast(dish.name + " added to " + mealType + " on " + dayLabel + "!");
    }

    var filtered = dishes.filter(function (d) {
        if (filter === "veg") return d.isVeg === true;
        if (filter === "nonveg") return d.isVeg === false;
        return true;
    });

    var FILTERS = [
        { key: "all", label: "All", icon: "fa-utensils" },
        { key: "veg", label: "Vegetarian", icon: "fa-leaf" },
        { key: "nonveg", label: "Non-Veg", icon: "fa-drumstick-bite" },
    ];

    return (
        <div className="is-root">

            {/* ── Hero ────────────────────────────────────────────────────────── */}
            <div className="is-hero">
                <h1 className="is-hero-title">What's in your fridge?</h1>
                <p className="is-hero-sub">
                    Tell NutriAI what ingredients you have, and we'll craft a perfect, nutritionally-balanced recipe just for you.
                </p>
            </div>

            {/* ── Input Card ──────────────────────────────────────────────────── */}
            <div className="is-input-card">
                {/* Search row */}
                <div className="is-search-row" onClick={function () { inputRef.current && inputRef.current.focus(); }}>
                    <Icon n="fa-magnifying-glass" cls="is-search-icon" />

                    {/* Ingredient tags inline */}
                    {ingredients.map(function (ing) {
                        return (
                            <span key={ing} className="is-quick-chip selected">
                                {ing}
                                <button type="button" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit" }}
                                    onClick={function (e) { e.stopPropagation(); removeIngredient(ing); }}>
                                    <Icon n="fa-xmark" />
                                </button>
                            </span>
                        );
                    })}

                    <input
                        ref={inputRef}
                        className="is-tag-input"
                        placeholder={ingredients.length === 0 ? "Enter ingredients you have (e.g., Salmon, Kale, Quinoa...)" : "Add more..."}
                        value={inputVal}
                        onChange={function (e) { setInputVal(e.target.value); }}
                        onKeyDown={handleKeyDown}
                    />

                    <button
                        type="button"
                        className="is-generate-btn"
                        onClick={getSuggestions}
                        disabled={ingredients.length === 0 || loading}
                    >
                        {loading
                            ? <><Icon n="fa-circle-notch fa-spin" /> Generating...</>
                            : <><Icon n="fa-wand-magic-sparkles" /> Generate</>
                        }
                    </button>
                </div>

                {/* Quick add + clear */}
                <div className="is-tag-row">
                    <span className="is-quick-label">Quick Add:</span>
                    {POPULAR.filter(function (p) { return ingredients.indexOf(p) === -1; }).slice(0, 8).map(function (p) {
                        return (
                            <button key={p} type="button" className="is-quick-chip"
                                onClick={function () { addIngredient(p); }}>
                                {p} +
                            </button>
                        );
                    })}
                    {ingredients.length > 0 && (
                        <button type="button" className="is-clear-link"
                            onClick={function () { setIngredients([]); setDishes([]); setSearched(false); }}>
                            <Icon n="fa-rotate-left" /> Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* ── Results ─────────────────────────────────────────────────────── */}
            {(searched || loading) && (
                <div className="is-results-wrap">
                    <div className="is-section-header">
                        <h2 className="is-section-title">Recommended AI Meals</h2>
                        <button className="is-filter-btn" type="button">
                            <Icon n="fa-sliders" /> Dietary Filters
                        </button>
                    </div>

                    {/* Filter tabs */}
                    <div className="is-filter-tabs">
                        {FILTERS.map(function (opt) {
                            return (
                                <button key={opt.key} type="button"
                                    className={"is-filter-tab " + (filter === opt.key ? "active" : "")}
                                    onClick={function () { setFilter(opt.key); }}>
                                    <Icon n={opt.icon} /> {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Error */}
                    {errMsg && !loading && (
                        <div className="is-error-banner">
                            <Icon n="fa-circle-exclamation" />
                            {errMsg}
                            <button type="button" onClick={getSuggestions}>
                                <Icon n="fa-rotate" /> Retry
                            </button>
                        </div>
                    )}

                    {/* Grid */}
                    <div className="is-masonry">
                        {loading ? (
                            Array.from({ length: 9 }).map(function (_, i) {
                                return <SkeletonCard key={i} index={i} />;
                            })
                        ) : filtered.length === 0 && !errMsg ? (
                            <div className="is-empty">
                                <Icon n="fa-face-sad-tear" cls="is-empty-icon" />
                                <p>No {filter !== "all" ? filter : ""} dishes found.</p>
                                <button type="button" onClick={function () { setFilter("all"); }}>Show all dishes</button>
                            </div>
                        ) : (
                            filtered.map(function (dish, i) {
                                // First card is featured (wide)
                                if (i === 0) {
                                    return (
                                        <DishCard key={dish.id || i} dish={dish} index={i}
                                            featured={true}
                                            onClick={setSelected}
                                            onAddPlan={setPlanDish}
                                            userIngredients={ingredients} />
                                    );
                                }
                                // AI innovation card after index 3
                                if (i === 3) {
                                    return (
                                        <span key="ai-card">
                                            <DishCard dish={dish} index={i}
                                                onClick={setSelected}
                                                onAddPlan={setPlanDish}
                                                userIngredients={ingredients} />
                                            <AICard />
                                        </span>
                                    );
                                }
                                return (
                                    <DishCard key={dish.id || i} dish={dish} index={i}
                                        onClick={setSelected}
                                        onAddPlan={setPlanDish}
                                        userIngredients={ingredients} />
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── Empty state (no search yet) ──────────────────────────────────── */}
            {!searched && !loading && (
                <div className="is-empty-state">
                    <div className="is-empty-state-icon"><Icon n="fa-bowl-food" /></div>
                    <h3>Start by adding ingredients</h3>
                    <p>Type what you have in your fridge and we'll suggest nutritionally-balanced meals you can make right now</p>
                </div>
            )}

            {/* ── Modals ─────────────────────────────────────────────────────── */}
            {selected && (
                <DishModal dish={selected}
                    onClose={function () { setSelected(null); }}
                    onAddPlan={function (d) { setSelected(null); setPlanDish(d); }}
                    userIngredients={ingredients} />
            )}

            {planDish && (
                <AddToPlanModal dish={planDish} mealPlans={mealPlans}
                    onConfirm={handleConfirmAdd}
                    onClose={function () { setPlanDish(null); }} />
            )}

            {toast && <Toast message={toast} onHide={function () { setToast(""); }} />}

            {/* Mobile FAB */}
            <button className="is-fab" type="button" onClick={getSuggestions} disabled={ingredients.length === 0 || loading}>
                <Icon n="fa-plus" /> Plan New Meal
            </button>
        </div>
    );
}