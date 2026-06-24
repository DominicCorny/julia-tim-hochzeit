/* ================================================================
   Bonus-Spiel · Sterntreffer  🎵⭐
   Kreise erscheinen zufällig und durchlaufen einen Farb-Timer:
   dunkelorange → grün (Trefferfenster) → verlöschen (verpasst).
   Treffer im grünen Fenster = goldene Sternen-Explosion.
   Man spielt das GANZE Lied durch und gewinnt mit >= winRatio Treffern.
   ----------------------------------------------------------------
   ⚙️  KONFIGURATION:
   - songSrc:  Pfad zur mp3 (leer = Testmodus mit Klick-Track)
   - songStart: Sekunde, ab der der Song startet (stilles Intro überspringen)
   - winRatio: nötige Trefferquote zum Gewinnen (0.8 = 80 %)
   - beatmap:  Beat-Zeitpunkte in Sekunden. Leer + songSrc gesetzt =
               automatische Beat-Erkennung im Browser. Für perfekten Takt
               mit tools/beatmap-recorder.html aufnehmen und hier einsetzen.
   ================================================================ */
const RHYTHM_CONFIG = {
  songSrc: "assets/audio/song.mp3",  // leer = Testmodus
  songStart: 10,          // Song ab dieser Sekunde starten (stilles Intro)
  winRatio: 0.8,          // 80 % Treffer = gewonnen
  beatStride: 2,          // nur jeden N-ten erkannten Beat nehmen (2 = halbe Tap-Dichte)
  beatmap: [],            // aus tools/beatmap-recorder.html (überschreibt Auto-Erkennung)
  testBpm: 110,           // nur Testmodus
  startOffset: 1.4,       // 1. Beat im Testmodus
  testBeats: 40,          // Anzahl Kreise im Testmodus
  lead: 1.6,              // Vorlaufzeit eines Kreises (orange -> grün)
  hitWindow: 0.26,        // ± Sekunden großzügiges Trefferfenster
  fade: 0.4,              // Ausblendzeit nach Verpassen
};

