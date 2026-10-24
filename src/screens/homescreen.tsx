import { useEffect, useState, type FormEvent } from "react";

import "./homescreen.css";

type Recurrence = "once" | "daily" | "every other day" | "weekly";

type Quest = {
  id: string;

  title: string;

  xp: number;

  recurrence: Recurrence;

  scheduledDate: string;

  weekday: number;

  completedDates: string[];
};

type WeekDay = {
  key: string;

  label: string;

  date: string;

  weekday: number;
};

type Draft = {
  title: string;

  xp: number;

  recurrence: Recurrence;
};

const QUESTS_KEY = "dailyquest-quest-rules";

const XP_KEY = "dailyquest-total-xp";

const XP_PER_LEVEL = 100;

function dateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentWeek(): WeekDay[] {
  const today = new Date();

  const monday = new Date(
    today.getFullYear(),

    today.getMonth(),

    today.getDate(),
  );

  const dayNumber = monday.getDay();

  monday.setDate(monday.getDate() - (dayNumber === 0 ? 6 : dayNumber - 1));

  const names = [
    "Måndag",

    "Tisdag",

    "Onsdag",

    "Torsdag",

    "Fredag",

    "Lördag",

    "Söndag",
  ];

  return names.map((label, weekday) => {
    const date = new Date(monday);

    date.setDate(monday.getDate() + weekday);

    return {
      key: dateKey(date),

      label,

      date: date.toLocaleDateString("sv-SE", {
        day: "numeric",

        month: "short",
      }),

      weekday,
    };
  });
}

function loadQuests(): Quest[] {
  try {
    const saved = localStorage.getItem(QUESTS_KEY);

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is Quest =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.xp === "number" &&
        ["once", "daily", "every other day", "weekly"].includes(
          item.recurrence,
        ) &&
        typeof item.scheduledDate === "string" &&
        typeof item.weekday === "number" &&
        Array.isArray(item.completedDates),
    );
  } catch {
    return [];
  }
}

