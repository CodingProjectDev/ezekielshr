# Little Discoveries — Version 6.3.1: Blank-screen recovery

Parent-guided toddler learning app, built from your original Little Discoveries English PWA. The same web code is used for an installable PWA and a Capacitor Android app. Everything visible in the web experience is bundled locally.

## Version 6.3.1: Blank-screen recovery update

- Fixes a home-screen rendering failure that can occur when the device has an old or unexpected saved age setting.
- Adds a visible recovery message if the application fails to load, rather than showing only the header and footer with an empty area.
- Forces the iPad PWA to request the updated application scripts and refreshes the service-worker cache; lesson code and styles refresh from the network while online but remain available from cache when offline.
- Install over V6.3 or V6.2, keep the existing assets/family recordings, then rebuild or redeploy the complete web bundle. The updated `index.html` is required for the startup fallback.

## Version 6.3: Standalone Find the Animal! game

- A new **Find the Animal!** home-screen banner opens its own game at `#find-animal`, outside the original three learning areas. The three learning cards, First Words, My Family and all other activities remain in place.
- The game uses existing full-photo animal assets. Children tap one of two large pictures (ages 12–23 months) or three (ages 24–36 months), while a parent can replay **Where is the lion?** and other questions.
- There are no timers, scores, harsh sounds or penalties: every tap names the chosen animal, another animal gets a gentle invitation to look again, and a successful find lets the child move to the next question.
- Parent Voice Studio now has a **Find the Animal** recording category for the full question for each of the nine animals. To record, open Grown-up Area → My Voice Studio → Find the Animal, choose an animal, and record the complete question. Recordings remain stored locally on the device; the app uses its device speech when no recording is available.
- A service-worker cache update makes this new game available offline after the PWA updates. No new internet calls, images, accounts or permissions were added.

## Version 6.2: Lion, Tiger, and Hen

- Added three new realistic, blue-background animal PNG picture cards: **Lion**, **Tiger**, and **Hen**. Animals now has nine large photo cards, all tappable to say their name.
- The original six GIF animations still play on tap. The three new cards use gentle built-in CSS tap motion because no true GIF footage is yet bundled for those animals; no missing GIFs are requested.
- Parent Voice Studio now automatically includes voice-recording slots for all nine animals.
- The new photos are AI-generated. The PWA offline cache includes them, so they also appear on an installed iPad when the update is deployed.

## Version 6.1.1: Picture animation and cleaner cards

- Removed all visible play-triangle badges from animal cards. The whole photo remains tappable and existing animal GIFs still play normally.
- Everyday Words now have twelve short, word-specific, CSS-powered movement effects when tapped. They use your existing photos and do not attempt to load missing GIF files. The still photo is restored automatically after each movement.
- Motion honors the device's reduced-motion setting, and the offline cache was refreshed for installed PWAs.
- These lightweight photo effects are **not** independently filmed GIF animations. Realistic motion within each object requires actual GIF or animated-image files for those words.

## Version 6.1: Complete visual refresh

- `storybook.css` provides a unified toddler-friendly theme across the home screen, First Words and Animals, Colors & Shapes, Numbers 1–10, parent-guided adventures, My Family, and all grown-up dialogs.
- The interface has larger tap targets, high-contrast labels, soft colorful learning cards, clearer parent guidance, and responsive iPad/phone layouts.
- Your existing PNG pictures, animal GIFs, family album, voice recordings, and learning activities are preserved. No account, ads, or network assets were added.
- The three learning areas remain First Words, Colors & Shapes, and Little Numbers; other previously removed areas were not reintroduced.
- Animal cards now show the bundled `assets/animals/*.png` pictures when idle instead of pointing to missing `*-poster.png` files; GIF playback on tap is unchanged.
- Both the PWA and Android web build include `storybook.css`, and the service-worker cache version has been updated for installed iPads.

The older design notes below are historical and may no longer describe the current card styling.

## Version 5.5: Unobstructed photos and clear words

- The large floating word pill from V5.4 has been removed because it covered the object being taught.
- Everyday Words and Animals now display the entire picture edge to edge at its natural proportions, with a slim pastel caption directly below the image.
- Alternating peach, lavender, and mint captions match the calm toddler-friendly design. The entire card remains one large tap target.
- The My Family layout, recordings and export/import functionality are unchanged.

