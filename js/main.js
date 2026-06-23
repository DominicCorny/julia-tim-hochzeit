/* ================================================================
   ⚙️  KONFIGURATION  –  HIER DEN CODE EINTRAGEN
   ----------------------------------------------------------------
   Genau den 4-stelligen Code eintragen, den du an der Cryptex
   einstellst. Nur Ziffern, genau 4 Stück.
   Reihenfolge: 1. Ziffer = Elfmeter, 2. = Ski, 3. = Kochen, 4. = Polterabend
   (entspricht der Reihenfolge unten in GAME_ORDER).
   ================================================================ */
const CRYPTEX_CODE = "1234";

/* Reihenfolge der Spiele = Zuordnung zu den Code-Stellen (0..3) */
const GAME_ORDER = ["penalty", "ski", "cooking", "polter"];

/* Bonus-Spiele: erscheinen im Hub, zählen aber KEINE Code-Ziffer */
const BONUS_GAMES = ["rhythm"];

/* ================================================================
   Ab hier muss nichts mehr angepasst werden.
   ================================================================ */
(function () {
  "use strict";

  const DIGITS = String(CRYPTEX_CODE).padStart(4, "0").slice(0, 4).split("");
  const STORAGE_KEY = "jt_hochzeit_progress_v1";

  // ---- Fortschritt (localStorage) --------------------------------
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) { return new Set(); }
  }
  function saveProgress(set) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch (e) {}
  }
  let completed = loadProgress();

  // ---- Screens ----------------------------------------------------
  const screens = {
    start: document.getElementById("screen-start"),
    hub:   document.getElementById("screen-hub"),
    game:  document.getElementById("screen-game"),
    final: document.getElementById("screen-final"),
  };
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
    window.scrollTo(0, 0);
  }

  // ---- Gemeinsame Helfer für die Spiele (window.JT) --------------
  window.JT = {
    // Zeiger-Position in Canvas-Koordinaten umrechnen
    pos: function (canvas, evt) {
      const r = canvas.getBoundingClientRect();
      return {
        x: (evt.clientX - r.left) * (canvas.width / r.width),
        y: (evt.clientY - r.top) * (canvas.height / r.height),
      };
    },
    confetti: launchConfetti,
  };

  // ---- Hub bauen --------------------------------------------------
  const hubGrid = document.getElementById("hub-grid");
  const codeStrip = document.getElementById("code-strip");
  const revealBtn = document.getElementById("btn-reveal");

  function renderHub() {
    // Mini-Code-Streifen
    codeStrip.innerHTML = "";
    GAME_ORDER.forEach((id, i) => {
      const chip = document.createElement("div");
      const done = completed.has(id);
      chip.className = "code-chip" + (done ? "" : " empty");
      chip.textContent = done ? DIGITS[i] : "?";
      codeStrip.appendChild(chip);
    });

    // Spiel-Kacheln (4 Ziffern-Spiele + Bonus-Spiele)
    hubGrid.innerHTML = "";
    [].concat(GAME_ORDER, BONUS_GAMES).forEach(id => {
      const game = window.Games[id];
      if (!game) return;
      const done = completed.has(id);
      const isBonus = GAME_ORDER.indexOf(id) < 0;
      const tile = document.createElement("div");
      tile.className = "hub-tile" + (done ? " done" : "") + (isBonus ? " bonus" : "");
      tile.innerHTML =
        (isBonus ? '<div class="tile-bonus-badge">★ Bonus</div>' : "") +
        '<div class="tile-emoji">' + game.emoji + "</div>" +
        '<div class="tile-name">' + game.name + "</div>" +
        '<div class="tile-blurb">' + game.blurb + "</div>" +
        '<div class="tile-status">' + (done ? "✓ Geschafft – nochmal?" : "Spielen") + "</div>";
      tile.addEventListener("click", () => openGame(id));
      hubGrid.appendChild(tile);
    });

    // Enthüllen-Button nur, wenn alle vier geschafft
    const all = GAME_ORDER.every(id => completed.has(id));
    revealBtn.hidden = !all;
  }

  // ---- Einzelspiel öffnen / schließen ----------------------------
  const gameRoot = document.getElementById("game-root");
  const gameTitle = document.getElementById("game-title");
  let activeTeardown = null;
  let activeGameId = null;

  function openGame(id) {
    const game = window.Games[id];
    if (!game) return;
    activeGameId = id;
    gameTitle.textContent = game.emoji + " " + game.name;
    gameRoot.innerHTML = "";
    showScreen("game");
    // mount gibt eine Aufräum-Funktion zurück
    activeTeardown = game.mount(gameRoot, () => onGameWin(id)) || null;
  }

  function closeGame() {
    if (typeof activeTeardown === "function") {
      try { activeTeardown(); } catch (e) {}
    }
    activeTeardown = null;
    activeGameId = null;
    gameRoot.innerHTML = "";
  }

  function onGameWin(id) {
    const idx = GAME_ORDER.indexOf(id);
    completed.add(id);
    saveProgress(completed);
    closeGame();
    if (idx >= 0) showOverlay(idx);
    else showBonusOverlay();
  }

  // ---- Sieg-Overlay ----------------------------------------------
  const overlay = document.getElementById("overlay");
  const overlayDigit = document.getElementById("overlay-digit");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayEmoji = document.getElementById("overlay-emoji");
  const overlaySub = document.getElementById("overlay-sub");

  function showOverlay(idx) {
    overlayEmoji.textContent = "🎉";
    overlayTitle.textContent = "Gewonnen!";
    overlaySub.textContent = "Ihr habt eine Ziffer freigeschaltet:";
    overlayDigit.style.display = "";
    overlayDigit.textContent = DIGITS[idx];
    overlay.hidden = false;
    launchConfetti(2500);
  }

  function showBonusOverlay() {
    overlayEmoji.textContent = "🌟";
    overlayTitle.textContent = "Sternenregen!";
    overlaySub.textContent = "Bonus geschafft – einfach, weil ihr großartig seid! ⭐";
    overlayDigit.style.display = "none";
    overlay.hidden = false;
    launchConfetti(2500);
  }
  document.getElementById("overlay-continue").addEventListener("click", () => {
    overlay.hidden = true;
    renderHub();
    const all = GAME_ORDER.every(id => completed.has(id));
    showScreen("hub");
  });

  // ---- Finale / Code enthüllen -----------------------------------
  function openFinal() {
    showScreen("final");
    renderCode();
    launchConfetti(6000);
  }
  function renderCode() {
    const boxes = document.getElementById("code-boxes");
    boxes.innerHTML = "";
    DIGITS.forEach((d, i) => {
      const el = document.createElement("div");
      el.className = "digit";
      el.textContent = d;
      boxes.appendChild(el);
      setTimeout(() => el.classList.add("show"), 350 + i * 350);
    });
  }

  // ---- Buttons ----------------------------------------------------
  document.getElementById("btn-start").addEventListener("click", () => {
    renderHub();
    showScreen("hub");
  });
  document.getElementById("btn-back").addEventListener("click", () => {
    closeGame();
    renderHub();
    showScreen("hub");
  });
  revealBtn.addEventListener("click", openFinal);
  document.getElementById("btn-final-back").addEventListener("click", () => {
    renderHub();
    showScreen("hub");
  });
  document.getElementById("reset-link").addEventListener("click", () => {
    if (confirm("Den gesamten Fortschritt zurücksetzen?")) {
      completed = new Set();
      saveProgress(completed);
      renderHub();
    }
  });

  // ================================================================
  // Konfetti (leichtgewichtig, ohne Bibliothek)
  // ================================================================
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  let confettiRAF = null;

  function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function launchConfetti(durationMs) {
    const duration = durationMs || 5000;
    const colors = ["#b03052", "#c9a227", "#e8d28a", "#ff7aa2", "#ffffff"];
    const pieces = [];
    for (let i = 0; i < 130; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height,
        r: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: -1.5 + Math.random() * 3,
        vy: 2 + Math.random() * 3.5,
        rot: Math.random() * Math.PI,
        vrot: -0.1 + Math.random() * 0.2,
      });
    }
    if (confettiRAF) cancelAnimationFrame(confettiRAF);
    const start = performance.now();
    (function frame(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      if (now - start < duration) confettiRAF = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })(start);
  }

  // ================================================================
  // Test-Hook (für automatisierte Tests / manuelles Durchspringen)
  // In der Browser-Konsole: JTdebug.win('penalty')  /  JTdebug.winAll()
  // ================================================================
  window.JTdebug = {
    win: function (id) { if (window.Games[id]) onGameWin(id); },
    winAll: function () {
      GAME_ORDER.forEach(id => completed.add(id));
      saveProgress(completed);
      renderHub();
    },
    reset: function () { completed = new Set(); saveProgress(completed); renderHub(); },
    state: function () { return [...completed]; },
  };
})();
