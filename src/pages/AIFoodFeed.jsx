/* eslint-disable */
import { useState, useEffect, useRef } from "react";
import "./AIFoodFeed.css";

// ─── API KEYS ──────────────────────────────────────────────
var GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
var SPOONACULAR_API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;

// ─── IMAGE HELPERS ─────────────────────────────────────────
var IMG_CACHE = {};
var FALLBACKS = [
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1574484284002-952d92456975?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-f81944a37bdb?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1547592180-85f173990554?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1546069596-600bbec60b03?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=480&h=360&fit=crop",
  "https://images.unsplash.com/photo-1555939594-58329b054e4f?w=480&h=360&fit=crop",
];

function getFallback(name) {
  var h = 0;
  for (var i = 0; i < (name || "").length; i++) h += name.charCodeAt(i) * (i + 1);
  return FALLBACKS[Math.abs(h) % FALLBACKS.length];
}

function fetchDishImage(dishName, imgSearch, callback) {
  var key = dishName || imgSearch || "x";
  if (IMG_CACHE.hasOwnProperty(key)) { callback(IMG_CACHE[key]); return; }
  if (!SPOONACULAR_API_KEY || SPOONACULAR_API_KEY === "undefined") {
    var fb = getFallback(key); IMG_CACHE[key] = fb; callback(fb); return;
  }
  fetch("https://api.spoonacular.com/recipes/complexSearch?query="
    + encodeURIComponent(imgSearch || dishName || "food")
    + "&number=1&apiKey=" + SPOONACULAR_API_KEY)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var url = d && d.results && d.results[0] && d.results[0].image;
      var final = url || getFallback(key);
      IMG_CACHE[key] = final; callback(final);
    })
    .catch(function () { var fb = getFallback(key); IMG_CACHE[key] = fb; callback(fb); });
}

function DishImage(props) {
  var dish = props.dish, cls = props.className || "";
  var name = dish.name || "", imgSearch = dish.imgSearch || name;
  var init = IMG_CACHE[name] || getFallback(name);
  var ss = useState(init); var src = ss[0]; var setSrc = ss[1];
  var fetched = useRef(false);
  useEffect(function () {
    if (!name) return;
    if (IMG_CACHE[name]) { setSrc(IMG_CACHE[name]); return; }
    if (fetched.current) return;
    fetched.current = true;
    fetchDishImage(name, imgSearch, function (u) { if (u) setSrc(u); });
  }, [name]);
  return <img src={src} alt={name} className={cls} loading="lazy"
    onError={function (e) { e.target.onerror = null; e.target.src = getFallback(name); }} />;
}

// ─── Groq AI ───────────────────────────────────────────────
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
      if (!r.ok) return r.json().then(function (e) { throw new Error((e.error && e.error.message) || "HTTP " + r.status); });
      return r.json();
    })
    .then(function (data) {
      var text = data.choices[0].message.content || "{}";
      var parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      var key = Object.keys(parsed).find(function (k) { return Array.isArray(parsed[k]); });
      return key ? parsed[key] : [];
    });
}

// ─── Icon helper ───────────────────────────────────────────
function Icon(props) {
  var n = (props.n || "fa-circle").replace(/fa-solid\s*/g, "").replace(/fa-regular\s*/g, "").trim();
  var parts = n.split(/\s+/).filter(Boolean);
  return <i className={["fa-solid", parts[0], parts.slice(1).join(" "), props.cls || ""].filter(Boolean).join(" ")} aria-hidden="true" />;
}

// ─── Skeleton Card ─────────────────────────────────────────
function SkeletonCard(props) {
  return (
    <div className="skeleton-card" style={{ animationDelay: (props.index * 0.05) + "s" }}>
      <div className="skeleton-img" />
      <div className="skeleton-body">
        <div className="skeleton-line" style={{ width: "75%", height: "18px" }} />
        <div className="skeleton-line" style={{ width: "55%", height: "18px" }} />
        <div className="skeleton-line" style={{ width: "100%", height: "13px", marginTop: "6px" }} />
        <div className="skeleton-line" style={{ width: "90%", height: "13px" }} />
        <div className="skeleton-btn" />
      </div>
    </div>
  );
}

