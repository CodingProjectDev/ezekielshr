import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const code = readFileSync(join(root, 'app.js'), 'utf8');
const appListeners = new Map();
const elements = new Map();
const pendingTimers = [];
const makeElement = () => ({
  innerHTML: '', textContent: '', value: '', checked: false, open: false,
  style: {}, dataset: {}, classList: { add() {}, remove() {} },
  addEventListener() {}, append() {}, setAttribute() {}, remove() {},
  showModal() { this.open = true; }, close() { this.open = false; }, focus() {},
});
const getElement = selector => {
  if (!elements.has(selector)) elements.set(selector, makeElement());
  return elements.get(selector);
};
const app = getElement('#app');
app.addEventListener = (name, handler) => appListeners.set(name, handler);
const store = new Map();
// A saved age from an older/incorrect install used to make the home screen
// crash while trying to display the daily adventure.
store.set('little-discoveries-v2', JSON.stringify({ age: 'legacy-1-to-3', name: 'Ezekiel' }));
const location = { hash: '', protocol: 'file:', hostname: '' };
const window = { scrollTo() {}, addEventListener() {}, confirm: () => true };
const context = {
  document: { querySelector: getElement, createElement: makeElement },
  window, location, navigator: {},
  localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
  setTimeout(callback, delay) { pendingTimers.push({ callback, delay }); return pendingTimers.length; },
  clearTimeout(id) { pendingTimers[id - 1] = null; }, console,
};
vm.createContext(context);
vm.runInContext(code + '\nglobalThis.__test = {route, prefs, renderParentPanel, home, ADVENTURES, ANIMALS, playAnimalMotion, stopAnimalPlayback, playEverydayMotion, stopEverydayMotion, getFindRound: () => findAnimalRound};', context);
const run = context.__test;
assert.equal(run.prefs.age, '12-17', 'invalid saved age should migrate to a supported range');
assert.ok(app.innerHTML.includes('What shall we play?'), 'home must render even with a stale saved age');

for (const [hash, marker] of [
  ['#home', 'What shall we play?'],
  ['#family', 'My Family'],
  ['#together', 'Choose an age range'],
  ['#journey/hello-sun/0', 'Look at the sun'],
  ['#journey/hello-sun/1', 'Say “sun” together'],
  ['#journey/hello-sun/2', 'Find daylight'],
  ['#words', 'Everyday words'],
  ['#find-animal', 'Find the Animal!'],
  ['#shapes', 'Colors'],
  ['#numbers', 'Five'],
  ['#bubbles', 'Bubble pop'],
]) {
  location.hash = hash;
  run.route();
  assert.ok(app.innerHTML.includes(marker), `${hash} must display ${marker}`);
}

