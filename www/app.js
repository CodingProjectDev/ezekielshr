/* Little Discoveries Version 2 — local-first, parent-guided play. */
'use strict';

const $ = selector => document.querySelector(selector);
const app = $('#app');
const STORAGE_KEY = 'little-discoveries-v2';

const MODULES = [
  { id: 'words', name: 'First Words', icon: '🍎', tint: 'peach', description: 'Name what you see, together.', intro: 'Explore pictures and say everyday words out loud.' },
  { id: 'shapes', name: 'Colors & Shapes', icon: '🟡', tint: 'lilac', description: 'Notice colors, curves, and corners.', intro: 'Touch a color or shape, then find one nearby.' },
  { id: 'numbers', name: 'Little Numbers', icon: '🔢', tint: 'sky', description: 'Discover numbers 1 to 10 together.', intro: 'Tap the big numbers, listen, and count real toys together.' },
];

const EVERYDAY_WORDS = [
  ['ball', 'Ball'], ['cat', 'Cat'], ['milk', 'Milk'], ['apple', 'Apple'],
  ['water', 'Water'], ['house', 'House'], ['sun', 'Sun'], ['flower', 'Flower'],
  ['book', 'Book'], ['car', 'Car'], ['hand', 'Hand'], ['shoe', 'Shoe'],
].map(([file, name]) => ({ name, file, src: `./assets/first-words/${file}.png` }));

const ANIMALS = [
  ['cat', 'Cat'], ['dog', 'Dog'], ['cow', 'Cow'],
  ['elephant', 'Elephant'], ['bird', 'Bird'], ['sheep', 'Sheep'],
  ['lion', 'Lion'], ['tiger', 'Tiger'], ['hen', 'Hen'],
].map(([file, name]) => ({
  name, file,
  src: `./assets/animals/${file}.png`,
  // Only the original six animals have real moving GIF files. New cards use
  // short offline-safe CSS motion until individual GIF footage is supplied.
  gifSrc: ['cat', 'dog', 'cow', 'elephant', 'bird', 'sheep'].includes(file)
    ? `./assets/animals/${file}.gif` : undefined,
  motionMs: file === 'bird' ? 1400 : ['lion', 'tiger', 'hen'].includes(file) ? 2600 : 3100,
}));

const COLORS = [
  { name: 'Red', color: '#ec746f' }, { name: 'Blue', color: '#74b5df' },
  { name: 'Yellow', color: '#e9c762' }, { name: 'Green', color: '#7fb795' },
  { name: 'Orange', color: '#eba06d' }, { name: 'Purple', color: '#ad97d6' },
];
const SHAPES = [
  { name: 'Circle', shape: 'circle', color: '#e9a96a' },
  { name: 'Square', shape: 'square', color: '#91b69b' },
  { name: 'Triangle', shape: 'triangle', color: '#a99ed2' },
  { name: 'Star', shape: 'star', color: '#e1be64' },
];
const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const AGE_TIPS = {
  '12-17': {
    words: 'Point, name one object, pause, and repeat your child’s sounds. Do not expect a correct answer.',
    shapes: 'Notice one color or round object. Explore with real blocks rather than testing labels.',
    numbers: 'Count one or two real toys while pointing. Hearing numbers is enough for now.',
  },
  '18-23': {
    words: 'Name the picture, invite a word or gesture, and point to something similar nearby.',
    shapes: 'Compare two colors or two shapes with safe, familiar objects.',
    numbers: 'Count up to three blocks together while moving them.',
  },
  '24-36': {
    words: 'Use short sentences about pictures and invite your child to describe them.',
    shapes: 'Sort safe objects by color or shape, while letting your child experiment.',
    numbers: 'Count up to five real objects, touching each one as you count.',
  },
};