## Version 5.4: No dark band over the pictures

- Everyday Words and Animals keep their edge-to-edge, naturally colored images.
- Replaced the dark bottom gradient with a small, warm cream-colored word label and dark green text.
- The photo remains visible and bright throughout the card while the word stays easy to read and tap.
- The My Family photo layout and all recordings remain unchanged.

## Version 5.3: Full-photo First Words and Animals

- Everyday Words and Animals use the same full-bleed image card design as My Family: no inset picture frame, no white margins added by the card, and no image cropping.
- Each picture keeps its natural aspect ratio, so portrait and landscape images can produce different card heights.
- The word appears on an accessible contrast gradient over the bottom of the image. The entire card remains the tap target, playing the parent's recording first where available.
- Only First Words and Animals use the full-image treatment; other learning areas keep their existing interactive layouts.

## Version 5.2: Photo fills the family card edge to edge

- Removed the inner cream-colored photo frame and padding from My Family cards.
- A parent's photo now spans the entire width and natural height of the card, preserving its aspect ratio rather than cropping any part of the face or body.
- Family name and the voice prompt appear over a soft dark gradient at the bottom of the photo, so the card itself is the photograph.
- Cards with portrait and landscape photos may have different heights by design. This is necessary to show each photo completely without cropping or stretching.

## Version 5.1: Show the whole picture

- My Family cards now display the **entire portrait photo**, including the top of the head and full body, instead of cropping it into a square. Narrow portrait images may show a little neutral background on each side so no part is cut off.
- Family cards are centered and larger, with one big card per row on narrow devices.
- First Words and Animals picture cards also display their **full PNG image**, including edge details such as the sun's rays, with larger illustrations across the card width.
- The PWA's offline cache version was updated so an installed iPad can receive the revised CSS after reloading online.

## New in Version 5: My Family 💛

From the home screen, choose **My Family**. Children see large cards made from *their own family photos*, and can tap a face to hear that person's short greeting. A grown-up should sit with them, name the person, wait for a response, and look at real photos together.

### Add a photo and a real voice

1. Choose **Grown-ups**, answer the arithmetic check, then select **My Family → Manage**.
2. Enter the familiar name your child hears (for example, Mama, Daddy, or Grandma) and select a family connection.
3. Choose a clear photo. The app reduces it to a private JPEG no wider than 900 pixels; source photos may be up to 8 MB. It stores that photo in the device's IndexedDB rather than your source folder.
4. Optionally select **Record greeting** and speak for up to 15 seconds, or **Upload audio** using MP3/M4A/WAV or another supported format (4 MB maximum). A recorded greeting isn't kept until you tap **Save family card**.
5. Tap **Save family card**. You can add up to 12 family members, edit them, and remove them later.

These family picture cards are separate from the three learning areas. When no recorded greeting exists, the app can say the saved family name using the device's English speech voice if enabled. There are no quizzes or scores for family photos.

### Share with another device

- **Export family pack** prepares a private JSON file containing saved family photos and their voice greetings.
- **Import family pack** restores the photos and voices on another device, updating matching family cards. It does not overwrite unrelated local cards. The file is limited to 35 MB and the album to 12 people.
- **Security:** The exported JSON file is **not encrypted** and includes sensitive family photos and voices. Share it privately and delete unnecessary copies. A person who can open that file can see its photos and listen to its recordings.
- No cloud sync, accounts, remote uploads, or live sharing are implemented. On-device storage can be cleared by the operating system or by uninstalling; keep a private export backup.
- Microphone access still requires a real secure context (HTTPS for an installed iPad PWA). If an iPad won't record, use iPad Voice Memos and **Upload audio**. An HTTP local-network address cannot be made microphone-compatible by installing its shortcut.

### What's new in the code

`family.js` and `family.css` implement the independent family album, gated editing interface, voice capture with the existing Web Audio WAV fallback where necessary, and JSON transfer. `sw.js`, the PWA build script and generated Android bundle include both files. Family photos and voices are stored in their own IndexedDB database, not in the service worker's static file cache.

