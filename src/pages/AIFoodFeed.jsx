/* eslint-disable */
import { useState, useEffect, useRef } from "react";
import "./AIFoodFeed.css";

// ─── API KEYS ─────────────────────────────────────────────────────────────────
var GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
var SPOONACULAR_API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;

// ─── IMAGE SYSTEM (Spoonacular) ───────────────────────────────────────────────
// Strategy:
// 1. Spoonacular /recipes/complexSearch — real food photos matched to dish name
// 2. Static fallback — curated Unsplash food photos (unique per dish name)

var IMG_CACHE = {};

var FALLBACKS = [
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-f81944a37bdb?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1546069596-600bbec60b03?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1555939594-58329b054e4f?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=600&fit=crop",
];

function getFallback(name) {
  var h = 0;
  for (var i = 0; i < (name || "").length; i++) h += name.charCodeAt(i) * (i + 1);
  return FALLBACKS[Math.abs(h) % FALLBACKS.length];
}

/**
 * Fetch a food image from Spoonacular's complexSearch endpoint.
 * Uses imgSearch (AI-generated 2-3 word term) for best match accuracy.
 * Falls back to a static photo if API key is missing or call fails.
 *
 * Spoonacular complexSearch returns:
 *   { results: [{ id, title, image }] }
 * where image is a full URL like:
 *   https://img.spoonacular.com/recipes/716429-312x231.jpg
 */
function fetchDishImage(dishName, imgSearch, callback) {
  var cacheKey = dishName || imgSearch || "unknown";

  // Return cached result immediately if available
  if (IMG_CACHE.hasOwnProperty(cacheKey)) {
    callback(IMG_CACHE[cacheKey]); return;
  }

  // No API key → use fallback right away
  if (!SPOONACULAR_API_KEY || SPOONACULAR_API_KEY === "undefined") {
    var fb = getFallback(cacheKey);
    IMG_CACHE[cacheKey] = fb;
    callback(fb); return;
  }

  var query = encodeURIComponent(imgSearch || dishName || "food");
  var url = "https://api.spoonacular.com/recipes/complexSearch?query=" + query
    + "&number=1&apiKey=" + SPOONACULAR_API_KEY;

  fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var result = data && data.results && data.results[0];
      var imgUrl = result && result.image ? result.image : null;
      var final = imgUrl || getFallback(cacheKey);
      IMG_CACHE[cacheKey] = final;
      callback(final);
    })
    .catch(function () {
      var fb = getFallback(cacheKey);
      IMG_CACHE[cacheKey] = fb;
      callback(fb);
    });
}

