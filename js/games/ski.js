/* ================================================================
   Spiel 2 · Pisten-Slalom  🎿  (Ratschings / Südtirol)
   Julia & Tim fahren gemeinsam Ski in Ratschings. Finger ziehen =
   lenken, Bäumen ausweichen, Bombardino einsammeln, bis zur
   Rinderalm kommen. Insider: Lift "Rinderexpress" (Enzian/Rinneralm).
   ================================================================ */
window.Games = window.Games || {};
window.Games.ski = {
  emoji: "🎿",
  name: "Pisten-Slalom",
  blurb: "Euer Ski-Tag in Ratschings – bis zur Rinderalm!",

  mount: function (root, onWin) {
    const W = 360, H = 600;
    const GOAL_DIST = 7000;     // zurückzulegende Strecke
    const TOTAL_M = 800;        // Anzeige in "Metern"
    const SKIER_Y = 470;
    const SIGN_TEXTS = ["Rinneralm", "Enzian", "Rinderexpress", "Ratschings", "Rinderalm 2 km"];

    root.innerHTML =
      '<div class="game-hud"><span class="s-lives">❤️❤️❤️</span>' +
      '<span>🛖 noch <b class="s-meters">' + TOTAL_M + ' m</b></span></div>' +
      '<canvas class="game-canvas" width="' + W + '" height="' + H + '"></canvas>' +
      '<p class="game-instructions">Ratschings runter bis zur <b>Rinderalm</b> – Bäumen ausweichen, ' +
      '<b>Bombardino</b> gibt Kraft! 🍹</p>';
    const canvas = root.querySelector(".game-canvas");
    const ctx = canvas.getContext("2d");
    const livesEl = root.querySelector(".s-lives");
    const metersEl = root.querySelector(".s-meters");

    let skier = { x: 180, target: 180, r: 16 };
    let obstacles = [];         // {x,y,type:'tree'|'bombardino',r}
    let signs = [];             // dekorative Pistenschilder {x,y,text}
    let dots = [];
    let traveled = 0, speed = 200, lives = 3, invuln = 0;
    let spawnTimer = 0, signTimer = 1.0, signIdx = 0, signSide = 1, liftOffset = 0, flash = "";
    let raf = null, last = 0, finished = false, won = false, started = false;

    // Fotos: Skilift (Start) + Rinderalm (Sieg)
    const liftImg = new Image(); let liftReady = false;
    liftImg.onload = function () { liftReady = true; };
    liftImg.src = "assets/Bilder/ski-lift.jpg";
    const huetteImg = new Image(); let huetteReady = false;
    huetteImg.onload = function () { huetteReady = true; };
    huetteImg.src = "assets/Bilder/ski-huette.jpg";

    for (let i = 0; i < 40; i++) dots.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() });

    // --- Steuerung ---
    let dragging = false;
    function setTarget(e) { const p = window.JT.pos(canvas, e); skier.target = Math.max(22, Math.min(W - 22, p.x)); }
    function down(e) { e.preventDefault(); if (!started) { started = true; return; } dragging = true; setTarget(e); }
    function move(e) { if (dragging) { setTarget(e); e.preventDefault(); } }
    function upx() { dragging = false; }
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", upx);
    canvas.addEventListener("pointercancel", upx);

    function updateLives() { livesEl.textContent = "❤️".repeat(lives) + "🤍".repeat(Math.max(0, 3 - lives)); }

    function update(dt) {
      if (!started) return;       // wartet auf Tap im Start-Screen
      const frac = traveled / GOAL_DIST;
      speed = 200 + frac * 170;
      traveled += speed * dt;
      liftOffset = (liftOffset + speed * dt * 0.6) % 130;
      if (invuln > 0) invuln -= dt;

      skier.x += (skier.target - skier.x) * Math.min(1, dt * 12);

      dots.forEach(d => { d.y += speed * dt * d.s * 0.5; if (d.y > H) { d.y = -4; d.x = Math.random() * W; } });

      // Hindernisse + Bombardino spawnen
      spawnTimer -= dt;
      const interval = 0.62 - frac * 0.24;
      if (spawnTimer <= 0) {
        spawnTimer = interval;
        if (Math.random() < 0.16) obstacles.push({ x: 60 + Math.random() * (W - 120), y: -30, type: "bombardino", r: 16 });
        else obstacles.push({ x: 40 + Math.random() * (W - 80), y: -30, type: "tree", r: 18 });
      }

      // Pistenschilder (dekorativ) spawnen – rechte Seite (links ist der Lift)
      signTimer -= dt;
      if (signTimer <= 0) {
        signTimer = 2.1;
        signs.push({ x: W - 46, y: -20, text: SIGN_TEXTS[signIdx % SIGN_TEXTS.length] });
        signIdx++;
      }
      for (let i = signs.length - 1; i >= 0; i--) {
        signs[i].y += speed * dt;
        if (signs[i].y > H + 40) signs.splice(i, 1);
      }

      // Bewegen + Kollision
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        if (!o) continue;
        o.y += speed * dt;
        if (o.y > H + 40) { obstacles.splice(i, 1); continue; }
        const hit = Math.hypot(o.x - skier.x, o.y - SKIER_Y) < o.r + skier.r - 6;
        if (!hit) continue;
        if (o.type === "bombardino") {
          if (lives < 3) lives++;
          updateLives();
          flash = "+Bombardino! 🍹";
          obstacles.splice(i, 1);
        } else if (invuln <= 0) {
          lives--; updateLives();
          invuln = 1.1; flash = "Autsch! 🌲";
          obstacles.splice(i, 1);
          if (lives <= 0) { softReset(); break; }
        }
      }

      metersEl.textContent = Math.max(0, Math.round((1 - traveled / GOAL_DIST) * TOTAL_M)) + " m";
      if (traveled >= GOAL_DIST && !won) win();
    }

    function softReset() {
      traveled = 0; lives = 3; invuln = 1.4; updateLives();
      obstacles.length = 0; flash = "Hoppla – nochmal!";
    }
    function win() {
      won = true; finished = true;
      obstacles.length = 0; signs.length = 0;
      drawHut();
      cancelAnimationFrame(raf);
      setTimeout(onWin, 5000); // Alm-Nachricht mind. 5 s lesbar lassen
    }

    // Bild bildschirmfüllend einpassen (Cover, mittig beschnitten)
    function drawImageCover(img, dx, dy, dw, dh) {
      const ir = img.width / img.height, dr = dw / dh;
      let sw, sh, sx, sy;
      if (ir > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
      else { sw = img.width; sh = sw / dr; sx = 0; sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    // Start-Screen mit Skilift-Foto
    function drawStart() {
      ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, W, H);
      if (liftReady) drawImageCover(liftImg, 0, 0, W, H);
      const g = ctx.createLinearGradient(0, H - 210, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.78)");
      ctx.fillStyle = g; ctx.fillRect(0, H - 210, W, 210);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.font = "700 19px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText("🚡 Rein in den Rinderexpress!", 180, H - 110);
      ctx.fillStyle = "#ffe08a";
      ctx.font = "600 16px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText("Tippen zum Starten", 180, H - 78);
    }

    // --- Zeichnen ---
    function draw() {
      if (!started) { drawStart(); return; }
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#dff1ff"); g.addColorStop(1, "#ffffff");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#eaf4ff";
      ctx.fillRect(0, 0, 18, H); ctx.fillRect(W - 18, 0, 18, H);

      ctx.fillStyle = "rgba(150,180,210,0.5)";
      dots.forEach(d => { ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, Math.PI * 2); ctx.fill(); });

      drawLift();
      drawBanner();

      // Fortschrittsbalken
      ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(40, 16, W - 80, 8);
      ctx.fillStyle = "#b03052"; ctx.fillRect(40, 16, (W - 80) * Math.min(1, traveled / GOAL_DIST), 8);

      signs.forEach(drawSign);

      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      obstacles.forEach(o => {
        if (o.type === "bombardino") drawBombardino(o.x, o.y);
        else { ctx.font = "34px sans-serif"; ctx.fillText("🌲", o.x, o.y); }
      });

      if (invuln <= 0 || Math.floor(invuln * 12) % 2 === 0) {
        ctx.font = "36px sans-serif";
        ctx.fillText("⛷️", skier.x, SKIER_Y);
      }

      if (flash) {
        ctx.font = "700 22px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = flash.indexOf("Bombardino") >= 0 ? "#a8841a" : "#b03052";
        ctx.fillText(flash, 180, 300);
      }
    }

    // Sessellift "Rinderexpress" am linken Rand
    function drawLift() {
      ctx.save();
      ctx.strokeStyle = "rgba(60,80,100,0.55)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(24, H); ctx.stroke();
      // Masten
      ctx.strokeStyle = "rgba(70,70,80,0.5)";
      for (let y = (liftOffset % 200) - 200; y < H; y += 200) {
        ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(24, y + 30); ctx.moveTo(14, y); ctx.lineTo(40, y); ctx.stroke();
      }
      // Sessel
      for (let y = (liftOffset % 130) - 130; y < H; y += 130) {
        ctx.strokeStyle = "rgba(60,80,100,0.55)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(24, y + 10); ctx.stroke();
        ctx.fillStyle = "#c0392b"; ctx.fillRect(16, y + 10, 16, 7);
      }
      // Lift-Schild
      ctx.fillStyle = "rgba(31,109,192,0.92)";
      ctx.fillRect(8, 60, 70, 18);
      ctx.fillStyle = "#fff"; ctx.font = "700 10px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🚡 Rinderexpress", 43, 70);
      ctx.restore();
    }

    function drawBanner() {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.font = "italic 600 13px Georgia, serif";
      ctx.fillStyle = "#3a6b9c"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("🏔 Ratschings · Südtirol", 180, 34);
      ctx.restore();
    }

    function drawSign(s) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.fillStyle = "rgba(138,90,43,0.9)"; ctx.fillRect(-2, 0, 4, 26);
      ctx.font = "700 11px -apple-system, Segoe UI, Roboto, sans-serif";
      const w = ctx.measureText(s.text).width + 14;
      ctx.fillStyle = "rgba(31,109,192,0.92)"; ctx.fillRect(-w / 2, -16, w, 18);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.text, 0, -7);
      ctx.restore();
    }

    // Bombardino – gezeichnetes Glas mit Sahnehaube
    function drawBombardino(x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = "rgba(120,80,10,0.45)"; ctx.lineWidth = 1;
      ctx.fillStyle = "#f6c945";
      ctx.beginPath();
      ctx.moveTo(-9, -5); ctx.lineTo(9, -5); ctx.lineTo(6, 12); ctx.lineTo(-6, 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fffdf5";
      ctx.beginPath(); ctx.ellipse(0, -6, 10, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7a4a1e";
      ctx.beginPath(); ctx.arc(-2, -7, 1.1, 0, Math.PI * 2); ctx.arc(3, -6, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawHut() {
      ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, W, H);
      if (huetteReady) {
        drawImageCover(huetteImg, 0, 0, W, H);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#dff1ff"); g.addColorStop(1, "#ffffff");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.font = "80px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🛖", 180, 250);
      }
      // dunkle Bänder für lesbaren Text
      const gt = ctx.createLinearGradient(0, 0, 0, 120);
      gt.addColorStop(0, "rgba(0,0,0,0.72)"); gt.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gt; ctx.fillRect(0, 0, W, 120);
      const gb = ctx.createLinearGradient(0, H - 150, 0, H);
      gb.addColorStop(0, "rgba(0,0,0,0)"); gb.addColorStop(1, "rgba(0,0,0,0.8)");
      ctx.fillStyle = gb; ctx.fillRect(0, H - 150, W, 150);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "700 25px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText("Rinderalm erreicht! 🎉", 180, 48);
      ctx.font = "600 16px Georgia, serif"; ctx.fillStyle = "#ffe08a";
      ctx.fillText("Zeit für einen Bombardino! 🍹", 180, H - 55);
    }

    let flashTimer = 0;
    function loop(now) {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      if (flash) { flashTimer += dt; if (flashTimer > 0.9) { flash = ""; flashTimer = 0; } } else flashTimer = 0;
      if (!won) draw();
      if (!finished) raf = requestAnimationFrame(loop);
    }
    updateLives();
    raf = requestAnimationFrame(loop);

    return function () {
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", upx);
      canvas.removeEventListener("pointercancel", upx);
    };
  },
};
