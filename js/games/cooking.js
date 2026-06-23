/* ================================================================
   Spiel 3 · Julia kocht – Tim isst  🍳
   Klassisches Rollenbild: Julia steht am Herd. Im grünen Bereich
   "Wenden!" tippen. 3 perfekte Pfannen = Gericht serviert.
   (Tim lenkt mit Kommentaren ab.)
   ================================================================ */
window.Games = window.Games || {};
window.Games.cooking = {
  emoji: "🍳",
  name: "Julias Küche",
  blurb: "Wenden im grünen Bereich – 3 perfekte Pfannen!",

  mount: function (root, onWin) {
    const NEEDED = 3;
    const FOODS = ["🍳", "🥩", "🥞", "🌭", "🍕"];
    const ZONE_START = 70, ZONE_END = 90;
    const TIM = [
      "Tim: „Riecht schon gut!“",
      "Tim: „Ich hätte da Hunger…“",
      "Tim: „Brennt da was?“",
      "Tim: „Du kannst das viel besser als ich.“",
      "Tim: „Noch nicht fertig?“",
    ];

    root.innerHTML =
      '<div class="game-hud"><span>🍳 Perfekte Pfannen: <b class="c-count">0/' + NEEDED + '</b></span></div>' +
      '<div class="cook-wrap">' +
        '<div class="cook-stage">🍳</div>' +
        '<div class="cook-meter"><div class="cook-zone"></div><div class="cook-fill"></div></div>' +
        '<p class="cook-msg">Tippe „Wenden!“, wenn der Balken im grünen Bereich ist.</p>' +
        '<button class="cook-btn">Wenden! 🍳</button>' +
      "</div>";

    const stage = root.querySelector(".cook-stage");
    const fillEl = root.querySelector(".cook-fill");
    const zoneEl = root.querySelector(".cook-zone");
    const msgEl = root.querySelector(".cook-msg");
    const btn = root.querySelector(".cook-btn");
    const countEl = root.querySelector(".c-count");

    zoneEl.style.left = ZONE_START + "%";
    zoneEl.style.width = (ZONE_END - ZONE_START) + "%";

    let fill = 0, speed = 36, perfect = 0, foodIndex = 0;
    let raf = null, last = 0, finished = false, busy = false;

    function timQuip() { msgEl.textContent = TIM[Math.floor(Math.random() * TIM.length)]; }

    function flip(success) {
      stage.classList.remove("flip");
      void stage.offsetWidth; // Reflow für Neustart der Animation
      stage.classList.add("flip");
      if (success) {
        foodIndex = (foodIndex + 1) % FOODS.length;
        setTimeout(() => { stage.textContent = FOODS[foodIndex]; }, 240);
      }
    }

    function onTap() {
      if (finished || busy) return;
      if (fill >= ZONE_START && fill <= ZONE_END) {
        perfect++;
        countEl.textContent = perfect + "/" + NEEDED;
        flip(true);
        fill = 0;
        speed += 7;
        if (perfect >= NEEDED) { return finish(); }
        msgEl.textContent = "Perfekt! 👏  " + (perfect === NEEDED - 1 ? "Noch eine!" : "");
      } else if (fill < ZONE_START) {
        msgEl.textContent = "Zu früh – noch roh! 🥩";
        flip(false);
        fill = 0;
      } else {
        msgEl.textContent = "Zu spät – fast verkohlt! 😅";
        flip(false);
        fill = 0;
      }
    }
    btn.addEventListener("click", onTap);

    function finish() {
      finished = true;
      busy = true;
      msgEl.textContent = "Serviert! 🍽️ Tim ist begeistert.";
      stage.textContent = "🍽️";
      cancelAnimationFrame(raf);
      setTimeout(onWin, 500);
    }

    function loop(now) {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!finished) {
        fill += speed * dt;
        if (fill >= 100) {
          fill = 0;
          msgEl.textContent = "Angebrannt! 🔥 " + TIM[2];
          flip(false);
        } else if (Math.random() < dt * 0.4) {
          // gelegentlicher Tim-Spruch
          if (fill < ZONE_START - 10) timQuip();
        }
        fillEl.style.width = Math.min(100, fill) + "%";
      }
      if (!finished) raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return function () {
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      btn.removeEventListener("click", onTap);
    };
  },
};