// Fifteen parent-led, screen-to-world adventures. Each has three gentle moments.
// The pictures are bundled PNGs and the activities never depend on a server.
const ADVENTURES = [
  {
    id: 'hello-sun', age: '12-17', title: 'Hello, Sunshine', icon: '☀️', image: './assets/first-words/sun.png',
    subtitle: 'Look, point, and say hello to the day.',
    steps: [
      { title: 'Look at the sun', prompt: 'Point to the happy sun in the picture.', caregiver: 'Let your child look first. Follow their gaze and point gently.', voice: 'Sun' },
      { title: 'Say “sun” together', prompt: 'Say “sun” slowly. Pause for a smile, sound, or gesture.', caregiver: 'Any response counts. Repeat their sounds with a warm smile.', voice: 'Sun. Hello, sun!' },
      { title: 'Find daylight', prompt: 'Look at the daylight through a window together.', caregiver: 'Talk about the bright day. Never encourage looking directly at the real sun.', voice: 'Bright day!' },
    ],
  },
  {
    id: 'roll-the-ball', age: '12-17', title: 'Roll the Ball', icon: '⚽', image: './assets/first-words/ball.png',
    subtitle: 'A tiny back-and-forth game.',
    steps: [
      { title: 'See the ball', prompt: 'Show the ball picture. Say “ball.”', caregiver: 'Point once and wait. Your child may look, reach, or babble.', voice: 'Ball' },
      { title: 'Find a soft ball', prompt: 'Bring a large, soft ball onto the floor.', caregiver: 'Choose a ball too large to be a choking hazard and stay close.', voice: 'Here is the ball!' },
      { title: 'Roll it together', prompt: 'Roll the ball gently toward each other.', caregiver: 'Take turns and celebrate reaching or watching, even without rolling back.', voice: 'Ready, roll!' },
    ],
  },
  {
    id: 'peekaboo-bear', age: '12-17', title: 'Peekaboo Bear', icon: '🧸', image: './assets/home/hero-bear.png',
    subtitle: 'Where did the cuddly friend go?',
    steps: [
      { title: 'Meet the bear', prompt: 'Point to the bear and say “bear.”', caregiver: 'Let your child explore the picture without asking for an answer.', voice: 'Bear!' },
      { title: 'Hide a toy', prompt: 'Partly cover a soft toy with a small cloth.', caregiver: 'Keep cloths away from the face and supervise closely.', voice: 'Where is bear?' },
      { title: 'Peekaboo!', prompt: 'Pull the cloth away and smile. Invite your child to try.', caregiver: 'Let your child lead. Repeat only while it feels fun.', voice: 'Peekaboo!' },
    ],
  },
  {
    id: 'little-kitty', age: '12-17', title: 'Little Kitty Sounds', icon: '🐱', image: './assets/animals/cat.png',
    subtitle: 'Look, listen, and make a playful sound.',
    steps: [
      { title: 'Look at the cat', prompt: 'Point to the ears, nose, and whiskers.', caregiver: 'Name just one detail at a time. Watch where your child looks.', voice: 'Cat' },
      { title: 'Make a cat sound', prompt: 'Say “meow” and wait for a sound or smile.', caregiver: 'Copy any sound your child makes. This is a conversation, not a test.', voice: 'Meow!' },
      { title: 'Pretend to be cats', prompt: 'Make tiny cat paws with your hands together.', caregiver: 'Gentle imitation and eye contact are enough.', voice: 'Soft kitty paws' },
    ],
  },
  {
    id: 'clap-and-smile', age: '12-17', title: 'Clap & Smile', icon: '👏', image: './assets/home/tap-discover.png',
    subtitle: 'Two little claps, one big smile.',
    steps: [
      { title: 'Show your hands', prompt: 'Hold up your hands and wave hello.', caregiver: 'Wait for your child to notice or move their hands.', voice: 'Hello, hands!' },
      { title: 'Clap slowly', prompt: 'Clap twice, slowly. One… two!', caregiver: 'Do not move your child’s hands for them. Invite imitation gently.', voice: 'Clap, clap!' },
      { title: 'Take turns', prompt: 'Pause and let your child make the next sound or movement.', caregiver: 'Copy their rhythm—even if it is a tap or a wiggle.', voice: 'Your turn!' },
    ],
  },
  {
    id: 'red-color-hunt', age: '18-23', title: 'Red Color Hunt', icon: '🍎', image: './assets/first-words/apple.png',
    subtitle: 'Find something red in your world.',
    steps: [
      { title: 'Meet red', prompt: 'Look at the apple and say “red.”', caregiver: 'Repeat the color while pointing to the apple.', voice: 'Red apple' },
      { title: 'Find red nearby', prompt: 'Look for a red toy, book, or piece of clothing.', caregiver: 'Offer two familiar objects if your child needs help.', voice: 'Where is red?' },
      { title: 'Show me red', prompt: 'Point to the red object together.', caregiver: 'Celebrate exploring; do not correct a toddler for guessing another color.', voice: 'You found red!' },
    ],
  },
  {
    id: 'find-the-shoes', age: '18-23', title: 'Shoe Detective', icon: '👟', image: './assets/first-words/shoe.png',
    subtitle: 'A familiar word and a little mission.',
    steps: [
      { title: 'Look at the shoe', prompt: 'Point to the picture and say “shoe.”', caregiver: 'Repeat the word and give your child time to respond.', voice: 'Shoe' },
      { title: 'Find a shoe', prompt: 'Ask, “Where is your shoe?” and point if needed.', caregiver: 'Keep the direction simple and use a gesture.', voice: 'Where is your shoe?' },
      { title: 'Put it by its friend', prompt: 'Place the shoe next to the other shoe.', caregiver: 'Help only as much as needed. Name the pair together.', voice: 'Two shoes!' },
    ],
  },
  {
    id: 'animal-conversation', age: '18-23', title: 'Animal Conversation', icon: '🐶', image: './assets/animals/dog.png',
    subtitle: 'Take turns making silly sounds.',
    steps: [
      { title: 'Find the dog', prompt: 'Look at the dog and name what you see.', caregiver: 'Ask “Dog?” while pointing; listen for any attempt to respond.', voice: 'Dog' },
      { title: 'Try a “woof”', prompt: 'Make a gentle dog sound. Invite your child to copy.', caregiver: 'Follow their sound rather than insisting on a perfect “woof.”', voice: 'Woof, woof!' },
      { title: 'Act like puppies', prompt: 'Pat your knees softly like little paws.', caregiver: 'Make room for the child to invent a movement.', voice: 'Puppy paws!' },
    ],
  },
  {
    id: 'stack-and-count', age: '18-23', title: 'Stack & Count', icon: '🧱', image: './assets/first-words/house.png',
    subtitle: 'Build something small together.',
    steps: [
      { title: 'Find two blocks', prompt: 'Put two large, safe blocks on the floor.', caregiver: 'Use age-safe blocks, never small loose pieces.', voice: 'Two blocks' },
      { title: 'One on top', prompt: 'Stack one block on another. Go slowly.', caregiver: 'Show once, then allow your child to explore.', voice: 'Up, up!' },
      { title: 'Count and rebuild', prompt: 'Touch the blocks: “One, two!” Then build again.', caregiver: 'Falling towers are part of the play. Laugh and try together.', voice: 'One, two!' },
    ],
  },
  {
    id: 'water-words', age: '18-23', title: 'Water Words', icon: '💧', image: './assets/first-words/water.png',
    subtitle: 'Splash-free language with everyday cups.',
    steps: [
      { title: 'Look at water', prompt: 'Point to the picture and say “water.”', caregiver: 'Use a familiar word in a calm, clear voice.', voice: 'Water' },
      { title: 'Find a cup', prompt: 'Show an empty, unbreakable cup.', caregiver: 'This can be a dry activity—water is not required.', voice: 'Cup' },
      { title: 'Pretend to pour', prompt: 'Pretend to pour from one cup to another.', caregiver: 'Keep the activity dry and supervised. Let the child imitate.', voice: 'Pour, pour!' },
    ],
  },
  {
    id: 'circle-detective', age: '24-36', title: 'Circle Detective', icon: '🟡', image: './assets/first-words/ball.png',
    subtitle: 'Find round things all around you.',
    steps: [
      { title: 'Spot a circle', prompt: 'Look at the round ball and say “circle.”', caregiver: 'Trace a big circle in the air.', voice: 'Circle' },
      { title: 'Find something round', prompt: 'Look for a plate, wheel, or round toy.', caregiver: 'Let your child choose the object, then talk about its shape.', voice: 'Round and round' },
      { title: 'Sort round things', prompt: 'Put two safe round objects together.', caregiver: 'Describe what is similar. Exact sorting is not required.', voice: 'Two circles!' },
    ],
  },
  {
    id: 'count-three', age: '24-36', title: 'Count to Three', icon: '🔢', image: './assets/first-words/ball.png',
    subtitle: 'Touch, move, and count three toys.',
    steps: [
      { title: 'Choose three toys', prompt: 'Place three large, safe toys in a row.', caregiver: 'Let your child help choose the toys.', voice: 'Three toys' },
      { title: 'Touch and count', prompt: 'Touch each toy: “One… two… three!”', caregiver: 'Move slowly, pairing one word with one toy.', voice: 'One. Two. Three.' },
      { title: 'Try another order', prompt: 'Mix them up and count together again.', caregiver: 'Invite your child to lead. This is exploration, not a quiz.', voice: 'Let’s count!' },
    ],
  },
  {
    id: 'story-builder', age: '24-36', title: 'Little Story Builder', icon: '📚', image: './assets/first-words/book.png',
    subtitle: 'A picture becomes a tiny story.',
    steps: [
      { title: 'Choose a picture', prompt: 'Open a favorite picture book together.', caregiver: 'Let your child choose the page or point to an object.', voice: 'Story time!' },
      { title: 'Wonder aloud', prompt: 'Ask, “What do you see?” and listen.', caregiver: 'Answer together if needed. Expand their word into a tiny phrase.', voice: 'What do you see?' },
      { title: 'Make a little story', prompt: 'Invent one sentence about the picture.', caregiver: 'Follow the child’s idea, however imaginative it is.', voice: 'Once upon a time…' },
    ],
  },
  {
    id: 'flower-explorer', age: '24-36', title: 'Flower Explorer', icon: '🌸', image: './assets/first-words/flower.png',
    subtitle: 'Notice nature with gentle curiosity.',
    steps: [
      { title: 'See the flower', prompt: 'Look at the petals and say “flower.”', caregiver: 'Invite your child to describe a color or shape.', voice: 'Flower' },
      { title: 'Look outside', prompt: 'Find a flower or leaf from a safe place.', caregiver: 'Do not touch or taste unknown plants. Pointing is enough.', voice: 'Hello, flower!' },
      { title: 'Pretend to grow', prompt: 'Crouch down, then stretch up tall like a flower.', caregiver: 'Move together slowly. Let your child choose how the flower grows.', voice: 'Grow, grow!' },
    ],
  },
  {
    id: 'rhythm-copycat', age: '24-36', title: 'Rhythm Copycat', icon: '🥁', image: './assets/home/tap-discover.png',
    subtitle: 'Your hands make the music.',
    steps: [
      { title: 'Tap twice', prompt: 'Tap your knees two times: tap, tap.', caregiver: 'Begin slowly so your child can notice the pattern.', voice: 'Tap, tap!' },
      { title: 'Copy the rhythm', prompt: 'Invite your child to copy your gentle taps.', caregiver: 'A different rhythm is welcome too. Try copying theirs.', voice: 'Your turn!' },
      { title: 'Create a new beat', prompt: 'Make up a silly rhythm together.', caregiver: 'Let your child lead and follow the beat they invent.', voice: 'Make some music!' },
    ],
  },
];

