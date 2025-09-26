import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";

/**
 * Utilities
 */
const cls = (...xs) => xs.filter(Boolean).join(" ");
const KEY = "romee-pulse-planner/v1";

const useLocalStorage = (key, initial) => {
  const storageKey = KEY + ":" + key;
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch (_) {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (_) {}
  }, [storageKey, value]);
  return [value, setValue];
};

// Time helpers (fixed EST context provided by the brief)
const NOW_EST = new Date("2025-09-26T16:00:00-05:00"); // 16:00 EST
const toMinutes = (HHMM) => {
  const [h, m] = HHMM.split(":").map(Number);
  return h * 60 + (m || 0);
};
const minutesOf = (d) => d.getHours() * 60 + d.getMinutes();

/**
 * Minimal shadcn-like UI atoms (styled with Tailwind + custom CSS).
 */
const Card = ({ className="", children }) => (
  <div className={cls("glass card-border rounded-2xl p-4 md:p-6 shadow-glass", className)}>{children}</div>
);

const Button = ({ className="", size="md", variant="primary", icon:Icon, children, ...props }) => {
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2", lg: "px-5 py-3 text-lg" };
  const variants = {
    primary: "bg-gradient-to-r from-cyan-400 to-indigo-500 text-white hover:opacity-95 active:opacity-90",
    ghost: "bg-white/10 text-white hover:bg-white/20",
    outline: "border border-white/20 bg-transparent hover:bg-white/10"
  };
  return (
    <button {...props}
      className={cls("rounded-xl font-semibold tracking-wide shadow-neon transition active:scale-[.98]",
                     sizes[size], variants[variant], className)}>
      <span className="inline-flex items-center gap-2">{Icon && <Icon size={18} />} {children}</span>
    </button>
  );
};

const Switch = ({ checked, onChange }) => (
  <div role="switch" aria-checked={checked}
       className="ui-switch cursor-pointer" data-checked={checked}
       onClick={() => onChange(!checked)}>
    <div className="knob"></div>
  </div>
);

const Textarea = ({ value, onChange, placeholder }) => (
  <textarea className="ui-textarea w-full text-white/90 placeholder-white/40"
            rows={3} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} />
);

const ProgressRadial = ({ value }) => {
  const r = 30, stroke = 6;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = C - (pct/100)*C;
  return (
    <div className="progress-wrap">
      <svg viewBox="0 0 72 72" width="72" height="72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={stroke} />
        <motion.circle cx="36" cy="36" r={r} fill="none" stroke="url(#grad)"
                       strokeWidth={stroke} strokeLinecap="round"
                       initial={{ strokeDashoffset: C }}
                       animate={{ strokeDashoffset: offset }}
                       transition={{ type: 'spring', stiffness: 120, damping: 24 }}
                       strokeDasharray={C} />
        <defs>
          <linearGradient id="grad" x1="0" x2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="center text-sm"><span>{Math.round(pct)}%</span></div>
    </div>
  );
};

/**
 * Data model — Romee's day structure
 */
const SECTIONS = [
  {
    id: "ochtend",
    label: "Ochtend",
    time: "08:00–10:00",
    start: toMinutes("08:00"),
    end: toMinutes("10:00"),
    color: "from-cyan-400 to-sky-500",
    items: [
      { id: "breakfast", title: "Ontbijt: kwark/fruit smoothie", icon: Lucide.Apple },
      { id: "coffee", title: "Koffie", icon: Lucide.Coffee },
      { id: "walk-ted-morning", title: "Wandeling met Ted · 30 min", icon: Lucide.Dog },
      { id: "shower-breath", title: "Douchen + ademhaling (rustmoment)", icon: Lucide.ShowerHead }
    ]
  },
  {
    id: "middag",
    label: "Middag",
    time: "14:00",
    start: toMinutes("14:00"),
    end: toMinutes("15:30"),
    color: "from-indigo-400 to-fuchsia-500",
    items: [
      { id: "meal-two", title: "Tweede maaltijd (brood/ei + fruit)", icon: Lucide.Egg },
      { id: "short-walk", title: "Korte wandeling · max 30 min", icon: Lucide.Footprints },
      { id: "nidra-rest", title: "Rust · Yoga Nidra · max 30 min", icon: Lucide.MoonStar },
      { id: "daily-chores", title: "Dagelijkse taken (boodschappen/schoonmaken/bakken ≤ 2 uur)", icon: Lucide.ListChecks }
    ]
  },
  {
    id: "namiddag",
    label: "Namiddag/Avond",
    time: "17:30+",
    start: toMinutes("17:30"),
    end: toMinutes("18:30"),
    color: "from-purple-400 to-pink-500",
    items: [
      { id: "with-floris", title: "Met Floris: wandeling met hond · TV kijken · kletsen · administratie", icon: Lucide.HeartHandshake }
    ]
  },
  {
    id: "avond",
    label: "Avond",
    time: "18:30+",
    start: toMinutes("18:30"),
    end: toMinutes("23:59"),
    color: "from-emerald-400 to-teal-500",
    items: [
      { id: "cook-eat", title: "Koken & eten met Floris", icon: Lucide.ChefHat },
      { id: "walk-ted-evening", title: "Korte wandeling met Ted · 15 min", icon: Lucide.Dog },
      { id: "shower-meditate", title: "Douchen/meditatie", icon: Lucide.Waves },
      { id: "free-time", title: "Vrije tijd", icon: Lucide.Sparkles }
    ]
  }
];