// ─── DishImage component ──────────────────────────────────────────────────────
function DishImage(props) {
  var dish = props.dish;
  var name = dish.name || "";
  var imgSearch = dish.imgSearch || name;
  var cls = props.className || "";

  // Show fallback immediately while Spoonacular loads
  var initSrc = (IMG_CACHE.hasOwnProperty(name) && IMG_CACHE[name])
    ? IMG_CACHE[name]
    : getFallback(name);

  var s = useState(initSrc);
  var src = s[0]; var setSrc = s[1];
  var fetchedRef = useRef(false);

  useEffect(function () {
    if (!name) return;
    // Already cached — just apply it
    if (IMG_CACHE.hasOwnProperty(name) && IMG_CACHE[name]) {
      setSrc(IMG_CACHE[name]); return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetchDishImage(name, imgSearch, function (url) {
      if (url) setSrc(url);
    });
  }, [name]);

  return (
    <img src={src} alt={name} className={cls} loading="lazy"
      onError={function (e) { e.target.onerror = null; e.target.src = getFallback(name); }} />
  );
}

// ─── Groq API ─────────────────────────────────────────────────────────────────
function askGroq(sys, usr) {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + GROQ_API_KEY },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", max_tokens: 6000, temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
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

// ─── Icon ─────────────────────────────────────────────────────────────────────
function Icon(props) {
  var n = (props.n || "fa-circle").replace(/fa-solid\s*/g, "").replace(/fa-regular\s*/g, "").trim();
  var parts = n.split(/\s+/).filter(Boolean);
  return <i className={["fa-solid", parts[0], parts.slice(1).join(" "), props.cls || ""].filter(Boolean).join(" ")} aria-hidden="true" />;
}

// ─── Heights ──────────────────────────────────────────────────────────────────
var HEIGHTS = [320, 420, 360, 480, 340, 400, 460, 380, 350, 430, 390, 445];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard(props) {
  var h = HEIGHTS[props.index % HEIGHTS.length];
  return (
    <div className="dish-card skeleton-card" style={{ "--card-h": h + "px" }}>
      <div className="skeleton-shimmer" style={{ height: h + "px" }} />
    </div>
  );
}

// ─── Add to Plan Picker Modal ─────────────────────────────────────────────────
function AddToPlanModal(props) {
  var dish = props.dish;
  var mealPlans = props.mealPlans;
  var onConfirm = props.onConfirm;
  var onClose = props.onClose;

  var days = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date();
    d.setDate(d.getDate() + i);
    var dateKey = d.toISOString().split("T")[0];
    var label = i === 0 ? "Today" : i === 1 ? "Tomorrow"
      : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    days.push({ dateKey: dateKey, label: label });
  }

  var ds = useState(days[0].dateKey);
  var selectedDate = ds[0]; var setSelectedDate = ds[1];

  var ms = useState("Breakfast");
  var selectedMeal = ms[0]; var setSelectedMeal = ms[1];

  var MEAL_TYPES = [
    { key: "Breakfast", icon: "fa-sun", color: "#f59e0b" },
    { key: "Lunch", icon: "fa-cloud-sun", color: "#10b981" },
    { key: "Dinner", icon: "fa-moon", color: "#6366f1" },
  ];

  function isSlotTaken(dateKey, mealType) {
    return mealPlans && mealPlans[dateKey] && mealPlans[dateKey][mealType] && mealPlans[dateKey][mealType].name;
  }

  function handleConfirm() { onConfirm(selectedDate, selectedMeal, dish); onClose(); }

  useEffect(function () { document.body.style.overflow = "hidden"; return function () { document.body.style.overflow = ""; }; }, []);

  return (
    <div className="atp-backdrop" onClick={onClose}>
      <div className="atp-modal" onClick={function (e) { e.stopPropagation(); }}>

        <div className="atp-header">
          <div className="atp-dish-info">
            <div className="atp-dish-img">
              <DishImage dish={dish} className="atp-dish-img-el" />
            </div>
            <div>
              <p className="atp-dish-label">Adding to plan</p>
              <h3 className="atp-dish-name">{dish.name}</h3>
              <div className="atp-dish-meta">
                <span><Icon n="fa-clock" /> {dish.time}</span>
                <span><Icon n="fa-fire" /> {dish.nutrition && dish.nutrition.calories}</span>
                <span className={"atp-veg-dot " + (dish.isVeg ? "veg" : "nonveg")}>
                  <Icon n={dish.isVeg ? "fa-leaf" : "fa-drumstick-bite"} />
                  {dish.isVeg ? "Veg" : "Non-Veg"}
                </span>
              </div>
            </div>
          </div>
          <button className="atp-close" type="button" onClick={onClose}><Icon n="fa-xmark" /></button>
        </div>

        <div className="atp-section">
          <p className="atp-section-label"><Icon n="fa-calendar" /> Choose Day</p>
          <div className="atp-day-list">
            {days.map(function (day) {
              var allTaken = MEAL_TYPES.every(function (m) { return isSlotTaken(day.dateKey, m.key); });
              return (
                <button key={day.dateKey} type="button"
                  className={"atp-day-btn " + (selectedDate === day.dateKey ? "active" : "") + (allTaken ? " full" : "")}
                  onClick={function () { setSelectedDate(day.dateKey); }}>
                  {day.label}
                  {allTaken && <span className="atp-full-tag">Full</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="atp-section">
          <p className="atp-section-label"><Icon n="fa-utensils" /> Choose Meal Slot</p>
          <div className="atp-meal-types">
            {MEAL_TYPES.map(function (m) {
              var taken = isSlotTaken(selectedDate, m.key);
              var takenName = taken && mealPlans[selectedDate] && mealPlans[selectedDate][m.key] && mealPlans[selectedDate][m.key].name;
              return (
                <button key={m.key} type="button"
                  style={{ "--slot-color": m.color }}
                  className={"atp-meal-btn " + (selectedMeal === m.key ? "active" : "") + (taken ? " taken" : "")}
                  onClick={function () { setSelectedMeal(m.key); }}>
                  <Icon n={m.icon} cls="atp-meal-icon" />
                  <span className="atp-meal-key">{m.key}</span>
                  {taken && <span className="atp-taken-name">{takenName}</span>}
                  {!taken && <span className="atp-empty-label">Empty</span>}
                  {selectedMeal === m.key && !taken && <Icon n="fa-circle-check" cls="atp-check" />}
                </button>
              );
            })}
          </div>
          {isSlotTaken(selectedDate, selectedMeal) && (
            <p className="atp-replace-warn">
              <Icon n="fa-triangle-exclamation" /> This will replace the existing meal
            </p>
          )}
        </div>

        <div className="atp-footer">
          <button className="atp-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="atp-confirm" type="button" onClick={handleConfirm}>
            <Icon n="fa-calendar-plus" />
            Add {dish.name} to {selectedMeal}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal(props) {
  var dish = props.dish;
  var onClose = props.onClose;

  var copied = useState(false); var isCopied = copied[0]; var setCopied = copied[1];

  useEffect(function () { document.body.style.overflow = "hidden"; return function () { document.body.style.overflow = ""; }; }, []);

  if (!dish) return null;

  var shareText = "🍽️ Check out this dish: " + dish.name + "\n"
    + "🕐 " + dish.time + "  |  🔥 " + (dish.nutrition && dish.nutrition.calories || "") + "  |  " + dish.difficulty + "\n"
    + "📝 " + (dish.description || "") + "\n"
    + "\n🥘 Ingredients: " + (dish.ingredients ? dish.ingredients.slice(0, 5).join(", ") : "") + "\n"
    + "\nFound on Kitchen Buddy 🍳";

  var encodedText = encodeURIComponent(shareText);

  var platforms = [
    { name: "WhatsApp", icon: "fa-whatsapp", color: "#25D366", bg: "rgba(37,211,102,.12)", url: "https://wa.me/?text=" + encodedText },
    { name: "Telegram", icon: "fa-telegram", color: "#2AABEE", bg: "rgba(42,171,238,.12)", url: "https://t.me/share/url?url=" + encodeURIComponent(window.location.href) + "&text=" + encodedText },
    { name: "Twitter / X", icon: "fa-x-twitter", color: "#000", bg: "rgba(255,255,255,.08)", url: "https://twitter.com/intent/tweet?text=" + encodedText },
    { name: "Instagram", icon: "fa-instagram", color: "#E1306C", bg: "rgba(225,48,108,.12)", url: null },
    { name: "Facebook", icon: "fa-facebook", color: "#1877F2", bg: "rgba(24,119,242,.12)", url: "https://www.facebook.com/sharer/sharer.php?quote=" + encodedText },
    { name: "Email", icon: "fa-envelope", color: "#e8622a", bg: "rgba(232,98,42,.12)", url: "mailto:?subject=" + encodeURIComponent("Try this recipe: " + dish.name) + "&body=" + encodedText },
  ];

  function handleShare(platform) {
    if (platform.url) { window.open(platform.url, "_blank", "noopener,noreferrer"); }
    else { navigator.clipboard.writeText(shareText).then(function () { setCopied(true); setTimeout(function () { setCopied(false); }, 2500); }); }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareText).then(function () { setCopied(true); setTimeout(function () { setCopied(false); }, 2500); });
  }

  function handleNativeShare() {
    if (navigator.share) { navigator.share({ title: dish.name, text: shareText }).catch(function () { }); }
  }

  return (
    <div className="share-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={function (e) { e.stopPropagation(); }}>
        <div className="share-header">
          <div className="share-dish-preview">
            <div className="share-dish-thumb">
              <DishImage dish={dish} className="share-thumb-img" />
            </div>
            <div>
              <p className="share-label">Share this dish</p>
              <h3 className="share-dish-name">{dish.name}</h3>
              <p className="share-dish-meta">
                <Icon n="fa-clock" /> {dish.time} &nbsp;·&nbsp;
                <Icon n="fa-fire" /> {dish.nutrition && dish.nutrition.calories}
              </p>
            </div>
          </div>
          <button className="share-close" type="button" onClick={onClose}><Icon n="fa-xmark" /></button>
        </div>

        {navigator.share && (
          <button className="share-native-btn" type="button" onClick={handleNativeShare}>
            <Icon n="fa-share-nodes" /> Share via your phone
          </button>
        )}

        <p className="share-platforms-label">Share on</p>
        <div className="share-platforms">
          {platforms.map(function (p) {
            return (
              <button key={p.name} type="button" className="share-platform-btn"
                style={{ "--pc": p.color, "--pb": p.bg }}
                onClick={function () { handleShare(p); }}>
                <span className="share-platform-icon"><i className={"fa-brands " + p.icon} aria-hidden="true" /></span>
                <span className="share-platform-name">{p.name}</span>
                {p.name === "Instagram" && <span className="share-copy-hint">Copies text</span>}
              </button>
            );
          })}
        </div>

        <div className="share-copy-row">
          <div className="share-copy-text-preview">{shareText.slice(0, 80)}...</div>
          <button type="button" className={"share-copy-btn " + (isCopied ? "copied" : "")} onClick={handleCopyLink}>
            <Icon n={isCopied ? "fa-check" : "fa-copy"} />
            {isCopied ? "Copied!" : "Copy text"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dish Card ────────────────────────────────────────────────────────────────
function DishCard(props) {
  var dish = props.dish;
  var index = props.index;
  var onClick = props.onClick;
  var onAddPlan = props.onAddPlan;
  var onShare = props.onShare;
  var h = HEIGHTS[index % HEIGHTS.length];

  function handleAddClick(e) { e.stopPropagation(); onAddPlan(dish); }
  function handleShare(e) { e.stopPropagation(); onShare(dish); }

  return (
    <div className="dish-card" style={{ "--card-h": h + "px", animationDelay: (index * 0.06) + "s" }}
      onClick={function () { onClick(dish); }}>
      <div className="dish-card-img-wrap">
        <DishImage dish={dish} className="dish-card-img" />
        <div className="dish-card-overlay" />
      </div>

      <div className="dish-card-top">
        <span className={"dish-badge sm " + (dish.isVeg ? "veg" : "nonveg")}>
          <Icon n={dish.isVeg ? "fa-leaf" : "fa-drumstick-bite"} />
          {dish.isVeg ? "Veg" : "Non-Veg"}
        </span>
      </div>

      <button type="button" className="card-add-btn" onClick={handleAddClick} title="Add to Meal Plan">
        <Icon n="fa-plus" />
      </button>

      <button type="button" className="card-share-btn" onClick={handleShare} title="Share this dish">
        <Icon n="fa-share-nodes" />
      </button>

      <div className="dish-card-bottom">
        <span className="dish-card-cuisine">{dish.cuisine}</span>
        <h3 className="dish-card-name">{dish.name}</h3>
        <div className="dish-card-meta">
          <span><Icon n="fa-clock" /> {dish.time}</span>
          <span><Icon n="fa-signal" /> {dish.difficulty}</span>
          {dish.nutrition && dish.nutrition.calories && <span><Icon n="fa-fire" /> {dish.nutrition.calories}</span>}
        </div>
        <button type="button" className="card-add-row" onClick={handleAddClick}>
          <Icon n="fa-calendar-plus" /> Add to Meal Plan
        </button>
      </div>
    </div>
  );
}

// ─── Dish Modal ───────────────────────────────────────────────────────────────
function DishModal(props) {
  var dish = props.dish;
  var onClose = props.onClose;
  var onAddPlan = props.onAddPlan;
  var onShare = props.onShare || function () { };

  useEffect(function () {
    document.body.style.overflow = "hidden";
    return function () { document.body.style.overflow = ""; };
  }, []);

  if (!dish) return null;
  var nutr = dish.nutrition || {};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={function (e) { e.stopPropagation(); }}>
        <button className="modal-close" type="button" onClick={onClose}><Icon n="fa-xmark" /></button>

        <div className="modal-img-wrap">
          <DishImage dish={dish} className="modal-img" />
          <div className="modal-img-overlay" />
          <div className="modal-img-badges">
            <span className={"dish-badge " + (dish.isVeg ? "veg" : "nonveg")}>
              <Icon n={dish.isVeg ? "fa-leaf" : "fa-drumstick-bite"} />
              {dish.isVeg ? "Vegetarian" : "Non-Veg"}
            </span>
            <span className="dish-badge time"><Icon n="fa-clock" /> {dish.time}</span>
            <span className="dish-badge diff"><Icon n="fa-signal" /> {dish.difficulty}</span>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-cuisine-tag">{dish.cuisine}</div>
          <h2 className="modal-title">{dish.name}</h2>
          <p className="modal-desc">{dish.description}</p>

          <div className="modal-nutrition">
            {[
              { icon: "fa-fire", label: "Calories", val: nutr.calories },
              { icon: "fa-dumbbell", label: "Protein", val: nutr.protein },
              { icon: "fa-wheat-awn", label: "Carbs", val: nutr.carbs },
              { icon: "fa-droplet", label: "Fat", val: nutr.fat },
            ].map(function (r) {
              return (
                <div className="nutr-item" key={r.label}>
                  <Icon n={r.icon} cls="nutr-icon" />
                  <span className="nutr-val">{r.val || "—"}</span>
                  <span className="nutr-label">{r.label}</span>
                </div>
              );
            })}
          </div>

          {dish.ingredients && dish.ingredients.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title"><Icon n="fa-list-ul" /> Ingredients</h3>
              <div className="ingredients-wrap">
                {dish.ingredients.map(function (ing, i) { return <span className="ingredient-chip" key={i}>{ing}</span>; })}
              </div>
            </div>
          )}

          {dish.steps && dish.steps.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title"><Icon n="fa-list-ol" /> How to Cook</h3>
              <ol className="steps-list">
                {dish.steps.map(function (step, i) {
                  return (
                    <li className="step-item" key={i}>
                      <span className="step-num">{i + 1}</span>
                      <span className="step-text">{step}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-add-plan" type="button" onClick={function () { onAddPlan(dish); onClose(); }}>
              <Icon n="fa-calendar-plus" /> Add to Meal Plan
            </button>
            <button className="btn-save" type="button"><Icon n="fa-bookmark" /></button>
            <button className="btn-share-modal" type="button"
              onClick={function () { onShare(dish); onClose(); }} title="Share this dish">
              <Icon n="fa-share-nodes" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mic Button ───────────────────────────────────────────────────────────────
function MicButton(props) {
  return (
    <div className="mic-container">
      {props.transcript && (
        <div className="mic-transcript"><Icon n="fa-quote-left" cls="transcript-quote" />{props.transcript}</div>
      )}
      <button type="button" className={"mic-btn " + (props.listening ? "listening" : "")} onClick={props.onClick}>
        {props.listening && <span><div className="mic-ring r1" /><div className="mic-ring r2" /><div className="mic-ring r3" /></span>}
        <Icon n={props.listening ? "fa-stop" : "fa-microphone"} cls="mic-icon" />
      </button>
      <div className="mic-label">{props.listening ? "Listening..." : "Tap to speak"}</div>
    </div>
  );
}

// ─── Success Toast ────────────────────────────────────────────────────────────
function Toast(props) {
  useEffect(function () {
    var t = setTimeout(props.onHide, 3000);
    return function () { clearTimeout(t); };
  }, []);
  return (
    <div className="atp-toast">
      <Icon n="fa-circle-check" cls="toast-icon" />
      <span>{props.message}</span>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────
export default function AIFoodFeed(props) {
  var addMeal = props.addMeal;
  var mealPlans = props.mealPlans || {};

  var prefs = {};
  try { prefs = JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}"); } catch (e) { }

  // ── Persisted state ───────────────────────────────────────────────────────
  var s1 = useState(function () {
    try { return JSON.parse(localStorage.getItem("feed_dishes") || "[]"); } catch (e) { return []; }
  });
  var dishes = s1[0]; var setDishes = s1[1];

  var s7 = useState(function () {
    try { return localStorage.getItem("feed_query") || ""; } catch (e) { return ""; }
  });
  var query = s7[0]; var setQuery = s7[1];

  var s8 = useState(function () {
    try { return localStorage.getItem("feed_filter") || "all"; } catch (e) { return "all"; }
  });
  var filter = s8[0]; var setFilter = s8[1];

  // ── Non-persisted state ───────────────────────────────────────────────────
  var s2 = useState(false); var loading = s2[0]; var setLoading = s2[1];
  var s3 = useState(""); var errMsg = s3[0]; var setErrMsg = s3[1];
  var s4 = useState(null); var selected = s4[0]; var setSelected = s4[1];
  var s5 = useState(false); var listening = s5[0]; var setListening = s5[1];
  var s6 = useState(""); var transcript = s6[0]; var setTranscript = s6[1];
  var s9 = useState(null); var planDish = s9[0]; var setPlanDish = s9[1];
  var s10 = useState(""); var toast = s10[0]; var setToast = s10[1];
  var s11 = useState(null); var shareDish = s11[0]; var setShareDish = s11[1];

  // ── Persist to localStorage ───────────────────────────────────────────────
  useEffect(function () { try { localStorage.setItem("feed_dishes", JSON.stringify(dishes)); } catch (e) { } }, [dishes]);
  useEffect(function () { try { localStorage.setItem("feed_query", query); } catch (e) { } }, [query]);
  useEffect(function () { try { localStorage.setItem("feed_filter", filter); } catch (e) { } }, [filter]);

  var recRef = useRef(null);
  var inputRef = useRef(null);

  function getVal(v) {
    if (!v) return "";
    if (Array.isArray(v)) return v.map(function (x) { return x.label || x; }).join(", ");
    return v.label || v;
  }

  function buildCtx() {
    var lines = [];
    if (prefs.name) lines.push("Name: " + prefs.name);
    if (prefs.country) lines.push("Country: " + getVal(prefs.country));
    if (prefs.region) lines.push("Region: " + getVal(prefs.region));
    if (prefs.diet) lines.push("Diet: " + getVal(prefs.diet));
    if (prefs.spice) lines.push("Spice: " + getVal(prefs.spice));
    if (prefs.cuisines) lines.push("Cuisines: " + getVal(prefs.cuisines));
    if (prefs.skill) lines.push("Skill: " + getVal(prefs.skill));
    if (prefs.cookTime) lines.push("Cook time: " + getVal(prefs.cookTime));
    if (prefs.dislikes && prefs.dislikes.length) lines.push("Dislikes: " + getVal(prefs.dislikes));
    if (prefs.allergies && prefs.allergies.length) lines.push("Allergies: " + getVal(prefs.allergies));
    return lines.join("\n");
  }

  function fetchDishes(userQuery) {
    if (userQuery === undefined) userQuery = "";
    setLoading(true); setErrMsg(""); setDishes([]);

    var sys = [
      "You are Kitchen Buddy's AI chef. Respond ONLY as JSON: {\"dishes\": [...]}",
      "",
      "CRITICAL RULE — Only suggest dishes that are:",
      "  - Widely recognised and commonly cooked at home",
      "  - Popular in the user's country/region OR globally famous",
      "  - Something most people have heard of (NOT obscure, fusion, or chef-only dishes)",
      "",
      "GOOD examples for Indian users: Paneer Butter Masala, Dal Makhani, Aloo Paratha,",
      "  Chole Bhature, Palak Paneer, Rajma Chawal, Butter Chicken, Biryani, Dosa, Idli,",
      "  Samosa, Poha, Upma, Maggi, Fried Rice, Pasta, Pizza, Burger, Sandwich, Omelette.",
      "",
      "BAD examples (never suggest): obscure regional variants, molecular gastronomy,",
      "  restaurant-only dishes, dishes with 20+ ingredients, made-up fusion names.",
      "",
      "Each dish needs ALL these fields:",
      "  id (unique string), name (familiar well-known dish name), cuisine,",
      "  description (2 mouth-watering sentences),",
      "  time (realistic like '20 min' or '45 min'),",
      "  difficulty (Easy or Medium or Hard),",
      "  isVeg (boolean — always return BOTH veg and non-veg),",
      "  nutrition: {calories, protein, carbs, fat} all strings,",
      "  ingredients (6-8 common household ingredients),",
      "  steps (4-6 simple steps),",
      "  tags (2-3 strings),",
      "  imgSearch: 2-3 word search term that matches a real recipe on Spoonacular.",
      "    Good: 'paneer curry', 'chicken biryani', 'chocolate cake', 'caesar salad'.",
      "    Use the most common English name for the dish, not a description.",
      "    Never use abstract or poetic terms — use the actual dish name.",
      "",
      "Return exactly 6 veg (isVeg:true) + 6 non-veg (isVeg:false) = 12 total."
    ].join("\n");

    var ctx = buildCtx() || "General food lover";
    var isSpecificSearch = userQuery && userQuery.trim().length > 0;
    var usr = isSpecificSearch
      ? "User profile:\n" + ctx + "\n\n" +
      "User searched for: \"" + userQuery + "\"\n\n" +
      "Return ONLY dishes that are directly related to \"" + userQuery + "\".\n" +
      "Return {\"dishes\":[3-5 closely related dishes]}"
      : "User profile:\n" + ctx + "\n\nSuggest 12 popular, familiar dishes this user would love today.\nMix meals: breakfast, lunch, snacks, dinner.\nReturn {\"dishes\":[12 dishes]}";

    askGroq(sys, usr)
      .then(function (r) {
        if (!Array.isArray(r) || r.length === 0) {
          setErrMsg("No dishes found for \"" + (userQuery || "") + "\". Try different keywords.");
        } else {
          setDishes(userQuery ? r : r.slice(0, 12));
        }
        setLoading(false);
      })
      .catch(function (e) { setErrMsg("AI error: " + e.message); setLoading(false); });
  }

  useEffect(function () {
    try {
      var cached = JSON.parse(localStorage.getItem("feed_dishes") || "[]");
      if (!cached || cached.length === 0) fetchDishes("");
    } catch (e) { fetchDishes(""); }
  }, []);

  function handleConfirmAdd(dateKey, mealType, dish) {
    var meal = {
      name: dish.name, time: dish.time,
      calories: dish.nutrition && dish.nutrition.calories,
      cuisine: dish.cuisine, description: dish.description,
      ingredients: dish.ingredients, steps: dish.steps,
      isVeg: dish.isVeg, difficulty: dish.difficulty, source: "ai_feed",
    };
    addMeal(dateKey, mealType, meal);
    var d = new Date(dateKey + "T00:00:00");
    var isToday = dateKey === new Date().toISOString().split("T")[0];
    var dayLabel = isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "long" });
    setToast(dish.name + " added to " + mealType + " on " + dayLabel + "!");
  }

  function startListening() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input needs Chrome."); return; }
    var rec = new SR();
    rec.lang = "en-US"; rec.interimResults = true;
    rec.onstart = function () { setListening(true); };
    rec.onend = function () { setListening(false); };
    rec.onerror = function () { setListening(false); };
    rec.onresult = function (e) {
      var t = Array.from(e.results).map(function (r) { return r[0].transcript; }).join("");
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) {
        setQuery(t); fetchDishes(t);
        setTimeout(function () { setTranscript(""); }, 3000);
      }
    };
    rec.start(); recRef.current = rec;
  }

  function stopListening() { if (recRef.current) recRef.current.stop(); setListening(false); }

  var filtered = dishes.filter(function (d) {
    if (filter === "veg") return d.isVeg === true;
    if (filter === "nonveg") return d.isVeg === false;
    return true;
  });

  var SUGGESTIONS = ["Something quick for breakfast", "High protein lunch", "Comfort food dinner", "Healthy and light", "Street food vibes", "Something spicy"];
  var FILTERS = [
    { key: "all", label: "All Dishes", icon: "fa-utensils" },
    { key: "veg", label: "Vegetarian", icon: "fa-leaf" },
    { key: "nonveg", label: "Non-Veg", icon: "fa-drumstick-bite" },
  ];

  return (
    <div className="feed-root">

      <div className="feed-hero">
        <div className="feed-hero-inner">
          <h1 className="feed-hero-title">What should I cook<span className="feed-hero-accent"> today?</span></h1>
          <p className="feed-hero-sub">Speak or type — AI finds dishes personalised just for you</p>
          <form className="feed-search-bar" onSubmit={function (e) { e.preventDefault(); if (query.trim()) fetchDishes(query.trim()); }}>
            <Icon n="fa-magnifying-glass" cls="search-icon" />
            <input ref={inputRef} className="feed-search-input"
              placeholder="Try paneer butter masala or quick breakfast..."
              value={query} onChange={function (e) { setQuery(e.target.value); }} />
            {query && <button type="button" className="search-clear" onClick={function () { setQuery(""); }}><Icon n="fa-xmark" /></button>}
            <button type="submit" className="search-submit"><Icon n="fa-arrow-right" /></button>
          </form>
          <div className="suggestion-chips">
            {SUGGESTIONS.map(function (s) {
              return <button key={s} type="button" className="suggestion-chip"
                onClick={function () { setQuery(s); fetchDishes(s); }}>{s}</button>;
            })}
          </div>
        </div>
      </div>

      <div className="feed-filter-bar">
        <div className="feed-filter-inner">
          <div className="filter-tabs">
            {FILTERS.map(function (opt) {
              return (
                <button key={opt.key} type="button"
                  className={"filter-tab " + (filter === opt.key ? "active" : "")}
                  onClick={function () { setFilter(opt.key); }}>
                  <Icon n={opt.icon} /> {opt.label}
                </button>
              );
            })}
          </div>
          <button type="button" className="refresh-btn"
            onClick={function () { fetchDishes(query); }} disabled={loading}>
            <Icon n={loading ? "fa-circle-notch fa-spin" : "fa-rotate"} />
            {loading ? "Loading..." : "Refresh Feed"}
          </button>
        </div>
      </div>

      {errMsg && !loading && (
        <div className="feed-error-banner">
          <Icon n="fa-circle-exclamation" /><span>{errMsg}</span>
          <button type="button" onClick={function () { fetchDishes(query); }}>
            <Icon n="fa-rotate" /> Retry
          </button>
        </div>
      )}

      <div className="feed-grid-wrap">
        <div className="masonry-grid">
          {loading
            ? Array.from({ length: 12 }).map(function (_, i) { return <SkeletonCard key={i} index={i} />; })
            : filtered.length === 0 && !errMsg
              ? (
                <div className="feed-empty">
                  <Icon n="fa-face-sad-tear" cls="empty-icon" />
                  <p>No dishes found.</p>
                  <button type="button" onClick={function () { setFilter("all"); fetchDishes(""); }}>
                    <Icon n="fa-rotate" /> Reset
                  </button>
                </div>
              )
              : filtered.map(function (dish, i) {
                return <DishCard key={dish.id || i} dish={dish} index={i}
                  onClick={setSelected} onAddPlan={setPlanDish} onShare={setShareDish} />;
              })
          }
        </div>
      </div>

      <MicButton listening={listening} transcript={transcript}
        onClick={function () { if (listening) stopListening(); else startListening(); }} />

      {selected && (
        <DishModal dish={selected} onClose={function () { setSelected(null); }}
          onAddPlan={function (d) { setSelected(null); setPlanDish(d); }}
          onShare={function (d) { setSelected(null); setShareDish(d); }} />
      )}

      {planDish && (
        <AddToPlanModal dish={planDish} mealPlans={mealPlans}
          onConfirm={handleConfirmAdd} onClose={function () { setPlanDish(null); }} />
      )}

      {toast && <Toast message={toast} onHide={function () { setToast(""); }} />}

      {shareDish && (
        <ShareModal dish={shareDish} onClose={function () { setShareDish(null); }} />
      )}
    </div>
  );
}