const AGE_GROUPS = [
  { value: '12-17', label: '12–17 months' },
  { value: '18-23', label: '18–23 months' },
  { value: '24-36', label: '2–3 years' },
];
const dailyAdventure = () => {
  const matchingAge = ADVENTURES.filter(item => item.age === prefs.age);
  // Previously saved age values can come from an older app release. Never let
  // an unknown value leave the home screen without a featured adventure.
  const adventures = matchingAge.length ? matchingAge : ADVENTURES.filter(item => item.age === AGE_GROUPS[0].value);
  const today = new Date();
  const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
  return adventures[((dayNumber % adventures.length) + adventures.length) % adventures.length];
};

function defaultPrefs() {
  return { name: '', age: '12-17', sound: true, breakMinutes: 3,
    activities: Object.fromEntries(MODULES.map(module => [module.id, 0])),
    adventuresDone: 0, lastPlayed: '' };
}
function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const defaults = defaultPrefs();
    const age = AGE_GROUPS.some(group => group.value === saved.age) ? saved.age : defaults.age;
    return { ...defaults, ...saved, age, activities: Object.fromEntries(MODULES.map(module => [module.id, saved.activities?.[module.id] || 0])) };
  } catch { return defaultPrefs(); }
}
let prefs = loadPrefs();
let currentModule = null;
let wordsTab = 'everyday';
let shapesTab = 'colors';
let breakTimer = null;
let activeAnimalPlayback = null;
let activeEverydayMotion = null;
let findAnimalRound = null;
let audioContext;
const safeText = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function savePrefs() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* Storage may be unavailable. */ }
}
function countPlay(moduleId) {
  prefs.activities[moduleId] = (prefs.activities[moduleId] || 0) + 1;
  prefs.lastPlayed = new Date().toISOString().slice(0, 10);
  savePrefs();
}
function say(text, voiceKey = null) {
  if (!prefs.sound) return;
  if (voiceKey && typeof VoiceStudio !== 'undefined') {
    VoiceStudio.playOrSpeak(voiceKey, text);
    return;
  }
  speakDeviceVoice(text);
}
function speakDeviceVoice(text) {
  if (!prefs.sound) return;
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(candidate => candidate.lang.toLowerCase().startsWith('en') && candidate.localService)
    || voices.find(candidate => candidate.lang.toLowerCase().startsWith('en'));
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || 'en-US';
  utterance.rate = 0.82;
  utterance.pitch = 1.1;
  speechSynthesis.speak(utterance);
}
function popTone(frequency = 420) {
  if (!prefs.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const tone = audioContext.createOscillator();
    const volume = audioContext.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(frequency, audioContext.currentTime);
    tone.frequency.exponentialRampToValueAtTime(frequency * 0.7, audioContext.currentTime + 0.16);
    volume.gain.setValueAtTime(0.07, audioContext.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.22);
    tone.connect(volume); volume.connect(audioContext.destination);
    tone.start(); tone.stop(audioContext.currentTime + 0.23);
  } catch { /* Audio hardware may be unavailable. */ }
}
function feedback(message) {
  const target = $('#feedback');
  if (target) target.textContent = message;
}
function startBreakTimer() {
  clearTimeout(breakTimer);
  if (!currentModule || !prefs.breakMinutes) return;
  breakTimer = setTimeout(() => {
    window.speechSynthesis?.cancel();
    if (!$('#break-dialog').open) $('#break-dialog').showModal();
  }, Number(prefs.breakMinutes) * 60000);
}