**Device testing:** Automated tests exercise saving, recording, playback and pack transfer, but a real iPad/Android microphone session still needs testing. HTTPS permissions cannot be simulated by the tests.

## New: My Voice Studio (real parent voices)

Open **Grown-ups**, solve the parent check, then choose **My Voice Studio**.

1. Choose **First Words**, **Animals**, or **Play Together**. The Play Together list offers separate voice prompts for each of its 45 steps.
2. Choose a word or prompt and tap **Record my voice**. Grant microphone access, speak naturally, and tap **Stop & save**. Clips automatically stop after 15 seconds and are limited to 4 MB.
3. Or tap **Upload audio** to import a parent recording from a phone or computer (MP3, M4A, WAV, WebM and other device-supported audio formats).
4. Tap **Play recording** to check your audio. If you dislike it, record again or remove it.
5. When the child taps the corresponding word/animal or chooses **Listen** in a Play Together adventure, the saved clip plays first. If there is no clip or the device cannot play it, the English device voice remains the fallback where available.

Recordings are stored locally in IndexedDB, separate from normal progress preferences. They do not automatically sync between phones. To share them, choose **Export voice pack** (a private JSON file), transfer that file to another device, then choose **Import voice pack** on that device. Importing a pack replaces matching recordings but leaves other local recordings alone.

**Important limitations:** Microphone recording needs permission and a secure context (HTTPS or localhost) on the PWA. The Android project declares microphone permissions and must still be tested on a real device. Downloading or sharing a voice pack can behave differently inside an Android WebView, depending on device support. Keep backup exports somewhere private: clearing browser/app data or uninstalling the app can erase recordings. Voice-pack files contain unencrypted personal voices, so share them only with trusted people.

### iPad / installed PWA troubleshooting (V4.1)

- The two audio file picker inputs stay hidden until **Upload audio** or **Import voice pack** is tapped.
- Voice Studio now shows whether its page is secure, whether microphone access is exposed, and whether the built-in recorder or the short WAV fallback is available.
- An iPad browser that exposes `getUserMedia()` but lacks `MediaRecorder` can try the Web Audio WAV recorder. This compatibility fallback uses the older `ScriptProcessorNode` API; test it on your actual iPad, because support differs across WebViews.
- **Crucial:** `http://192.168.x.x:5500` is not a secure origin, even if you added the page to the iPad Home Screen. The microphone remains unavailable there. Host the app over HTTPS, open that HTTPS URL in Safari, and add it to the Home Screen again. `http://localhost` is only a suitable exception when the browser and server run on the same device.
- If installed PWA capture still fails after HTTPS and microphone permission, open the same HTTPS page directly in Safari or record with iPad Voice Memos and **Upload audio**. The app never bypasses browser/device microphone restrictions.

## New: Play Together

Open **Play Together** from the home screen to choose from **15 parent-guided adventures**. There are five activities for each age range (12–17 months, 18–23 months, and 2–3 years). Every adventure has three short moments: **Look**, **Say**, and **Play**.

- Each stage shows a large local PNG illustration, a simple prompt, and a caregiver tip.
- The optional **Listen** button uses speech synthesis when the device has an available English voice; a parent can always say the words instead.
- No timers, quizzes, scores, ads, sign-in, or internet requests. A screen-break reminder remains available in Grown-ups settings.
- Finishing an adventure records a simple local count in the parent panel; it does not assess developmental progress.
- Today’s featured adventure rotates locally among the five adventures for the selected age band.
- The three home learning areas are First Words, Colors & Shapes, and Little Numbers.

For infants under 18 months, treat this as a parent-facing prompt to play with your child away from the screen. Real-world interaction matters much more than screen activity.

## Toddler-friendly design refresh

- New pastel home screen with welcoming illustration, large **Let's play** button, and a simple daily play idea.
- Three colorful learning cards with oversized icons and easy-to-tap targets; responsive layouts for phones and tablets.
- Larger picture cards and accessible labels, plus calmer, consistent activity screens and parent controls.
- The `design.css` visual layer is separate from the original `style.css`, so you can customize the theme without changing activity logic.
- All refreshed styles, Voice Studio and My Family scripts are included in the offline cache and Android web bundle; no network fonts or images are required.

## Three learning areas

