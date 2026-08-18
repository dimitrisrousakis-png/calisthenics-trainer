CALISTHENICS TRAINER — NETLIFY / PWA PACKAGE

DEPLOY TO NETLIFY
1. Log in to Netlify.
2. Create a new site using Netlify Drop / manual deploy.
3. Drag THIS FOLDER (or the extracted contents of the ZIP) into the deploy area.
4. Keep using the same Netlify site for future updates so the URL stays the same.
5. Open the HTTPS Netlify URL in Chrome on Android.
6. On the Train page, an "Install App" card should appear when Chrome offers installation.
   Chrome may also expose installation in its menu.

IMPORTANT ABOUT SAVED DATA
- Sessions, history and settings still use browser localStorage.
- Redeploying code to the SAME Netlify site/URL normally preserves this local data.
- Data is device/browser-specific.
- Clearing site data, changing the Netlify domain, or using a different device/browser will not carry it across.

PACKAGE FILES
- index.html               Main trainer app
- manifest.webmanifest     PWA metadata
- service-worker.js        Offline/app-shell caching
- icons/                   App, browser and maskable icons
- netlify.toml             Netlify headers/cache configuration

UPDATES
For future updates, replace the files on the same Netlify site. If service-worker files
change, increment CACHE_NAME in service-worker.js (for example v1 -> v2) so old cached
assets are removed during activation.


VERSION 2 EXERCISE LIBRARY
The library now contains 25 exercises, including:
- Dynamic Goddess Squat
- Spiderman Plank
- Cobra Press-Ups
- Chaturanga → Upward Dog
- Upward Dog → Downward Dog Flow
- Locust Pose Lifts
- Child's Pose
- Puppy Pose
- Sphinx Pose
- Seal Pose

New Exercise Library filters: Yoga Flow and Mobility.

Existing localStorage keys and original exercise IDs were preserved, so previously
saved sessions/history remain compatible when this version is deployed to the same site.


VERSION 3 EXERCISE LIBRARY
Added Boat variations:
- Boat Pose
- Half Boat Hold
- Boat Leg Extensions
- Boat Pose Twists
- Boat Knee Tucks

Added Bridge variations:
- Bridge Pose Hold
- Bridge Pulses
- Marching Bridge
- Single-Leg Bridge
- Bridge Walkouts

The library now contains 35 exercises.
Existing exercise IDs and localStorage keys are preserved for compatibility.


VERSION 4 — SPOTIFY / MUSIC MODE
- Added Music Mode (enabled by default).
- Music Mode suppresses all trainer speech/audio output during workouts.
- This helps Spotify or another music app remain the only audio source.
- Added optional vibration cues for exercise changes and completed timers.
- Voice Guidance remains available when Music Mode is switched off.
- Existing sessions, history, exercises and localStorage keys remain compatible.

NOTE
A web/PWA app cannot directly control Android audio focus for Spotify. Music Mode avoids
requesting trainer audio output, which is the most reliable way to prevent the trainer
from interrupting or ducking background music.


VERSION 5 — PROGRESSION, SIDE CARDS, WAKE LOCK, BACKUP, DARK MODE

1. 4-WEEK PROGRESSION
- Added an exact Week 1–4 strength progression to the Train page.
- Each week has Monday Upper Body + Core, Wednesday Legs + Core, and Friday Full Body.
- Session cards show estimated strength time and remaining time available inside a 30-minute day.

2. LEFT / RIGHT EXERCISE HANDLING
- Exercises marked as per-side now automatically create separate LEFT and RIGHT workout cards.
- Applies to movements such as Side Plank, Reverse Lunges, Dead Bug, Bird Dog,
  Boat Pose Twists, Marching Bridge, Single-Leg Bridge and Spiderman Plank.
- Session duration estimates now count both sides.

3. SCREEN WAKE LOCK
- Added an optional Keep Screen Awake setting (enabled by default).
- Uses the Screen Wake Lock API when supported so the display does not sleep during a workout.

4. JSON BACKUP / RESTORE
- Export all saved sessions, history and settings to one JSON file.
- Import a backup on another device/browser or after clearing site data.

5. DARK MODE
- Added System / Light / Dark appearance setting.
- System mode follows the phone/browser color scheme.

All original localStorage keys and exercise IDs remain unchanged for compatibility.


VERSION 6 — GITHUB PAGES + FIREBASE
- Hosting target changed from Netlify to GitHub Pages.
- Added optional Firebase Authentication (Email/Password).
- Added Cloud Firestore sync for sessions, history and settings.
- Added automatic local/cloud merge on sign-in.
- Added automatic sync after local changes.
- Added Cloud Backup and Restore Backup.
- localStorage remains fully functional as the offline/local fallback.
- Added firebase-config.js, firebase-cloud.js, firestore.rules and firebase.json.
- Added .nojekyll for GitHub Pages.
- See GITHUB_FIREBASE_SETUP.txt for setup instructions.

Firebase JavaScript SDK used through the official CDN:
  12.17.1


VERSION 7 — PRIVATE-STYLE LOGIN GATE
- Full-screen Firebase login gate added.
- Trainer UI remains hidden until Authentication confirms a user.
- Create Account, Sign In and Reset Password are available from the gate.
- Sign Out immediately returns to the locked screen.
- GitHub Pages remains public hosting; Firebase rules protect user data.