function loadXp(): number {
  try {
    const saved = localStorage.getItem(XP_KEY);

    const value = Number(saved);

    return saved !== null && Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function recurrenceLabel(recurrence: Recurrence) {
  if (recurrence === "daily") return "VARJE DAG";

  if (recurrence === "weekly") return "VARJE VECKA";

  if (recurrence === "every other day") return "VARANNAN DAG";

  return "ENGÅNGSUPPGIFT";
}

export default function HomeScreen() {
  const [week, setWeek] = useState(getCurrentWeek);

  const [quests, setQuests] = useState(loadQuests);

  const [totalXp, setTotalXp] = useState(loadXp);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  // Uppdatera veckans datum automatiskt om appen lämnas öppen över midnatt.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setWeek(getCurrentWeek());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Visa dagens kolumn först, följt av kommande dagar och sedan tidigare dagar.
  const todayWeekday = (new Date().getDay() + 6) % 7;
  const orderedWeek = [...week].sort((a, b) => {
    const aOrder = (a.weekday - todayWeekday + 7) % 7;
    const bOrder = (b.weekday - todayWeekday + 7) % 7;
    return aOrder - bOrder;
  });

  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;

  const xpInLevel = totalXp % XP_PER_LEVEL;

  function saveQuests(next: Quest[]) {
    setQuests(next);

    try {
      localStorage.setItem(QUESTS_KEY, JSON.stringify(next));
    } catch {
      console.warn("Kunde inte spara uppgifterna.");
    }
  }

  function saveXp(next: number) {
    setTotalXp(next);

    try {
      localStorage.setItem(XP_KEY, String(next));
    } catch {
      console.warn("Kunde inte spara XP.");
    }
  }

  useEffect(() => {
    try {
      localStorage.setItem(QUESTS_KEY, JSON.stringify(quests));
    } catch {
      console.warn("Kunde inte spara uppgifterna.");
    }
  }, [quests]);

  useEffect(() => {
    try {
      localStorage.setItem(XP_KEY, String(totalXp));
    } catch {
      console.warn("Kunde inte spara XP.");
    }
  }, [totalXp]);

  function updateDraft(dayKey: string, changes: Partial<Draft>) {
    setDrafts((current) => {
      const draft = current[dayKey] ?? {
        title: "",

        xp: 15,

        recurrence: "once",
      };

      return {
        ...current,

        [dayKey]: {
          ...draft,

          ...changes,
        },
      };
    });
  }

  function addQuest(event: FormEvent<HTMLFormElement>, day: WeekDay) {
    event.preventDefault();

    const draft = drafts[day.key] ?? {
      title: "",

      xp: 15,

      recurrence: "once" as Recurrence,
    };

    const title = draft.title.trim();

    if (!title) return;

    const quest: Quest = {
      id: crypto.randomUUID(),

      title,

      xp: Math.min(100, Math.max(5, Number(draft.xp) || 15)),

      recurrence: draft.recurrence,

      scheduledDate: day.key,

      weekday: day.weekday,

      completedDates: [],
    };

    saveQuests([...quests, quest]);

    setDrafts((current) => ({
      ...current,

      [day.key]: {
        title: "",

        xp: 15,

        recurrence: "once",
      },
    }));
  }

  function getDayQuests(day: WeekDay) {
    return quests.filter((quest) => {
      if (quest.recurrence === "once") {
        return quest.scheduledDate === day.key;
      }

      if (quest.recurrence === "daily") {
        return true;
      }

      if (quest.recurrence === "every other day") {
        const startDate = new Date(`${quest.scheduledDate}T12:00:00`);

        const currentDate = new Date(`${day.key}T12:00:00`);

        const difference = Math.round(
          (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        return difference >= 0 && difference % 2 === 0;
      }

      return quest.weekday === day.weekday;
    });
  }

  function toggleQuest(quest: Quest, day: WeekDay) {
    const isCompleted = quest.completedDates.includes(day.key);

    const updated = quests.map((item) => {
      if (item.id !== quest.id) return item;

      return {
        ...item,
        completedDates: isCompleted
          ? item.completedDates.filter(
              (completedDate) => completedDate !== day.key,
            )
          : [...item.completedDates, day.key],
      };
    });

    saveQuests(updated);

    // Att ångra en markering tar tillbaka XP som uppgiften gav.
    saveXp(Math.max(0, totalXp + (isCompleted ? -quest.xp : quest.xp)));
  }

  function editQuest(quest: Quest) {
    const titleInput = window.prompt("Ändra uppgiftens namn:", quest.title);

    if (titleInput === null) return;

    const title = titleInput.trim();

    if (!title) {
      window.alert("Uppgiften behöver ha ett namn.");

      return;
    }

    const xpInput = window.prompt(
      "Hur många XP ska uppgiften ge? (5–100)",

      String(quest.xp),
    );

    if (xpInput === null) return;

    const xp = Number(xpInput);

    if (!Number.isFinite(xp) || xp < 5 || xp > 100) {
      window.alert("Ange ett tal mellan 5 och 100.");

      return;
    }

    saveQuests(
      quests.map((item) =>
        item.id === quest.id ? { ...item, title, xp } : item,
      ),
    );
  }

  function changeRecurrence(quest: Quest) {
    const options: Recurrence[] = ["once", "daily", "weekly"];

    const selected = window.prompt(
      "Välj återkomst:\n1 = Engångsuppgift\n2 = Varje dag\n3 = Varje vecka",

      String(options.indexOf(quest.recurrence) + 1),
    );

    if (selected === null) return;

    const recurrence = options[Number(selected) - 1];

    if (!recurrence) {
      window.alert("Välj 1, 2 eller 3.");

      return;
    }

    const updated = quests.map((item) =>
      item.id === quest.id ? { ...item, recurrence } : item,
    );

    saveQuests(updated);
  }

  function deleteQuest(quest: Quest) {
    const confirmed = window.confirm(
      `Vill du ta bort "${quest.title}" och dess framtida upprepningar?`,
    );

    if (!confirmed) return;

    // Redan intjänad XP behålls även när en uppgift tas bort.

    saveQuests(quests.filter((item) => item.id !== quest.id));
  }

  const allOccurrences = week.flatMap((day) =>
    getDayQuests(day).map((quest) => ({
      quest,

      day,

      completed: quest.completedDates.includes(day.key),
    })),
  );

  const completedCount = allOccurrences.filter((item) => item.completed).length;

  const progress = allOccurrences.length
    ? (completedCount / allOccurrences.length) * 100
    : 0;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="DailyQuest startsida">
          <span className="brand-icon">DQ</span>

          <span>
            <strong>DailyQuest</strong>

            <small>LEVEL UP YOUR LIFE</small>
          </span>
        </a>

        <div className="nav-label">MENY</div>

        <nav className="navigation" aria-label="Huvudmeny">
          <a className="nav-item active" href="#home">
            <span>⌂</span> Min vecka
          </a>

          <a className="nav-item" href="#quests">
            <span>⚔</span> Uppdrag
          </a>

          <a className="nav-item" href="#progress">
            <span>▥</span> Mina framsteg
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="side-status">
            <span className="status-dot" />

            <span>Du gör framsteg</span>
          </div>

          <p>Varje steg räknas.</p>
        </div>
      </aside>

      <section className="main-content" id="home">
        <header className="topbar">
          <div>
            <p className="eyebrow">DIN PERSONLIGA DASHBOARD</p>

            <h1>
              Nu kör vi. <span>🎮</span>
            </h1>

            <p className="topbar-subtitle">Små uppdrag. Riktiga framsteg.</p>
          </div>

          <div className="level-badge">
            <div className="level-icon">✦</div>

            <div>
              <span>DIN NIVÅ</span>

              <strong>LEVEL {level}</strong>
            </div>
          </div>
        </header>

        <section className="hero-card" id="progress">
          <div className="hero-glow" />

          <div className="hero-content">
            <span className="hero-tag">
              <span className="live-dot" /> DIN RESA FORTSÄTTER
            </span>

            <h2>
              Bygg din streak.
              <br />
              Levla upp i vardagen.
            </h2>

            <p>
              Varje uppdrag du klarar tar dig ett steg framåt. Du bestämmer
              takten.
            </p>

            <div className="xp-heading">
              <span>LEVEL {level}</span>

              <span>
                {xpInLevel} / {XP_PER_LEVEL} XP
              </span>
            </div>

            <div
              className="xp-track"
              role="progressbar"
              aria-label="Framsteg till nästa level"
              aria-valuenow={xpInLevel}
              aria-valuemin={0}
              aria-valuemax={XP_PER_LEVEL}
            >
              <div className="xp-fill" style={{ width: `${xpInLevel}%` }} />
            </div>

            <p className="xp-caption">
              {XP_PER_LEVEL - xpInLevel} XP till nästa level
            </p>
          </div>

          <div className="hero-emblem" aria-hidden="true">
            <div className="emblem-ring">
              <div className="emblem-core">⚡</div>
            </div>

            <span className="emblem-label">KEEP GOING</span>
          </div>
        </section>

        <section className="stats-grid" aria-label="Veckans statistik">
          <article className="stat-card">
            <div className="stat-icon blue">⚔</div>

            <div>
              <span>VECKANS TILLFÄLLEN</span>

              <strong>{allOccurrences.length}</strong>

              <small>Återkommande och enstaka</small>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon green">✓</div>

            <div>
              <span>AVKLARADE</span>

              <strong>
                {completedCount} <small>/ {allOccurrences.length}</small>
              </strong>

              <small>Du är på gång!</small>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon purple">✦</div>

            <div>
              <span>INSAMLADE XP</span>

              <strong>{totalXp}</strong>

              <small>Erfarenhetspoäng totalt</small>
            </div>
          </article>
        </section>

        <section className="quests-section" id="quests">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PLANERA DIN VARDAG</p>

              <h2>Veckans uppdrag</h2>
            </div>

            <span className="quest-count">
              {completedCount} av {allOccurrences.length} klara
            </span>
          </div>

          <div className="daily-progress">
            <div
              className="daily-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="week-instructions">
            Lägg till egna uppgifter. Välj om de ska ske en gång, varje dag
            eller samma veckodag varje vecka.
          </p>

          <div className="week-board">
            {orderedWeek.map((day) => {
              const draft = drafts[day.key] ?? {
                title: "",

                xp: 15,

                recurrence: "once" as Recurrence,
              };

              const dayQuests = getDayQuests(day);

              const dayCompleted = dayQuests.filter((quest) =>
                quest.completedDates.includes(day.key),
              ).length;

              return (
                <section className="week-day" key={day.key}>
                  <header className="week-day-header">
                    <div>
                      <h3>{day.label}</h3>

                      <span>{day.date}</span>
                    </div>

                    <span className="day-count">
                      {dayCompleted}/{dayQuests.length}
                    </span>
                  </header>

                  <div className="day-quests">
                    {dayQuests.map((quest) => {
                      const completed = quest.completedDates.includes(day.key);

                      return (
                        <article
                          className={`day-quest ${completed ? "done" : ""}`}
                          key={quest.id}
                        >
                          <div className="day-quest-title">
                            <span className="day-quest-marker">
                              {completed ? "✓" : "○"}
                            </span>

                            <span>{quest.title}</span>
                          </div>

                          <span className="recurrence-label">
                            {recurrenceLabel(quest.recurrence)}
                          </span>

                          <div className="day-quest-footer">
                            <span className="day-quest-xp">+{quest.xp} XP</span>

                            <button
                              className="day-complete-button"
                              onClick={() => toggleQuest(quest, day)}
                              aria-label={
                                completed
                                  ? `Ångra avklarad uppgift: ${quest.title}`
                                  : `Markera som klar: ${quest.title}`
                              }
                            >
                              {completed ? "Ångra" : "Klar"}
                            </button>

                            <button
                              className="day-delete-button"
                              onClick={() => editQuest(quest)}
                              title="Redigera namn och XP"
                              aria-label={`Redigera ${quest.title}`}
                            >
                              ✎
                            </button>

                            <button
                              className="day-delete-button"
                              onClick={() => changeRecurrence(quest)}
                              title="Ändra återkomst"
                              aria-label={`Ändra återkomst för ${quest.title}`}
                            >
                              ↻
                            </button>

                            <button
                              className="day-delete-button"
                              onClick={() => deleteQuest(quest)}
                              title="Ta bort uppgift"
                              aria-label={`Ta bort ${quest.title}`}
                            >
                              ×
                            </button>
                          </div>
                        </article>
                      );
                    })}

                    {dayQuests.length === 0 && (
                      <p className="empty-day">Inga uppdrag ännu.</p>
                    )}
                  </div>

                  <form
                    className="add-quest-form"
                    onSubmit={(event) => addQuest(event, day)}
                  >
                    <label htmlFor={`title-${day.key}`}>Ny uppgift</label>

                    <input
                      id={`title-${day.key}`}
                      value={draft.title}
                      onChange={(event) =>
                        updateDraft(day.key, { title: event.target.value })
                      }
                      placeholder="T.ex. vattna blommorna"
                      maxLength={80}
                      required
                    />

                    <label htmlFor={`recurrence-${day.key}`}>Återkomst</label>

                    <select
                      id={`recurrence-${day.key}`}
                      value={draft.recurrence}
                      onChange={(event) =>
                        updateDraft(day.key, {
                          recurrence: event.target.value as Recurrence,
                        })
                      }
                    >
                      <option value="once">En gång</option>

                      <option value="daily">Varje dag</option>

                      <option value="every other day">Varannan dag</option>

                      <option value="weekly">Varje vecka, samma dag</option>
                    </select>

                    <label htmlFor={`xp-${day.key}`}>XP-belöning</label>

                    <select
                      id={`xp-${day.key}`}
                      value={draft.xp}
                      onChange={(event) =>
                        updateDraft(day.key, { xp: Number(event.target.value) })
                      }
                    >
                      <option value={5}>5 XP · Snabbt</option>

                      <option value={10}>10 XP · Litet</option>

                      <option value={15}>15 XP · Lagom</option>

                      <option value={25}>25 XP · Utmaning</option>

                      <option value={50}>50 XP · Stort uppdrag</option>
                    </select>

                    <button className="add-quest-button" type="submit">
                      ＋ Lägg till
                    </button>
                  </form>
                </section>
              );
            })}
          </div>

          {allOccurrences.length > 0 &&
            completedCount === allOccurrences.length && (
              <div className="all-done">
                <span>🏆</span>

                <div>
                  <strong>Snyggt jobbat!</strong>

                  <p>
                    Du har klarat alla veckans uppdrag. Var stolt över det du
                    gjort!
                  </p>
                </div>
              </div>
            )}
        </section>

        <footer className="app-footer">
          <span>DAILYQUEST</span>

          <span>En sak i taget. Du fixar det.</span>
        </footer>
      </section>
    </main>
  );
}
