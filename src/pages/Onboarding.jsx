import { useState, useEffect, useRef } from "react";
import "./Onboarding.css";

// ─── Groq API helper ──────────────────────────────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

async function askGroq(systemPrompt, userMessage) {
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
  try { return JSON.parse(match?.[0] || "{}"); }
  catch { return {}; }
}

// ─── Font Awesome Icon ────────────────────────────────────────────────────────
function FAIcon({ name = "fa-circle", className = "" }) {
  const stripped = (name || "fa-circle")
    .replace(/\bfa-solid\b|\bfa-regular\b|\bfa-brands\b|\bfas\b|\bfar\b/g, "")
    .trim();
  const [icon, ...mods] = stripped.split(/\s+/).filter(Boolean);
  const cls = ["fa-solid", icon, ...mods, className].filter(Boolean).join(" ");
  return <i className={cls} aria-hidden="true" />;
}

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  {
    id: "name",
    title: "What should we call you?",
    subtitle: "A name helps us personalise your entire experience",
    type: "text_input",
    field: "name",
    icon: "fa-user",
    placeholder: "Your first name…",
  },
  {
    id: "country",
    title: "Where are you from?",
    subtitle: "We'll surface dishes rooted in your culinary heritage",
    type: "ai_single",
    field: "country",
    icon: "fa-earth-asia",
    cols: 3,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown, no explanation.`,
    aiUser: () =>
      `List 12 countries with rich food cultures. Return ONLY:
{"options":[{"id":"in","label":"India","icon":"fa-flag","subtitle":"Curries, spices & street food"},...]}
Rules: FA6 Solid icon names ONLY (e.g. fa-flag). No "fa-solid" prefix. id, label, icon, subtitle required. 12 items.`,
  },
  {
    id: "region",
    title: "Which regions excite you?",
    subtitle: "Pick all the regional cuisines you love",
    type: "ai_multi",
    field: "region",
    icon: "fa-map-location-dot",
    cols: 2,
    dependsOn: "country",
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown.`,
    aiUser: (p) =>
      `User is from "${p.country?.label}". List 8 culinary regions. Return ONLY:
{"options":[{"id":"north","label":"North Indian","icon":"fa-compass","subtitle":"Rich gravies & breads"},...]}
Rules: FA6 Solid icon names, no "fa-solid" prefix. 8 items specific to "${p.country?.label}".`,
  },
  {
    id: "diet",
    title: "How do you eat?",
    subtitle: "Select every dietary preference that applies",
    type: "ai_multi",
    field: "diet",
    icon: "fa-leaf",
    cols: 2,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown.`,
    aiUser: () =>
      `List 6 common diet types. Return ONLY:
{"options":[{"id":"veg","label":"Vegetarian","icon":"fa-seedling","subtitle":"No meat or seafood"},...]}
Rules: FA6 Solid icon names, no "fa-solid" prefix. 6 items.`,
  },
  {
    id: "spice",
    title: "How spicy do you like it?",
    subtitle: "Choose the heat level that makes you happiest",
    type: "ai_single",
    field: "spice",
    icon: "fa-fire",
    cols: 1,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown.`,
    aiUser: () =>
      `List 5 spice tolerance levels, coolest to hottest, with creative names. Return ONLY:
{"options":[{"id":"none","label":"Ice Cold","icon":"fa-snowflake","subtitle":"Completely mild"},{"id":"mild","label":"Gentle Warmth","icon":"fa-sun","subtitle":"Barely a tingle"},...]}
Rules: FA6 Solid icon names, no "fa-solid" prefix. 5 items ordered cool→hot.`,
  },
  {
    id: "cuisines",
    title: "Favourite world cuisines",
    subtitle: "Pick everything you love — your feed blends them all",
    type: "ai_multi",
    field: "cuisines",
    icon: "fa-utensils",
    cols: 3,
    dependsOn: ["country", "diet"],
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown.`,
    aiUser: (p) => {
      const d = Array.isArray(p.diet)
        ? p.diet.map((x) => x.label).join(", ")
        : p.diet?.label || "all";
      return `User from "${p.country?.label}", diet: "${d}". List 12 world cuisines. Return ONLY:
{"options":[{"id":"indian","label":"Indian","icon":"fa-bowl-rice","subtitle":"Aromatic spices"},...]}
Rules: FA6 Solid icon names, no "fa-solid" prefix. No duplicate icons. 12 items.`;
    },
  },
  {
    id: "dislikes",
    title: "Foods you'd rather skip",
    subtitle: "These will never appear in your feed",
    type: "ai_multi_optional",
    field: "dislikes",
    icon: "fa-ban",
    cols: 3,
    dependsOn: ["diet", "country"],
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown.`,
    aiUser: (p) => {
      const d = Array.isArray(p.diet)
        ? p.diet.map((x) => x.label).join(", ")
        : p.diet?.label || "all";
      return `Diet: "${d}", from "${p.country?.label}". List 12 commonly disliked foods. Return ONLY:
{"options":[{"id":"bitter_gourd","label":"Bitter Gourd","icon":"fa-circle-xmark","subtitle":"Very bitter"},{"id":"mushrooms","label":"Mushrooms","icon":"fa-circle-minus","subtitle":"Earthy texture"},...]}
Rules: FA6 Solid icon names, no "fa-solid" prefix. 12 items.`;
    },
  },
  {
    id: "allergies",
    title: "Any food allergies?",
    subtitle: "These are strictly excluded from every suggestion",
    type: "ai_multi_optional",
    field: "allergies",
    icon: "fa-triangle-exclamation",
    cols: 3,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown.`,
    aiUser: () =>
      `List 10 major food allergens. Return ONLY:
{"options":[{"id":"gluten","label":"Gluten","icon":"fa-wheat-awn","subtitle":"Wheat, barley, rye"},{"id":"dairy","label":"Dairy","icon":"fa-droplet","subtitle":"Milk, cheese, butter"},...]}
Rules: FA6 Solid icon names, no "fa-solid" prefix. 10 items.`,
  },
  {
    id: "skill",
    title: "Your cooking confidence",
    subtitle: "We'll match recipe complexity to your level",
    type: "ai_single",
    field: "skill",
    icon: "fa-star",
    cols: 2,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown.`,
    aiUser: () =>
      `List 4 home-cook skill levels, beginner to expert, warm and encouraging. Return ONLY:
{"options":[{"id":"beginner","label":"Just Starting","icon":"fa-seedling","subtitle":"I can boil water and make toast"},...]}
Rules: FA6 Solid icon names, no "fa-solid" prefix. 4 items ordered beginner→expert.`,
  },
  {
    id: "cooktime",
    title: "Time you have for cooking",
    subtitle: "We'll prioritise recipes that fit your schedule",
    type: "ai_single",
    field: "cookTime",
    icon: "fa-clock",
    cols: 2,
    aiSystem: `You are Kitchen Buddy's onboarding AI. Respond ONLY with raw JSON, no markdown.`,
    aiUser: () =>
      `List 4 daily cooking time windows, quickest to leisurely. Return ONLY:
{"options":[{"id":"15","label":"Under 15 min","icon":"fa-bolt","subtitle":"Lightning-fast weeknight meals"},...]}
Rules: FA6 Solid icon names, no "fa-solid" prefix. 4 items.`,
  },
];

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ cols }) {
  const count = cols === 1 ? 5 : cols === 2 ? 4 : 6;
  return (
    <div className={`up-grid up-grid-${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="up-opt-card skeleton">
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

// ─── Option Card ──────────────────────────────────────────────────────────────
function OptCard({ opt, selected, onClick, multi }) {
  return (
    <button
      className={`up-opt-card${selected ? " sel" : ""}${multi ? " multi" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className="up-opt-icon">
        <FAIcon name={opt.icon || "fa-circle"} />
      </span>
      <span className="up-opt-body">
        <span className="up-opt-label">{opt.label}</span>
        {opt.subtitle && <span className="up-opt-sub">{opt.subtitle}</span>}
      </span>
      <span className="up-opt-check">
        {multi
          ? <FAIcon name={selected ? "fa-square-check" : "fa-square"} />
          : <FAIcon name={selected ? "fa-circle-dot" : "fa-circle"} />}
      </span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
// Props:
//   onComplete  — called when user saves / closes
//   isModal     — true when opened via avatar (edit mode), false on first visit
export default function Onboarding({ onComplete, isModal = false }) {
  const [idx, setIdx] = useState(0);
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}"); }
    catch { return {}; }
  });
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [textVal, setTextVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}").name || ""; }
    catch { return ""; }
  });
  const [customVal, setCustomVal] = useState("");
  const [animDir, setAnimDir] = useState("fwd");
  const [animKey, setAnimKey] = useState(0);
  const textRef = useRef(null);

  const step = STEPS[idx];
  const isLast = idx === STEPS.length - 1;
  const isMulti = step.type === "ai_multi" || step.type === "ai_multi_optional";
  const progress = ((idx + 1) / STEPS.length) * 100;

  // ── Fetch AI options ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!step.aiUser) return;
    if (cache[step.id]) return;

    const deps = Array.isArray(step.dependsOn)
      ? step.dependsOn
      : step.dependsOn ? [step.dependsOn] : [];
    const ready = deps.every((d) => {
      const v = prefs[d];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
    if (!ready) return;

    setLoading(true);
    setError(false);

    const msg = typeof step.aiUser === "function" ? step.aiUser(prefs) : step.aiUser;
    askGroq(step.aiSystem, msg)
      .then((data) => {
        const opts = data.options || data[Object.keys(data)[0]] || [];
        if (!Array.isArray(opts) || opts.length === 0) throw new Error("empty");
        setCache((c) => ({ ...c, [step.id]: opts }));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [idx, prefs]);

  useEffect(() => {
    if (step.type === "text_input") textRef.current?.focus();
  }, [idx]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const go = (dir, fn) => {
    setAnimDir(dir);
    setAnimKey((k) => k + 1);
    setTimeout(fn, 55);
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

  const back = () => { if (idx > 0) go("bck", () => setIdx((i) => i - 1)); };
  const retry = () => {
    setCache((c) => { const n = { ...c }; delete n[step.id]; return n; });
    setError(false);
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const pickSingle = (opt) => setPrefs((p) => ({ ...p, [step.field]: opt }));
  const toggleMulti = (opt) =>
    setPrefs((p) => {
      const arr = p[step.field] || [];
      const has = arr.some((x) => x.id === opt.id);
      return { ...p, [step.field]: has ? arr.filter((x) => x.id !== opt.id) : [...arr, opt] };
    });

  // ── Render: step body ──────────────────────────────────────────────────────
  const sel = prefs[step.field];
  const opts = cache[step.id] || [];
  const cols = step.cols || 3;

  const renderBody = () => {
    if (step.type === "text_input") {
      return (
        <div className="up-text-wrap">
          <div className="up-text-field">
            <FAIcon name={step.icon} className="up-text-fa" />
            <input
              ref={textRef}
              className="up-text-input"
              placeholder={step.placeholder}
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && next()}
            />
          </div>
          {textVal.trim() && (
            <div className="up-hello">
              <FAIcon name="fa-circle-check" />
              Hi <strong>{textVal.trim()}</strong> — let's build your taste profile!
            </div>
          )}
        </div>
      );
    }

    if (loading) return <Skeleton cols={cols} />;

    if (error) {
      return (
        <div className="up-error">
          <FAIcon name="fa-circle-exclamation" />
          <span>Couldn't load options right now.</span>
          <button className="up-retry" onClick={retry} type="button">
            <FAIcon name="fa-rotate" /> Try again
          </button>
        </div>
      );
    }

    if (opts.length === 0) return <Skeleton cols={cols} />;

    return (
      <div className="up-opts-wrap">
        <div className="up-hint">
          <FAIcon name={
            step.type === "ai_multi_optional" ? "fa-circle-info"
              : isMulti ? "fa-hand-pointer" : "fa-circle-dot"
          } />
          <span>
            {step.type === "ai_multi_optional"
              ? "Optional — skip if none apply"
              : isMulti
                ? `Select all that apply · ${(sel || []).length} chosen`
                : "Choose one"}
          </span>
        </div>

        <div className={`up-grid up-grid-${cols}`}>
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

        {step.id === "dislikes" && (
          <div className="up-custom-row">
            <FAIcon name="fa-plus" className="up-custom-fa" />
            <input
              className="up-custom-input"
              placeholder="Add something else you dislike…"
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

        {step.id === "allergies" && (
          <button
            type="button"
            className={`up-none-btn${!sel || sel.length === 0 ? " active" : ""}`}
            onClick={() => setPrefs((p) => ({ ...p, allergies: [] }))}
          >
            <FAIcon name="fa-circle-check" />
            No allergies — I can eat everything
          </button>
        )}
      </div>
    );
  };

  // ── Render: summary (last step) ────────────────────────────────────────────
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
      <div className="up-summary">
        <div className="up-summary-hd">
          <FAIcon name="fa-wand-magic-sparkles" />
          Your taste profile is ready!
        </div>
        <div className="up-summary-chips">
          {prefs.name && (
            <span className="up-chip"><FAIcon name="fa-user" /> {prefs.name}</span>
          )}
          {chips.map(({ key, icon }) => {
            const v = prefs[key];
            if (!v) return null;
            const label = Array.isArray(v)
              ? v.map((x) => x.label).join(", ")
              : typeof v === "object" ? v.label : v;
            return (
              <span className="up-chip" key={key}>
                <FAIcon name={icon} /> {label}
              </span>
            );
          })}
          {(prefs.cuisines || []).length > 0 && (
            <span className="up-chip">
              <FAIcon name="fa-utensils" /> {prefs.cuisines.length} cuisines
            </span>
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div className="up-overlay" />

      {/* Two-panel shell */}
      <div className="up-shell">

        {/* ── Sidebar ── */}
        <aside className="up-sidebar">
          <div className="up-sidebar-logo">
            <i className="fa-solid fa-kitchen-set" aria-hidden="true" />
            <span>Kitchen Buddy</span>
          </div>

          <div className="up-sidebar-title">
            {isModal ? "Edit your profile" : "Build your taste profile"}
          </div>
          <p className="up-sidebar-sub">
            {isModal
              ? "Update any preference. Changes are saved when you finish."
              : "Just a few questions so we can personalise every recipe for you."}
          </p>

          {/* Clickable step list */}
          <nav className="up-step-nav">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`up-step-btn${i === idx ? " cur" : i < idx ? " done" : ""}`}
                onClick={() => go(i > idx ? "fwd" : "bck", () => setIdx(i))}
              >
                <span className="up-step-dot">
                  {i < idx
                    ? <i className="fa-solid fa-check" aria-hidden="true" />
                    : <span>{i + 1}</span>}
                </span>
                <span className="up-step-label">{s.title}</span>
              </button>
            ))}
          </nav>

          <div className="up-sidebar-footer">
            <div className="up-prog-bar">
              <div className="up-prog-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="up-prog-label">{idx + 1} of {STEPS.length} complete</span>
          </div>
        </aside>

        {/* ── Main panel ── */}
        <main className="up-main">
          {/* Top-right close / skip button */}
          <div className="up-topbar">
            <button
              type="button"
              className="up-close-btn"
              onClick={() => onComplete?.(prefs)}
            >
              <i
                className={`fa-solid ${isModal ? "fa-xmark" : "fa-forward"}`}
                aria-hidden="true"
              />
              <span>{isModal ? "Close" : "Skip for now"}</span>
            </button>
          </div>

          {/* Animated step card */}
          <div key={animKey} className={`up-card anim-${animDir}`}>

            {/* Header */}
            <div className="up-card-head">
              <div className="up-step-badge">
                <FAIcon name={step.icon} />
                <span>Step {idx + 1} of {STEPS.length}</span>
              </div>
              <h2 className="up-card-title">{step.title}</h2>
              <p className="up-card-sub">{step.subtitle}</p>
            </div>

            {/* Body */}
            <div className="up-card-body">
              {renderBody()}
              {renderSummary()}
            </div>

            {/* Footer nav */}
            <div className="up-card-foot">
              <button
                type="button"
                className="up-btn-back"
                onClick={back}
                disabled={idx === 0}
              >
                <FAIcon name="fa-arrow-left" /> Back
              </button>

              <button
                type="button"
                className={`up-btn-next${!canNext() ? " dis" : ""}${isLast ? " fin" : ""}`}
                onClick={next}
                disabled={!canNext()}
              >
                {loading
                  ? <><FAIcon name="fa-circle-notch fa-spin" /> Loading…</>
                  : isLast
                    ? <><FAIcon name="fa-floppy-disk" /> Save Profile</>
                    : <>Next <FAIcon name="fa-arrow-right" /></>}
              </button>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}