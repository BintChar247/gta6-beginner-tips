# GTA 6 Rookie Guide — beginner tips (unofficial)

An offline Android app with **119 beginner tips** for Grand Theft Auto VI story mode, in 13 topics. The tips were collected during launch week (Nov 2026) from gaming magazines, guide sites, creators and the player community, then rewritten in plain language.

- **Tips are tagged by reliability.** Each one shows Confirmed, Reported or Unverified. A "Sources differ" badge marks facts the guides disagree on.
- **Search, save and track progress.** You can search every tip, save favourites, and mark tips as learned to climb from *Fresh Off the Bus* to *Legend of Leonida*.
- **Five golden rules and a tip of the day** sit on the home screen.
- **Original look and offline use.** The neon-sunset artwork is original, the app works fully offline, and each tip links to its sources.

> Unofficial fan-made guide. Not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive.

## Install
Download [`dist/gta6-rookie-guide.apk`](dist/gta6-rookie-guide.apk), Android 8.0 or newer. On your phone, allow *Install unknown apps* for your browser or file manager, then open the APK.

## Build
Requirements: JDK 17 and the Android SDK (platform 34, build-tools 34). Set `sdk.dir` in `local.properties`, or set `ANDROID_HOME`.

```sh
./gradlew assembleRelease
# -> app/build/outputs/apk/release/app-release.apk
```

## Project layout
| Path | What |
|---|---|
| `app/src/main/assets/` | The app UI: `index.html`, `styles.css`, `app.js` and the generated `tips.js` |
| `app/src/main/java/.../MainActivity.java` | WebView shell. It handles the back button and opens links outside the app |
| `content/tips-library.md` | The research report the tips are generated from |
| `tools/build_tips.py` | Regenerates `tips.js` from the report: `python tools/build_tips.py content/tips-library.md app/src/main/assets/tips.js` |

## Updating tips
Edit `content/tips-library.md` and keep the `**XX-00 · Title** [Confidence]` format. Then rerun `build_tips.py` and rebuild.