function activityKey(sectionId, itemId, suffix) {
  return `${sectionId}:${itemId}:${suffix}`;
}

const ActivityItem = ({ sectionId, item }) => {
  const [checked, setChecked] = useLocalStorage(activityKey(sectionId, item.id, "checked"), false);
  const [note, setNote] = useLocalStorage(activityKey(sectionId, item.id, "note"), "");

  useEffect(() => {
    // tiny animation prompt when toggling
  }, [checked]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 16 }}
      className={cls("rounded-2xl p-3 md:p-4 bg-white/5 border border-white/10", checked && "bg-white/8")}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/10">
          {item.icon && React.createElement(item.icon, { size: 22 })}
        </div>
        <div className="flex-1">
          <div className={cls("font-semibold leading-tight", checked ? "opacity-60 line-through" : "")}>
            {item.title}
          </div>
        </div>
        <Switch checked={checked} onChange={setChecked} />
      </div>
      <div className="mt-3">
        <Textarea
          value={note}
          onChange={setNote}
          placeholder="Notitie… (wordt automatisch opgeslagen)"
        />
      </div>
    </motion.div>
  );
};

const Section = ({ section, active }) => {
  return (
    <Card className={cls("mb-4 md:mb-6")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cls("rounded-xl p-2 text-sm font-bold bg-gradient-to-r", section.color)}>
            {section.time}
          </div>
          <h3 className="text-lg md:text-xl font-display font-bold">{section.label}</h3>
        </div>
        {active && (
          <span className="text-xs md:text-sm px-2 py-1 rounded-full bg-lime-400/20 text-lime-300 border border-lime-300/30">
            Nu bezig
          </span>
        )}
      </div>
      <div className="mt-4 grid gap-3">
        {section.items.map((item) => (
          <ActivityItem key={item.id} sectionId={section.id} item={item} />
        ))}
      </div>
    </Card>
  );
};

const Mascot = () => (
  <svg className="hero-mascot" width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#22d3ee"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
    </defs>
    <g filter="url(#f0)">
      <rect x="12" y="14" width="116" height="92" rx="24" fill="url(#g)" opacity=".95"/>
      <circle cx="70" cy="56" r="22" fill="white"/>
      <circle cx="60" cy="50" r="6" fill="#111827"/>
      <circle cx="82" cy="50" r="6" fill="#111827"/>
      <path d="M58 70c8 8 16 8 24 0" stroke="#111827" strokeWidth="4" strokeLinecap="round"/>
      <!-- Ted's ears -->
      <path d="M40 38c0-10 12-18 18-12 6 6-2 18-12 18" fill="white"/>
      <path d="M100 38c0-10-12-18-18-12-6 6 2 18 12 18" fill="white"/>
      <!-- Sparkles -->
      <circle cx="22" cy="34" r="3" fill="white" opacity=".7"/>
      <circle cx="118" cy="36" r="3" fill="white" opacity=".7"/>
    </g>
    <defs>
      <filter id="f0" x="0" y="0" width="140" height="120" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="rgba(0,0,0,.35)"/>
      </filter>
    </defs>
  </svg>
);

const InstallChip = ({ onInstall, visible }) => {
  if (!visible) return null;
  return (
    <div className="install-chip z-40">
      <Lucide.BadgePlus size={18} />
      <span className="text-sm">Installeer app</span>
      <Button size="sm" onClick={onInstall}>Toevoegen</Button>
    </div>
  );
};

