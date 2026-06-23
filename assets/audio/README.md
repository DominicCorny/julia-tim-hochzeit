# Audio

Hier die Song-Datei für das Bonus-Spiel **Sterntreffer** ablegen, z. B. `unser-song.mp3`.

Danach in `js/games/rhythm.js` oben in `RHYTHM_CONFIG` eintragen:

```js
songSrc: "assets/audio/unser-song.mp3",
beatmap: [ ... ],   // aus tools/beatmap-recorder.html
```

Ohne `songSrc` läuft das Spiel im **Testmodus** mit einem Klick-Track (zum Ausprobieren).
