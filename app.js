(() => {
  "use strict";

  const WEEKS_PER_YEAR = 52;
  const FULL_MOONS_PER_YEAR = 12.37;
  const STORAGE_KEY = "life-weeks-v1";

  const $ = (id) => document.getElementById(id);

  const el = {
    birthday: $("birthday"),
    expectancy: $("expectancy"),
    expectLabel: $("expectLabel"),
    statsPanel: $("statsPanel"),
    gridPanel: $("gridPanel"),
    remainsPanel: $("remainsPanel"),
    sharePanel: $("sharePanel"),
    livedWeeks: $("livedWeeks"),
    remainWeeks: $("remainWeeks"),
    lifePct: $("lifePct"),
    ageLine: $("ageLine"),
    weekGrid: $("weekGrid"),
    remainCards: $("remainCards"),
    customLabel: $("customLabel"),
    customCount: $("customCount"),
    shareBtn: $("shareBtn"),
    sharePreview: $("sharePreview"),
    shareImg: $("shareImg"),
    shareDownload: $("shareDownload"),
    themeToggle: $("themeToggle"),
  };

  const CARD_DEFS = [
    { key: "cny", label: "農曆新年", perYear: 1, unit: "次" },
    { key: "sakura", label: "櫻花季", perYear: 1, unit: "次" },
    { key: "bday", label: "生日", perYear: 1, unit: "次" },
    { key: "weekend", label: "週末", perYear: 52, unit: "個" },
    { key: "moon", label: "滿月", perYear: FULL_MOONS_PER_YEAR, unit: "次" },
  ];

  function todayLocal() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function parseDateInput(value) {
    if (!value) return null;
    const [y, m, day] = value.split("-").map(Number);
    if (!y || !m || !day) return null;
    const d = new Date(y, m - 1, day);
    if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null;
    return d;
  }

  function daysBetween(a, b) {
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / 86400000);
  }

  function ageYearsExact(birthday, now) {
    let years = now.getFullYear() - birthday.getFullYear();
    const m = now.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) years -= 1;
    return years;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }

  function saveState(partial) {
    const next = { ...loadState(), ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* ignore quota */ }
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
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    el.birthday.max = `${y}-${m}-${d}`;
    el.birthday.min = "1900-01-01";
  }

  function compute(birthday, expectancyYears) {
    const now = todayLocal();
    if (birthday > now) return null;

    const totalWeeks = expectancyYears * WEEKS_PER_YEAR;
    const livedDays = Math.max(0, daysBetween(birthday, now));
    let livedWeeks = Math.floor(livedDays / 7);
    if (livedWeeks >= totalWeeks) livedWeeks = totalWeeks;
    const remainWeeks = Math.max(0, totalWeeks - livedWeeks);
    const pct = totalWeeks > 0 ? (livedWeeks / totalWeeks) * 100 : 0;

    const ageY = ageYearsExact(birthday, now);
    // Remaining years: from now until birthday + expectancy
    const endDate = new Date(
      birthday.getFullYear() + expectancyYears,
      birthday.getMonth(),
      birthday.getDate()
    );
    const remainDays = Math.max(0, daysBetween(now, endDate));
    const remainYears = remainDays / 365.2425;

    return {
      livedWeeks,
      remainWeeks,
      totalWeeks,
      pct,
      ageY,
      remainYears,
      currentIndex: Math.min(livedWeeks, totalWeeks - 1),
    };
  }

  function formatInt(n) {
    return Math.round(n).toLocaleString("zh-TW");
  }

  function renderGrid(data) {
    const frag = document.createDocumentFragment();
    // Prefer DOM batch: create via string for speed on large grids
    const parts = new Array(data.totalWeeks);
    for (let i = 0; i < data.totalWeeks; i++) {
      let cls = "week-cell";
      if (i < data.livedWeeks) cls += " lived";
      else if (i === data.livedWeeks && data.remainWeeks > 0) cls += " now";
      else if (i === data.totalWeeks - 1 && data.remainWeeks === 0) cls += " now";
      parts[i] = `<div class="${cls}"></div>`;
    }
    el.weekGrid.innerHTML = parts.join("");
    el.weekGrid.setAttribute(
      "aria-label",
      `人生週格圖：共 ${data.totalWeeks} 週，已過 ${data.livedWeeks} 週，剩餘約 ${data.remainWeeks} 週`
    );
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

  function render() {
    const birthday = parseDateInput(el.birthday.value);
    const expectancy = Number(el.expectancy.value) || 80;
    el.expectLabel.textContent = String(expectancy);

    if (!birthday) {
      el.statsPanel.hidden = true;
      el.gridPanel.hidden = true;
      el.remainsPanel.hidden = true;
      el.sharePanel.hidden = true;
      return;
    }

    const data = compute(birthday, expectancy);
    if (!data) {
      el.statsPanel.hidden = true;
      el.gridPanel.hidden = true;
      el.remainsPanel.hidden = true;
      el.sharePanel.hidden = true;
      return;
    }

    el.statsPanel.hidden = false;
    el.gridPanel.hidden = false;
    el.remainsPanel.hidden = false;
    el.sharePanel.hidden = false;

    el.livedWeeks.textContent = formatInt(data.livedWeeks);
    el.remainWeeks.textContent = formatInt(data.remainWeeks);
    el.lifePct.textContent = `${data.pct.toFixed(1)}%`;
    el.ageLine.textContent = `你大約 ${data.ageY} 歲 · 以 ${expectancy} 歲估算，人生已走完 ${data.pct.toFixed(1)}%`;

    renderGrid(data);
    renderCards(data.remainYears);
    updateCustom(data.remainYears);

    // Clear previous share preview when inputs change
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
    };
  }

  function generateShareImage() {
    const birthday = parseDateInput(el.birthday.value);
    const expectancy = Number(el.expectancy.value) || 80;
    if (!birthday) return;
    const data = compute(birthday, expectancy);
    if (!data) return;

    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const c = getThemeColors();

    // Background
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    // Soft glow
    const grad = ctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, W * 0.7);
    grad.addColorStop(0, "rgba(196,164,132,0.22)");
    grad.addColorStop(1, "rgba(196,164,132,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Brand
    ctx.fillStyle = c.muted;
    ctx.font = "500 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("存點日子", W / 2, 72);

    // Title
    ctx.fillStyle = c.ink;
    ctx.font = "700 72px sans-serif";
    ctx.fillText("人生倒數", W / 2, 160);

    // Key line
    const keyLine = `還剩約 ${formatInt(data.remainWeeks)} 週`;
    ctx.fillStyle = c.accent;
    ctx.font = "600 48px sans-serif";
    ctx.fillText(keyLine, W / 2, 230);

    ctx.fillStyle = c.soft;
    ctx.font = "400 30px sans-serif";
    ctx.fillText(
      `已活過 ${formatInt(data.livedWeeks)} 週 · ${data.pct.toFixed(1)}%`,
      W / 2,
      280
    );

    // Grid card
    const padX = 72;
    const gridTop = 330;
    const gridBottom = 980;
    const cardH = gridBottom - gridTop;
    roundRect(ctx, padX, gridTop, W - padX * 2, cardH, 28);
    ctx.fillStyle = c.card;
    ctx.fill();
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw weeks
    const cols = 52;
    const rows = expectancy;
    const innerPad = 36;
    const areaW = W - padX * 2 - innerPad * 2;
    const areaH = cardH - innerPad * 2 - 20;
    const gap = 2.2;
    const cellW = (areaW - gap * (cols - 1)) / cols;
    const cellH = (areaH - gap * (rows - 1)) / rows;
    const cell = Math.min(cellW, cellH);
    const gridW = cols * cell + (cols - 1) * gap;
    const gridH = rows * cell + (rows - 1) * gap;
    const ox = (W - gridW) / 2;
    const oy = gridTop + innerPad + (areaH - gridH) / 2;

    for (let i = 0; i < data.totalWeeks; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = ox + col * (cell + gap);
      const y = oy + row * (cell + gap);
      if (i < data.livedWeeks) ctx.fillStyle = c.lived;
      else if (i === data.livedWeeks && data.remainWeeks > 0) ctx.fillStyle = c.now;
      else if (i === data.totalWeeks - 1 && data.remainWeeks === 0) ctx.fillStyle = c.now;
      else ctx.fillStyle = c.remain;
      const r = Math.max(0.8, cell * 0.22);
      roundRect(ctx, x, y, cell, cell, r);
      ctx.fill();
    }

    // Poignant line from custom or default
    const customText = (el.customLabel.value || "").trim() || "陪爸媽吃幾次年夜飯";
    const customN = Math.max(0, Math.floor(data.remainYears));
    const poignant = `還能${customText} 約 ${formatInt(customN)} 次`;

    ctx.fillStyle = c.ink;
    ctx.font = "500 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(poignant, W / 2, 1080);

    // Extra remaining highlights
    const cny = Math.max(0, Math.floor(data.remainYears));
    const weekends = Math.max(0, Math.floor(data.remainYears * 52));
    ctx.fillStyle = c.soft;
    ctx.font = "400 26px sans-serif";
    ctx.fillText(
      `農曆新年 ${formatInt(cny)} 次 · 週末 ${formatInt(weekends)} 個 · 滿月 ${formatInt(Math.floor(data.remainYears * FULL_MOONS_PER_YEAR))} 次`,
      W / 2,
      1135
    );

    // Footer
    ctx.fillStyle = c.muted;
    ctx.font = "400 24px sans-serif";
    ctx.fillText("一週一格 · 珍惜現在", W / 2, 1235);
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

  // Events
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

  el.shareBtn.addEventListener("click", () => {
    generateShareImage();
  });

  // Init
  setDateMax();
  initTheme();
  const state = loadState();
  if (state.birthday) el.birthday.value = state.birthday;
  if (state.expectancy && state.expectancy >= 70 && state.expectancy <= 90) {
    el.expectancy.value = String(state.expectancy);
  }
  if (typeof state.customLabel === "string") {
    el.customLabel.value = state.customLabel;
  } else {
    el.customLabel.placeholder = "陪爸媽吃幾次年夜飯";
  }
  el.expectLabel.textContent = el.expectancy.value;
  render();

  // Expose for tests
  window.__lifeWeeks = {
    render,
    generateShareImage,
    compute,
    parseDateInput,
  };
})();