function home() {
  currentModule = null;
  const greeting = prefs.name ? `Hello, ${safeText(prefs.name)}!` : 'Hello, little explorer!';
  const featured = dailyAdventure();
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <span class="pill"><span aria-hidden="true">✦</span> LITTLE MOMENTS, BIG WONDER</span>
        <p class="hero-greeting">${greeting}</p>
        <h1>Play a little.<br><em>Discover a lot.</em></h1>
        <p class="hero-description">A happy place to explore first words, colors, and tiny adventures—with you right by their side.</p>
        <div class="hero-actions"><a class="button primary hero-button" href="#together">Play Together <span aria-hidden="true">→</span></a><span class="hero-helper">15 tiny adventures<br>Parent-led, offline-friendly play.</span></div>
      </div>
      <div class="hero-art" aria-hidden="true"><span class="hero-spark spark-one">✦</span><span class="hero-spark spark-two">✳</span><span class="hero-spark spark-three">●</span><img src="./assets/home/hero-bear.png" alt=""></div>
    </section>
    <section class="today-card" aria-label="Today's little idea">
      <span class="today-symbol" aria-hidden="true"><img src="${featured.image}" alt=""></span>
      <div><span class="eyebrow">TODAY'S LITTLE IDEA · PLAY TOGETHER</span><strong>${featured.title}</strong><p>${featured.subtitle}</p></div>
      <a href="#journey/${featured.id}/0" class="today-link" aria-label="Start ${featured.title}">Start <span aria-hidden="true">↗</span></a>
    </section>
    <a class="family-home-banner" href="#family" aria-label="Open My Family picture cards"><span class="family-banner-icon" aria-hidden="true">💛</span><span class="family-banner-copy"><span class="eyebrow">NEW · YOUR OWN SPECIAL PEOPLE</span><strong>My Family</strong><p>Real family photos. Familiar voices. Little moments together.</p></span><span class="family-banner-arrow" aria-hidden="true">→</span></a>
    <div class="section-heading"><div><span class="eyebrow">PICK A HAPPY ADVENTURE</span><h2>What shall we play?</h2></div><p>Three little ways to learn together</p></div>
    <section class="module-grid" aria-label="Learning areas">
      ${MODULES.map((module, index) => `<a class="module-card module-${module.id}" href="#${module.id}"><span class="module-top"><span class="module-icon ${module.tint}" aria-hidden="true">${module.icon}</span><span class="module-step" aria-hidden="true">0${index + 1}</span></span><span class="module-name"><strong>${module.name}</strong><span class="module-arrow" aria-hidden="true">↗</span></span><p>${module.description}</p></a>`).join('')}
    </section>
    <a class="find-home-banner" href="#find-animal" aria-label="Play Find the Animal">
      <span class="find-home-pictures" aria-hidden="true"><img src="./assets/animals/lion.png" alt=""><img src="./assets/animals/hen.png" alt=""><img src="./assets/animals/tiger.png" alt=""></span>
      <span class="find-home-copy"><span class="eyebrow">A NEW LITTLE GAME</span><strong>Find the Animal!</strong><span>Listen, look, and tap the animal together.</span></span>
      <span class="find-home-arrow" aria-hidden="true">→</span>
    </a>
    <aside class="together-banner"><span aria-hidden="true">♡</span><div><strong>The best part of playtime? You.</strong><p>Point, talk, smile, and follow your child's curiosity. A few moments here can lead to a whole adventure away from the screen.</p></div></aside>`;
}

function renderFamily() {
  app.innerHTML = `<section class="family-stage">
    <div class="activity-top"><a href="#home" class="back-link">← Home</a><span class="eyebrow">PLAY WITH SOMEONE YOU LOVE</span></div>
    <div class="family-stage-header"><span class="family-stage-icon" aria-hidden="true">💛</span><div><span class="eyebrow">FAMILIAR FACES, REAL VOICES</span><h1>My Family</h1><p>Look, point, listen, and say hello together.</p></div></div>
    <div id="family-gallery" aria-live="polite"><p class="family-gallery-note">Opening your family album…</p></div>
  </section>`;
  if (typeof FamilyWorld !== 'undefined') FamilyWorld.renderGallery();
}

function renderTogether() {
  const age = AGE_GROUPS.find(group => group.value === prefs.age) || AGE_GROUPS[0];
  const choices = ADVENTURES.filter(item => item.age === age.value);
  app.innerHTML = `
    <div class="activity-top"><a href="#home" class="back-link">← Home</a><span class="eyebrow">15 LITTLE ADVENTURES · AGES 1–3</span></div>
    <section class="together-intro">
      <div class="together-intro-copy"><span class="pill">♡ MADE FOR GROWN-UPS & LITTLE HANDS</span>
        <h1>Little moments.<br><em>Big discoveries.</em></h1>
        <p>Choose a tiny adventure. Look at a picture, say something together, then put the phone down and play in the real world.</p>
        <span class="journey-intro-note">✦ 3 easy moments per adventure · No scores or timers</span>
      </div><img src="./assets/home/hero-bear.png" alt="Friendly illustrated bear" class="together-intro-bear">
    </section>
    <div class="journey-pick-head"><div><span class="eyebrow">FIND THE RIGHT FIT</span><h2>Choose an age range</h2></div><p>Change this anytime</p></div>
    <div class="journey-age-tabs" role="group" aria-label="Choose an age range">
      ${AGE_GROUPS.map(group => `<button type="button" class="journey-age-tab ${group.value === age.value ? 'active' : ''}" data-action="journey-age" data-value="${group.value}" aria-pressed="${group.value === age.value}">${group.label}</button>`).join('')}
    </div>
    <div class="journey-pick-head"><div><span class="eyebrow">FIVE ADVENTURES FOR ${age.label.toUpperCase()}</span><h2>What feels fun today?</h2></div></div>
    <section class="journey-grid" aria-label="Guided adventures for ${age.label}">
      ${choices.map((item, index) => `<a class="journey-card" href="#journey/${item.id}/0"><span class="journey-card-image"><img src="${item.image}" alt="" loading="lazy"></span><span class="journey-card-body"><span class="journey-card-kicker">ADVENTURE ${index + 1} · 3 MOMENTS</span><strong>${item.title}</strong><span class="journey-card-description">${item.subtitle}</span><span class="journey-card-cta">Let's explore <span aria-hidden="true">↗</span></span></span></a>`).join('')}
    </section>
    <aside class="parent-prompt together-reminder"><span class="symbol" aria-hidden="true">♡</span><div><strong>Grown-up reminder</strong><p>These prompts are for you to guide. Follow your child's interest, take breaks whenever you like, and enjoy the off-screen moments most.</p></div></aside>`;
}

