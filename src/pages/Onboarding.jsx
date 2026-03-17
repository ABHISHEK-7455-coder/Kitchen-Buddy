import { useState, useEffect, useRef } from "react";
import "./Onboarding.css";

// ─── Groq API helper ──────────────────────────────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
async function askClaude(systemPrompt, userMessage) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  try {
    return JSON.parse(match?.[0] || "{}");
  } catch {
    return {};
  }
}

// ─── Font Awesome Icon ────────────────────────────────────────────────────────
// FIX: strips any accidental "fa-solid" prefix the AI adds,
// then applies exactly one "fa-solid" so icons always render correctly.
function FAIcon({ name = "fa-circle", className = "" }) {
  const stripped = (name || "fa-circle")
    .replace(/\bfa-solid\b|\bfa-regular\b|\bfa-brands\b|\bfas\b|\bfar\b/g, "")
    .trim();
  const [icon, ...mods] = stripped.split(/\s+/).filter(Boolean);
  const cls = ["fa-solid", icon, ...mods, className].filter(Boolean).join(" ");
  return <i className={cls} aria-hidden="true" />;
}

// ─── Step definitions ─────────────────────────────────────────────────────────
// type "ai_single"         → pick exactly ONE
// type "ai_multi"          → pick ONE OR MORE (required)
// type "ai_multi_optional" → pick any, or skip
const STEPS = [
  {
    id: "name",
    title: "Welcome to Kitchen Buddy",
    subtitle: "What should we call you?",
    type: "text_input",
    field: "name",
    icon: "fa-user",
    placeholder: "Enter your first name...",
  },
  {
    id: "country",
    title: "Where are you from?",
    subtitle: "We'll personalise your feed with dishes from your culture",
    type: "ai_single",
    field: "country",
    icon: "fa-earth-asia",
    cols: 3,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: () =>
      `List 12 countries that have rich, distinct food cultures for a meal planning app.
Return ONLY this JSON shape:
{"options":[{"id":"in","label":"India","icon":"fa-flag","subtitle":"Curries, spices & street food"},...]}
Rules:
- Use Font Awesome 6 Solid icon names ONLY (e.g. fa-flag, fa-utensils, fa-bowl-rice)
- Do NOT include the words "fa-solid" in the icon value — just the icon name like "fa-flag"
- Every object must have: id, label, icon, subtitle
- 12 items total`,
  },
  {
    id: "region",
    title: "Which regions do you love?",
    subtitle: "Pick all regional cuisines that excite you",
    type: "ai_multi",           // ← MULTI: user can pick several regions
    field: "region",
    icon: "fa-map-location-dot",
    cols: 2,
    dependsOn: "country",
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: (prefs) =>
      `The user is from "${prefs.country?.label}". List 8 culinary regions or food-significant states/areas of that country.
Return ONLY this JSON shape:
{"options":[{"id":"north","label":"North Indian","icon":"fa-compass","subtitle":"Rich gravies & breads"},...]}
Rules:
- Use Font Awesome 6 Solid icon names ONLY (e.g. fa-compass, fa-map, fa-location-dot)
- Do NOT include "fa-solid" in the icon value
- Every object must have: id, label, icon, subtitle
- 8 items specific to "${prefs.country?.label}"`,
  },
  {
    id: "diet",
    title: "Your diet preferences",
    subtitle: "Select all that apply to how you eat",
    type: "ai_multi",           // ← MULTI: e.g. someone can be veg + gluten-free
    field: "diet",
    icon: "fa-leaf",
    cols: 2,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: () =>
      `List 6 common diet types for a global meal planning app.
Return ONLY this JSON shape:
{"options":[{"id":"veg","label":"Vegetarian","icon":"fa-seedling","subtitle":"No meat or seafood"},{"id":"vegan","label":"Vegan","icon":"fa-leaf","subtitle":"No animal products"},...]}
Rules:
- Use Font Awesome 6 Solid icon names ONLY (e.g. fa-seedling, fa-leaf, fa-drumstick-bite)
- Do NOT include "fa-solid" in the icon value
- Every object must have: id, label, icon, subtitle
- 6 items total`,
  },
  {
    id: "spice",
    title: "How spicy do you like it?",
    subtitle: "Pick the heat level you enjoy most",
    type: "ai_single",          // ← SINGLE: only one spice level
    field: "spice",
    icon: "fa-fire",
    cols: 1,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: () =>
      `List 5 spice tolerance levels from no heat to extreme. Give them creative, evocative names.
Return ONLY this JSON shape:
{"options":[{"id":"none","label":"Ice Cold","icon":"fa-snowflake","subtitle":"Completely mild, zero heat"},{"id":"mild","label":"Gentle Warmth","icon":"fa-sun","subtitle":"Barely a tingle"},...]}
Rules:
- Use Font Awesome 6 Solid icon names ONLY (e.g. fa-snowflake, fa-sun, fa-pepper-hot, fa-fire, fa-skull)
- Do NOT include "fa-solid" in the icon value
- Every object must have: id, label, icon, subtitle
- 5 items ordered coolest → hottest`,
  },
  {
    id: "cuisines",
    title: "Favourite cuisines",
    subtitle: "Pick everything you love — AI will blend them into your feed",
    type: "ai_multi",           // ← MULTI
    field: "cuisines",
    icon: "fa-utensils",
    cols: 3,
    dependsOn: ["country", "diet"],
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: (prefs) => {
      const dietLabel = Array.isArray(prefs.diet)
        ? prefs.diet.map((d) => d.label).join(", ")
        : prefs.diet?.label || "all foods";
      return `The user is from "${prefs.country?.label}" with diet preferences: "${dietLabel}".
List 12 world cuisines they'd likely enjoy — weight towards their background but include global variety.
Return ONLY this JSON shape:
{"options":[{"id":"indian","label":"Indian","icon":"fa-bowl-rice","subtitle":"Aromatic spices & curries"},{"id":"italian","label":"Italian","icon":"fa-pizza-slice","subtitle":"Pasta, risotto & more"},...]}
Rules:
- Use Font Awesome 6 Solid icon names ONLY (e.g. fa-bowl-rice, fa-pizza-slice, fa-fish)
- Do NOT include "fa-solid" in the icon value
- No two items may share the same icon value
- Every object must have: id, label, icon, subtitle
- 12 items total`;
    },
  },
  {
    id: "dislikes",
    title: "Foods you'd rather avoid",
    subtitle: "These will never appear in your personalised feed",
    type: "ai_multi_optional",  // ← MULTI optional
    field: "dislikes",
    icon: "fa-ban",
    cols: 3,
    dependsOn: ["diet", "country"],
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: (prefs) => {
      const dietLabel = Array.isArray(prefs.diet)
        ? prefs.diet.map((d) => d.label).join(", ")
        : prefs.diet?.label || "all foods";
      return `The user follows a "${dietLabel}" diet from "${prefs.country?.label}".
List 12 commonly disliked foods/ingredients relevant to their background.
Return ONLY this JSON shape:
{"options":[{"id":"bitter_gourd","label":"Bitter Gourd","icon":"fa-circle-xmark","subtitle":"Intensely bitter vegetable"},{"id":"mushrooms","label":"Mushrooms","icon":"fa-circle-minus","subtitle":"Earthy fungus texture"},...]}
Rules:
- Use Font Awesome 6 Solid icon names ONLY
- Do NOT include "fa-solid" in the icon value
- Every object must have: id, label, icon, subtitle
- 12 items total`;
    },
  },
  {
    id: "allergies",
    title: "Any food allergies?",
    subtitle: "Your safety is our priority — these are strictly excluded",
    type: "ai_multi_optional",  // ← MULTI optional
    field: "allergies",
    icon: "fa-triangle-exclamation",
    cols: 3,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: () =>
      `List the 10 most medically recognised food allergens worldwide.
Return ONLY this JSON shape:
{"options":[{"id":"gluten","label":"Gluten","icon":"fa-wheat-awn","subtitle":"Wheat, barley, rye"},{"id":"dairy","label":"Dairy","icon":"fa-droplet","subtitle":"Milk, cheese, butter"},...]}
Rules:
- Use Font Awesome 6 Solid icon names ONLY (e.g. fa-wheat-awn, fa-droplet, fa-egg, fa-fish)
- Do NOT include "fa-solid" in the icon value
- Every object must have: id, label, icon, subtitle
- 10 items total`,
  },
  {
    id: "skill",
    title: "Your cooking skill level",
    subtitle: "We'll match recipe complexity to your comfort zone",
    type: "ai_single",          // ← SINGLE
    field: "skill",
    icon: "fa-star",
    cols: 2,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: () =>
      `List 4 home cooking skill levels from complete beginner to near-professional. Be warm and encouraging.
Return ONLY this JSON shape:
{"options":[{"id":"beginner","label":"Just Starting","icon":"fa-seedling","subtitle":"I can boil water and make toast"},{"id":"home_cook","label":"Confident Cook","icon":"fa-house","subtitle":"I follow recipes comfortably"},...]}
Rules:
- Use Font Awesome 6 Solid icon names ONLY (e.g. fa-seedling, fa-house, fa-hat-chef, fa-star)
- Do NOT include "fa-solid" in the icon value
- Every object must have: id, label, icon, subtitle
- 4 items ordered beginner → expert`,
  },
  {
    id: "cooktime",
    title: "Time you can spend cooking",
    subtitle: "We'll prioritise recipes that fit your daily schedule",
    type: "ai_single",          // ← SINGLE
    field: "cookTime",
    icon: "fa-clock",
    cols: 2,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: () =>
      `List 4 daily cooking time windows from ultra-quick to leisurely weekend cooking.
Return ONLY this JSON shape:
{"options":[{"id":"15","label":"Under 15 min","icon":"fa-bolt","subtitle":"Lightning-fast weeknight meals"},{"id":"30","label":"15–30 min","icon":"fa-clock","subtitle":"Balanced weekday cooking"},...]}
Rules:
- Use Font Awesome 6 Solid icon names ONLY (e.g. fa-bolt, fa-clock, fa-hourglass, fa-timer)
- Do NOT include "fa-solid" in the icon value
- Every object must have: id, label, icon, subtitle
- 4 items ordered quickest → longest`,
  },
];

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ cols }) {
  const count = cols === 1 ? 5 : cols === 2 ? 4 : cols === 3 ? 6 : 8;
  return (
    <div className={`ob-grid ob-grid-${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ob-card-opt skeleton">
          <div className="sk-icon" />
          <div className="sk-lines">
            <div className="sk-line sk-long" />
            <div className="sk-line sk-short" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Option card ──────────────────────────────────────────────────────────────
function OptCard({ opt, selected, onClick, multi }) {
  return (
    <button
      className={`ob-card-opt ${selected ? "sel" : ""} ${multi ? "multi" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className="opt-icon-wrap">
        <FAIcon name={opt.icon || "fa-circle"} />
      </span>
      <span className="opt-body">
        <span className="opt-label">{opt.label}</span>
        {opt.subtitle && <span className="opt-sub">{opt.subtitle}</span>}
      </span>
      {/* Checkbox for multi, radio for single */}
      <span className="opt-checkmark">
        {multi
          ? <FAIcon name={selected ? "fa-square-check" : "fa-square"} />
          : <FAIcon name={selected ? "fa-circle-dot" : "fa-circle"} />
        }
      </span>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const [idx, setIdx] = useState(0);
  const [prefs, setPrefs] = useState({});
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [textVal, setTextVal] = useState("");
  const [customVal, setCustomVal] = useState("");
  const [animDir, setAnimDir] = useState("fwd");
  const [animKey, setAnimKey] = useState(0);
  const textRef = useRef(null);

  const step = STEPS[idx];
  const isLast = idx === STEPS.length - 1;
  const progress = (idx / STEPS.length) * 100;
  const isMulti = step.type === "ai_multi" || step.type === "ai_multi_optional";

  // ── Fetch AI options ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!step.aiUser) return;
    if (cache[step.id]) return;

    const deps = Array.isArray(step.dependsOn)
      ? step.dependsOn
      : step.dependsOn ? [step.dependsOn] : [];

    // For multi-select deps (diet, region) check array length > 0
    // For single-select deps (country) check object exists
    const depsReady = deps.every((d) => {
      const v = prefs[d];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
    if (!depsReady) return;

    setLoading(true);
    setError(false);

    const userMsg = typeof step.aiUser === "function"
      ? step.aiUser(prefs)
      : step.aiUser;

    askClaude(step.aiSystem, userMsg)
      .then((data) => {
        const opts = data.options || data[Object.keys(data)[0]] || [];
        if (!Array.isArray(opts) || opts.length === 0) throw new Error("empty");
        setCache((c) => ({ ...c, [step.id]: opts }));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [idx, prefs]);

  // ── Focus text input ─────────────────────────────────────────────────────
  useEffect(() => {
    if (step.type === "text_input") textRef.current?.focus();
  }, [idx]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const go = (dir, fn) => {
    setAnimDir(dir);
    setAnimKey((k) => k + 1);
    setTimeout(fn, 60);
  };

  const canNext = () => {
    if (loading) return false;
    if (step.type === "text_input") return textVal.trim().length > 0;
    if (step.type === "ai_single") return !!prefs[step.field];
    if (step.type === "ai_multi") return (prefs[step.field] || []).length > 0;
    if (step.type === "ai_multi_optional") return true;
    return true;
  };

  const next = () => {
    if (!canNext()) return;
    if (step.type === "text_input")
      setPrefs((p) => ({ ...p, [step.field]: textVal.trim() }));
    if (isLast) {
      const final = {
        ...prefs,
        ...(step.type === "text_input" ? { [step.field]: textVal.trim() } : {}),
      };
      localStorage.setItem("kitchenBuddyPrefs", JSON.stringify(final));
      onComplete?.(final);
      return;
    }
    go("fwd", () => setIdx((i) => i + 1));
  };

  const back = () => {
    if (idx === 0) return;
    go("bck", () => setIdx((i) => i - 1));
  };

  const retry = () => {
    setCache((c) => { const n = { ...c }; delete n[step.id]; return n; });
    setError(false);
  };

  // ── Selection ────────────────────────────────────────────────────────────
  const pickSingle = (opt) => setPrefs((p) => ({ ...p, [step.field]: opt }));

  const toggleMulti = (opt) =>
    setPrefs((p) => {
      const arr = p[step.field] || [];
      const has = arr.some((x) => x.id === opt.id);
      return {
        ...p,
        [step.field]: has
          ? arr.filter((x) => x.id !== opt.id)
          : [...arr, opt],
      };
    });

  // ── Render body ──────────────────────────────────────────────────────────
  const sel = prefs[step.field];
  const opts = cache[step.id] || [];
  const cols = step.cols || 3;

  const renderBody = () => {
    if (step.type === "text_input") {
      return (
        <div className="ob-text-wrap">
          <div className="ob-text-field">
            <FAIcon name={step.icon} className="ob-text-fa" />
            <input
              ref={textRef}
              className="ob-text-input"
              placeholder={step.placeholder}
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && next()}
            />
          </div>
          {textVal.trim() && (
            <div className="ob-text-hello">
              <FAIcon name="fa-circle-check" />
              Hi <strong>{textVal.trim()}</strong>, let's build your taste profile!
            </div>
          )}
        </div>
      );
    }

    if (loading) return <Skeleton cols={cols} />;

    if (error) {
      return (
        <div className="ob-error">
          <FAIcon name="fa-circle-exclamation" />
          <span>Couldn't load options right now.</span>
          <button className="ob-retry" onClick={retry} type="button">
            <FAIcon name="fa-rotate" /> Try again
          </button>
        </div>
      );
    }

    if (opts.length === 0) return <Skeleton cols={cols} />;

    return (
      <div className="ob-opts-wrap">
        {/* Hint bar */}
        <div className="ob-multi-hint">
          <FAIcon name={
            step.type === "ai_multi_optional" ? "fa-circle-info"
              : isMulti ? "fa-hand-pointer"
                : "fa-circle-dot"
          } />
          {step.type === "ai_multi_optional"
            ? "Optional — skip if none apply"
            : isMulti
              ? `Select all that apply · ${(sel || []).length} selected`
              : "Select one option below"}
        </div>

        {/* Options grid */}
        <div className={`ob-grid ob-grid-${cols}`}>
          {opts.map((opt) => {
            const isSel = isMulti
              ? (sel || []).some((x) => x.id === opt.id)
              : sel?.id === opt.id;
            return (
              <OptCard
                key={opt.id}
                opt={opt}
                selected={isSel}
                multi={isMulti}
                onClick={() => isMulti ? toggleMulti(opt) : pickSingle(opt)}
              />
            );
          })}
        </div>

        {/* Custom dislike input */}
        {step.id === "dislikes" && (
          <div className="ob-custom-row">
            <FAIcon name="fa-plus" className="ob-custom-fa" />
            <input
              className="ob-custom-input"
              placeholder="Add a custom food you dislike..."
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customVal.trim()) {
                  toggleMulti({
                    id: `custom_${Date.now()}`,
                    label: customVal.trim(),
                    icon: "fa-circle-xmark",
                    subtitle: "Custom",
                  });
                  setCustomVal("");
                }
              }}
            />
          </div>
        )}

        {/* No-allergy shortcut */}
        {step.id === "allergies" && (
          <button
            type="button"
            className={`ob-none-btn ${!sel || sel.length === 0 ? "active" : ""}`}
            onClick={() => setPrefs((p) => ({ ...p, allergies: [] }))}
          >
            <FAIcon name="fa-circle-check" />
            No allergies — I can eat everything
          </button>
        )}
      </div>
    );
  };

  // ── Summary on last step ─────────────────────────────────────────────────
  const renderSummary = () => {
    if (!isLast) return null;
    const chips = [
      { key: "country", icon: "fa-earth-asia" },
      { key: "region", icon: "fa-map-location-dot" },
      { key: "diet", icon: "fa-leaf" },
      { key: "spice", icon: "fa-fire" },
      { key: "skill", icon: "fa-star" },
      { key: "cookTime", icon: "fa-clock" },
    ];
    return (
      <div className="ob-summary">
        <div className="ob-summary-hd">
          <FAIcon name="fa-wand-magic-sparkles" />
          Your taste profile is set!
        </div>
        <div className="ob-summary-chips">
          {prefs.name && (
            <span className="ob-s-chip">
              <FAIcon name="fa-user" /> {prefs.name}
            </span>
          )}
          {chips.map(({ key, icon }) => {
            const v = prefs[key];
            if (!v) return null;
            // Handle both single object and array (multi-select fields)
            const label = Array.isArray(v)
              ? v.map((x) => x.label).join(", ")
              : typeof v === "object" ? v.label : v;
            return (
              <span className="ob-s-chip" key={key}>
                <FAIcon name={icon} /> {label}
              </span>
            );
          })}
          {(prefs.cuisines || []).length > 0 && (
            <span className="ob-s-chip">
              <FAIcon name="fa-utensils" /> {prefs.cuisines.length} cuisines
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="ob-root">
      <div className="ob-bg-grid" />
      <div className="ob-blob ob-b1" />
      <div className="ob-blob ob-b2" />

      <header className="ob-header">
        <div className="ob-logo">
          <FAIcon name="fa-kitchen-set" className="ob-logo-fa" />
          <span>Kitchen Buddy</span>
        </div>
        <button className="ob-skip" type="button" onClick={() => onComplete?.(prefs)}>
          Skip for now
        </button>
      </header>

      <div className="ob-prog-track">
        <div className="ob-prog-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="ob-dots-row">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`ob-dot ${i === idx ? "cur" : i < idx ? "done" : ""}`}
          />
        ))}
      </div>

      <div key={animKey} className={`ob-main-card anim-${animDir}`}>
        <div className="ob-ch">
          <div className="ob-ch-badge">
            <FAIcon name={step.icon} />
            <span>Step {idx + 1} of {STEPS.length}</span>
          </div>
          <h2 className="ob-ch-title">{step.title}</h2>
          <p className="ob-ch-sub">{step.subtitle}</p>
        </div>

        <div className="ob-cb">
          {renderBody()}
          {renderSummary()}
        </div>

        <div className="ob-cf">
          <button
            type="button"
            className="ob-btn-back"
            onClick={back}
            disabled={idx === 0}
          >
            <FAIcon name="fa-arrow-left" /> Back
          </button>

          <span className="ob-frac">{idx + 1} / {STEPS.length}</span>

          <button
            type="button"
            className={`ob-btn-next ${!canNext() ? "dis" : ""} ${isLast ? "fin" : ""}`}
            onClick={next}
            disabled={!canNext()}
          >
            {loading
              ? <><FAIcon name="fa-circle-notch fa-spin" /> Loading…</>
              : isLast
                ? <><FAIcon name="fa-rocket" /> Start Cooking!</>
                : <>Continue <FAIcon name="fa-arrow-right" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}