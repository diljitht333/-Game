# Block Puzzle — Turn the game into an Android APK

The game is a web app. **Capacitor** wraps it in a native Android shell so it runs
fully offline as a real app (sound, vibration, saved scores and settings all work).

## 1. Install the tools (one time)

| Tool | Where |
| --- | --- |
| Node.js 20+ | https://nodejs.org |
| Android Studio (latest) | https://developer.android.com/studio — during setup install the Android SDK + an emulator |
| Git | https://git-scm.com |

## 2. Get the code on your computer

1. In Lovable, click **GitHub → Connect to GitHub** and create the repository.
2. On your computer:
   ```bash
   git clone https://github.com/<you>/<repo>.git
   cd <repo>
   npm install
   ```

## 3. Add Capacitor

```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
```
`capacitor.config.json` is already in the project (app id `com.blockpuzzle.gems`, name
"Block Puzzle", web folder `www`). Change `appId` to your own unique id before publishing
to Google Play (e.g. `com.yourname.blockpuzzle`).

## 4. Build the offline game files

```bash
bash scripts/build-android.sh
```
This creates the `www/` folder (the whole game, playable without internet).

## 5. Create the Android project (one time)

```bash
npx cap add android
npx cap sync android
```

### Lock to portrait
Open `android/app/src/main/AndroidManifest.xml` and add to the `<activity ...>` tag:
```xml
android:screenOrientation="portrait"
```

### Vibration permission
In the same file, above `<application>`, add:
```xml
<uses-permission android:name="android.permission.VIBRATE" />
```

### App icon
In Android Studio: right-click `app/res` → **New → Image Asset** → choose
`public/icon-512.png` (or `app-icon-1024.png` from the delivered files) → Next → Finish.

## 6. Run on a phone or emulator

```bash
npx cap open android
```
Android Studio opens. Wait for Gradle sync, pick a device (plug in your phone with
**USB debugging** on, or start an emulator) and press ▶ **Run**.

## 7. Build the APK

**Test APK (quick):** Android Studio → **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
File appears at `android/app/build/outputs/apk/debug/app-debug.apk` — copy it to any
phone and install (allow "Install unknown apps").

**Release APK / Play Store bundle:**
1. **Build → Generate Signed Bundle / APK**.
2. Choose **Android App Bundle (.aab)** for Google Play, or **APK** for direct sharing.
3. **Create new…** keystore — save the file and passwords safely; you need them for every update.
4. Choose **release** → Finish. Output: `android/app/release/`.

## 8. After changing the game

Every time you change the game in Lovable:
```bash
git pull
bash scripts/build-android.sh
npx cap sync android
```
then Run / Build again in Android Studio. Increase `versionCode` and `versionName` in
`android/app/build.gradle` before uploading a new version to Google Play.

## Troubleshooting

- **White screen** → you forgot step 4 or `npx cap sync android`.
- **Gradle / SDK errors** → Android Studio → Tools → SDK Manager → install the latest SDK Platform & Build-Tools.
- **No sound until first tap** → normal; Android requires a tap before audio can play.
- **Fonts look different offline** → the game uses Google Fonts; without internet it falls back to the system font. Everything else works offline.
