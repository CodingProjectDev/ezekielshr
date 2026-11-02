/* Little Discoveries V4 — local parent recordings, no accounts or uploads. */
'use strict';

const VoiceStudio = (() => {
  const $ = selector => document.querySelector(selector);
  const DB_NAME = 'little-discoveries-voice-studio';
  const STORE = 'clips';
  const MAX_CLIP_BYTES = 4 * 1024 * 1024;
  const MAX_PACK_BYTES = 30 * 1024 * 1024;
  const MAX_RECORD_SECONDS = 15;
  const PACK_FORMAT = 'little-discoveries-voice-pack';
  let databasePromise;
  let targets = [];
  let category = 'words';
  let selectedKey = '';
  let recorder = null;
  let stream = null;
  let recordingTimer = null;
  let activeAudio = null;
  let activeUrl = null;
  let playGeneration = 0;
  let fallbackSpeak = () => {};
  let onBack = () => {};

  const categories = [
    { id: 'words', label: 'First Words' },
    { id: 'animals', label: 'Animals' },
    { id: 'find-animal', label: 'Find the Animal' },
    { id: 'adventures', label: 'Play Together' },
  ];

  function canUseWavFallback() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    return Boolean(AudioContextClass?.prototype?.createScriptProcessor);
  }

  function showDiagnostics() {
    const label = $('#voice-studio-diagnostics');
    if (!label) return;
    const secure = window.isSecureContext === true ? 'yes' : window.isSecureContext === false ? 'no' : 'unknown';
    const microphone = Boolean(navigator.mediaDevices?.getUserMedia);
    const recorderAvailable = Boolean(window.MediaRecorder);
    label.textContent = `Device check: secure page ${secure} · microphone API ${microphone ? 'available' : 'missing'} · recorder ${recorderAvailable ? 'available' : canUseWavFallback() ? 'WAV fallback available' : 'missing'}.`;
  }

  function wavBlob(chunks, sampleRate) {
    const sampleCount = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    if (!sampleCount) return new Blob([], { type: 'audio/wav' });
    const dataSize = sampleCount * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const write = (offset, string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    write(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
    write(8, 'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, dataSize, true);
    let offset = 44;
    for (const chunk of chunks) {
      for (const value of chunk) {
        const sample = Math.max(-1, Math.min(1, value));
        view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Older iPad WebViews may have microphone access but no MediaRecorder.
  // A short Web Audio capture can still be saved as standard mono WAV.
  async function createWavRecorder(mediaStream, audioContext) {
    const source = audioContext.createMediaStreamSource(mediaStream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const silentOutput = audioContext.createGain();
    silentOutput.gain.value = 0;
    const chunks = [];
    const wavRecorder = {
      state: 'inactive', mimeType: 'audio/wav', ondataavailable: null, onstop: null, onerror: null,
      start() { this.state = 'recording'; },
      stop() {
        if (this.state !== 'recording') return;
        this.state = 'inactive';
        processor.onaudioprocess = null;
        source.disconnect(); processor.disconnect(); silentOutput.disconnect();
        audioContext.close().catch(() => {});
        this.ondataavailable?.({ data: wavBlob(chunks, audioContext.sampleRate) });
        this.onstop?.();
      },
    };
    processor.onaudioprocess = event => {
      if (wavRecorder.state !== 'recording') return;
      chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(silentOutput);
    silentOutput.connect(audioContext.destination);
    await audioContext.resume();
    if (audioContext.state !== 'running') throw new Error('The iPad audio engine did not start. Try Safari or upload a Voice Memos file.');
    return wavRecorder;
  }

  const escapeHtml = input => String(input).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  function status(message, isError = false) {
    const element = $('#voice-studio-status');
    if (element) {
      element.textContent = message;
      element.dataset.error = isError ? 'true' : 'false';
    }
  }

  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('Offline recording storage is unavailable on this device.'));
    databasePromise ||= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open recording storage.'));
      request.onblocked = () => reject(new Error('Close another tab using Little Discoveries and try again.'));
    }).catch(error => { databasePromise = null; throw error; });
    return databasePromise;
  }

  async function getClip(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not load the recording.'));
    });
  }

  async function getClips() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Could not list recordings.'));
    });
  }

  async function putClips(records) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      records.forEach(record => tx.objectStore(STORE).put(record));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not save the recording.'));
      tx.onabort = () => reject(tx.error || new Error('Saving was interrupted.'));
    });
  }

  async function deleteClip(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not remove the recording.'));
    });
  }

  function releaseAudio() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio = null;
    }
    if (activeUrl) { URL.revokeObjectURL(activeUrl); activeUrl = null; }
  }

  function stopPlayback() {
    playGeneration++;
    releaseAudio();
  }

  async function playBlob(blob, fallbackText = '') {
    stopPlayback();
    const generation = playGeneration;
    activeUrl = URL.createObjectURL(blob);
    const audio = new Audio(activeUrl);
    activeAudio = audio;
    const finish = () => {
      if (generation === playGeneration) releaseAudio();
    };
    audio.onended = finish;
    audio.onerror = () => {
      finish();
      if (fallbackText && generation === playGeneration) fallbackSpeak(fallbackText);
    };
    try { await audio.play(); }
    catch {
      finish();
      if (fallbackText && generation === playGeneration) fallbackSpeak(fallbackText);
    }
  }

  async function playOrSpeak(key, text) {
    stopPlayback();
    const generation = playGeneration;
    try {
      const record = await getClip(key);
      if (generation !== playGeneration) return;
      if (record?.blob instanceof Blob && record.blob.size) {
        await playBlob(record.blob, text);
        return;
      }
    } catch { /* Device storage can be unavailable; use speech instead. */ }
    if (generation === playGeneration) fallbackSpeak(text);
  }

  function targetForSelection() {
    const choices = targets.filter(item => item.category === category);
    if (!choices.some(item => item.key === selectedKey)) selectedKey = choices[0]?.key || '';
    return targets.find(item => item.key === selectedKey);
  }

  async function render() {
    const dialog = $('#voice-studio');
    if (!dialog?.open) return;
    const selected = targetForSelection();
    let clips = [];
    try { clips = await getClips(); }
    catch (error) { status(error.message, true); }
    if (!dialog.open) return;
    const saved = new Set(clips.map(item => item.key));
    $('#voice-studio-tabs').innerHTML = categories.map(item => `<button type="button" data-category="${item.id}" class="voice-tab ${item.id === category ? 'active' : ''}" aria-pressed="${item.id === category}">${item.label}</button>`).join('');
    $('#voice-studio-target').innerHTML = targets.filter(item => item.category === category)
      .map(item => `<option value="${item.key}" ${item.key === selectedKey ? 'selected' : ''}>${escapeHtml(item.label)}${saved.has(item.key) ? ' ✓ Saved' : ''}</option>`).join('');
    $('#voice-studio-image').src = selected?.image || './assets/home/hero-bear.png';
    $('#voice-studio-image').alt = selected?.label || '';
    $('#voice-studio-phrase').textContent = selected?.phrase || '';
    $('#voice-studio-state').textContent = saved.has(selectedKey) ? 'Your recording is saved on this device.' : 'No custom recording yet. The device voice is the fallback.';
    $('#voice-studio-count').textContent = `${saved.size} of ${targets.length} voice prompts recorded`;
    $('#voice-studio-play').disabled = !saved.has(selectedKey);
    $('#voice-studio-remove').disabled = !saved.has(selectedKey);
    const locked = Boolean(recorder);
    $('#voice-studio-target').disabled = locked;
    $('#voice-studio-tabs').querySelectorAll('button').forEach(button => { button.disabled = locked; });
    $('#voice-studio-upload-button').disabled = locked;
    $('#voice-studio-import-button').disabled = locked;
    $('#voice-studio-export').disabled = locked;
    $('#voice-studio-record').textContent = locked ? '■ Stop & save recording' : '● Record my voice';
    $('#voice-studio-record').classList.toggle('recording', locked);
  }

  function stopRecording() {
    clearTimeout(recordingTimer);
    if (recorder?.state === 'recording') recorder.stop();
  }

  async function toggleRecording() {
    if (recorder) { stopRecording(); return; }
    showDiagnostics();
    if (window.isSecureContext === false) {
      status('This installed app is not using a secure connection. Open the site with HTTPS in Safari and install it again. HTTP local IP addresses cannot use the microphone.', true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      status('This iPad app does not expose microphone access. Open the original HTTPS website directly in Safari, or record in Voice Memos and upload the audio.', true);
      return;
    }
    if (!window.MediaRecorder && !canUseWavFallback()) {
      status('This browser has no compatible recording engine. Open the HTTPS site in Safari, or use Voice Memos and Upload audio.', true);
      return;
    }
    const key = selectedKey;
    let fallbackContext = null;
    try {
      if (!window.MediaRecorder && canUseWavFallback()) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        fallbackContext = new AudioContextClass();
        fallbackContext.resume().catch(() => {});
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!$('#voice-studio').open) {
        stream.getTracks().forEach(track => track.stop()); stream = null;
        fallbackContext?.close().catch(() => {});
        return;
      }
      let currentRecorder;
      if (window.MediaRecorder) {
        try {
          const supportedType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg']
            .find(type => MediaRecorder.isTypeSupported?.(type));
          currentRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
        } catch (error) {
          if (!canUseWavFallback()) throw error;
        }
      }
      if (!currentRecorder) {
        if (!fallbackContext) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          fallbackContext = new AudioContextClass();
        }
        currentRecorder = await createWavRecorder(stream, fallbackContext);
      }
      recorder = currentRecorder;
      const chunks = [];
      currentRecorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      currentRecorder.onstop = async () => {
        clearTimeout(recordingTimer);
        stream?.getTracks().forEach(track => track.stop());
        stream = null;
        recorder = null;
        const blob = new Blob(chunks, { type: currentRecorder.mimeType || chunks[0]?.type || 'audio/webm' });
        if (!blob.size || blob.size > MAX_CLIP_BYTES) {
          status('Recording was empty or too large. Try a shorter clip.', true);
        } else {
          try { await putClips([{ key, blob, updatedAt: Date.now() }]); status('Voice saved! Tap Play to hear it.'); }
          catch (error) { status(error.message, true); }
        }
        await render();
      };
      currentRecorder.onerror = () => status('The microphone stopped unexpectedly. Try again.', true);
      currentRecorder.start();
      recordingTimer = setTimeout(stopRecording, MAX_RECORD_SECONDS * 1000);
      status(`Recording now. Speak clearly, then tap Stop (maximum ${MAX_RECORD_SECONDS} seconds).`);
      await render();
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      stream = null;
      recorder = null;
      if (fallbackContext?.state !== 'closed') fallbackContext?.close().catch(() => {});
      status(error?.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow it in Safari or iPad settings, then retry.' : (error?.message || 'Could not start recording on this device.'), true);
      await render();
    }
  }

  function isAudioFile(file) {
    return Boolean(file && (file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|opus|webm|aac|mp4)$/i.test(file.name)));
  }

  async function importAudioFile(file) {
    if (!isAudioFile(file) || !file.size || file.size > MAX_CLIP_BYTES) {
      status('Choose an audio file smaller than 4 MB (MP3, M4A, WAV, or WebM).', true);
      return;
    }
    try {
      const blob = file.slice(0, file.size, file.type || 'audio/mp4');
      await putClips([{ key: selectedKey, blob, updatedAt: Date.now() }]);
      status('Audio imported and saved locally.');
      await render();
    } catch (error) { status(error.message, true); }
  }

  function blobAsBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Unable to read an audio recording.'));
      reader.readAsDataURL(blob);
    });
  }

  function blobFromBase64(base64, type) {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length > Math.ceil(MAX_CLIP_BYTES * 4 / 3) + 8) throw new Error('Invalid audio in the voice pack.');
    const binary = atob(base64);
    if (binary.length > MAX_CLIP_BYTES) throw new Error('An audio clip exceeds the 4 MB limit.');
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new Blob([bytes], { type });
  }

  async function exportPack() {
    try {
      const clips = await getClips();
      if (!clips.length) { status('Record or upload a voice before exporting.'); return; }
      const size = clips.reduce((sum, record) => sum + record.blob.size, 0);
      if (size > MAX_PACK_BYTES / 1.4) { status('Voice pack is too large to export at once.', true); return; }
      status('Preparing your private voice pack…');
      const records = await Promise.all(clips.map(async record => ({
        key: record.key, type: record.blob.type, audio: await blobAsBase64(record.blob),
      })));
      const file = new File([JSON.stringify({ format: PACK_FORMAT, version: 1, clips: records })], 'little-discoveries-voice-pack.json', { type: 'application/json' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Little Discoveries Voice Pack' }); status('Voice pack shared.'); return; }
        catch (error) { if (error?.name === 'AbortError') { status('Sharing canceled.'); return; } }
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url; link.download = file.name;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status('Voice pack download started. Keep the file private.');
    } catch (error) { status(error.message || 'Export is not available on this device.', true); }
  }

  async function importPack(file) {
    if (!file || file.size > MAX_PACK_BYTES) { status('Voice pack must be smaller than 30 MB.', true); return; }
    try {
      const contents = JSON.parse(await file.text());
      if (contents?.format !== PACK_FORMAT || contents.version !== 1 || !Array.isArray(contents.clips) || contents.clips.length > targets.length) throw new Error('Not a valid Little Discoveries voice pack.');
      const allowedKeys = new Set(targets.map(target => target.key));
      const records = contents.clips.map(item => {
        if (!allowedKeys.has(item?.key) || typeof item.audio !== 'string' || typeof item.type !== 'string' || !item.type.startsWith('audio/')) throw new Error('The voice pack contains an unknown or invalid recording.');
        return { key: item.key, blob: blobFromBase64(item.audio, item.type), updatedAt: Date.now() };
      });
      if (!records.length) { status('This voice pack is empty.'); return; }
      await putClips(records);
      status(`Imported ${records.length} recordings. Matching recordings were replaced.`);
      await render();
    } catch (error) { status(error.message || 'The voice pack could not be imported.', true); }
  }

  function init({ words, animals, adventures, fallback, back }) {
    fallbackSpeak = fallback;
    onBack = back;
    targets = [
      ...words.map(item => ({ key: `words:${item.name.toLowerCase()}`, category: 'words', label: item.name, phrase: item.name, image: item.src })),
      ...animals.map(item => ({ key: `animals:${item.name.toLowerCase()}`, category: 'animals', label: item.name, phrase: item.name, image: item.src })),
      ...animals.map(item => ({ key: `find-animal:${item.name.toLowerCase()}`, category: 'find-animal', label: `Find the ${item.name}`, phrase: `Where is the ${item.name.toLowerCase()}?`, image: item.src })),
      ...adventures.flatMap(adventure => adventure.steps.map((step, index) => ({
        key: `adventure:${adventure.id}:${index}`, category: 'adventures', label: `${adventure.title} — ${['Look', 'Say', 'Play'][index]}: ${step.title}`,
        phrase: step.voice, image: adventure.image,
      }))),
    ];
    $('#voice-studio-open').addEventListener('click', async () => {
      $('#parent-panel').close();
      $('#voice-studio').showModal();
      showDiagnostics();
      status('Choose a prompt. Your recordings stay on this device.');
      await render();
    });
    $('#voice-studio-back').addEventListener('click', () => {
      stopRecording(); stopPlayback(); $('#voice-studio').close(); onBack();
    });
    $('#voice-studio').addEventListener('cancel', () => { stopRecording(); stopPlayback(); });
    $('#voice-studio-tabs').addEventListener('click', async event => {
      const button = event.target.closest('[data-category]');
      if (!button || recorder) return;
      category = button.dataset.category;
      selectedKey = '';
      await render();
    });
    $('#voice-studio-target').addEventListener('change', async event => {
      if (recorder) return;
      selectedKey = event.target.value;
      await render();
    });
    $('#voice-studio-record').addEventListener('click', toggleRecording);
    $('#voice-studio-play').addEventListener('click', async () => {
      try { const clip = await getClip(selectedKey); if (clip?.blob) await playBlob(clip.blob); }
      catch (error) { status(error.message, true); }
    });
    $('#voice-studio-remove').addEventListener('click', async () => {
      if (!window.confirm('Remove this voice recording from this device?')) return;
      try { await deleteClip(selectedKey); status('Recording removed. Device voice will be used instead.'); await render(); }
      catch (error) { status(error.message, true); }
    });
    $('#voice-studio-upload-button').addEventListener('click', () => $('#voice-studio-upload').click());
    $('#voice-studio-upload').addEventListener('change', async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) await importAudioFile(file);
    });
    $('#voice-studio-export').addEventListener('click', exportPack);
    $('#voice-studio-import-button').addEventListener('click', () => $('#voice-studio-import').click());
    $('#voice-studio-import').addEventListener('change', async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) await importPack(file);
    });
  }

  // Reuse the same iPad-friendly WAV recording fallback in My Family Studio.
  return { init, playOrSpeak, stopPlayback, canUseWavFallback, createWavRecorder };
})();
