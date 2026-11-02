import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = readFileSync(join(root, 'family.js'), 'utf8');
const stored = new Map();
const elements = new Map();
let lastShared;
let fallbackText;
let audioPlays = 0;

function element() {
  const listeners = new Map();
  return {
    listeners, innerHTML: '', textContent: '', value: '', files: [], disabled: false,
    isConnected: true, open: false, dataset: {}, classList: { toggle() {} },
    addEventListener(type, callback) { listeners.set(type, callback); },
    close() { this.open = false; }, showModal() { this.open = true; },
    replaceChildren() {}, append() {}, reset() {}, click() {},
  };
}
function select(selector) {
  if (!elements.has(selector)) elements.set(selector, element());
  return elements.get(selector);
}
function request(result) {
  const resultRequest = {};
  queueMicrotask(() => { resultRequest.result = result; resultRequest.onsuccess?.(); });
  return resultRequest;
}
const db = {
  transaction() {
    const tx = {
      objectStore() {
        return {
          get(key) { return request(stored.get(key)); },
          getAll() { return request([...stored.values()]); },
          put(item) { stored.set(item.id, item); queueMicrotask(() => tx.oncomplete?.()); },
          delete(id) { stored.delete(id); queueMicrotask(() => tx.oncomplete?.()); },
        };
      },
    };
    return tx;
  },
};
const indexedDB = { open() { return request(db); } };
const sharedUrls = new Set();
const URL = {
  createObjectURL() { const value = `blob:family-${sharedUrls.size + 1}`; sharedUrls.add(value); return value; },
  revokeObjectURL(value) { sharedUrls.delete(value); },
};
class ImageMock {
  naturalWidth = 400;
  naturalHeight = 400;
  set src(_source) { queueMicrotask(() => this.onload?.()); }
}
class ReaderMock {
  async readAsDataURL(blob) {
    this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
    this.onload?.();
  }
}
class RecorderMock {
  state = 'inactive';
  mimeType = 'audio/mp4';
  static isTypeSupported(type) { return type === 'audio/mp4'; }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['Hello, little one!'], { type: 'audio/mp4' }) });
    this.onstop?.();
  }
}
class AudioMock {
  play() { audioPlays++; return Promise.resolve(); }
  pause() {}
}
const window = {
  indexedDB, MediaRecorder: RecorderMock, isSecureContext: true,
  crypto: { randomUUID: () => '11111111-2222-4333-8444-555555555555' }, confirm: () => true,
};
const navigator = {
  mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
  canShare: () => true,
  share: async ({ files }) => { lastShared = files[0]; },
};
const document = {
  querySelector: select,
  createElement(name) {
    if (name === 'canvas') return {
      getContext() { return { fillRect() {}, drawImage() {} }; },
      toBlob(callback) { callback(new Blob(['compressed-photo'], { type: 'image/jpeg' })); },
    };
    return element();
  },
};
const context = {
  Blob, File, Buffer, Image: ImageMock, FileReader: ReaderMock, Audio: AudioMock, MediaRecorder: RecorderMock,
  window, document, navigator, URL, indexedDB, atob, console,
  VoiceStudio: { canUseWavFallback: () => false },
  setTimeout: () => 1, clearTimeout() {},
};
vm.createContext(context);
vm.runInContext(`${script}\nglobalThis.family = FamilyWorld;`, context);
const family = context.family;
family.init({ back() {}, fallback: name => { fallbackText = name; }, enabled: () => true });

await select('#family-open').listeners.get('click')();
assert.equal(select('#family-studio').open, true);
assert.match(select('#family-member-list').innerHTML, /No family photos yet/);

const photo = new File(['a photo'], 'dad.jpg', { type: 'image/jpeg' });
await select('#family-photo-file').listeners.get('change')({ target: { files: [photo], value: '' } });
select('#family-member-name').value = 'Daddy';
select('#family-member-role').value = 'dad';

await select('#family-record-button').listeners.get('click')();
assert.match(select('#family-record-button').textContent, /Stop/);
await select('#family-record-button').listeners.get('click')();
assert.match(select('#family-audio-help').textContent, /ready/);

await select('#family-member-form').listeners.get('submit')({ preventDefault() {} });
assert.equal(stored.size, 1);
const [saved] = stored.values();
assert.equal(saved.name, 'Daddy');
assert.equal(saved.photo.type, 'image/jpeg');
assert.equal(saved.voice.size, 'Hello, little one!'.length);

select('#family-gallery').isConnected = true;
await family.renderGallery();
assert.match(select('#family-gallery').innerHTML, /Daddy/);
await family.play(saved.id);
assert.equal(audioPlays, 1);

await select('#family-export').listeners.get('click')();
assert.equal(lastShared.name, 'little-discoveries-my-family.json');
const pack = JSON.parse(await lastShared.text());
assert.equal(pack.format, 'little-discoveries-family-pack');
assert.equal(pack.members.length, 1);
assert.equal(pack.members[0].name, 'Daddy');
assert.ok(pack.members[0].photo);
assert.ok(pack.members[0].voice);

stored.clear();
await select('#family-import-file').listeners.get('change')({ target: { files: [lastShared], value: '' } });
assert.equal(stored.size, 1, 'import restores both photo and voice');
assert.equal([...stored.values()][0].voice.size, 'Hello, little one!'.length);

// An edited member may have no recording, with the name read aloud as a fallback.
stored.get(saved.id).voice = null;
await family.play(saved.id);
assert.equal(fallbackText, 'Daddy');

const badPack = new File([JSON.stringify({
  format: 'little-discoveries-family-pack', version: 1,
  members: [{ ...pack.members[0], name: '<script>alert(1)</script>' }],
})], 'bad-family.json', { type: 'application/json' });
await select('#family-import-file').listeners.get('change')({ target: { files: [badPack], value: '' } });
assert.match(select('#family-message').textContent, /invalid/i);

window.isSecureContext = false;
await select('#family-record-button').listeners.get('click')();
assert.match(select('#family-message').textContent, /HTTPS/);

const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'family.css'), 'utf8');
assert.match(html, /id="family-photo-file"[^>]+hidden/);
assert.match(html, /id="family-audio-file"[^>]+hidden/);
assert.match(css, /input\[hidden\]\s*\{\s*display: none !important/);
assert.match(css, /\.family-person-photo img[^}]*object-fit:\s*contain/s, 'family photos must show the entire uploaded picture');
assert.match(css, /\.family-person-photo img[^}]*height:\s*auto/s, 'family photo height should follow its original aspect ratio');
assert.match(css, /\.family-person-overlay[^}]*position:\s*absolute/s, 'name and voice hint should overlay the photo');
assert.match(script, /class=\"family-person-overlay\"/, 'gallery cards must render the photo overlay');
assert.match(readFileSync(join(root, 'design.css'), 'utf8'), /\.play-tile img[^}]*object-fit:\s*contain/s, 'first-word pictures must not crop');

console.log('Passed: My Family photo resize, local storage, microphone greeting, playback, export/import, invalid packs, HTTPS guidance, hidden inputs.');
