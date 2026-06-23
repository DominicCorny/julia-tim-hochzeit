/* ================================================================
   Spiel 4 · Scherben bringen Glück  🍽️💥
   Euer Polterabend. Geschirr fliegt hoch – antippen zum Zerschlagen.
   20 Scherben = Glück für die Ehe.
   ================================================================ */
window.Games = window.Games || {};
window.Games.polter = {
  emoji: "🍽️",
  name: "Polterabend",
  blurb: "Zerschlagt 20 Teller – Scherben bringen Glück!",

  mount: function (root, onWin) {
    const W = 360, H = 600, NEEDED = 20, G = 900;
    const PLATES = ["🍽️", "🍶", "🍷", "🥣", "🫖", "🍵"];

    root.innerHTML =
      '<div class="game-hud"><span>💥 Scherben: <b class="po-count">0/' + NEEDED + '</b></span></div>' +
      '<canvas class="game-canvas" width="' + W + '" height="' + H + '"></canvas>' +
      '<p class="game-instructions">Tippt das fliegende Geschirr an, bevor es runterfällt!</p>';
    const canvas = root.querySelector(".game-canvas");
    const ctx = canvas.getContext("2d");
    const countEl = root.querySelector(".po-count");

    let dishes = [], shards = [];
    let count = 0, spawnTimer = 0;
    let raf = null, last = 0, finished = false;

    function spawn() {
      const golden = Math.random() < 0.12;
      dishes.push({
        x: 50 + Math.random() * (W - 100),
        y: H + 24,
        vx: -120 + Math.random() * 240,
        vy: -(760 + Math.random() * 140),
        r: golden ? 24 : 21,
        emoji: golden ? "🏺" : PLATES[Math.floor(Math.random() * PLATES.length)],
        points: golden ? 2 : 1,
        golden: golden,
        rot: 0, vrot: -3 + Math.random() * 6,
      });
    }

    function smash(d) {
      count = Math.min(NEEDED, count + d.points);
      countEl.textContent = count + "/" + NEEDED;
      const cols = d.golden ? ["#e8c14a", "#f6e08a", "#fff4c2"] : ["#dfe6ee", "#b9c4d0", "#ffffff", "#cdd6e0"];
      for (let i = 0; i < 12; i++) {
        shards.push({
          x: d.x, y: d.y,
          vx: -200 + Math.random() * 400,
          vy: -260 + Math.random() * 220,
          size: 4 + Math.random() * 6,
          rot: Math.random() * 6, vrot: -6 + Math.random() * 12,
          life: 0.9, color: cols[Math.floor(Math.random() * cols.length)],
        });
      }
      if (count >= NEEDED && !finished) win();
    }

    function onDown(e) {
      if (finished) return;
      const p = window.JT.pos(canvas, e);
      // oberste (zuletzt gezeichnete) zuerst treffen
      for (let i = dishes.length - 1; i >= 0; i--) {
        const d = dishes[i];
        if (Math.hypot(d.x - p.x, d.y - p.y) < d.r + 12) {
          smash(d);
          dishes.splice(i, 1);
          break;
        }
      }
      e.preventDefault();
    }
    canvas.addEventListener("pointerdown", onDown);

    function win() {
      finished = true;
      cancelAnimationFrame(raf);
      drawScene();
      ctx.font = "700 30px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillStyle = "#ffe08a"; ctx.textAlign = "center";
      ctx.fillText("Viel Glück! 🍀💥", 180, 300);
      setTimeout(onWin, 700);
    }

    function update(dt) {
      spawnTimer -= dt;
      if (spawnTimer <= 0 && dishes.length < 5) { spawn(); spawnTimer = 0.45 + Math.random() * 0.35; }

      for (let i = dishes.length - 1; i >= 0; i--) {
        const d = dishes[i];
        d.vy += G * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vrot * dt;
        if (d.y > H + 60) dishes.splice(i, 1); // ungetroffen -> raus (kein Abzug)
      }
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.vy += G * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vrot * dt;
        s.life -= dt;
        if (s.life <= 0) shards.splice(i, 1);
      }
    }

    function drawScene() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#2a1437"); g.addColorStop(1, "#5e2750");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // Lichterkette oben
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = ["#ffd27a", "#ff9eb5", "#a0e8ff"][i % 3];
        ctx.beginPath(); ctx.arc(20 + i * 40, 18 + (i % 2) * 8, 5, 0, Math.PI * 2); ctx.fill();
      }
      // Tisch unten
      ctx.fillStyle = "#3a1d2b"; ctx.fillRect(0, H - 26, W, 26);

      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      dishes.forEach(d => {
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
        ctx.font = (d.r * 1.7) + "px sans-serif";
        ctx.fillText(d.emoji, 0, 0);
        ctx.restore();
      });
      shards.forEach(s => {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.color;
        ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!finished) { update(dt); drawScene(); }
      if (!finished) raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return function () {
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
    };
  },
};
