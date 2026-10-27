(() => {
  "use strict";

  const WEEKS_PER_YEAR = 52;
  const FULL_MOONS_PER_YEAR = 12.37;
  const STORAGE_KEY = "life-weeks-v1";
  const VIEWS = ["year", "month", "week", "day"];
  const VIEW_LABELS = { year: "年", month: "月", week: "週", day: "日" };

  const $ = (id) => document.getElementById(id);

  const el = {
    birthday: $("birthday"),
    expectancy: $("expectancy"),
    expectLabel: $("expectLabel"),
    bdayReminder: $("bdayReminder"),
    statsPanel: $("statsPanel"),
    tickPanel: $("tickPanel"),
    gridPanel: $("gridPanel"),
    weekNotePanel: $("weekNotePanel"),
    milestonesPanel: $("milestonesPanel"),
    goalsPanel: $("goalsPanel"),
    phasesPanel: $("phasesPanel"),
    remainsPanel: $("remainsPanel"),
    sharePanel: $("sharePanel"),
    livedCount: $("livedCount"),
    remainCount: $("remainCount"),
    livedLabel: $("livedLabel"),
    remainLabel: $("remainLabel"),
    lifePct: $("lifePct"),
    ageLine: $("ageLine"),
    lifeGrid: $("lifeGrid"),
    gridFoot: $("gridFoot"),
    phaseLegend: $("phaseLegend"),
    cellDetail: $("cellDetail"),
    cellDetailTitle: $("cellDetailTitle"),
    cellDetailRange: $("cellDetailRange"),
    cellDetailList: $("cellDetailList"),
    cellDetailNote: $("cellDetailNote"),
    cellDetailClose: $("cellDetailClose"),
    weekNote: $("weekNote"),
    weekNoteRange: $("weekNoteRange"),
    eventList: $("eventList"),
    eventEmpty: $("eventEmpty"),
    goalList: $("goalList"),
    goalEmpty: $("goalEmpty"),
    remainCards: $("remainCards"),
    customLabel: $("customLabel"),
    customCount: $("customCount"),
    shareBtn: $("shareBtn"),
    sharePreview: $("sharePreview"),
    shareImg: $("shareImg"),
    shareDownload: $("shareDownload"),
    themeToggle: $("themeToggle"),
    dataBtn: $("dataBtn"),
    tickSeconds: $("tickSeconds"),
    tickMinutes: $("tickMinutes"),
    tickHours: $("tickHours"),
    yearRemainText: $("yearRemainText"),
    monthRemainText: $("monthRemainText"),
    weekRemainText: $("weekRemainText"),
    yearBar: $("yearBar"),
    monthBar: $("monthBar"),
    weekBar: $("weekBar"),
    phaseChildEnd: $("phaseChildEnd"),
    phaseSchoolEnd: $("phaseSchoolEnd"),
    phaseWorkEnd: $("phaseWorkEnd"),
    addEventBtn: $("addEventBtn"),
    addGoalBtn: $("addGoalBtn"),
    eventDialog: $("eventDialog"),
    eventForm: $("eventForm"),
    eventDialogTitle: $("eventDialogTitle"),
    eventDate: $("eventDate"),
    eventTitle: $("eventTitle"),
    eventEmoji: $("eventEmoji"),
    eventEditId: $("eventEditId"),
    eventCancel: $("eventCancel"),
    goalDialog: $("goalDialog"),
    goalForm: $("goalForm"),
    goalDialogTitle: $("goalDialogTitle"),
    goalDate: $("goalDate"),
    goalTitle: $("goalTitle"),
    goalEditId: $("goalEditId"),
    goalCancel: $("goalCancel"),
    dataDialog: $("dataDialog"),
    exportBtn: $("exportBtn"),
    importFile: $("importFile"),
    dataClose: $("dataClose"),
  };

  const CARD_DEFS = [
    { key: "cny", label: "農曆新年", perYear: 1, unit: "次" },
    { key: "sakura", label: "櫻花季", perYear: 1, unit: "次" },
    { key: "bday", label: "生日", perYear: 1, unit: "次" },
    { key: "weekend", label: "週末", perYear: 52, unit: "個" },
    { key: "moon", label: "滿月", perYear: FULL_MOONS_PER_YEAR, unit: "次" },
  ];

  let currentView = "week";
  let shareView = "week";
  let tickTimer = null;
  let lastCells = [];

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function todayLocal() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function nowExact() {
    return new Date();
  }

  function parseDateInput(value) {
    if (!value) return null;
    const [y, m, day] = value.split("-").map(Number);
    if (!y || !m || !day) return null;
    const d = new Date(y, m - 1, day);
    if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null;
    return d;
  }

  function formatDateISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatDateTW(d) {
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  function daysBetween(a, b) {
    const ms =
      Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    return Math.floor(ms / 86400000);
  }

  function ageYearsExact(birthday, now) {
    let years = now.getFullYear() - birthday.getFullYear();
    const m = now.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) years -= 1;
    return years;
  }

  function startOfWeek(d) {
    // Monday as start (Taiwan common)
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
  }

  function addDays(d, n) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }

  function daysInMonth(y, m0) {
    return new Date(y, m0 + 1, 0).getDate();
  }

  function defaultState() {
    return {
      birthday: "",
      expectancy: 80,
      customLabel: "",
      theme: null,
      view: "week",
      shareView: "week",
      events: [],
      goals: [],
      weekNotes: {},
      phases: { childEnd: 12, schoolEnd: 22, workEnd: 65 },
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw) || {};
      return { ...defaultState(), ...parsed, phases: { ...defaultState().phases, ...(parsed.phases || {}) } };
    } catch {
      return defaultState();
    }
  }

  function saveState(partial) {
    const next = { ...loadState(), ...partial };
    if (partial && partial.phases) {
      next.phases = { ...loadState().phases, ...partial.phases };
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* ignore quota */ }
    return next;
  }

  function getState() {
    return loadState();
  }

  function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
    el.themeToggle.setAttribute(
      "aria-label",
      t === "dark" ? "切換成淺色模式" : "切換成深色模式"
    );
    saveState({ theme: t });
  }

  function initTheme() {
    const saved = loadState().theme;
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  function setDateMax() {
    const t = todayLocal();
    el.birthday.max = formatDateISO(t);
    el.birthday.min = "1900-01-01";
  }

  function formatInt(n) {
    return Math.round(n).toLocaleString("zh-TW");
  }

  function phaseForAge(age, phases) {
    if (age < phases.childEnd) return "child";
    if (age < phases.schoolEnd) return "school";
    if (age < phases.workEnd) return "work";
    return "retire";
  }

  function phaseClass(name) {
    return `phase-${name}`;
  }

  function phaseLabel(name) {
    return { child: "童年", school: "求學", work: "工作", retire: "退休" }[name] || name;
  }

  function compute(birthday, expectancyYears) {
    const now = todayLocal();
    if (birthday > now) return null;

    const endDate = new Date(
      birthday.getFullYear() + expectancyYears,
      birthday.getMonth(),
      birthday.getDate()
    );
    const livedDays = Math.max(0, daysBetween(birthday, now));
    const totalDays = Math.max(1, daysBetween(birthday, endDate));
    const remainDaysLife = Math.max(0, daysBetween(now, endDate));

    const totalWeeks = expectancyYears * WEEKS_PER_YEAR;
    let livedWeeks = Math.floor(livedDays / 7);
    if (livedWeeks >= totalWeeks) livedWeeks = totalWeeks;
    const remainWeeks = Math.max(0, totalWeeks - livedWeeks);

    const totalMonths = expectancyYears * 12;
    const livedMonths =
      (now.getFullYear() - birthday.getFullYear()) * 12 +
      (now.getMonth() - birthday.getMonth()) +
      (now.getDate() >= birthday.getDate() ? 0 : -1);
    const livedMonthsClamped = Math.max(0, Math.min(totalMonths, livedMonths));
    const remainMonths = Math.max(0, totalMonths - livedMonthsClamped);

    const livedYears = ageYearsExact(birthday, now);
    const remainYearsFloor = Math.max(0, expectancyYears - livedYears);
    const remainYears = remainDaysLife / 365.2425;
    const pct = totalWeeks > 0 ? (livedWeeks / totalWeeks) * 100 : 0;

    return {
      birthday,
      endDate,
      now,
      livedDays,
      totalDays,
      remainDaysLife,
      livedWeeks,
      remainWeeks,
      totalWeeks,
      livedMonths: livedMonthsClamped,
      remainMonths,
      totalMonths,
      livedYears,
      remainYearsFloor,
      remainYears,
      expectancyYears,
      pct,
      currentWeekIndex: Math.min(livedWeeks, Math.max(0, totalWeeks - 1)),
      currentMonthIndex: Math.min(livedMonthsClamped, Math.max(0, totalMonths - 1)),
      currentYearIndex: Math.min(livedYears, Math.max(0, expectancyYears - 1)),
    };
  }

  function cellRangeForIndex(data, view, index) {
    const b = data.birthday;
    if (view === "year") {
      const start = new Date(b.getFullYear() + index, b.getMonth(), b.getDate());
      const end = addDays(new Date(b.getFullYear() + index + 1, b.getMonth(), b.getDate()), -1);
      return { start, end, label: `${index}–${index + 1} 歲` };
    }
    if (view === "month") {
      const start = new Date(b.getFullYear(), b.getMonth() + index, b.getDate());
      const end = addDays(new Date(b.getFullYear(), b.getMonth() + index + 1, b.getDate()), -1);
      return {
        start,
        end,
        label: `${start.getFullYear()}年${start.getMonth() + 1}月`,
      };
    }
    if (view === "week") {
      const start = addDays(b, index * 7);
      const end = addDays(start, 6);
      return { start, end, label: `第 ${index + 1} 週` };
    }
    // day view: index is day-of-year 0-based for current calendar year
    const y = data.now.getFullYear();
    const start = new Date(y, 0, 1 + index);
    return { start, end: start, label: formatDateTW(start) };
  }

  function indexForDate(data, view, date) {
    const b = data.birthday;
    if (date < b) return -1;
    if (view === "year") {
      let age = date.getFullYear() - b.getFullYear();
      const m = date.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && date.getDate() < b.getDate())) age -= 1;
      return age;
    }
    if (view === "month") {
      return (
        (date.getFullYear() - b.getFullYear()) * 12 +
        (date.getMonth() - b.getMonth()) +
        (date.getDate() >= b.getDate() ? 0 : -1)
      );
    }
    if (view === "week") {
      return Math.floor(daysBetween(b, date) / 7);
    }
    // day
    if (date.getFullYear() !== data.now.getFullYear()) return -1;
    return daysBetween(new Date(data.now.getFullYear(), 0, 1), date);
  }

  function weekKeyForDate(date) {
    const s = startOfWeek(date);
    return formatDateISO(s);
  }

  function currentWeekKey() {
    return weekKeyForDate(todayLocal());
  }

  function buildCells(data, view, state) {
    const phases = state.phases;
    const cells = [];

    if (view === "year") {
      const total = data.expectancyYears;
      for (let i = 0; i < total; i++) {
        const range = cellRangeForIndex(data, "year", i);
        const age = i;
        let status = "remain";
        if (i < data.livedYears) status = "lived";
        else if (i === data.livedYears) status = "now";
        cells.push({
          index: i,
          status,
          phase: phaseForAge(age, phases),
          range,
          view,
        });
      }
    } else if (view === "month") {
      const total = data.totalMonths;
      for (let i = 0; i < total; i++) {
        const range = cellRangeForIndex(data, "month", i);
        const ageApprox = Math.floor(i / 12);
        let status = "remain";
        if (i < data.livedMonths) status = "lived";
        else if (i === data.livedMonths) status = "now";
        cells.push({
          index: i,
          status,
          phase: phaseForAge(ageApprox, phases),
          range,
          view,
        });
      }
    } else if (view === "week") {
      for (let i = 0; i < data.totalWeeks; i++) {
        const range = cellRangeForIndex(data, "week", i);
        const ageApprox = Math.floor(i / WEEKS_PER_YEAR);
        let status = "remain";
        if (i < data.livedWeeks) status = "lived";
        else if (i === data.livedWeeks && data.remainWeeks > 0) status = "now";
        else if (i === data.totalWeeks - 1 && data.remainWeeks === 0) status = "now";
        cells.push({
          index: i,
          status,
          phase: phaseForAge(ageApprox, phases),
          range,
          view,
          weekKey: weekKeyForDate(range.start),
        });
      }
    } else {
      // day: current calendar year compact (approx 365/366 cells in rows of ~37)
      const y = data.now.getFullYear();
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      const total = isLeap ? 366 : 365;
      const yearStart = new Date(y, 0, 1);
      const todayIdx = daysBetween(yearStart, data.now);
      for (let i = 0; i < total; i++) {
        const start = new Date(y, 0, 1 + i);
        const age = ageYearsExact(data.birthday, start);
        let status = "remain";
        if (start < data.birthday) status = "remain";
        else if (i < todayIdx) status = "lived";
        else if (i === todayIdx) status = "now";
        if (start > data.endDate) status = "remain";
        cells.push({
          index: i,
          status: start < data.birthday ? "before" : status,
          phase: phaseForAge(Math.max(0, age), phases),
          range: { start, end: start, label: formatDateTW(start) },
          view,
        });
      }
    }

    // Attach events / goals
    const events = state.events || [];
    const goals = state.goals || [];
    for (const cell of cells) {
      cell.events = [];
      cell.goals = [];
      for (const ev of events) {
        const d = parseDateInput(ev.date);
        if (!d) continue;
        if (d >= cell.range.start && d <= cell.range.end) cell.events.push(ev);
      }
      for (const g of goals) {
        const d = parseDateInput(g.date);
        if (!d) continue;
        if (d >= cell.range.start && d <= cell.range.end) cell.goals.push(g);
      }
    }

    return cells;
  }

  function countsForView(data, view) {
    if (view === "year") {
      return {
        lived: data.livedYears,
        remain: data.remainYearsFloor,
        livedLabel: "已活過（年）",
        remainLabel: "還剩約（年）",
        foot: "每格一年 · 由左至右 · 點格子可看詳情",
      };
    }
    if (view === "month") {
      return {
        lived: data.livedMonths,
        remain: data.remainMonths,
        livedLabel: "已活過（月）",
        remainLabel: "還剩約（月）",
        foot: "每列 12 個月 · 由左至右 · 點格子可看詳情",
      };
    }
    if (view === "day") {
      const y = data.now.getFullYear();
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      const total = isLeap ? 366 : 365;
      const yearStart = new Date(y, 0, 1);
      const lived = Math.min(total, Math.max(0, daysBetween(yearStart, data.now)));
      return {
        lived,
        remain: Math.max(0, total - lived - 1),
        livedLabel: `${y} 已過（日）`,
        remainLabel: `${y} 還剩（日）`,
        foot: `顯示 ${y} 年每一天 · 點格子可看詳情`,
      };
    }
    return {
      lived: data.livedWeeks,
      remain: data.remainWeeks,
      livedLabel: "已活過（週）",
      remainLabel: "還剩約（週）",
      foot: "每列約一年 · 由左至右 · 由上而下 · 點格子可看詳情",
    };
  }

  function renderPhaseLegend(state) {
    const p = state.phases;
    el.phaseLegend.hidden = false;
    el.phaseLegend.innerHTML = `
      <span><i class="phase-swatch phase-child"></i>童年 0–${p.childEnd}</span>
      <span><i class="phase-swatch phase-school"></i>求學 –${p.schoolEnd}</span>
      <span><i class="phase-swatch phase-work"></i>工作 –${p.workEnd}</span>
      <span><i class="phase-swatch phase-retire"></i>退休</span>
      <span><i class="dot event"></i>里程碑</span>
      <span><i class="dot goal"></i>目標</span>
    `;
  }

  function renderGrid(data, state) {
    const cells = buildCells(data, currentView, state);
    lastCells = cells;
    el.lifeGrid.className = `life-grid view-${currentView}`;
    const parts = cells.map((c, idx) => {
      const classes = ["life-cell", `has-phase`, phaseClass(c.phase)];
      if (c.status === "lived") classes.push("lived");
      if (c.status === "now") classes.push("now");
      if (c.status === "before") classes.push("before");
      if (c.events.length) classes.push("has-event");
      if (c.goals.length) classes.push("has-goal");
      const title = `${c.range.label}${c.events.length ? " · " + c.events.map((e) => e.title).join("、") : ""}`;
      return `<button type="button" class="${classes.join(" ")}" data-idx="${idx}" title="${escapeAttr(title)}" aria-label="${escapeAttr(title)}"></button>`;
    });
    el.lifeGrid.innerHTML = parts.join("");
    const counts = countsForView(data, currentView);
    el.lifeGrid.setAttribute(
      "aria-label",
      `人生${VIEW_LABELS[currentView]}格圖：已過 ${counts.lived}，剩餘約 ${counts.remain}`
    );
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function showCellDetail(cell, state) {
    el.cellDetail.hidden = false;
    el.cellDetailTitle.textContent = cell.range.label;
    if (cell.range.start.getTime() === cell.range.end.getTime()) {
      el.cellDetailRange.textContent = formatDateTW(cell.range.start);
    } else {
      el.cellDetailRange.textContent = `${formatDateTW(cell.range.start)} – ${formatDateTW(cell.range.end)}`;
    }
    const items = [];
    for (const ev of cell.events) {
      items.push(`<li>${ev.emoji || "📍"} ${escapeHtml(ev.title)} <span class="item-meta">（${ev.date}）</span></li>`);
    }
    for (const g of cell.goals) {
      items.push(`<li>🎯 ${escapeHtml(g.title)} <span class="item-meta">（目標 ${g.date}）</span></li>`);
    }
    el.cellDetailList.innerHTML = items.length ? items.join("") : "<li style='border:0;color:var(--muted)'>這段時間還沒有標記</li>";

    // Week note if week view or overlapping week
    let note = "";
    if (cell.view === "week" && cell.weekKey) {
      note = (state.weekNotes && state.weekNotes[cell.weekKey]) || "";
    } else {
      const key = weekKeyForDate(cell.range.start);
      note = (state.weekNotes && state.weekNotes[key]) || "";
    }
    if (note) {
      el.cellDetailNote.hidden = false;
      el.cellDetailNote.textContent = `這週想做：${note}`;
    } else {
      el.cellDetailNote.hidden = true;
      el.cellDetailNote.textContent = "";
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderCards(remainYears) {
    el.remainCards.innerHTML = CARD_DEFS.map((def) => {
      const n = Math.max(0, Math.floor(remainYears * def.perYear));
      return `<article class="card"><span class="n">${formatInt(n)}</span><span class="t">${def.label}</span></article>`;
    }).join("");
  }

  function updateCustom(remainYears) {
    const n = Math.max(0, Math.floor(remainYears));
    el.customCount.textContent = formatInt(n);
  }

  function daysUntilNextBirthday(birthday, now) {
    let next = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate());
    if (next <= now) next = new Date(now.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
    return daysBetween(now, next);
  }

  function renderBirthdayReminder(birthday) {
    const now = todayLocal();
    const days = daysUntilNextBirthday(birthday, now);
    const ageNext = ageYearsExact(birthday, now) + 1;
    if (days === 0) {
      el.bdayReminder.hidden = false;
      el.bdayReminder.textContent = `🎂 今天是你的生日！祝你 ${ageYearsExact(birthday, now)} 歲生日快樂。`;
    } else {
      el.bdayReminder.hidden = false;
      el.bdayReminder.textContent = `下次生日（滿 ${ageNext} 歲）還有 ${days} 天。`;
    }
  }

  function renderEvents(state) {
    const events = [...(state.events || [])].sort((a, b) => a.date.localeCompare(b.date));
    el.eventEmpty.hidden = events.length > 0;
    el.eventList.innerHTML = events
      .map(
        (ev) => `<li class="item-card" data-id="${ev.id}">
        <span class="item-emoji">${ev.emoji || "📍"}</span>
        <div class="item-body">
          <p class="item-title">${escapeHtml(ev.title)}</p>
          <p class="item-meta">${ev.date}</p>
        </div>
        <div class="item-actions">
          <button type="button" data-action="edit-event" data-id="${ev.id}">編輯</button>
          <button type="button" data-action="del-event" data-id="${ev.id}">刪除</button>
        </div>
      </li>`
      )
      .join("");
  }

  function renderGoals(state, data) {
    const goals = [...(state.goals || [])].sort((a, b) => a.date.localeCompare(b.date));
    el.goalEmpty.hidden = goals.length > 0;
    const now = todayLocal();
    el.goalList.innerHTML = goals
      .map((g) => {
        const d = parseDateInput(g.date);
        let meta = g.date;
        if (d) {
          const left = daysBetween(now, d);
          if (left > 0) meta += ` · 還有 ${left} 天`;
          else if (left === 0) meta += " · 就是今天";
          else meta += ` · 已過 ${-left} 天`;
        }
        return `<li class="item-card" data-id="${g.id}">
        <span class="item-emoji">🎯</span>
        <div class="item-body">
          <p class="item-title">${escapeHtml(g.title)}</p>
          <p class="item-meta">${meta}</p>
        </div>
        <div class="item-actions">
          <button type="button" data-action="edit-goal" data-id="${g.id}">編輯</button>
          <button type="button" data-action="del-goal" data-id="${g.id}">刪除</button>
        </div>
      </li>`;
      })
      .join("");
  }

  function renderWeekNote(state) {
    const key = currentWeekKey();
    const s = startOfWeek(todayLocal());
    const e = addDays(s, 6);
    el.weekNoteRange.textContent = `本週 ${formatDateTW(s)} – ${formatDateTW(e)}`;
    el.weekNote.value = (state.weekNotes && state.weekNotes[key]) || "";
  }

  function setView(view) {
    if (!VIEWS.includes(view)) return;
    currentView = view;
    saveState({ view });
    document.querySelectorAll(".view-tab[data-view]").forEach((btn) => {
      const on = btn.getAttribute("data-view") === view;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    render();
  }

  function setShareView(view) {
    if (!["year", "month", "week"].includes(view)) return;
    shareView = view;
    saveState({ shareView: view });
    document.querySelectorAll(".share-view").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-share-view") === view);
    });
  }

  function updateTicks(birthday) {
    if (!birthday) return;
    const now = nowExact();
    const ms = Math.max(0, now.getTime() - birthday.getTime());
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(ms / 3600000);
    el.tickSeconds.textContent = formatInt(seconds);
    el.tickMinutes.textContent = formatInt(minutes);
    el.tickHours.textContent = formatInt(hours);

    // Year progress
    const yStart = new Date(now.getFullYear(), 0, 1);
    const yEnd = new Date(now.getFullYear() + 1, 0, 1);
    const yTotal = yEnd - yStart;
    const yDone = now - yStart;
    const yPct = Math.min(100, Math.max(0, (yDone / yTotal) * 100));
    const yLeftMs = Math.max(0, yEnd - now);
    el.yearBar.style.width = `${yPct.toFixed(2)}%`;
    el.yearRemainText.textContent = remainHuman(yLeftMs);

    // Month progress
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const mTotal = mEnd - mStart;
    const mDone = now - mStart;
    const mPct = Math.min(100, Math.max(0, (mDone / mTotal) * 100));
    el.monthBar.style.width = `${mPct.toFixed(2)}%`;
    el.monthRemainText.textContent = remainHuman(Math.max(0, mEnd - now));

    // Week progress (Mon-Sun)
    const wStart = startOfWeek(todayLocal());
    const wEnd = addDays(wStart, 7);
    const wStartMs = wStart.getTime();
    const wEndMs = wEnd.getTime();
    const wPct = Math.min(100, Math.max(0, ((now.getTime() - wStartMs) / (wEndMs - wStartMs)) * 100));
    el.weekBar.style.width = `${wPct.toFixed(2)}%`;
    el.weekRemainText.textContent = remainHuman(Math.max(0, wEndMs - now.getTime()));
  }

  function remainHuman(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `剩 ${d} 天 ${h} 時`;
    if (h > 0) return `剩 ${h} 時 ${m} 分`;
    return `剩 ${m} 分`;
  }

  function startTicker(birthday) {
    if (tickTimer) clearInterval(tickTimer);
    updateTicks(birthday);
    tickTimer = setInterval(() => updateTicks(birthday), 1000);
  }

  function stopTicker() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  }

  function render() {
    const state = getState();
    const birthday = parseDateInput(el.birthday.value);
    const expectancy = Number(el.expectancy.value) || 80;
    el.expectLabel.textContent = String(expectancy);

    const panels = [
      el.statsPanel,
      el.tickPanel,
      el.gridPanel,
      el.weekNotePanel,
      el.milestonesPanel,
      el.goalsPanel,
      el.phasesPanel,
      el.remainsPanel,
      el.sharePanel,
    ];

    if (!birthday) {
      panels.forEach((p) => (p.hidden = true));
      el.bdayReminder.hidden = true;
      el.cellDetail.hidden = true;
      stopTicker();
      return;
    }

    const data = compute(birthday, expectancy);
    if (!data) {
      panels.forEach((p) => (p.hidden = true));
      el.bdayReminder.hidden = true;
      stopTicker();
      return;
    }

    panels.forEach((p) => (p.hidden = false));

    const counts = countsForView(data, currentView);
    el.livedCount.textContent = formatInt(counts.lived);
    el.remainCount.textContent = formatInt(counts.remain);
    el.livedLabel.textContent = counts.livedLabel;
    el.remainLabel.textContent = counts.remainLabel;
    el.lifePct.textContent = `${data.pct.toFixed(1)}%`;
    el.ageLine.textContent = `你大約 ${data.livedYears} 歲 · 以 ${expectancy} 歲估算，人生已走完 ${data.pct.toFixed(1)}%`;
    el.gridFoot.textContent = counts.foot;

    renderBirthdayReminder(birthday);
    renderPhaseLegend(state);
    renderGrid(data, state);
    renderCards(data.remainYears);
    updateCustom(data.remainYears);
    renderEvents(state);
    renderGoals(state, data);
    renderWeekNote(state);
    startTicker(birthday);

    el.sharePreview.hidden = true;
    el.shareImg.removeAttribute("src");
  }

  function getThemeColors() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) {
      return {
        bg: "#1a1612",
        card: "#241e18",
        ink: "#f3ebe2",
        soft: "#c9b8a6",
        muted: "#8f7d6b",
        lived: "#b8956e",
        now: "#e07a5f",
        remain: "#2e2620",
        accent: "#d4b896",
        line: "#3a3028",
        event: "#7aa2f7",
        goal: "#e08ab0",
      };
    }
    return {
      bg: "#f7f1ea",
      card: "#fffdf9",
      ink: "#2c241c",
      soft: "#6b5d4e",
      muted: "#9a8774",
      lived: "#c4a484",
      now: "#d4654a",
      remain: "#ebe0d4",
      accent: "#9a7355",
      line: "#e6d8c8",
      event: "#5b8def",
      goal: "#c45d8a",
    };
  }

  function generateShareImage() {
    const birthday = parseDateInput(el.birthday.value);
    const expectancy = Number(el.expectancy.value) || 80;
    if (!birthday) return;
    const data = compute(birthday, expectancy);
    if (!data) return;
    const state = getState();
    const view = shareView;
    const cells = buildCells(data, view, state);
    const counts = countsForView(data, view);

    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const c = getThemeColors();

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, W * 0.7);
    grad.addColorStop(0, "rgba(196,164,132,0.22)");
    grad.addColorStop(1, "rgba(196,164,132,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = c.muted;
    ctx.font = "500 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("存點日子", W / 2, 72);

    ctx.fillStyle = c.ink;
    ctx.font = "700 72px sans-serif";
    ctx.fillText("人生倒數", W / 2, 160);

    const keyLine = `還剩約 ${formatInt(counts.remain)} ${VIEW_LABELS[view]}`;
    ctx.fillStyle = c.accent;
    ctx.font = "600 48px sans-serif";
    ctx.fillText(keyLine, W / 2, 230);

    ctx.fillStyle = c.soft;
    ctx.font = "400 30px sans-serif";
    ctx.fillText(
      `已活過 ${formatInt(counts.lived)} ${VIEW_LABELS[view]} · ${data.pct.toFixed(1)}% · ${VIEW_LABELS[view]}視圖`,
      W / 2,
      280
    );

    const padX = 72;
    const gridTop = 320;
    const gridBottom = 980;
    const cardH = gridBottom - gridTop;
    roundRect(ctx, padX, gridTop, W - padX * 2, cardH, 28);
    ctx.fillStyle = c.card;
    ctx.fill();
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    let cols = 52;
    if (view === "year") cols = 10;
    else if (view === "month") cols = 12;
    const rows = Math.ceil(cells.length / cols) || 1;
    const innerPad = 36;
    const areaW = W - padX * 2 - innerPad * 2;
    const areaH = cardH - innerPad * 2 - 20;
    const gap = view === "year" ? 5 : 2.2;
    const cellW = (areaW - gap * (cols - 1)) / cols;
    const cellH = (areaH - gap * (rows - 1)) / rows;
    const cell = Math.min(cellW, cellH);
    const gridW = cols * cell + (cols - 1) * gap;
    const gridH = rows * cell + (rows - 1) * gap;
    const ox = (W - gridW) / 2;
    const oy = gridTop + innerPad + (areaH - gridH) / 2;

    for (let i = 0; i < cells.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = ox + col * (cell + gap);
      const y = oy + row * (cell + gap);
      const cellData = cells[i];
      if (cellData.status === "lived") ctx.fillStyle = c.lived;
      else if (cellData.status === "now") ctx.fillStyle = c.now;
      else ctx.fillStyle = c.remain;
      const r = Math.max(0.8, cell * 0.22);
      roundRect(ctx, x, y, cell, cell, r);
      ctx.fill();
      if (cellData.events && cellData.events.length) {
        ctx.fillStyle = c.event;
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      if (cellData.goals && cellData.goals.length) {
        ctx.strokeStyle = c.goal;
        ctx.lineWidth = Math.max(1.5, cell * 0.12);
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.28, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const customText = (el.customLabel.value || "").trim() || "陪爸媽吃幾次年夜飯";
    const customN = Math.max(0, Math.floor(data.remainYears));
    const poignant = `還能${customText} 約 ${formatInt(customN)} 次`;

    ctx.fillStyle = c.ink;
    ctx.font = "500 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(poignant, W / 2, 1080);

    const cny = Math.max(0, Math.floor(data.remainYears));
    const weekends = Math.max(0, Math.floor(data.remainYears * 52));
    ctx.fillStyle = c.soft;
    ctx.font = "400 26px sans-serif";
    ctx.fillText(
      `農曆新年 ${formatInt(cny)} 次 · 週末 ${formatInt(weekends)} 個 · 滿月 ${formatInt(Math.floor(data.remainYears * FULL_MOONS_PER_YEAR))} 次`,
      W / 2,
      1135
    );

    ctx.fillStyle = c.muted;
    ctx.font = "400 24px sans-serif";
    ctx.fillText("一格一格 · 珍惜現在", W / 2, 1235);
    ctx.font = "600 26px sans-serif";
    ctx.fillStyle = c.soft;
    ctx.fillText("存點日子", W / 2, 1285);

    const url = canvas.toDataURL("image/png");
    el.shareImg.src = url;
    el.shareDownload.href = url;
    el.sharePreview.hidden = false;
    return url;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // ---- Events / Goals CRUD ----
  function openEventDialog(edit) {
    el.eventEditId.value = edit ? edit.id : "";
    el.eventDialogTitle.textContent = edit ? "編輯里程碑" : "新增里程碑";
    el.eventDate.value = edit ? edit.date : "";
    el.eventTitle.value = edit ? edit.title : "";
    el.eventEmoji.value = edit ? edit.emoji || "" : "";
    if (typeof el.eventDialog.showModal === "function") el.eventDialog.showModal();
    else el.eventDialog.setAttribute("open", "");
  }

  function openGoalDialog(edit) {
    el.goalEditId.value = edit ? edit.id : "";
    el.goalDialogTitle.textContent = edit ? "編輯目標" : "新增目標";
    el.goalDate.value = edit ? edit.date : "";
    el.goalTitle.value = edit ? edit.title : "";
    if (typeof el.goalDialog.showModal === "function") el.goalDialog.showModal();
    else el.goalDialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  // ---- Export / Import ----
  function exportJSON() {
    const state = getState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `人生倒數-備份-${formatDateISO(todayLocal())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object") throw new Error("格式錯誤");
        const merged = { ...defaultState(), ...data };
        if (!merged.phases) merged.phases = defaultState().phases;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        applyLoadedState(merged);
        closeDialog(el.dataDialog);
        render();
      } catch (e) {
        alert("無法匯入：檔案格式不正確。");
      }
    };
    reader.readAsText(file);
  }

  function applyLoadedState(state) {
    if (state.birthday) el.birthday.value = state.birthday;
    if (state.expectancy) el.expectancy.value = String(state.expectancy);
    if (typeof state.customLabel === "string") el.customLabel.value = state.customLabel;
    if (state.phases) {
      el.phaseChildEnd.value = state.phases.childEnd;
      el.phaseSchoolEnd.value = state.phases.schoolEnd;
      el.phaseWorkEnd.value = state.phases.workEnd;
    }
    if (state.theme) applyTheme(state.theme);
    if (state.view && VIEWS.includes(state.view)) {
      currentView = state.view;
      document.querySelectorAll(".view-tab[data-view]").forEach((btn) => {
        const on = btn.getAttribute("data-view") === currentView;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
    }
    if (state.shareView) setShareView(state.shareView);
  }

  // ---- Wire events ----
  el.themeToggle.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "dark" ? "light" : "dark");
  });

  el.birthday.addEventListener("change", () => {
    saveState({ birthday: el.birthday.value });
    render();
  });
  el.birthday.addEventListener("input", () => {
    saveState({ birthday: el.birthday.value });
    render();
  });

  el.expectancy.addEventListener("input", () => {
    saveState({ expectancy: Number(el.expectancy.value) });
    render();
  });

  el.customLabel.addEventListener("input", () => {
    saveState({ customLabel: el.customLabel.value });
    const birthday = parseDateInput(el.birthday.value);
    const expectancy = Number(el.expectancy.value) || 80;
    if (birthday) {
      const data = compute(birthday, expectancy);
      if (data) updateCustom(data.remainYears);
    }
  });

  document.querySelectorAll(".view-tab[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.getAttribute("data-view")));
  });

  document.querySelectorAll(".share-view").forEach((btn) => {
    btn.addEventListener("click", () => setShareView(btn.getAttribute("data-share-view")));
  });

  el.lifeGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".life-cell");
    if (!btn) return;
    const idx = Number(btn.getAttribute("data-idx"));
    const cell = lastCells[idx];
    if (!cell) return;
    showCellDetail(cell, getState());
  });

  el.cellDetailClose.addEventListener("click", () => {
    el.cellDetail.hidden = true;
  });

  el.weekNote.addEventListener("input", () => {
    const key = currentWeekKey();
    const state = getState();
    const weekNotes = { ...(state.weekNotes || {}), [key]: el.weekNote.value };
    if (!el.weekNote.value) delete weekNotes[key];
    saveState({ weekNotes });
  });

  ["phaseChildEnd", "phaseSchoolEnd", "phaseWorkEnd"].forEach((id) => {
    el[id].addEventListener("change", () => {
      let childEnd = Number(el.phaseChildEnd.value) || 12;
      let schoolEnd = Number(el.phaseSchoolEnd.value) || 22;
      let workEnd = Number(el.phaseWorkEnd.value) || 65;
      if (schoolEnd <= childEnd) schoolEnd = childEnd + 1;
      if (workEnd <= schoolEnd) workEnd = schoolEnd + 1;
      el.phaseChildEnd.value = childEnd;
      el.phaseSchoolEnd.value = schoolEnd;
      el.phaseWorkEnd.value = workEnd;
      saveState({ phases: { childEnd, schoolEnd, workEnd } });
      render();
    });
  });

  el.addEventBtn.addEventListener("click", () => openEventDialog(null));
  el.addGoalBtn.addEventListener("click", () => openGoalDialog(null));

  el.eventCancel.addEventListener("click", () => closeDialog(el.eventDialog));
  el.goalCancel.addEventListener("click", () => closeDialog(el.goalDialog));

  el.eventForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const state = getState();
    const events = [...(state.events || [])];
    const editId = el.eventEditId.value;
    const payload = {
      id: editId || uid(),
      date: el.eventDate.value,
      title: el.eventTitle.value.trim(),
      emoji: (el.eventEmoji.value || "").trim().slice(0, 4),
    };
    if (!payload.date || !payload.title) return;
    if (editId) {
      const i = events.findIndex((x) => x.id === editId);
      if (i >= 0) events[i] = payload;
      else events.push(payload);
    } else {
      events.push(payload);
    }
    saveState({ events });
    closeDialog(el.eventDialog);
    render();
  });

  el.goalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const state = getState();
    const goals = [...(state.goals || [])];
    const editId = el.goalEditId.value;
    const payload = {
      id: editId || uid(),
      date: el.goalDate.value,
      title: el.goalTitle.value.trim(),
    };
    if (!payload.date || !payload.title) return;
    if (editId) {
      const i = goals.findIndex((x) => x.id === editId);
      if (i >= 0) goals[i] = payload;
      else goals.push(payload);
    } else {
      goals.push(payload);
    }
    saveState({ goals });
    closeDialog(el.goalDialog);
    render();
  });

  el.eventList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const state = getState();
    if (btn.getAttribute("data-action") === "del-event") {
      saveState({ events: (state.events || []).filter((x) => x.id !== id) });
      render();
    } else if (btn.getAttribute("data-action") === "edit-event") {
      const ev = (state.events || []).find((x) => x.id === id);
      if (ev) openEventDialog(ev);
    }
  });

  el.goalList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const state = getState();
    if (btn.getAttribute("data-action") === "del-goal") {
      saveState({ goals: (state.goals || []).filter((x) => x.id !== id) });
      render();
    } else if (btn.getAttribute("data-action") === "edit-goal") {
      const g = (state.goals || []).find((x) => x.id === id);
      if (g) openGoalDialog(g);
    }
  });

  el.shareBtn.addEventListener("click", () => generateShareImage());

  el.dataBtn.addEventListener("click", () => {
    if (typeof el.dataDialog.showModal === "function") el.dataDialog.showModal();
    else el.dataDialog.setAttribute("open", "");
  });
  el.dataClose.addEventListener("click", () => closeDialog(el.dataDialog));
  el.exportBtn.addEventListener("click", exportJSON);
  el.importFile.addEventListener("change", () => {
    const f = el.importFile.files && el.importFile.files[0];
    if (f) importJSON(f);
    el.importFile.value = "";
  });

  // Init
  setDateMax();
  initTheme();
  const state = loadState();
  applyLoadedState(state);
  if (!el.customLabel.value) el.customLabel.placeholder = "陪爸媽吃幾次年夜飯";
  el.expectLabel.textContent = el.expectancy.value;
  render();

  window.__lifeWeeks = {
    render,
    generateShareImage,
    compute,
    parseDateInput,
    setView,
    getState,
    saveState,
    buildCells,
    currentView: () => currentView,
    shareView: () => shareView,
  };
})();