window.Games = window.Games || {};
window.Games.rhythm = {
  emoji: "🎵",
  name: "High School Musical DS",
  blurb: "Trefft die Kreise im Takt zu eurem Song! ⭐",

  mount: function (root, onWin) {
    const W = 360, H = 600;
    const C = RHYTHM_CONFIG;
    const DARK = [194, 78, 0], GREEN = [39, 201, 63]; // orange -> grün

    function genBeats(from, count, bpm) {
      const out = [], step = 60 / bpm;
      for (let i = 0; i < count; i++) out.push(+(from + i * step).toFixed(3));
      return out;
    }
    // Tap-Dichte ausdünnen: nur jeden N-ten Beat behalten
    function strideBeats(arr) {
      const s = Math.max(1, C.beatStride | 0);
      return s === 1 ? arr : arr.filter(function (_, i) { return i % s === 0; });
    }

    const audio = C.songSrc ? new Audio(C.songSrc) : null;
    if (audio) { audio.preload = "auto"; audio.loop = false; }
    const autoDetect = !!audio && !(C.beatmap && C.beatmap.length);

    // Beatmap: Config > (Auto-Erkennung später) > Testmodus
    let beatmap;
    if (C.beatmap && C.beatmap.length) beatmap = C.beatmap.slice().sort((a, b) => a - b); // Handmap: 1:1
    else if (audio) beatmap = [];                       // wird beim Start erkannt
    else beatmap = strideBeats(genBeats(C.startOffset, C.testBeats, C.testBpm));

    root.innerHTML =
      '<div class="game-hud"><span>⭐ Treffer: <b class="r-hits">0</b></span>' +
      '<span class="r-mode"></span></div>' +
      '<canvas class="game-canvas" width="' + W + '" height="' + H + '"></canvas>' +
      '<p class="game-instructions">Tippe jeden Kreis, wenn er <b>grün</b> wird – das ganze Lied lang!</p>';
    const canvas = root.querySelector(".game-canvas");
    const ctx = canvas.getContext("2d");
    const hitsEl = root.querySelector(".r-hits");
    root.querySelector(".r-mode").textContent = audio ? "🎶" : "🔊 Testmodus";

    let audioCtx = null;
    let circles = [];     // {x,y,r,beat,ticked}
    let stars = [];       // Partikel
    let phase = "idle";   // idle | analyzing | playing | done
    let finished = false, disposed = false, detected = false, won = false;
    let hits = 0, spawned = 0, spawnIdx = 0, vtime = 0, pct = 0;
    let raf = null, last = 0;

    function now() {
      if (phase !== "playing") return 0;
      return audio ? audio.currentTime : vtime;
    }

    // --- Start / Erkennung ---
    function beginStart() {
      if (autoDetect && !detected) {
        phase = "analyzing";
        detectBeats(C.songSrc).then(function (bm) {
          beatmap = (bm && bm.length >= 8) ? strideBeats(bm) : strideBeats(genBeats(C.songStart + 0.5, 40, C.testBpm));
          detected = true; goPlaying();
        }).catch(function () {
          beatmap = strideBeats(genBeats(C.songStart + 0.5, 40, C.testBpm));
          detected = true; goPlaying();
        });
      } else {
        goPlaying();
      }
    }
    function goPlaying() {
      if (disposed) return;
      phase = "playing";
      hits = 0; spawned = 0; spawnIdx = 0; vtime = 0; pct = 0; won = false;
      circles = []; stars = [];
      hitsEl.textContent = "0";
      if (audio) {
        try { audio.currentTime = C.songStart; audio.play().catch(function () {}); } catch (e) {}
      } else {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      }
    }

    function detectBeats(src) {
      return fetch(src).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ac = new AC();
        return ac.decodeAudioData(buf).then(function (ab) {
          try { ac.close(); } catch (e) {}
          return analyzeBeats(ab);
        });
      });
    }
    function analyzeBeats(ab) {
      const data = ab.getChannelData(0), sr = ab.sampleRate, win = 1024, perSec = sr / win;
      const energies = [];
      for (let i = 0; i + win <= data.length; i += win) {
        let s = 0; for (let j = 0; j < win; j++) { const v = data[i + j]; s += v * v; }
        energies.push(s / win);
      }
      const hist = Math.max(1, Math.round(perSec)); // ~1 s gleitender Mittelwert
      const beats = []; let lastT = -10; const minGap = 0.40;
      for (let k = 1; k < energies.length - 1; k++) {
        let avg = 0; const a = Math.max(0, k - hist);
        for (let m = a; m < k; m++) avg += energies[m];
        avg /= Math.max(1, k - a);
        const e = energies[k], t = k / perSec;
        if (t < C.songStart) continue; // stilles Intro auslassen
        if (e > avg * 1.4 && e > 1e-4 && e >= energies[k - 1] && e >= energies[k + 1] && t - lastT >= minGap) {
          beats.push(+t.toFixed(3)); lastT = t;
        }
      }
      return beats;
    }

    function playTick() {
      if (!audioCtx) return;
      try {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
        const t = audioCtx.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        o.start(t); o.stop(t + 0.09);
      } catch (e) {}
    }

    // --- Eingabe ---
    function onDown(e) {
      e.preventDefault();
      if (phase === "idle") { beginStart(); return; }
      if (phase === "analyzing") return;
      if (phase === "done") { if (!won) goPlaying(); return; } // verloren -> nochmal
      const p = window.JT.pos(canvas, e);
      const cnow = now();
      let best = -1, bestDelta = 1e9;
      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        if (Math.hypot(c.x - p.x, c.y - p.y) > c.r + 14) continue;
        const delta = Math.abs(cnow - c.beat);
        if (delta <= C.hitWindow && delta < bestDelta) { bestDelta = delta; best = i; }
      }
      if (best >= 0) {
        const c = circles[best];
        burst(c.x, c.y);
        circles.splice(best, 1);
        hits++;
        hitsEl.textContent = hits;
      }
    }
    canvas.addEventListener("pointerdown", onDown);

    function burst(x, y) {
      for (let i = 0; i < 14; i++) {
        const a = (Math.PI * 2 * i) / 14 + Math.random();
        const sp = 90 + Math.random() * 170;
        stars.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.8, size: 5 + Math.random() * 7, rot: Math.random() * 6, vrot: -6 + Math.random() * 12 });
      }
      stars.push({ x: x, y: y, vx: 0, vy: -10, life: 0.7, size: 26, rot: 0, vrot: 0, big: true });
    }

    function spawnPos() {
      let x = 60, y = 110;
      for (let t = 0; t < 12; t++) {
        x = 50 + Math.random() * (W - 100);
        y = 90 + Math.random() * (H - 170);
        let ok = true;
        for (const c of circles) if (Math.hypot(c.x - x, c.y - y) < 74) { ok = false; break; }
        if (ok) break;
      }
      return { x: x, y: y };
    }

    function finishGame() {
      phase = "done";
      if (audio) { try { audio.pause(); } catch (e) {} }
      const ratio = spawned ? hits / spawned : 0;
      pct = Math.round(ratio * 100);
      won = ratio >= C.winRatio;
      if (won) {
        window.JT.confetti(3500);
        setTimeout(function () { if (!disposed) onWin(); }, 1300);
      }
    }

    // --- Update ---
    function update(dt) {
      if (!audio) vtime += dt;
      const cnow = now();
      while (spawnIdx < beatmap.length && beatmap[spawnIdx] - C.lead <= cnow) {
        const beat = beatmap[spawnIdx];
        spawnIdx++;
        if (beat + C.hitWindow < cnow) continue; // schon vorbei -> überspringen
        const pos = spawnPos();
        circles.push({ x: pos.x, y: pos.y, r: 27, beat: beat, ticked: false });
        spawned++;
      }
      for (const c of circles) {
        if (!c.ticked && cnow >= c.beat) { c.ticked = true; if (!audio) playTick(); }
      }
      for (let i = circles.length - 1; i >= 0; i--) {
        if (cnow > circles[i].beat + C.hitWindow + C.fade) circles.splice(i, 1); // verpasst
      }
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 220 * dt; s.rot += s.vrot * dt; s.life -= dt;
        if (s.life <= 0) stars.splice(i, 1);
      }
      // Lied zu Ende? (alle Beats gespawnt + keine Kreise mehr)
      if (spawned > 0 && spawnIdx >= beatmap.length && circles.length === 0) finishGame();
    }

    // --- Zeichnen ---
    function lerpCol(a, b, t) {
      return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * t) + "," + Math.round(a[1] + (b[1] - a[1]) * t) + "," + Math.round(a[2] + (b[2] - a[2]) * t) + ")";
    }
    function drawScene(cnow) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#241a3a"); g.addColorStop(1, "#3a2350");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      for (let i = 0; i < 26; i++) { const sx = (i * 73) % W, sy = (i * 131) % H; ctx.fillRect(sx, sy, 2, 2); }
      ctx.textAlign = "center"; ctx.textBaseline = "middle";

      if (phase === "idle") {
        ctx.font = "60px sans-serif"; ctx.fillText("🎵", 180, 222);
        ctx.font = "700 22px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = "#ffe08a"; ctx.fillText("Tippen zum Starten", 180, 292);
        ctx.font = "15px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(audio ? "(euer Song – das ganze Lied!)" : "(Testmodus: Klick-Track)", 180, 322);
        // Hinweis: Ton einschalten (am Handy oft stumm)
        ctx.font = "700 18px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = "#ffd54a";
        ctx.fillText("🔊 Ton am Handy einschalten!", 180, 374);
        return;
      }
      if (phase === "analyzing") {
        ctx.font = "54px sans-serif"; ctx.fillText("🎧", 180, 250);
        ctx.font = "700 20px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = "#ffe08a"; ctx.fillText("Analysiere Song …", 180, 320);
        return;
      }
      if (phase === "done") {
        ctx.font = "60px sans-serif"; ctx.fillText(won ? "🎉" : "🎵", 180, 210);
        ctx.font = "800 46px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = won ? "#27c93f" : "#ffe08a";
        ctx.fillText(pct + "%", 180, 285);
        ctx.font = "600 17px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText(hits + " von " + spawned + " getroffen", 180, 325);
        ctx.font = "700 20px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = "#ffe08a";
        ctx.fillText(won ? "Gewonnen! ⭐" : "Ziel: 80 % – tippen für nochmal", 180, 375);
        return;
      }

      // Fortschrittsbalken (Songposition über die Beats)
      const prog = beatmap.length ? Math.min(1, spawnIdx / beatmap.length) : 0;
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(30, 14, W - 60, 6);
      ctx.fillStyle = "#ffd54a"; ctx.fillRect(30, 14, (W - 60) * prog, 6);

      for (const c of circles) {
        const p = Math.max(0, Math.min(1, (cnow - (c.beat - C.lead)) / C.lead));
        const ready = Math.abs(cnow - c.beat) <= C.hitWindow;
        let alpha = 1;
        if (cnow > c.beat + C.hitWindow) alpha = Math.max(0, 1 - (cnow - (c.beat + C.hitWindow)) / C.fade);
        ctx.globalAlpha = alpha;
        if (!ready && cnow < c.beat) {
          ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(c.x, c.y, c.r + (1 - p) * 42, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = lerpCol(DARK, GREEN, p);
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r + (ready ? 3 : 0), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ready ? "#eafff0" : "rgba(0,0,0,0.25)";
        ctx.lineWidth = ready ? 4 : 2;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r + (ready ? 3 : 0), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      for (const s of stars) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, s.life * 1.4));
        if (s.big) { ctx.font = (s.size) + "px sans-serif"; ctx.fillText("⭐", 0, 0); }
        else drawStar(s.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    function drawStar(size) {
      ctx.fillStyle = "#ffd54a";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
        ctx.lineTo(Math.cos(a2) * size * 0.45, Math.sin(a2) * size * 0.45);
      }
      ctx.closePath(); ctx.fill();
    }

    function loop(t) {
      if (!last) last = t;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (phase === "playing" && !finished) update(dt);
      if (!finished) drawScene(now());
      if (!finished) raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return function () {
      finished = true; disposed = true;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      if (audio) { try { audio.pause(); audio.src = ""; } catch (e) {} }
      if (audioCtx) { try { audioCtx.close(); } catch (e) {} }
    };
  },
};