function renderJourney(adventure, stepIndex) {
  const step = adventure.steps[stepIndex];
  const momentLabels = ['LOOK', 'SAY', 'PLAY'];
  const isLast = stepIndex === adventure.steps.length - 1;
  const progress = Math.round((stepIndex + 1) / adventure.steps.length * 100);
  app.innerHTML = `
    <div class="activity-top"><a href="#together" class="back-link">← All adventures</a><span class="eyebrow">MOMENT ${stepIndex + 1} OF ${adventure.steps.length}</span></div>
    <section class="journey-play">
      <div class="journey-play-top"><span class="pill">${adventure.icon} ${adventure.title.toUpperCase()}</span><span class="journey-stage">${momentLabels[stepIndex]}</span></div>
      <div class="journey-progress" aria-label="Moment ${stepIndex + 1} of ${adventure.steps.length}"><span style="width:${progress}%"></span></div>
      <div class="journey-play-content">
        <div class="journey-play-picture"><img src="${adventure.image}" alt="${adventure.title} illustration"></div>
        <div class="journey-play-copy"><span class="eyebrow">A LITTLE MOMENT TOGETHER</span><h1>${step.title}</h1>
          <p class="journey-instruction">${step.prompt}</p>
          <aside class="journey-parent-cue"><span aria-hidden="true">♡</span><div><strong>For your grown-up</strong><p>${step.caregiver}</p></div></aside>
          <div class="journey-controls"><button class="button light journey-voice" type="button" data-action="journey-speak">🔊 Listen</button>
            ${isLast ? '<button class="button primary journey-next" type="button" data-action="journey-finish">We did it together ✓</button>' : `<a class="button primary journey-next" href="#journey/${adventure.id}/${stepIndex + 1}">Next moment →</a>`}
          </div>
        </div>
      </div>
    </section>
    <p class="little-note">There is no correct answer or time limit. Let the real-world play take as long as your child likes.</p>`;
}

function renderJourneyDone(adventure) {
  app.innerHTML = `
    <div class="activity-top"><a href="#together" class="back-link">← All adventures</a><span class="eyebrow">A HAPPY LITTLE MEMORY</span></div>
    <section class="journey-finish"><span class="journey-finish-icon" aria-hidden="true">♡</span><span class="eyebrow">YOU PLAYED TOGETHER!</span>
      <h1>A lovely little moment.</h1><p>You explored <strong>${adventure.title}</strong> together. A smile, a sound, or a shared discovery is enough.</p>
      <img src="${adventure.image}" alt="" class="journey-finish-image">
      <div class="journey-finish-actions"><a class="button primary" href="#together">Choose another adventure →</a><a class="button light" href="#home">Back home</a></div>
      <p class="journey-end-note">Now put the phone away and enjoy your time together.</p>
    </section>`;
}

function activityHeader(moduleId) {
  const module = MODULES.find(item => item.id === moduleId);
  const parentTip = AGE_TIPS[prefs.age]?.[moduleId] || AGE_TIPS['12-17'][moduleId];
  return `<div class="activity-top"><a href="#home" class="back-link">← Home</a><span class="eyebrow">PLAY TOGETHER · AGES 1–3</span></div>
    <div class="activity-heading"><span class="pill">${module.icon} ${module.name.toUpperCase()}</span><h1>${module.name}</h1><p>${module.intro}</p></div>
    <aside class="parent-prompt"><span class="symbol" aria-hidden="true">♡</span><div><strong>Grown-up tip</strong><p>${parentTip}</p></div></aside>`;
}
function renderWords() {
  const items = wordsTab === 'animals' ? ANIMALS : EVERYDAY_WORDS;
  app.innerHTML = activityHeader('words') + `
    <div class="tab-row"><button class="tab ${wordsTab === 'everyday' ? 'active' : ''}" data-action="words-tab" data-value="everyday" aria-pressed="${wordsTab === 'everyday'}">Everyday words</button><button class="tab ${wordsTab === 'animals' ? 'active' : ''}" data-action="words-tab" data-value="animals" aria-pressed="${wordsTab === 'animals'}">Animals</button></div>
    <section class="activity-grid word-photo-grid" aria-label="Picture cards">
      ${items.map((item, index) => `<button class="play-tile word-photo-card" data-action="word" data-index="${index}" ${item.file ? `data-${wordsTab === 'animals' ? 'animal' : 'word'}="${item.file}"` : ''} aria-label="Hear ${item.name} and watch it move"><img src="${item.src}" alt="" loading="lazy"><span class="word-photo-label"><strong>${item.name}</strong></span></button>`).join('')}
    </section><p class="feedback" id="feedback" aria-live="polite"></p>
    <p class="little-note">${wordsTab === 'animals' ? 'Tap an animal to hear its name and see a little movement. Tap again to replay.' : 'Tap a picture to hear the word and watch a little motion. Then look for the real object together.'}</p>`;
}