location.hash = '#words'; run.route();
assert.equal((app.innerHTML.match(/class="play-tile word-photo-card"/g) || []).length, 12, 'everyday words should use full-bleed picture cards');
assert.equal((app.innerHTML.match(/class="word-photo-label"/g) || []).length, 12, 'word labels should overlay the image');
assert.equal((app.innerHTML.match(/data-word="[a-z]+"/g) || []).length, 12, 'all everyday pictures should have distinct tap animations');
assert.ok(!app.innerHTML.includes('animal-play-indicator'), 'word cards should not show play symbols');
const designCss = readFileSync(join(root, 'design.css'), 'utf8');
const mainHtml = readFileSync(join(root, 'index.html'), 'utf8');
assert.ok(mainHtml.includes('app.js?v=6.3.1'), 'the PWA should fetch the repaired app script');
assert.ok(mainHtml.includes('Reload lessons'), 'a failed application load should show a recovery action, not blank content');
const storybookCss = readFileSync(join(root, 'storybook.css'), 'utf8');
assert.ok(mainHtml.includes('href="./storybook.css"'), 'all screens should load the storybook visual theme');
assert.ok(mainHtml.indexOf('href="./storybook.css"') > mainHtml.indexOf('href="./family.css"'), 'storybook theme should load last');
assert.match(storybookCss, /\.module-card\s*\{/, 'story UI must style home modules');
assert.match(storybookCss, /\.play-tile\.word-photo-card\s*\{/, 'story UI must style word and animal photos');
assert.match(storybookCss, /\.find-choice\s*\{/, 'Find the Animal should have large responsive photo choices');
assert.match(storybookCss, /\.find-home-banner\s*\{/, 'Find the Animal should have its own colorful home link');
assert.match(storybookCss, /\.family-person-card\s*\{/, 'story UI must style family cards');
assert.match(storybookCss, /\.voice-studio-modal, \.family-modal/, 'story UI must style parent tools');
assert.match(storybookCss, /prefers-reduced-motion/, 'story UI must respect reduced-motion settings');
for (const animal of ['lion', 'tiger', 'hen']) {
  assert.ok(storybookCss.includes(`[data-animal="${animal}"] img`), `new ${animal} card needs tap-motion styling`);
}
for (const word of ['ball', 'cat', 'milk', 'apple', 'water', 'house', 'sun', 'flower', 'book', 'car', 'hand', 'shoe']) {
  assert.ok(storybookCss.includes(`[data-word="${word}"] img`), `${word} should have an everyday-word animation`);
}
assert.match(designCss, /\.play-tile\.word-photo-card img[^}]*height:\s*auto/s, 'word photos should keep natural height');
assert.match(designCss, /\.word-photo-label[^}]*position:\s*absolute/s, 'word labels should overlay full-image cards');
assert.match(designCss, /\.word-photo-label[^}]*background:\s*linear-gradient/s, 'word captions should use a legible bottom gradient');
assert.match(designCss, /\.play-tile\.word-photo-card \.word-photo-label strong[^}]*color:\s*#fff/s, 'word labels should remain legible on photos');
assert.match(designCss, /\.number-card \.number-digit[^}]*font-size:\s*clamp/s, 'number cards should display large numerals');

location.hash = '#numbers'; run.route();
assert.equal((app.innerHTML.match(/data-action="number"/g) || []).length, 10, 'show ten number cards');
assert.ok(app.innerHTML.includes('number-digit" aria-hidden="true">10'), 'number ten should be a numeral');
assert.ok(!app.innerHTML.includes('number-dots'), 'number cards should not use dot pictures');

location.hash = '#words'; run.route();
vm.runInContext("wordsTab = 'animals';", context);
run.route();
assert.equal((app.innerHTML.match(/assets\/animals\/[a-z]+\.png"/g) || []).length, 9, 'nine animals should start on bundled PNG pictures');
assert.equal((app.innerHTML.match(/data-animal="[a-z]+"/g) || []).length, 9, 'all nine animal cards should have tap targets');
assert.equal((app.innerHTML.match(/animal-play-indicator/g) || []).length, 0, 'animal cards should not show play icons');
assert.ok(!app.innerHTML.includes('src="./assets/animals/cat.gif"'), 'animal GIFs should not autoplay on load');
assert.equal(JSON.stringify(run.ANIMALS.slice(-3).map(animal => animal.name)), '["Lion","Tiger","Hen"]', 'lion, tiger, and hen should be added after the original six');
assert.ok(run.ANIMALS.slice(-3).every(animal => !animal.gifSrc), 'new cards should not request GIFs that have not been provided');
vm.runInContext("wordsTab = 'everyday';", context);

location.hash = '#home'; run.route();
assert.equal((app.innerHTML.match(/class="module-card module-/g) || []).length, 3, 'home screen should show three learning areas');
assert.ok(app.innerHTML.includes('href="#find-animal"'), 'Find the Animal should have a separate home entry outside the three learning modules');
for (const removed of ['Memory & Thinking', 'Music & Movement', 'Real-World Missions']) {
  assert.ok(!app.innerHTML.includes(removed), `${removed} should be absent from home`);
}
for (const legacyHash of ['#memory', '#music', '#missions']) {
  location.hash = legacyHash;
  run.route();
  assert.ok(app.innerHTML.includes('What shall we play?'), `${legacyHash} should return home`);
}
location.hash = '#home'; run.route();
assert.ok(app.innerHTML.includes('TODAY\'S LITTLE IDEA'), 'home screen should include a parent-guided daily play idea');
assert.ok(app.innerHTML.includes('href="#together"'), 'home should link to Play Together');
assert.ok(app.innerHTML.includes('href="#family"'), 'home should link to family picture cards');
assert.equal(run.ADVENTURES.length, 15, 'Play Together must include fifteen adventures');
for (const age of ['12-17', '18-23', '24-36']) {
  assert.equal(run.ADVENTURES.filter(adventure => adventure.age === age).length, 5, `must have five adventures for ${age}`);
}
for (const adventure of run.ADVENTURES) {
  assert.equal(adventure.steps.length, 3, `${adventure.id} should have three moments`);
  assert.ok(existsSync(join(root, adventure.image)), `missing adventure artwork: ${adventure.image}`);
  assert.ok(adventure.steps.every(step => step.prompt && step.caregiver && step.voice), `missing caregiver prompts in ${adventure.id}`);
}

const click = (action, index = 0, value = '') => {
  const button = makeElement();
  button.dataset = { action, index: String(index), value };
  appListeners.get('click')({ target: { closest: () => button } });
};

location.hash = '#find-animal'; run.prefs.age = '12-17'; run.route();
assert.equal((app.innerHTML.match(/data-action="find-choice"/g) || []).length, 2, 'young toddlers should see two large picture choices');
assert.ok(app.innerHTML.includes('data-action="find-hear"'), 'question should have a child-friendly speak button');
assert.ok(app.innerHTML.includes('data-action="find-next" hidden'), 'the next question should wait for a successful discovery');
const firstFindRound = run.getFindRound();
assert.ok(firstFindRound.choices.includes(firstFindRound.target), 'the target animal must always be a possible choice');
assert.equal(new Set(firstFindRound.choices.map(animal => animal.name)).size, 2, 'choices must not repeat an animal');
click('find-hear');
const wrongIndex = firstFindRound.choices.findIndex(animal => animal !== firstFindRound.target);
click('find-choice', wrongIndex);
assert.match(getElement('#find-feedback').textContent, /Let's look for/, 'other answers should get gentle guidance');
assert.equal(firstFindRound.completed, false, 'trying another picture should not end the round');
const findsBefore = run.prefs.activities.words;
click('find-choice', firstFindRound.choices.indexOf(firstFindRound.target));
assert.equal(firstFindRound.completed, true, 'finding the target completes the round');
assert.match(getElement('#find-feedback').textContent, /You found/, 'success should feel encouraging');
assert.equal(getElement('#find-next').hidden, false, 'next button should appear after a find');
assert.equal(run.prefs.activities.words, findsBefore + 1, 'a found animal should count as one First Words interaction');
click('find-choice', firstFindRound.choices.indexOf(firstFindRound.target));
assert.equal(run.prefs.activities.words, findsBefore + 1, 'repeated taps should not inflate progress');
click('find-next');
assert.notEqual(run.getFindRound().target, firstFindRound.target, 'next question should show a different animal');
assert.equal((app.innerHTML.match(/data-action="find-choice"/g) || []).length, 2);
run.prefs.age = '24-36'; run.route();
assert.equal((app.innerHTML.match(/data-action="find-choice"/g) || []).length, 3, 'older toddlers should see three choices');
const olderRound = run.getFindRound();
assert.equal(new Set(olderRound.choices.map(animal => animal.name)).size, 3, 'three-choice round should never repeat pictures');
assert.ok(olderRound.choices.includes(olderRound.target));
run.prefs.age = '12-17';
const voiceCode = readFileSync(join(root, 'voice-studio.js'), 'utf8');
assert.ok(voiceCode.includes("{ id: 'find-animal', label: 'Find the Animal' }"), 'Voice Studio should have a Find the Animal category');
assert.ok(voiceCode.includes('key: `find-animal:${item.name.toLowerCase()}`'), 'parents should be able to record full animal-finding questions');

let currentAnimalImage;
function fakeImage(src) {
  return {
    src, isConnected: true,
    cloneNode() { return fakeImage(this.src); },
    replaceWith(other) { this.isConnected = false; currentAnimalImage = other; },
  };
}
currentAnimalImage = fakeImage(run.ANIMALS[0].src);
const animalCard = {
  querySelector: () => currentAnimalImage,
  classList: { add() {}, remove() {} },
};
const lionClasses = new Set();
const lionCard = {
  classList: {
    add(value) { lionClasses.add(value); },
    remove(value) { lionClasses.delete(value); },
  },
};
run.playAnimalMotion(lionCard, run.ANIMALS[6]);
assert.ok(lionClasses.has('animal-animating'), 'new lion should move on tap even without a GIF file');
const lionTimer = pendingTimers.filter(Boolean).findLast(timer => timer.delay === 2600);
assert.ok(lionTimer, 'new animal motion should stop automatically');
lionTimer.callback();
assert.ok(!lionClasses.has('animal-animating'), 'new animal should settle back to its still picture');
const everydayMotionClasses = new Set();
const everydayCard = {
  classList: {
    add(value) { everydayMotionClasses.add(value); },
    remove(value) { everydayMotionClasses.delete(value); },
  },
};
run.playEverydayMotion(everydayCard);
assert.ok(everydayMotionClasses.has('word-animating'), 'tapping everyday pictures should start their movement');
const wordTimer = pendingTimers.filter(Boolean).findLast(timer => timer.delay === 2700);
assert.ok(wordTimer, 'everyday animation should stop automatically');
wordTimer.callback();
assert.ok(!everydayMotionClasses.has('word-animating'), 'everyday pictures return to rest after animation');
run.playAnimalMotion(animalCard, run.ANIMALS[0]);
assert.ok(currentAnimalImage.src.endsWith('cat.gif'), 'a tap should start the real-motion GIF');
run.playAnimalMotion(animalCard, run.ANIMALS[0]);
assert.ok(currentAnimalImage.src.endsWith('cat.gif'), 'another tap should restart animation');
const finishTimer = pendingTimers.filter(Boolean).findLast(timer => timer.delay === 3100);
assert.ok(finishTimer, 'GIF playback should schedule an automatic stop');
finishTimer.callback();
assert.ok(currentAnimalImage.src.endsWith('cat.png'), 'animation should return to the bundled still image');
context.window.matchMedia = () => ({ matches: true });
run.playAnimalMotion(animalCard, run.ANIMALS[0]);
assert.ok(currentAnimalImage.src.endsWith('cat.png'), 'reduced-motion preferences should prevent animation');
run.playEverydayMotion(everydayCard);
assert.ok(!everydayMotionClasses.has('word-animating'), 'reduced-motion preferences should also prevent everyday animations');
context.window.matchMedia = () => ({ matches: false });
location.hash = '#together'; run.route();
assert.equal((app.innerHTML.match(/class="journey-card"/g) || []).length, 5, 'show five adventures for the selected age');
click('journey-age', 0, '18-23');
assert.equal(run.prefs.age, '18-23', 'age selection should update local preferences');
assert.ok(app.innerHTML.includes('Shoe Detective'), 'new age band should display its adventures');
click('journey-age', 0, '12-17');
location.hash = '#journey/hello-sun/2'; run.route(); click('journey-finish');
assert.equal(run.prefs.adventuresDone, 1, 'completing an adventure should save local progress');
assert.equal(location.hash, '#journey/hello-sun/done');
assert.ok(app.innerHTML.includes('A lovely little moment.'), 'completion should show a gentle finish screen');
run.route();
assert.equal(run.prefs.adventuresDone, 1, 'viewing completion must not add a duplicate count');
location.hash = '#journey/invalid/0'; run.route();
assert.ok(app.innerHTML.includes('Choose an age range'), 'unknown adventure should fail safely');
location.hash = '#words'; run.route(); click('word');
assert.equal(run.prefs.activities.words, findsBefore + 2, 'word tap should track local engagement in addition to the new game');
location.hash = '#numbers'; run.route(); click('number', 10);
assert.equal(getElement('#feedback').textContent, 'Ten', 'tapping 10 should say and show Ten');
assert.equal(run.prefs.activities.numbers, 1, 'tapping number ten should record interaction');
run.renderParentPanel();
assert.ok(getElement('#progress-stats').innerHTML.includes('areas explored'));

run.prefs.name = '<script>alert(1)</script>';
run.home();
assert.ok(!app.innerHTML.includes('<script>'), 'child name must be escaped as text');

const serviceWorker = readFileSync(join(root, 'sw.js'), 'utf8');
const serviceWorkerContext = { self: { addEventListener() {} } };
vm.createContext(serviceWorkerContext);
vm.runInContext(serviceWorker + '\nglobalThis.assetPaths = ASSETS;', serviceWorkerContext);
for (const path of serviceWorkerContext.assetPaths) {
  assert.ok(existsSync(join(root, path.split('?')[0])), `missing offline asset ${path}`);
}
assert.ok(serviceWorkerContext.assetPaths.includes('./assets/animals/cat.gif'), 'offline cache includes animal animations');
assert.ok(serviceWorkerContext.assetPaths.includes('./app.js?v=6.3.1'), 'offline cache stores the repaired app script');
assert.ok(serviceWorkerContext.assetPaths.includes('./assets/animals/cat.png'), 'offline cache includes animal PNG previews');
for (const animal of ['lion', 'tiger', 'hen']) {
  assert.ok(serviceWorkerContext.assetPaths.includes(`./assets/animals/${animal}.png`), `${animal} photo should work offline`);
  assert.ok(!serviceWorkerContext.assetPaths.includes(`./assets/animals/${animal}.gif`), `do not precache missing ${animal} GIF`);
}
assert.ok(existsSync(join(root, 'assets/animals/CREDITS.md')), 'animal footage credits should be included');

const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest')));
assert.equal(manifest.display, 'standalone');
assert.ok(existsSync(join(root, 'android/app/src/main/AndroidManifest.xml')));
console.log('Passed: standalone Find the Animal game, age-adjusted choices, gentle feedback, parent voice prompts, numbers 1–10, nine animals, GIFs, PWA, Android.');
