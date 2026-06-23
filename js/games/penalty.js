/* ================================================================
   Spiel 1 · Elfmeter-Held  ⚽
   Tim ist Fußballfan. Wischen = Schussrichtung. 3 Tore gegen
   Torfrau Julia gewinnen das Spiel.
   ================================================================ */
window.Games = window.Games || {};
window.Games.penalty = {
  emoji: "⚽",
  name: "Elfmeter-Held",
  blurb: "Tim am Ball – 3 Tore gegen Torfrau Julia!",

  mount: function (root, onWin) {
    const W = 360, H = 600;
    const GOAL = { left: 80, right: 280, top: 70, line: 150 };
    const SPOT = { x: 180, y: 470 };
    const NEEDED = 3;

    // --- DOM ---
    root.innerHTML =
      '<div class="game-hud"><span>⚽ Tore: <b class="p-goals">0/' + NEEDED + '</b></span>' +
      '<span class="p-msg">&nbsp;</span></div>' +
      '<canvas class="game-canvas" width="' + W + '" height="' + H + '"></canvas>' +
      '<p class="game-instructions">Wisch über den Ball Richtung Tor – ziele in die Ecken!</p>';
    const canvas = root.querySelector(".game-canvas");
    const ctx = canvas.getContext("2d");
    const goalsEl = root.querySelector(".p-goals");
    const msgEl = root.querySelector(".p-msg");

    // --- Zustand ---
    let goals = 0;
    let state = "aim";          // aim | flying | result
    let ball = { x: SPOT.x, y: SPOT.y, r: 15 };
    let keeper = { x: 180, w: 56, dir: 1, dive: 180 };
    let flight = null;          // {t, dur, fromX, fromY, toX, kFrom, kTo}
    let resultUntil = 0;
    let resultText = "";
    let aim = null;             // {sx,sy,cx,cy} während Wischen
    let raf = null, last = 0, finished = false;

    const inGoalRange = x => Math.max(GOAL.left + 12, Math.min(GOAL.right - 12, x));

    // --- Eingabe (Wischen) ---
    function down(e) {
      if (state !== "aim") return;
      const p = window.JT.pos(canvas, e);
      aim = { sx: p.x, sy: p.y, cx: p.x, cy: p.y };
      e.preventDefault();
    }
    function move(e) {
      if (!aim) return;
      const p = window.JT.pos(canvas, e);
      aim.cx = p.x; aim.cy = p.y;
      e.preventDefault();
    }
    function up(e) {
      if (!aim) return;
      const dx = aim.cx - aim.sx, dy = aim.cy - aim.sy;
      const dist = Math.hypot(dx, dy);
      aim = null;
      if (state !== "aim") return;
      if (dist < 22 || dy > -10) { return; } // nur Aufwärts-Wisch zählt
      shoot(dx);
      e.preventDefault();
    }
    function shoot(dx) {
      const toX = inGoalRange(SPOT.x + dx * 1.5);
      keeper.dive = GOAL.left + 22 + Math.random() * (GOAL.right - GOAL.left - 44);
      flight = { t: 0, dur: 0.55, fromX: ball.x, fromY: ball.y, toX: toX, kFrom: keeper.x, kTo: keeper.dive };
      state = "flying";
    }

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", () => { aim = null; });

    // --- Logik ---
    function update(dt, now) {
      if (state === "aim") {
        keeper.x += keeper.dir * 60 * dt;
        if (keeper.x > GOAL.right - keeper.w / 2) { keeper.x = GOAL.right - keeper.w / 2; keeper.dir = -1; }
        if (keeper.x < GOAL.left + keeper.w / 2) { keeper.x = GOAL.left + keeper.w / 2; keeper.dir = 1; }
      } else if (state === "flying") {
        flight.t += dt / flight.dur;
        const t = Math.min(1, flight.t);
        ball.x = flight.fromX + (flight.toX - flight.fromX) * t;
        ball.y = flight.fromY + (GOAL.line - flight.fromY) * t - Math.sin(Math.PI * t) * 60;
        ball.r = 15 - 6 * t;
        keeper.x = flight.kFrom + (flight.kTo - flight.kFrom) * easeOut(t);
        if (t >= 1) evaluate(now);
      } else if (state === "result") {
        if (now >= resultUntil) {
          if (goals >= NEEDED) { win(); return; }
          resetBall();
        }
      }
    }
    function easeOut(t) { return 1 - Math.pow(1 - t, 2); }

    function evaluate(now) {
      const saved = Math.abs(ball.x - keeper.x) < (keeper.w / 2 + ball.r + 2);
      if (saved) {
        resultText = "Julia hält! 🧤";
      } else {
        goals++;
        goalsEl.textContent = goals + "/" + NEEDED;
        resultText = "TOOOR! ⚽🎉";
      }
      msgEl.textContent = resultText;
      state = "result";
      resultUntil = now + 1100;
    }
    function resetBall() {
      ball = { x: SPOT.x, y: SPOT.y, r: 15 };
      keeper.x = 180; keeper.dir = 1;
      resultText = ""; msgEl.innerHTML = "&nbsp;";
      state = "aim";
    }
    function win() {
      if (finished) return;
      finished = true;
      msgEl.textContent = "Held! ⚽";
      cancelAnimationFrame(raf);
      setTimeout(onWin, 300);
    }

    // --- Zeichnen ---
    function draw() {
      // Hintergrund: Stadion + Rasen
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#7ec8f0");
      sky.addColorStop(0.33, "#aee3ff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#3da35d";
      ctx.fillRect(0, 195, W, H - 195);
      // Rasenstreifen
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      for (let i = 0; i < 6; i++) ctx.fillRect(0, 210 + i * 70, W, 35);

      // Strafraum-Linien
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(30, 360); ctx.lineTo(330, 360); ctx.stroke();
      ctx.beginPath(); ctx.arc(SPOT.x, 360, 70, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

      // Tor (Netz + Pfosten)
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(GOAL.left, GOAL.top, GOAL.right - GOAL.left, GOAL.line - GOAL.top + 8);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      for (let x = GOAL.left; x <= GOAL.right; x += 14) { ctx.beginPath(); ctx.moveTo(x, GOAL.top); ctx.lineTo(x, GOAL.line + 8); ctx.stroke(); }
      for (let y = GOAL.top; y <= GOAL.line + 8; y += 12) { ctx.beginPath(); ctx.moveTo(GOAL.left, y); ctx.lineTo(GOAL.right, y); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(GOAL.left, GOAL.line + 10); ctx.lineTo(GOAL.left, GOAL.top);
      ctx.lineTo(GOAL.right, GOAL.top); ctx.lineTo(GOAL.right, GOAL.line + 10);
      ctx.stroke();

      // Torfrau Julia
      drawKeeper(keeper.x, GOAL.top + 34);
      ctx.font = "600 13px " + uiFont();
      ctx.fillStyle = "#7d1f3a";
      ctx.textAlign = "center";
      ctx.fillText("Torfrau Julia", 180, GOAL.top - 8);

      // Ziel-Pfeil beim Wischen
      if (aim) {
        ctx.strokeStyle = "rgba(176,48,82,0.85)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(SPOT.x, SPOT.y);
        ctx.lineTo(SPOT.x + (aim.cx - aim.sx) * 1.5, SPOT.y + (aim.cy - aim.sy) * 1.5);
        ctx.stroke();
      }

      // Ball
      drawBall(ball.x, ball.y, ball.r);

      // Ergebnis-Text groß
      if (state === "result" && resultText) {
        ctx.font = "700 30px " + uiFont();
        ctx.fillStyle = resultText.indexOf("TOR") === 0 ? "#1f7a3a" : "#b03052";
        ctx.textAlign = "center";
        ctx.fillText(resultText, 180, 300);
      }
    }
    function drawKeeper(x, y) {
      ctx.save();
      ctx.translate(x, y);
      // Körper (Trikot)
      ctx.fillStyle = "#b03052";
      ctx.fillRect(-18, 4, 36, 34);
      // Kopf
      ctx.fillStyle = "#f3c9a8";
      ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
      // Haare
      ctx.fillStyle = "#6b4423";
      ctx.beginPath(); ctx.arc(0, -8, 11, Math.PI, 0); ctx.fill();
      // Handschuhe
      ctx.fillStyle = "#e8d28a";
      ctx.beginPath(); ctx.arc(-24, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(24, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function drawBall(x, y, r) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function uiFont() { return "-apple-system, Segoe UI, Roboto, sans-serif"; }

    // --- Loop ---
    function loop(now) {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt, now);
      draw();
      if (!finished) raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    // --- Teardown ---
    return function () {
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
    };
  },
};