function beginFindAnimalRound() {
  const targetIndex = findAnimalRound ? (findAnimalRound.targetIndex + 1) % ANIMALS.length : 0;
  const choiceCount = prefs.age === '24-36' ? 3 : 2;
  const choices = [ANIMALS[targetIndex], ANIMALS[(targetIndex + 3) % ANIMALS.length]];
  if (choiceCount === 3) choices.push(ANIMALS[(targetIndex + 6) % ANIMALS.length]);
  // Rotate the choices so the correct picture is not always in the same position.
  const offset = targetIndex % choiceCount;
  findAnimalRound = {
    targetIndex,
    target: ANIMALS[targetIndex],
    choices: [...choices.slice(offset), ...choices.slice(0, offset)],
    completed: false,
  };
}

function sayFindAnimalQuestion() {
  if (!findAnimalRound) return;
  const animal = findAnimalRound.target;
  say(`Where is the ${animal.name.toLowerCase()}?`, `find-animal:${animal.name.toLowerCase()}`);
}

function renderFindAnimal() {
  const choiceCount = prefs.age === '24-36' ? 3 : 2;
  if (!findAnimalRound || findAnimalRound.choices.length !== choiceCount) beginFindAnimalRound();
  const { target, choices, completed } = findAnimalRound;
  const ageNote = prefs.age === '12-17'
    ? 'Grown-up: point and name the animals. Looking or reaching is enough—no need to pick the right one.'
    : 'Grown-up: listen together, give your child time to look, and celebrate curiosity without pressure.';
  app.innerHTML = `
    <div class="activity-top"><a href="#home" class="back-link">← Home</a><span class="eyebrow">A LITTLE LISTEN-AND-FIND GAME</span></div>
    <section class="find-game-heading"><span class="pill">🐾 LOOK · LISTEN · DISCOVER</span><h1>Find the Animal!</h1><p>Can your little explorer find a furry or feathery friend?</p></section>
    <aside class="parent-prompt find-parent-tip"><span class="symbol" aria-hidden="true">♡</span><div><strong>Play gently, together</strong><p>${ageNote}</p></div></aside>
    <section class="find-question-box" aria-label="Animal finding question">
      <span class="find-question-kicker">LET'S LOOK TOGETHER</span>
      <h2>Where is the <strong>${target.name}</strong>?</h2>
      <button type="button" class="button primary find-hear-button" data-action="find-hear" aria-label="Hear the question again">🔊 Hear the question</button>
    </section>
    <section class="find-choices ${choiceCount === 3 ? 'find-three' : ''}" style="--find-columns:${choiceCount}" aria-label="Choose the animal">
      ${choices.map((animal, index) => `<button type="button" class="find-choice ${completed && animal === target ? 'is-found' : ''}" data-action="find-choice" data-index="${index}" aria-label="Picture of ${animal.name}"><img src="${animal.src}" alt="" loading="eager"><span class="find-choice-label"><strong>${animal.name}</strong></span></button>`).join('')}
    </section>
    <div class="find-game-feedback"><p id="find-feedback" role="status" aria-live="polite">${completed ? `You found the ${target.name}! Lovely looking!` : 'Tap any picture to hear its name.'}</p>
      <button type="button" class="button primary find-next-button" id="find-next" data-action="find-next" ${completed ? '' : 'hidden'}>Next animal <span aria-hidden="true">→</span></button>
    </div>
    <p class="little-note find-game-note">No timers, scores, or wrong-answer sounds. Take a break whenever your child is ready.</p>`;
}
function stopEverydayMotion() {
  if (!activeEverydayMotion) return;
  clearTimeout(activeEverydayMotion.timer);
  activeEverydayMotion.card.classList.remove('word-animating');
  activeEverydayMotion = null;
}
function playEverydayMotion(card) {
  stopEverydayMotion();
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
  // Reflow restarts the short illustration animation when the same word is tapped again.
  void card.offsetWidth;
  card.classList.add('word-animating');
  activeEverydayMotion = { card, timer: setTimeout(stopEverydayMotion, 2700) };
}
function stopAnimalPlayback() {
  if (!activeAnimalPlayback) return;
  const { image, card, poster, timer } = activeAnimalPlayback;
  clearTimeout(timer);
  if (image?.isConnected) {
    const stillImage = image.cloneNode(false);
    stillImage.src = poster;
    image.replaceWith(stillImage);
  }
  card.classList.remove('animal-playing');
  card.classList.remove('animal-animating');
  activeAnimalPlayback = null;
}
function playAnimalMotion(card, item) {
  stopAnimalPlayback();
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
  if (!item.gifSrc) {
    // No missing-GIF requests: animate the PNG gently and restore its still state.
    void card.offsetWidth;
    card.classList.add('animal-animating');
    activeAnimalPlayback = { image: null, card, poster: null, timer: setTimeout(stopAnimalPlayback, item.motionMs) };
    return;
  }
  const stillImage = card.querySelector('img');
  if (!stillImage) return;
  // Replacing the image node restarts the GIF at its first frame, including on repeat taps.
  const movingImage = stillImage.cloneNode(false);
  movingImage.src = item.gifSrc;
  stillImage.replaceWith(movingImage);
  card.classList.add('animal-playing');
  activeAnimalPlayback = {
    image: movingImage, card, poster: item.src,
    timer: setTimeout(stopAnimalPlayback, item.motionMs),
  };
}
function renderShapes() {
  const isColors = shapesTab === 'colors';
  app.innerHTML = activityHeader('shapes') + `
    <div class="tab-row"><button class="tab ${isColors ? 'active' : ''}" data-action="shapes-tab" data-value="colors" aria-pressed="${isColors}">Colors</button><button class="tab ${!isColors ? 'active' : ''}" data-action="shapes-tab" data-value="shapes" aria-pressed="${!isColors}">Shapes</button></div>
    <section class="activity-grid" aria-label="${isColors ? 'Colors' : 'Shapes'}">
      ${(isColors ? COLORS : SHAPES).map((item, index) => `<button class="play-tile" data-action="shape" data-index="${index}"><span class="shape-visual" aria-hidden="true" style="--shape-color:${item.color}">${isColors ? '<span class="color-dot"></span>' : `<span class="shape-figure shape-${item.shape}"></span>`}</span><strong>${item.name}</strong></button>`).join('')}
    </section><p class="feedback" id="feedback" aria-live="polite"></p>
    <div class="tab-row" style="margin-top:25px"><a class="button light" href="#bubbles">🫧 Optional bubble play</a></div>`;
}
function renderNumbers() {
  app.innerHTML = activityHeader('numbers') + `<section class="activity-grid numbers-grid" aria-label="Numbers one through ten">
    ${Array.from({ length: 10 }, (_, index) => index + 1).map(number => `<button class="play-tile number-card" data-action="number" data-index="${number}" aria-label="Hear number ${NUMBER_WORDS[number]}"><span class="number-digit" aria-hidden="true">${number}</span><strong>${NUMBER_WORDS[number]}</strong></button>`).join('')}
    </section><p class="feedback" id="feedback" aria-live="polite"></p>
    <p class="little-note">Tap a number to hear its name. Then count toys together at your child's pace.</p>`;
}
function renderBubbles() {
  app.innerHTML = `<div class="activity-top"><a href="#shapes" class="back-link">← Colors & Shapes</a><span class="eyebrow">SENSORY MOMENT</span></div>
    <div class="activity-heading"><span class="pill">🫧 TAP AND DISCOVER</span><h1>Bubble pop</h1><p>A gentle cause-and-effect moment. Take turns with your child.</p></div>
    <div class="bubble-stage" id="bubble-stage" aria-label="Tap bubbles to pop them"></div>
    <p class="feedback" id="feedback" aria-live="polite"></p>
    <aside class="parent-prompt"><span class="symbol">♡</span><div><strong>Play away from the screen</strong><p>Make a big circle with your hands, then pretend to pop it.</p></div></aside>`;
  for (let i = 0; i < 8; i++) addBubble(i);
}
function addBubble(index) {
  const stage = $('#bubble-stage');
  if (!stage) return;
  const bubble = document.createElement('button');
  bubble.className = 'bubble';
  bubble.setAttribute('aria-label', 'Pop bubble');
  bubble.style.left = `${7 + (index % 4) * 25}%`;
  bubble.style.top = `${25 + Math.floor(index / 4) * 185}px`;
  bubble.style.animationDelay = `-${index * 0.3}s`;
  bubble.addEventListener('click', () => {
    bubble.disabled = true;
    bubble.classList.add('popping');
    popTone(320 + index * 48);
    feedback('Pop!');
    countPlay('shapes');
    setTimeout(() => { bubble.remove(); if (stage.isConnected) addBubble(index); }, 300);
  });
  stage.append(bubble);
}
function route() {
  try {
  stopAnimalPlayback();
  stopEverydayMotion();
  clearTimeout(breakTimer);
  window.speechSynthesis?.cancel();
  if (typeof VoiceStudio !== 'undefined') VoiceStudio.stopPlayback();
  if (typeof FamilyWorld !== 'undefined') FamilyWorld.stopAudio();
  const hashPath = location.hash.slice(1).split('/');
  currentModule = hashPath[0];
  switch (currentModule) {
    case 'together': renderTogether(); break;
    case 'journey': {
      currentModule = 'together';
      const adventure = ADVENTURES.find(item => item.id === hashPath[1]);
      const rawStep = hashPath[2] || '0';
      const stepIndex = Number(rawStep);
      if (!adventure) renderTogether();
      else if (rawStep === 'done') renderJourneyDone(adventure);
      else if (Number.isInteger(stepIndex) && stepIndex >= 0 && stepIndex < adventure.steps.length) renderJourney(adventure, stepIndex);
      else renderTogether();
      break;
    }
    case 'words': renderWords(); break;
    case 'find-animal': renderFindAnimal(); break;
    case 'family': renderFamily(); break;
    case 'shapes': renderShapes(); break;
    case 'numbers': renderNumbers(); break;
    case 'bubbles': renderBubbles(); break;
    default: home(); break;
  }
  startBreakTimer();
  window.scrollTo({ top: 0, behavior: 'auto' });
  } catch (error) {
    console.error('Little Discoveries could not load this screen:', error);
    app.innerHTML = `<section class="parent-prompt" role="alert"><span class="symbol" aria-hidden="true">♡</span><div><strong>Let's try again, little explorer.</strong><p>Ask a grown-up to reload this page. Your saved family pictures and recordings are still on this device.</p><button class="button primary" type="button" data-action="retry-start">Try again</button></div></section>`;
  }
}