1. **First Words** — everyday pictures and six animal cards showing a still frame from each real-motion GIF. Tap an animal to play its motion once, then return to the same still frame; replay with another tap. The animal name is spoken using device speech or a parent's recording where available. Reduced-motion devices keep the card still.
2. **Colors & Shapes** — tap colors and shapes, and optional bubble pop.
3. **Little Numbers** — large, colorful numerals 1 to 10; tap to hear each number spoken aloud. No dots or timed quizzes.

The six animal GIFs use actual motion footage, not zoom effects, and are credited in Grown-ups settings and `assets/animals/CREDITS.md`. They increase offline download size, so allow the first installation to finish caching while online.

The standalone Memory & Thinking, Music & Movement, and Real-World Missions learning areas have been removed from the home screen and app routes. The separate parent-guided Play Together adventures remain available.

The parent area includes age-tailored tips for 12–17 months, 18–23 months, and 2–3 years, a short break reminder, voice on/off, and local interaction and completed-adventure counts. The app does **not** calculate intelligence, offer clinical developmental assessments, or collect user accounts or analytics.

## Run the PWA locally on your Mac

1. Open this folder in VS Code.
2. In the terminal, run:

   ```bash
   python3 -m http.server 5500
   ```

3. Open <http://localhost:5500>.
4. For install and offline testing, use localhost or deploy over HTTPS, then visit once online to cache all artwork. A browser may require you to reload after the service worker first activates.

There is no Node dependency for the PWA itself. The browser provides Web Speech and Web Audio. Spoken words may be unavailable offline on some devices; you should test voice behavior on the target phone.

## Build the Android app (Capacitor)

The ZIP includes the **generated Android Studio project in `android/`**, Capacitor configuration, and build scripts. It does **not** contain a compiled APK. To run it on your Mac:

1. Install Node.js 22+ and Android Studio with an Android SDK.
2. Inside this folder, run:

   ```bash
   npm install
   npm run build
   npm run android:sync
   npx cap open android
   ```

3. In Android Studio, wait for Gradle sync, connect a phone or start an emulator, and click Run.
4. When you change `app.js`, CSS, or images, run `npm run android:sync` before rebuilding the Android application.

**Before publishing:** The generated native project currently uses the placeholder app ID `com.example.littlediscoveries`. Choose a unique permanent package ID and update both `capacitor.config.json` and the corresponding Android Gradle/Java namespace and package settings. Changing only the Capacitor config does not rename an existing native project. Prepare app icons, a privacy policy, age-appropriate content review, and verify all Google Play Families policy requirements. Publishing a child-directed app is separate from getting it to run locally.

## Replace images with your own

- `assets/animals/` — 6 animal cards.
- `assets/first-words/` — 12 everyday picture cards.
- `assets/home/` — 4 placeholder illustrations.
- App icons are at the project root.

All learning cards and homepage illustration assets are now real **PNG files**, not renamed SVGs. The existing custom `sun.png` was preserved. The other picture-card PNGs use bundled, recolored layout cards with Twemoji illustrations; see `ASSET_CREDITS.md` for attribution. Replace them with your own images using the same PNG filenames, then build/sync again. Bump `CACHE` in `sw.js` when publishing updated cached files.

## Privacy, screen use, and limits

- Progress counts live in browser/device `localStorage`; they do not sync between devices and disappear when storage is cleared.
- There are no ads, third-party analytics, accounts, remote fonts, or external audio/image requests. Family photos and voices are private to the device unless exported by the parent.
- `parent-gate` is a basic arithmetic gate, not security or authentication.
- Fullscreen and PWA installation do not prevent a child leaving the app. Android screen pinning may help.
- Design intent is **brief parent-child interactions** followed by real-world play. For children under 18 months especially, in-person engagement is more important than screen activities. Follow your pediatrician's advice about screen media.

## Project layout

```text
index.html / style.css / design.css / voice-studio.css / family.css / app.js / voice-studio.js / family.js   PWA source
sw.js / manifest.webmanifest     Offline and install metadata
assets/                        Bundled placeholders
scripts/build-web.mjs          Generates web bundle for Android
www/                           Included generated web bundle
android/                       Included native Android Studio project
package.json                   Capacitor dependencies and scripts
capacitor.config.json          Android app configuration
```
