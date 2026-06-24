# Julia & Tim – Das Hochzeitsrätsel 💍

Ein mobile-first Browser-Spiel als Hochzeitsgeschenk: Julia & Tim scannen einen
QR-Code, meistern **vier Mini-Spiele** und bekommen für jeden Sieg **eine Ziffer**
des 4-stelligen Codes, mit dem sie die **Cryptex** öffnen und an ihr Geldgeschenk
kommen.

Alles läuft **rein im Browser** – kein Backend, keine Build-Tools, keine
Abhängigkeiten. Reine HTML/CSS/JS-Dateien, direkt auf GitHub Pages lauffähig.

## Die vier Spiele (je 1 Ziffer)
1. **Elfmeter-Held** ⚽ – Tim am Ball, 3 Tore gegen Torfrau Julia (wischen).
2. **Pisten-Slalom** 🎿 – Ski-Tag in Ratschings bis zur Rinderalm (Finger ziehen).
3. **High School Musical DS** 🎵⭐ – Kreise im Takt zum Song treffen (orange → grün → antippen);
   das ganze Lied durchspielen, Sieg bei 80 % Trefferquote. Song-Einrichtung siehe Abschnitt 5.
4. **Polterabend** 🍽️💥 – 20 Teller zerschlagen (antippen).

Jeder Sieg schaltet eine Ziffer frei. Alle vier → vollständiger Code mit Konfetti.
Alle Spiele sind über die Übersicht jederzeit wiederholbar; der Fortschritt wird im
Browser (localStorage) gesichert.

---

## 1. Den Code setzen ⚙️ (WICHTIG)

Öffne `js/main.js`. Ganz oben steht:

```js
const CRYPTEX_CODE = "1234";
```

Trage dort **genau** den 4-stelligen Code ein, den du auch an der Cryptex
einstellst. Die Reihenfolge der Ziffern entspricht der Spiel-Reihenfolge darunter:

```js
// 1. Ziffer = Elfmeter, 2. = Ski, 3. = Kochen, 4. = Polterabend
const GAME_ORDER = ["penalty", "ski", "cooking", "polter"];
```

Das ist die einzige Pflicht-Anpassung.

---

## 2. Lokal testen 🔍

Wegen der mehreren Dateien am besten über einen Mini-Server starten:

```bash
cd JuliaTimHochzeit
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

Am Handy testen (Browser → Entwicklertools → Mobile-Ansicht), da mobile-first.

**Test-Abkürzung:** In der Browser-Konsole lassen sich Spiele überspringen –
`JTdebug.win('penalty')`, `JTdebug.winAll()` (alle freischalten) oder
`JTdebug.reset()` (Fortschritt löschen).

---

## 3. Auf GitHub Pages veröffentlichen 🚀

1. Neues GitHub-Repository anlegen (z. B. `julia-tim-hochzeit`).
2. Dateien pushen:

   ```bash
   cd JuliaTimHochzeit
   git init
   git add .
   git commit -m "Hochzeitsrätsel für Julia & Tim"
   git branch -M main
   git remote add origin https://github.com/<DEIN-USER>/julia-tim-hochzeit.git
   git push -u origin main
   ```

3. Repo: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**, Branch: **main**, Ordner: **/ (root)** → **Save**

4. Nach ~1 Minute erreichbar unter:
   `https://<DEIN-USER>.github.io/julia-tim-hochzeit/`

Das ist die URL für den QR-Code.

> Hinweis: Da alles im Browser läuft, steckt der Code technisch im JavaScript und
> wäre per „Seitenquelltext anzeigen" auffindbar. Für den Überraschungs-Gag egal.

---

## 4. QR-Code erzeugen 📱

Die Pages-URL in einen QR-Code packen, z. B.:

```bash
brew install qrencode
qrencode -o hochzeits-qr.png "https://<DEIN-USER>.github.io/julia-tim-hochzeit/"
```

QR-Code ausdrucken, ins Geschenk legen – fertig. 🎉

---

## 5. Song für „High School Musical DS" einrichten 🎵

Aktuell verdrahtet: `assets/audio/song.mp3`. Die Einstellungen stehen oben in
`js/games/rhythm.js` in `RHYTHM_CONFIG`:

```js
songSrc:   "assets/audio/song.mp3",  // leer = Testmodus mit Klick-Track
songStart:  10,   // Song ab dieser Sekunde starten (stilles Intro überspringen)
winRatio:   0.8,  // nötige Trefferquote zum Gewinnen (0.8 = 80 %)
beatStride: 2,    // nur jeden N-ten erkannten Beat (2 = halbe Tap-Dichte; 1 = alle)
beatmap:    [],   // siehe unten
```

**Takt (Beatmap):**
- **Automatisch (Standard):** Ist `beatmap` leer, analysiert der Browser den Song
  beim Start selbst und erzeugt die Beats. Es muss nichts getan werden.
- **Perfekt von Hand:** `tools/beatmap-recorder.html` öffnen, Song laden, im Takt
  mittippen (TAP/Leertaste), die ausgegebene `beatmap: [ ... ]` in `rhythm.js`
  einsetzen. Eine gesetzte Beatmap hat Vorrang vor der Auto-Erkennung.

Anderen Song nehmen? Datei nach `assets/audio/` legen, `songSrc` anpassen und ggf.
`songStart` (Stelle, ab der Ton kommt) setzen.

---

## Projektstruktur

```
index.html                  Grundgerüst + Screens (Start, Hub, Spiel, Finale)
css/styles.css               gesamtes Styling (romantisches Theme)
js/main.js                   Steuerung: Screens, Code-Logik, Fortschritt  ← CODE HIER SETZEN
js/games/penalty.js          Spiel 1 · Elfmeter-Held
js/games/ski.js              Spiel 2 · Pisten-Slalom (Ratschings)
js/games/rhythm.js           Spiel 3 · High School Musical DS  ← SONG + BEATMAP HIER SETZEN
js/games/polter.js           Spiel 4 · Polterabend
tools/beatmap-recorder.html  Hilfstool: Beatmap zum Song aufnehmen
assets/audio/                hier die Song-mp3 ablegen
```

Viel Spaß & herzlichen Glückwunsch an Julia & Tim! ❤️