app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const index = Number(button.dataset.index);
  switch (action) {
    case 'retry-start': location.hash = '#home'; route(); break;
    case 'family-play': {
      if (typeof FamilyWorld !== 'undefined') FamilyWorld.play(button.dataset.id);
      break;
    }
    case 'journey-age': {
      const age = button.dataset.value;
      if (!AGE_GROUPS.some(group => group.value === age)) return;
      prefs.age = age;
      savePrefs();
      renderTogether();
      break;
    }
    case 'journey-speak': {
      const [, id, rawStep] = location.hash.slice(1).split('/');
      const adventure = ADVENTURES.find(item => item.id === id);
      const step = adventure?.steps[Number(rawStep)];
      if (!step) return;
      say(step.voice, `adventure:${adventure.id}:${rawStep}`);
      break;
    }
    case 'journey-finish': {
      const [, id, rawStep] = location.hash.slice(1).split('/');
      const adventure = ADVENTURES.find(item => item.id === id);
      if (!adventure || rawStep !== String(adventure.steps.length - 1)) return;
      prefs.adventuresDone = (Number(prefs.adventuresDone) || 0) + 1;
      prefs.lastPlayed = new Date().toISOString().slice(0, 10);
      savePrefs();
      popTone(500);
      location.hash = `#journey/${adventure.id}/done`;
      route();
      break;
    }
    case 'words-tab': stopAnimalPlayback(); stopEverydayMotion(); wordsTab = button.dataset.value; renderWords(); break;
    case 'find-hear': sayFindAnimalQuestion(); break;
    case 'find-next':
      beginFindAnimalRound();
      renderFindAnimal();
      sayFindAnimalQuestion();
      break;
    case 'find-choice': {
      const animal = findAnimalRound?.choices[index];
      if (!animal || !Number.isInteger(index) || currentModule !== 'find-animal') return;
      say(animal.name, `animals:${animal.name.toLowerCase()}`);
      const feedbackTarget = $('#find-feedback');
      if (!findAnimalRound.completed && animal === findAnimalRound.target) {
        findAnimalRound.completed = true;
        button.classList.add('is-found');
        if (feedbackTarget) feedbackTarget.textContent = `You found the ${animal.name}! Lovely looking!`;
        const nextButton = $('#find-next');
        if (nextButton) nextButton.hidden = false;
        countPlay('words');
      } else if (!findAnimalRound.completed && feedbackTarget) {
        feedbackTarget.textContent = `That's the ${animal.name}. Let's look for the ${findAnimalRound.target.name} together!`;
      }
      break;
    }
    case 'word': {
      const item = (wordsTab === 'animals' ? ANIMALS : EVERYDAY_WORDS)[index];
      if (!item) return;
      if (wordsTab === 'animals') playAnimalMotion(button, item);
      else playEverydayMotion(button);
      say(item.name, `${wordsTab === 'animals' ? 'animals' : 'words'}:${item.name.toLowerCase()}`); feedback(item.name); countPlay('words'); break;
    }
    case 'shapes-tab': shapesTab = button.dataset.value; renderShapes(); break;
    case 'shape': {
      const item = (shapesTab === 'colors' ? COLORS : SHAPES)[index];
      if (!item) return;
      say(item.name); feedback(item.name); countPlay('shapes'); break;
    }
    case 'number': {
      if (!Number.isInteger(index) || index < 1 || index > 10) return;
      say(NUMBER_WORDS[index]); feedback(NUMBER_WORDS[index]); countPlay('numbers'); break;
    }
  }
  if (action !== 'words-tab' && action !== 'shapes-tab') {
    button.classList.add('played');
    setTimeout(() => button.classList.remove('played'), 220);
  }
});

