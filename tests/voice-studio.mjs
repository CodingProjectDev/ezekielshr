import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'voice-studio.js'), 'utf8');
const records = new Map();
const elements = new Map();
const timers = [];
const audioPlayed = [];
const fallbackSpoken = [];
let sharedFile;

function makeElement() {
  const listeners = new Map();
  return {
    listeners, open: true, value: '', files: [], disabled: false, dataset: {},
    innerHTML: '', textContent: '', src: '', alt: '',
    classList: { toggle() {} },
    addEventListener(name, listener) { listeners.set(name, listener); },
    querySelectorAll() { return []; },
    close() { this.open = false; },
    showModal() { this.open = true; },
    click() {}, append() {}, remove() {},
  };
}
function element(selector) {
  if (!elements.has(selector)) elements.set(selector, makeElement());
  return elements.get(selector);
}
function fakeRequest(value) {
  const request = {};
  queueMicrotask(() => { request.result = value; request.onsuccess?.(); });
  return request;
}
const fakeDb = {
  transaction() {
    const tx = {
      objectStore() {
        return {
          get(key) { return fakeRequest(records.get(key) || null); },
          getAll() { return fakeRequest(Array.from(records.values())); },
          put(record) { records.set(record.key, record); queueMicrotask(() => tx.oncomplete?.()); },
          delete(key) { records.delete(key); queueMicrotask(() => tx.oncomplete?.()); },
        };
      },
    };
    return tx;
  },
};
const indexedDB = { open() { return fakeRequest(fakeDb); } };
class FakeAudio {
  constructor(src) { this.src = src; }
  play() { audioPlayed.push(this.src); return Promise.resolve(); }
  pause() {}
}
class FakeFileReader {
  async readAsDataURL(blob) {
    const buffer = Buffer.from(await blob.arrayBuffer());
    this.result = `data:${blob.type};base64,${buffer.toString('base64')}`;
    this.onload?.();
  }
}
class FakeMediaRecorder {
  constructor() { this.mimeType = 'audio/webm'; this.state = 'inactive'; }
  static isTypeSupported(type) { return type === 'audio/webm;codecs=opus'; }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['my voice'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}
const navigator = {
  mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
  canShare: () => true,
  share: async ({ files }) => { sharedFile = files[0]; },
};
const window = { indexedDB, MediaRecorder: FakeMediaRecorder, confirm: () => true };
const document = { querySelector: element };
const URL = { createObjectURL: () => 'blob:mock', revokeObjectURL() {} };
const context = {
  Blob, File, Buffer, FileReader: FakeFileReader, Audio: FakeAudio, MediaRecorder: FakeMediaRecorder,
  navigator, window, document, indexedDB, URL, atob,
  setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {}, console,
};
vm.createContext(context);
vm.runInContext(source + '\nglobalThis.studio = VoiceStudio;', context);
const studio = context.studio;
studio.init({
  words: [{ name: 'Sun', src: './assets/first-words/sun.png' }],
  animals: [{ name: 'Cat', src: './assets/animals/cat.png' }],
  adventures: [{ id: 'hello-sun', title: 'Hello Sunshine', image: './assets/first-words/sun.png', steps: [
    { title: 'Look', voice: 'Sun' }, { title: 'Say', voice: 'Hello' }, { title: 'Play', voice: 'Bright day' },
  ] }],
  fallback: text => fallbackSpoken.push(text),
  back: () => {},
});
await element('#voice-studio-open').listeners.get('click')();
await studio.playOrSpeak('words:sun', 'Sun');
assert.deepEqual(fallbackSpoken, ['Sun'], 'missing recording must fall back to device voice');

// A parent's first recording can be captured through the microphone button.
await element('#voice-studio-record').listeners.get('click')();
assert.equal(element('#voice-studio-record').textContent, '■ Stop & save recording');
await element('#voice-studio-record').listeners.get('click')();
await new Promise(resolve => setImmediate(resolve));
assert.equal(records.get('words:sun')?.blob.size, 8, 'recorded audio must be saved in IndexedDB');
await studio.playOrSpeak('words:sun', 'Sun');
assert.equal(audioPlayed.length, 1, 'a stored recording should play instead of speech synthesis');
assert.equal(fallbackSpoken.length, 1, 'playing a stored recording must not trigger robotic fallback');

// A separate imported recording replaces the selected phrase.
const imported = new File(['another voice'], 'sun.webm', { type: 'audio/webm' });
await element('#voice-studio-upload').listeners.get('change')({ target: { files: [imported], value: '' } });
assert.equal(records.get('words:sun')?.blob.size, 13);

// Export/import is a private, single-file way to move voices between devices.
await element('#voice-studio-export').listeners.get('click')();
assert.equal(sharedFile.name, 'little-discoveries-voice-pack.json');
const pack = JSON.parse(await sharedFile.text());
assert.equal(pack.format, 'little-discoveries-voice-pack');
assert.equal(pack.clips.length, 1);
records.clear();
await element('#voice-studio-import').listeners.get('change')({ target: { files: [sharedFile], value: '' } });
assert.equal(records.get('words:sun')?.blob.size, 13, 'imported pack should restore the audio');

await element('#voice-studio-remove').listeners.get('click')();
assert.equal(records.size, 0, 'removal should delete the saved audio');

// A home-screen iPad with a microphone but without MediaRecorder can save WAV.
const processors = [];
class FakeAudioContext {
  constructor() { this.state = 'running'; this.sampleRate = 44100; this.destination = {}; }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  createScriptProcessor() {
    const processor = { onaudioprocess: null, connect() {}, disconnect() {} };
    processors.push(processor);
    return processor;
  }
  createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  resume() { return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
window.MediaRecorder = undefined;
window.AudioContext = FakeAudioContext;
window.isSecureContext = true;
await element('#voice-studio-record').listeners.get('click')();
assert.equal(processors.length, 1, 'WAV fallback should be used without MediaRecorder');
processors[0].onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array([0, 0.5, -0.5, 0.25]) } });
await element('#voice-studio-record').listeners.get('click')();
await new Promise(resolve => setImmediate(resolve));
const wav = records.get('words:sun')?.blob;
assert.equal(wav?.type, 'audio/wav');
assert.equal(wav.size, 52);
assert.equal(Buffer.from(await wav.arrayBuffer()).toString('ascii', 0, 4), 'RIFF');

// No recording code can override the browser's secure-context requirement.
window.isSecureContext = false;
await element('#voice-studio-record').listeners.get('click')();
assert.match(element('#voice-studio-status').textContent, /HTTPS/);

assert.match(readFileSync(join(root, 'voice-studio.css'), 'utf8'), /input\[hidden\].*display: none/);
console.log('Passed: recording, local storage, playback, upload, export/import, iPad WAV fallback, HTTPS diagnostics, hidden file inputs.');