// ─── Add To Plan Modal ─────────────────────────────────────
function AddToPlanModal(props) {
  var dish = props.dish, mealPlans = props.mealPlans || {},
    onConfirm = props.onConfirm, onClose = props.onClose;
  var days = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(); d.setDate(d.getDate() + i);
    var dateKey = d.toISOString().split("T")[0];
    var label = i === 0 ? "Today" : i === 1 ? "Tomorrow"
      : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    days.push({ dateKey, label });
  }
  var s1 = useState(days[0].dateKey); var selDate = s1[0]; var setSelDate = s1[1];
  var s2 = useState("Breakfast"); var selMeal = s2[0]; var setSelMeal = s2[1];
  var MEALS = [
    { key: "Breakfast", icon: "fa-sun", color: "#f59e0b" },
    { key: "Lunch", icon: "fa-cloud-sun", color: "#10b981" },
    { key: "Dinner", icon: "fa-moon", color: "#6366f1" },
  ];
  function taken(dk, mt) { return !!(mealPlans[dk] && mealPlans[dk][mt] && mealPlans[dk][mt].name); }
  function handleConfirm() { onConfirm(selDate, selMeal, dish); onClose(); }
  useEffect(function () { document.body.style.overflow = "hidden"; return function () { document.body.style.overflow = ""; }; }, []);
  return (
    <div className="atp-backdrop" onClick={onClose}>
      <div className="atp-modal" onClick={function (e) { e.stopPropagation(); }}>
        <div className="atp-header">
          <div className="atp-dish-info">
            <div className="atp-dish-img"><DishImage dish={dish} className="atp-dish-img-el" /></div>
            <div>
              <p className="atp-dish-label">Adding to plan</p>
              <h3 className="atp-dish-name">{dish.name}</h3>
              <div className="atp-dish-meta">
                <span><Icon n="fa-clock" /> {dish.time}</span>
                <span><Icon n="fa-fire" /> {dish.nutrition && dish.nutrition.calories}</span>
                <span className={"atp-veg-pill " + (dish.isVeg ? "veg" : "nonveg")}>
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
              var allTaken = MEALS.every(function (m) { return taken(day.dateKey, m.key); });
              return (
                <button key={day.dateKey} type="button"
                  className={"atp-day-btn" + (selDate === day.dateKey ? " active" : "") + (allTaken ? " full" : "")}
                  onClick={function () { setSelDate(day.dateKey); }}>
                  {day.label}{allTaken && <span className="atp-full-tag">Full</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="atp-section">
          <p className="atp-section-label"><Icon n="fa-utensils" /> Choose Meal Slot</p>
          <div className="atp-meal-types">
            {MEALS.map(function (m) {
              var isTaken = taken(selDate, m.key);
              var takenName = isTaken && mealPlans[selDate] && mealPlans[selDate][m.key] && mealPlans[selDate][m.key].name;
              return (
                <button key={m.key} type="button" style={{ "--slot-color": m.color }}
                  className={"atp-meal-btn" + (selMeal === m.key ? " active" : "") + (isTaken ? " taken" : "")}
                  onClick={function () { setSelMeal(m.key); }}>
                  <Icon n={m.icon} cls="atp-meal-icon" />
                  <span className="atp-meal-key">{m.key}</span>
                  {isTaken ? <span className="atp-taken-name">{takenName}</span>
                    : <span className="atp-empty-label">Empty</span>}
                  {selMeal === m.key && !isTaken && <Icon n="fa-circle-check" cls="atp-check" />}
                </button>
              );
            })}
          </div>
          {taken(selDate, selMeal) && (
            <p className="atp-replace-warn"><Icon n="fa-triangle-exclamation" /> This will replace the existing meal</p>
          )}
        </div>
        <div className="atp-footer">
          <button className="atp-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="atp-confirm" type="button" onClick={handleConfirm}>
            <Icon n="fa-calendar-plus" /> Add {dish.name} to {selMeal}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ───────────────────────────────────────────
function ShareModal(props) {
  var dish = props.dish, onClose = props.onClose;
  var cs = useState(false); var copied = cs[0]; var setCopied = cs[1];
  useEffect(function () { document.body.style.overflow = "hidden"; return function () { document.body.style.overflow = ""; }; }, []);
  if (!dish) return null;
  var shareText = "🍽️ " + dish.name + "\n🕐 " + dish.time + "  |  🔥 " + (dish.nutrition && dish.nutrition.calories || "")
    + "\n📝 " + (dish.description || "") + "\n\nFound on Kitchen Buddy 🍳";
  var enc = encodeURIComponent(shareText);
  var platforms = [
    { name: "WhatsApp", icon: "fa-whatsapp", color: "#25D366", url: "https://wa.me/?text=" + enc },
    { name: "Telegram", icon: "fa-telegram", color: "#2AABEE", url: "https://t.me/share/url?url=" + encodeURIComponent(window.location.href) + "&text=" + enc },
    { name: "Twitter/X", icon: "fa-x-twitter", color: "#000000", url: "https://twitter.com/intent/tweet?text=" + enc },
    { name: "Instagram", icon: "fa-instagram", color: "#E1306C", url: null },
    { name: "Facebook", icon: "fa-facebook", color: "#1877F2", url: "https://www.facebook.com/sharer/sharer.php?quote=" + enc },
    { name: "Email", icon: "fa-envelope", color: "#2a9d5c", url: "mailto:?subject=" + encodeURIComponent("Try: " + dish.name) + "&body=" + enc },
  ];
  function doShare(p) {
    if (p.url) window.open(p.url, "_blank", "noopener,noreferrer");
    else navigator.clipboard.writeText(shareText).then(function () { setCopied(true); setTimeout(function () { setCopied(false); }, 2500); });
  }
  return (
    <div className="share-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={function (e) { e.stopPropagation(); }}>
        <div className="share-header">
          <div className="share-dish-preview">
            <div className="share-dish-thumb"><DishImage dish={dish} className="share-thumb-img" /></div>
            <div>
              <p className="share-label">Share this dish</p>
              <h3 className="share-dish-name">{dish.name}</h3>
              <p className="share-dish-meta"><Icon n="fa-clock" /> {dish.time} · <Icon n="fa-fire" /> {dish.nutrition && dish.nutrition.calories}</p>
            </div>
          </div>
          <button className="share-close" type="button" onClick={onClose}><Icon n="fa-xmark" /></button>
        </div>
        {navigator.share && (
          <button className="share-native-btn" type="button"
            onClick={function () { navigator.share({ title: dish.name, text: shareText }).catch(function () { }); }}>
            <Icon n="fa-share-nodes" /> Share via your phone
          </button>
        )}
        <p className="share-platforms-label">Share on</p>
        <div className="share-platforms">
          {platforms.map(function (p) {
            return (
              <button key={p.name} type="button" className="share-platform-btn"
                style={{ "--pc": p.color }} onClick={function () { doShare(p); }}>
                <span className="share-platform-icon"><i className={"fa-brands " + p.icon} aria-hidden="true" /></span>
                <span className="share-platform-name">{p.name}</span>
                {p.name === "Instagram" && <span className="share-copy-hint">Copies text</span>}
              </button>
            );
          })}
        </div>
        <div className="share-copy-row">
          <div className="share-copy-text-preview">{shareText.slice(0, 80)}…</div>
          <button type="button" className={"share-copy-btn" + (copied ? " copied" : "")}
            onClick={function () { navigator.clipboard.writeText(shareText).then(function () { setCopied(true); setTimeout(function () { setCopied(false); }, 2500); }); }}>
            <Icon n={copied ? "fa-check" : "fa-copy"} />{copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dish Card ─────────────────────────────────────────────
function DishCard(props) {
  var dish = props.dish, index = props.index,
    onClick = props.onClick, onAddPlan = props.onAddPlan, onShare = props.onShare;

  // Pick best tag label for badge
  var tag = (dish.tags && dish.tags.length > 0)
    ? dish.tags[0].toUpperCase()
    : (dish.cuisine || "").toUpperCase();

  return (
    <div className="dish-card" style={{ animationDelay: (index * 0.05) + "s" }}
      onClick={function () { onClick(dish); }}>

      {/* Image */}
      <div className="dish-card-img-wrap">
        <DishImage dish={dish} className="dish-card-img" />
        {tag && <span className="dish-tag-badge">{tag}</span>}
      </div>

      {/* Body */}
      <div className="dish-card-body">
        <h3 className="dish-card-name">{dish.name}</h3>
        <p className="dish-card-desc">{dish.description}</p>

        {/* Add to Meal Log button */}
        <button type="button" className="card-meal-btn"
          onClick={function (e) { e.stopPropagation(); onAddPlan(dish); }}>
          <Icon n="fa-circle-plus" /> Add to Meal Log
        </button>
      </div>
    </div>
  );
}

// ─── Dish Detail Modal ─────────────────────────────────────
function DishModal(props) {
  var dish = props.dish, onClose = props.onClose,
    onAddPlan = props.onAddPlan, onShare = props.onShare || function () { };
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
          <div className="modal-img-gradient" />
          <div className="modal-img-badges">
            <span className={"modal-badge " + (dish.isVeg ? "veg" : "nonveg")}>
              <Icon n={dish.isVeg ? "fa-leaf" : "fa-drumstick-bite"} />
              {dish.isVeg ? "Vegetarian" : "Non-Veg"}
            </span>
            <span className="modal-badge time"><Icon n="fa-clock" /> {dish.time}</span>
            <span className="modal-badge diff"><Icon n="fa-signal" /> {dish.difficulty}</span>
          </div>
        </div>
        <div className="modal-body">
          <div className="modal-cuisine">{dish.cuisine}</div>
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
            <button className="btn-add-plan" type="button"
              onClick={function () { onAddPlan(dish); onClose(); }}>
              <Icon n="fa-calendar-plus" /> Add to Meal Log
            </button>
            <button className="btn-icon-action" type="button"><Icon n="fa-bookmark" /></button>
            <button className="btn-icon-action" type="button"
              onClick={function () { onShare(dish); onClose(); }}>
              <Icon n="fa-share-nodes" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────
function Toast(props) {
  useEffect(function () { var t = setTimeout(props.onHide, 3000); return function () { clearTimeout(t); }; }, []);
  return (
    <div className="atp-toast">
      <Icon n="fa-circle-check" cls="toast-icon" />
      <span>{props.message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//   MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function AIFoodFeed(props) {
  var addMeal = props.addMeal;
  var mealPlans = props.mealPlans || {};

  var prefs = {};
  try { prefs = JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}"); } catch (e) { }

  var _d = useState(function () { try { return JSON.parse(localStorage.getItem("feed_dishes") || "[]"); } catch (e) { return []; } });
  var dishes = _d[0]; var setDishes = _d[1];

  var _q = useState(function () { try { return localStorage.getItem("feed_query") || ""; } catch (e) { return ""; } });
  var query = _q[0]; var setQuery = _q[1];

  var _f = useState(function () { try { return localStorage.getItem("feed_filter") || "all"; } catch (e) { return "all"; } });
  var filter = _f[0]; var setFilter = _f[1];

  var _l = useState(false); var loading = _l[0]; var setLoading = _l[1];
  var _e = useState(""); var errMsg = _e[0]; var setErrMsg = _e[1];
  var _s = useState(null); var selected = _s[0]; var setSelected = _s[1];
  var _ls = useState(false); var listening = _ls[0]; var setListening = _ls[1];
  var _tr = useState(""); var transcript = _tr[0]; var setTranscript = _tr[1];
  var _pd = useState(null); var planDish = _pd[0]; var setPlanDish = _pd[1];
  var _t = useState(""); var toast = _t[0]; var setToast = _t[1];
  var _sh = useState(null); var shareDish = _sh[0]; var setShareDish = _sh[1];

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
    if (prefs.region) lines.push("Region: " + getVal(prefs.region));
    if (prefs.diet) lines.push("Diet: " + getVal(prefs.diet));
    if (prefs.spice) lines.push("Spice: " + getVal(prefs.spice));
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
      "You are Kitchen Buddy's Indian food AI chef. Respond ONLY as JSON: {\"dishes\": [...]}",
      "EVERY dish must be 100% authentic Indian. cuisine = specific Indian regional name.",
      "Each dish needs: id, name, cuisine, description (2 sentences), time, difficulty,",
      "isVeg (boolean), nutrition:{calories,protein,carbs,fat}, ingredients (6-8),",
      "steps (4-6), tags (2-3: e.g. 'keto friendly','high protein','vegetarian',",
      "'omega-3 rich','antioxidant','energy boost','street food','comfort food'),",
      "imgSearch (2-3 word English search term).",
      "Return 6 veg + 6 non-veg = 12 dishes. Vary regions.",
    ].join("\n");

    var ctx = buildCtx() || "Indian food lover";
    var isSearch = userQuery && userQuery.trim().length > 0;
    var usr = isSearch
      ? "User: " + ctx + "\n\nSearch: \"" + userQuery + "\"\nReturn {\"dishes\":[3-5 related Indian dishes]}"
      : "User: " + ctx + "\n\nSuggest 12 popular authentic Indian dishes. Mix breakfast/lunch/snacks/dinner and regions.\nReturn {\"dishes\":[12 dishes]}";

    askGroq(sys, usr)
      .then(function (r) {
        if (!Array.isArray(r) || r.length === 0) {
          setErrMsg("No dishes found for \"" + (userQuery || "") + "\". Try different keywords.");
        } else {
          setDishes(isSearch ? r : r.slice(0, 12));
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
    addMeal(dateKey, mealType, {
      name: dish.name, time: dish.time,
      calories: dish.nutrition && dish.nutrition.calories,
      cuisine: dish.cuisine, description: dish.description,
      ingredients: dish.ingredients, steps: dish.steps,
      isVeg: dish.isVeg, difficulty: dish.difficulty, source: "ai_feed",
    });
    var d = new Date(dateKey + "T00:00:00");
    var isToday = dateKey === new Date().toISOString().split("T")[0];
    setToast(dish.name + " added to " + mealType + " on " + (isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "long" })) + "!");
  }

  function startListening() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice needs Chrome."); return; }
    var rec = new SR(); rec.lang = "en-IN"; rec.interimResults = true;
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

  var SUGGESTIONS = [
    "Quick breakfast", "High protein", "Street food",
    "Comfort dinner", "South Indian", "Something spicy 🌶️",
  ];

  var NAV_LINKS = ["Home", "AI", "Ingredients", "Meal Log", "Planner", "Pantry"];

  return (
    <div className="feed-root">

      {/* ─── Main ─── */}
      <div className="feed-main">

        {/* Hero */}
        <section className="feed-hero">
          <h1 className="feed-hero-title">
            Discover your next
            <span className="feed-hero-accent"> Culinary Masterpiece.</span>
          </h1>

          {/* Search */}
          <form className="feed-search-bar"
            onSubmit={function (e) { e.preventDefault(); if (query.trim()) fetchDishes(query.trim()); }}>
            <Icon n="fa-magnifying-glass" cls="search-icon" />
            <input ref={inputRef} className="feed-search-input"
              placeholder="I'm craving something spicy and high-protein..."
              value={query} onChange={function (e) { setQuery(e.target.value); }} />
            {query && (
              <button type="button" className="search-clear"
                onClick={function () { setQuery(""); }}>
                <Icon n="fa-xmark" />
              </button>
            )}
            <button type="button"
              className={"search-mic-btn" + (listening ? " listening" : "")}
              onClick={function () { if (listening) stopListening(); else startListening(); }}>
              <Icon n={listening ? "fa-stop" : "fa-microphone"} />
            </button>
            <button type="submit" className="search-submit">Ask AI</button>
          </form>

          {/* Filter pills */}
          <div className="feed-filter-row">
            {[
              { key: "all", label: "All" },
              { key: "veg", label: "Vegetarian" },
              { key: "nonveg", label: "Non-Veg" },
            ].map(function (opt) {
              return (
                <button key={opt.key} type="button"
                  className={"filter-pill" + (filter === opt.key ? " active" : "")}
                  onClick={function () { setFilter(opt.key); }}>
                  {opt.label}
                </button>
              );
            })}
            <button type="button" className="refresh-btn-round"
              onClick={function () { fetchDishes(query); }}
              disabled={loading}
              title="Refresh">
              <Icon n={loading ? "fa-circle-notch fa-spin" : "fa-rotate"} />
            </button>
          </div>

          {/* Suggestion chips */}
          <div className="suggestion-chips">
            {SUGGESTIONS.map(function (s) {
              return (
                <button key={s} type="button" className="suggestion-chip"
                  onClick={function () { setQuery(s); fetchDishes(s); }}>
                  {s}
                </button>
              );
            })}
          </div>
        </section>

        {/* Error */}
        {errMsg && !loading && (
          <div className="feed-error-banner">
            <Icon n="fa-circle-exclamation" />
            <span>{errMsg}</span>
            <button type="button" onClick={function () { fetchDishes(query); }}>
              <Icon n="fa-rotate" /> Retry
            </button>
          </div>
        )}

        {/* Card Grid */}
        <div className="feed-grid-wrap">
          <div className="card-grid">
            {loading
              ? Array.from({ length: 12 }).map(function (_, i) {
                return <SkeletonCard key={i} index={i} />;
              })
              : filtered.length === 0 && !errMsg
                ? (
                  <div className="feed-empty">
                    <Icon n="fa-face-sad-tear" cls="feed-empty-icon" />
                    <p>No dishes found.</p>
                    <button type="button" className="feed-empty-btn"
                      onClick={function () { setFilter("all"); fetchDishes(""); }}>
                      <Icon n="fa-rotate" /> Reset
                    </button>
                  </div>
                )
                : filtered.map(function (dish, i) {
                  return (
                    <DishCard key={dish.id || i} dish={dish} index={i}
                      onClick={setSelected}
                      onAddPlan={setPlanDish}
                      onShare={setShareDish} />
                  );
                })
            }
          </div>
        </div>
      </div>

      {/* Floating mic fab */}
      <div className="mic-fab">
        {transcript && (
          <div className="mic-transcript-bubble">
            <Icon n="fa-quote-left" cls="transcript-quote" /> {transcript}
          </div>
        )}
        <button type="button"
          className={"mic-btn" + (listening ? " listening" : "")}
          onClick={function () { if (listening) stopListening(); else startListening(); }}>
          {listening && <>
            <div className="mic-ring r1" />
            <div className="mic-ring r2" />
            <div className="mic-ring r3" />
          </>}
          <Icon n={listening ? "fa-stop" : "fa-microphone"} />
        </button>
      </div>

      {/* Modals */}
      {selected && (
        <DishModal dish={selected}
          onClose={function () { setSelected(null); }}
          onAddPlan={function (d) { setSelected(null); setPlanDish(d); }}
          onShare={function (d) { setSelected(null); setShareDish(d); }} />
      )}

      {planDish && (
        <AddToPlanModal dish={planDish} mealPlans={mealPlans}
          onConfirm={handleConfirmAdd}
          onClose={function () { setPlanDish(null); }} />
      )}

      {toast && <Toast message={toast} onHide={function () { setToast(""); }} />}

      {shareDish && (
        <ShareModal dish={shareDish} onClose={function () { setShareDish(null); }} />
      )}
    </div>
  );
}