function renderParentPanel() {
  const values = Object.values(prefs.activities);
  const playTaps = values.reduce((sum, value) => sum + value, 0);
  $('#progress-stats').innerHTML = `
    <div class="stat"><strong>${playTaps}</strong><small>play interactions</small></div>
    <div class="stat"><strong>${values.filter(value => value > 0).length}</strong><small>areas explored</small></div>
    <div class="stat"><strong>${Number(prefs.adventuresDone) || 0}</strong><small>adventures together</small></div>`;
  $('#progress-list').innerHTML = MODULES.map(module => `<div class="progress-line"><span>${module.icon} ${module.name}</span><span>${prefs.activities[module.id] || 0} interactions</span></div>`).join('');
  $('#child-name').value = prefs.name;
  $('#age-group').value = prefs.age;
  $('#break-minutes').value = String(prefs.breakMinutes);
  $('#sound-enabled').checked = prefs.sound;
  const voices = window.speechSynthesis?.getVoices() || [];
  const english = voices.find(voice => voice.lang.toLowerCase().startsWith('en'));
  $('#voice-note').textContent = english
    ? (english.localService ? 'An English device voice is available; test it in airplane mode.' : 'An English voice is available but might require internet access.')
    : 'No English speech voice is currently available. Picture cards will still work.';
}
$('#parent-open').addEventListener('click', () => {
  $('#gate-answer').value = ''; $('#gate-error').textContent = '';
  $('#parent-gate').showModal(); $('#gate-answer').focus();
});
$('#gate-cancel').addEventListener('click', () => $('#parent-gate').close());
$('#gate-form').addEventListener('submit', event => {
  event.preventDefault();
  if ($('#gate-answer').value.trim() !== '12') { $('#gate-error').textContent = 'Try again.'; return; }
  $('#parent-gate').close(); renderParentPanel(); $('#parent-panel').showModal();
});
$('#child-name').addEventListener('input', event => {
  prefs.name = event.target.value.slice(0, 24); savePrefs();
  if (!currentModule) home();
});
$('#age-group').addEventListener('change', event => { prefs.age = event.target.value; savePrefs(); });
$('#break-minutes').addEventListener('change', event => { prefs.breakMinutes = Number(event.target.value); savePrefs(); startBreakTimer(); });
$('#sound-enabled').addEventListener('change', event => {
  prefs.sound = event.target.checked;
  if (!prefs.sound) {
    window.speechSynthesis?.cancel();
    if (typeof VoiceStudio !== 'undefined') VoiceStudio.stopPlayback();
  }
  savePrefs();
});
$('#reset-progress').addEventListener('click', () => {
  if (!window.confirm('Clear the locally saved play history? Your preferences will stay.')) return;
  prefs.activities = defaultPrefs().activities;
  prefs.adventuresDone = 0;
  prefs.lastPlayed = '';
  savePrefs(); renderParentPanel();
});
$('#break-done').addEventListener('click', () => { $('#break-dialog').close(); location.hash = 'home'; route(); });

if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => {
  if ($('#parent-panel').open) renderParentPanel();
});
if (typeof VoiceStudio !== 'undefined') VoiceStudio.init({
  words: EVERYDAY_WORDS,
  animals: ANIMALS,
  adventures: ADVENTURES,
  fallback: speakDeviceVoice,
  back: () => { renderParentPanel(); $('#parent-panel').showModal(); },
});
if (typeof FamilyWorld !== 'undefined') FamilyWorld.init({
  fallback: speakDeviceVoice,
  enabled: () => prefs.sound,
  back: () => { renderParentPanel(); $('#parent-panel').showModal(); },
});
const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
const canUseServiceWorker = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if (!isNative && canUseServiceWorker && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => { $('#offline-note').textContent = 'Offline lessons are ready after the first successful visit. Voice audio still depends on the device.'; })
    .catch(() => { $('#offline-note').textContent = 'Offline caching could not be enabled on this device.'; });
} else {
  $('#offline-note').textContent = isNative
    ? 'The Android app bundles its lessons locally; spoken audio depends on the device.'
    : 'Use localhost or HTTPS to enable offline PWA caching.';
}

window.addEventListener('hashchange', route);
route();