const BottomBar = ({ progress }) => {
  return (
    <div className="bottom-nav z-30">
      <div className="mx-auto max-w-md px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lucide.Clock size={18} className="opacity-80" />
          <span className="text-sm opacity-80">Context: 26 sep 2025, 16:00 EST</span>
        </div>
        <div className="flex items-center gap-3">
          <ProgressRadial value={progress} />
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const nowMin = minutesOf(NOW_EST);

  // figure out which section is active now (based on the EST context)
  const activeSectionId = useMemo(() => {
    const sec = SECTIONS.find(s => nowMin >= s.start && nowMin <= s.end);
    return sec ? sec.id : null;
  }, [nowMin]);

  // compute progress over all items (checked items / total items)
  const checkedCount = useMemo(() => {
    let count = 0;
    for (const s of SECTIONS) for (const item of s.items) {
      const key = KEY + ":" + activityKey(s.id, item.id, "checked");
      try {
        const raw = localStorage.getItem(key);
        if (raw && JSON.parse(raw) === true) count += 1;
      } catch (_) {}
    }
    return count;
  }, []); // computed only on first load

  const totalCount = SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const [progress, setProgress] = useState(Math.round(100 * (checkedCount / totalCount)));
  // Recompute progress reactively when storage changes
  useEffect(() => {
    const handler = () => {
      let c = 0;
      for (const s of SECTIONS) for (const item of s.items) {
        const key = KEY + ":" + activityKey(s.id, item.id, "checked");
        try {
          const raw = localStorage.getItem(key);
          if (raw && JSON.parse(raw) === true) c += 1;
        } catch (_) {}
      }
      setProgress(Math.round(100 * (c / totalCount)));
    };
    window.addEventListener("storage", handler);
    const id = setInterval(handler, 750);
    return () => { clearInterval(id); window.removeEventListener("storage", handler); };
  }, [totalCount]);

  // PWA install handling
  const [deferred, setDeferred] = useState(null);
  const [installVisible, setInstallVisible] = useState(false);
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setInstallVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  const doInstall = async () => {
    if (!deferred) return;
    setInstallVisible(false);
    const res = await deferred.prompt();
    // res.outcome may be 'accepted' or 'dismissed'
  };

  // Offline/online indicator
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Decorative rings */}
      <div className="pulse-rings">
        <div className="ring"></div><div className="ring"></div><div className="ring"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20">
        <div className="mx-auto max-w-md px-4 pt-[10px] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl p-2 bg-white/10">
                <img src="./icons/icon-192.png" width="28" height="28" alt="Pulse Planner" className="rounded-lg" />
              </div>
              <div>
                <div className="text-xs opacity-70">Pulse Planner</div>
                <div className="font-display text-lg font-extrabold tracking-tight">Romee · Activiteiten</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div title={online ? "Online" : "Offline"} className={cls("w-2.5 h-2.5 rounded-full", online ? "bg-emerald-400" : "bg-amber-400")}></div>
              <Button size="sm" variant="ghost" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} icon={Lucide.Sparkles}>Notities</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-md px-4 pt-3">
        <Card className="relative overflow-hidden">
          <div className="flex items-center gap-4">
            <Mascot />
            <div className="flex-1">
              <div className="text-xs opacity-80">Vandaag (EST-context)</div>
              <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">Plan met Ted & Floris</h2>
              <p className="text-white/80 mt-1 leading-snug">
                Veeg door je dag. Check taken af. Schrijf snelle notities. Alles blijft lokaal bewaard, ook offline.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <ProgressRadial value={progress} />
                <div className="text-sm opacity-80">
                  <div>Voortgang</div>
                  <div className="font-semibold">{progress}% voltooid</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Timeline */}
      <main className="mx-auto max-w-md px-4 pt-3 pb-24">
        {SECTIONS.map((section) => (
          <Section key={section.id} section={section} active={activeSectionId === section.id} />
        ))}
      </main>

      {/* Bottom bar */}
      <BottomBar progress={progress} />

      {/* Floating quick note (store at root key) */}
      <QuickNoteFab />

      {/* Install chip when available */}
      <InstallChip visible={installVisible} onInstall={doInstall} />
    </div>
  );
};

const QuickNoteFab = () => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useLocalStorage("quick-note", "");
  return (
    <>
      <button className="fab z-40 flex items-center gap-2" onClick={() => setOpen(!open)}>
        <Lucide.PenSquare size={20} />
        Snelle notitie
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 p-4 grid place-items-end pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="pointer-events-auto max-w-md w-full mx-auto glass rounded-2xl p-4 border border-white/15 shadow-glass"
              initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/10"><Lucide.NotebookPen size={18} /></div>
                <div className="flex-1">
                  <div className="font-semibold">Snelle notitie</div>
                  <Textarea value={text} onChange={setText} placeholder="Typ hier je idee, taak of gedachten…" />
                  <div className="mt-2 text-xs opacity-70">Wordt automatisch opgeslagen op dit apparaat.</div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" onClick={() => setOpen(false)}>Sluiten</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const container = document.getElementById("root");
createRoot(container).render(<App />);
