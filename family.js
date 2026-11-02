/* My Family: private photos and short greetings, stored locally in IndexedDB. */
'use strict';

const FamilyWorld = (() => {
  const $ = selector => document.querySelector(selector);
  const DB_NAME = 'little-discoveries-family';
  const STORE = 'members';
  const PACK_FORMAT = 'little-discoveries-family-pack';
  const MAX_MEMBERS = 12;
  const MAX_PHOTO_SOURCE = 8 * 1024 * 1024;
  const MAX_PHOTO = 2 * 1024 * 1024;
  const MAX_AUDIO = 4 * 1024 * 1024;
  const MAX_PACK = 35 * 1024 * 1024;
  const RELATIONS = ['mom', 'dad', 'grandparent', 'sibling', 'aunt-uncle', 'other'];
  const RELATION_LABELS = { mom: 'Mom', dad: 'Dad', grandparent: 'Grandparent', sibling: 'Sibling', 'aunt-uncle': 'Aunt or uncle', other: 'Loved one' };
  let dbPromise;
  let onBack = () => {};
  let speak = () => {};
  let soundOn = () => true;
  let draft = emptyDraft();
  let draftImageUrl = null;
  let galleryUrls = [];
  let listUrls = [];
  let gallerySequence = 0;
  let recording = null;
  let mediaStream = null;
  let recordTimer = null;
  let recordDiscarded = false;
  let playing = null;
  let playingUrl = null;

  const escapeHtml = value => String(value).replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[match]));

  function emptyDraft() { return { id: '', name: '', relation: 'mom', photo: null, voice: null }; }
  function message(text, error = false) {
    const node = $('#family-message');
    if (node) { node.textContent = text; node.dataset.error = String(error); }
  }
  function openDb() {
    if (!window.indexedDB) return Promise.reject(new Error('Private storage is unavailable. Try opening this app outside private browsing.'));
    dbPromise ||= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open private family storage.'));
      request.onblocked = () => reject(new Error('Close another Little Discoveries tab and try again.'));
    }).catch(error => { dbPromise = null; throw error; });
    return dbPromise;
  }
  async function allMembers() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
      request.onerror = () => reject(request.error || new Error('Cannot read family cards.'));
    });
  }
  async function memberById(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Cannot open this family card.'));
    });
  }
  async function saveMembers(members) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      for (const member of members) tx.objectStore(STORE).put(member);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not save family cards. Storage may be full.'));
      tx.onabort = () => reject(tx.error || new Error('Family card saving was interrupted.'));
    });
  }
  async function deleteMember(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not delete that family card.'));
    });
  }
  function revokeUrls(urls) { urls.forEach(url => URL.revokeObjectURL(url)); urls.length = 0; }
  function stopAudio() {
    if (playing) { playing.pause(); playing.onended = null; playing.onerror = null; playing = null; }
    if (playingUrl) { URL.revokeObjectURL(playingUrl); playingUrl = null; }
  }
  async function playBlob(blob) {
    stopAudio();
    playingUrl = URL.createObjectURL(blob);
    playing = new Audio(playingUrl);
    const audio = playing;
    audio.onended = () => { if (playing === audio) stopAudio(); };
    audio.onerror = () => { if (playing === audio) stopAudio(); };
    try { await audio.play(); } catch { if (playing === audio) stopAudio(); message('Audio could not play on this device.', true); }
  }
  function newId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `family-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  async function renderGallery() {
    const gallery = $('#family-gallery');
    if (!gallery) return;
    const sequence = ++gallerySequence;
    let members;
    try { members = await allMembers(); }
    catch { gallery.textContent = 'Family photos cannot load right now. A grown-up can try again in My Family Studio.'; return; }
    if (sequence !== gallerySequence || !gallery.isConnected) return;
    revokeUrls(galleryUrls);
    if (!members.length) {
      gallery.innerHTML = `<div class="family-empty"><span aria-hidden="true">💛</span><h2>Our special people</h2><p>Ask a grown-up to add photos of Mom, Dad, and people you love.</p><p class="family-empty-hint">Grown-ups → My Family → Manage</p></div>`;
      return;
    }
    gallery.innerHTML = `<p class="family-gallery-note">Tap a face to hear their greeting. Then point to a real photo together!</p><div class="family-gallery-grid">${members.map(member => {
      const imageUrl = URL.createObjectURL(member.photo);
      galleryUrls.push(imageUrl);
      return `<button class="family-person-card" type="button" data-action="family-play" data-id="${escapeHtml(member.id)}" aria-label="Hear ${escapeHtml(member.name)}"><span class="family-person-photo"><img src="${imageUrl}" alt="${escapeHtml(member.name)}"></span><span class="family-person-overlay"><strong>${escapeHtml(member.name)}</strong><span class="family-person-caption">${member.voice ? '▶ Hear their voice' : '♥ Say hello'}</span></span></button>`;
    }).join('')}</div><aside class="family-offscreen"><span aria-hidden="true">♡</span><div><strong>Try it together</strong><p>Say their name, point to the picture, and give your child time to smile, gesture, or respond. There is no quiz or score.</p></div></aside>`;
  }

  async function play(id) {
    if (!soundOn()) return;
    stopAudio();
    try {
      const member = await memberById(id);
      if (!member) return;
      if (member.voice?.size) await playBlob(member.voice);
      else speak(member.name);
    } catch { message('Voice could not load. You can still say their name together.', true); }
  }

  function updateDraftPhoto() {
    if (draftImageUrl) URL.revokeObjectURL(draftImageUrl);
    draftImageUrl = null;
    const node = $('#family-photo-preview');
    node.replaceChildren();
    if (draft.photo) {
      draftImageUrl = URL.createObjectURL(draft.photo);
      const img = document.createElement('img');
      img.src = draftImageUrl;
      img.alt = 'Chosen family photo';
      node.append(img);
    } else { node.textContent = '♡'; }
    $('#family-play-button').disabled = !draft.voice;
    $('#family-remove-voice').disabled = !draft.voice;
    $('#family-audio-help').textContent = draft.voice
      ? 'A voice greeting is ready. Save this card to keep it.'
      : 'Up to 15 seconds. On iPad, microphone recording requires HTTPS; audio upload also works.';
  }
  function startNewDraft() {
    if (recording) { message('Stop the recording first.', true); return; }
    stopAudio();
    draft = emptyDraft();
    $('#family-member-form').reset();
    $('#family-form-title').textContent = 'Add a family member';
    $('#family-save').textContent = 'Save family card';
    updateDraftPhoto();
    message('Choose a picture and name to make a card.');
  }
  async function editMember(id) {
    if (recording) return;
    const member = await memberById(id);
    if (!member) return;
    draft = { ...member };
    $('#family-member-name').value = member.name;
    $('#family-member-role').value = member.relation;
    $('#family-form-title').textContent = `Edit ${member.name}`;
    $('#family-save').textContent = 'Save changes';
    updateDraftPhoto();
    message('Update the photo or voice, then save your changes.');
  }
  async function renderManager() {
    const list = $('#family-member-list');
    revokeUrls(listUrls);
    let members;
    try { members = await allMembers(); } catch (error) { message(error.message, true); return; }
    list.innerHTML = `<div class="family-list-heading"><strong>Your family cards</strong><span>${members.length} / ${MAX_MEMBERS}</span></div>` + (members.length
      ? members.map(member => {
        const url = URL.createObjectURL(member.photo);
        listUrls.push(url);
        return `<div class="family-list-card"><img src="${url}" alt=""><div><strong>${escapeHtml(member.name)}</strong><small>${RELATION_LABELS[member.relation] || 'Loved one'} · ${member.voice ? 'Voice saved' : 'No voice yet'}</small></div><button class="button light" type="button" data-family-edit="${escapeHtml(member.id)}">Edit</button><button class="family-delete" type="button" data-family-delete="${escapeHtml(member.id)}" aria-label="Delete ${escapeHtml(member.name)}">✕</button></div>`;
      }).join('')
      : `<p class="family-list-empty">No family photos yet. Add the first one below.</p>`);
  }
  async function open() {
    $('#parent-panel').close();
    $('#family-studio').showModal();
    startNewDraft();
    await renderManager();
  }
  function finish() {
    discardRecording(); stopAudio();
    if (draftImageUrl) { URL.revokeObjectURL(draftImageUrl); draftImageUrl = null; }
    revokeUrls(listUrls);
    $('#family-studio').close();
    onBack();
  }

  function resizePhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.size || file.size > MAX_PHOTO_SOURCE || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        reject(new Error('Choose a JPG, PNG, or supported photo under 8 MB.')); return;
      }
      const url = URL.createObjectURL(file);
      const image = new Image();
      const cleanup = () => URL.revokeObjectURL(url);
      image.onload = () => {
        try {
          const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('The photo editor is unavailable.');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            cleanup();
            if (!blob || !blob.size || blob.size > MAX_PHOTO) reject(new Error('This photo is too large to save. Try a smaller picture.'));
            else resolve(blob);
          }, 'image/jpeg', 0.78);
        } catch (error) { cleanup(); reject(error); }
      };
      image.onerror = () => { cleanup(); reject(new Error('The photo could not be opened. Try JPG or PNG.')); };
      image.src = url;
    });
  }

  function isAudio(file) { return file && (file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|webm|mp4|aac)$/i.test(file.name)); }
  function stopRecording() {
    clearTimeout(recordTimer);
    if (recording?.state === 'recording') recording.stop();
  }
  function discardRecording() {
    recordDiscarded = true;
    if (recording) stopRecording();
    else { mediaStream?.getTracks().forEach(track => track.stop()); mediaStream = null; }
  }
  function setRecordingUI(isRecording) {
    $('#family-record-button').textContent = isRecording ? '■ Stop & use greeting' : '● Record greeting';
    $('#family-record-button').classList.toggle('recording', isRecording);
    for (const selector of ['#family-save', '#family-clear', '#family-photo-button', '#family-audio-button', '#family-export', '#family-import-button']) {
      $(selector).disabled = isRecording;
    }
  }
  async function toggleRecording() {
    if (recording) { stopRecording(); return; }
    if (window.isSecureContext === false) { message('Microphone needs HTTPS. Open the secure site in Safari, or record in Voice Memos and upload the audio.', true); return; }
    if (!navigator.mediaDevices?.getUserMedia) { message('Microphone access is not available here. Try the HTTPS website in Safari or upload a Voice Memos file.', true); return; }
    if (!window.MediaRecorder && !VoiceStudio.canUseWavFallback()) { message('No microphone recorder is supported here. Upload a Voice Memos audio clip.', true); return; }
    let audioContext = null;
    try {
      if (!window.MediaRecorder && VoiceStudio.canUseWavFallback()) {
        const Context = window.AudioContext || window.webkitAudioContext;
        audioContext = new Context();
        audioContext.resume().catch(() => {});
      }
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!$('#family-studio').open) { mediaStream.getTracks().forEach(track => track.stop()); mediaStream = null; return; }
      let currentRecorder = null;
      if (window.MediaRecorder) {
        try {
          const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(candidate => window.MediaRecorder.isTypeSupported?.(candidate));
          currentRecorder = new MediaRecorder(mediaStream, type ? { mimeType: type } : undefined);
        } catch (error) { if (!VoiceStudio.canUseWavFallback()) throw error; }
      }
      if (!currentRecorder) {
        if (!audioContext) { const Context = window.AudioContext || window.webkitAudioContext; audioContext = new Context(); }
        currentRecorder = await VoiceStudio.createWavRecorder(mediaStream, audioContext);
      }
      recording = currentRecorder;
      recordDiscarded = false;
      const chunks = [];
      currentRecorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      currentRecorder.onstop = () => {
        clearTimeout(recordTimer);
        mediaStream?.getTracks().forEach(track => track.stop()); mediaStream = null;
        recording = null;
        setRecordingUI(false);
        const blob = new Blob(chunks, { type: currentRecorder.mimeType || chunks[0]?.type || 'audio/mp4' });
        if (recordDiscarded || !$('#family-studio').open) return;
        if (!blob.size || blob.size > MAX_AUDIO) { message('Recording is empty or too large. Try a shorter greeting.', true); return; }
        draft.voice = blob;
        updateDraftPhoto();
        message('Greeting recorded! Save the family card to keep it.');
      };
      currentRecorder.onerror = () => message('The microphone stopped unexpectedly. Try again.', true);
      currentRecorder.start();
      setRecordingUI(true);
      recordTimer = setTimeout(stopRecording, 15000);
      message('Recording now. Say a short, warm greeting, then tap Stop. Maximum 15 seconds.');
    } catch (error) {
      mediaStream?.getTracks().forEach(track => track.stop()); mediaStream = null;
      recording = null;
      if (audioContext?.state !== 'closed') audioContext?.close().catch(() => {});
      setRecordingUI(false);
      message(error?.name === 'NotAllowedError' ? 'Microphone permission denied. Allow microphone access in Safari/iPad settings or upload audio.' : (error?.message || 'Could not start microphone recording.'), true);
    }
  }

  async function saveDraft(event) {
    event.preventDefault();
    if (recording) return;
    const name = $('#family-member-name').value.trim().slice(0, 24);
    const relation = $('#family-member-role').value;
    if (!name) { message('Enter a familiar name, such as Mama or Daddy.', true); return; }
    if (!RELATIONS.includes(relation) || !draft.photo) { message('Choose a family photo before saving.', true); return; }
    try {
      const members = await allMembers();
      if (!draft.id && members.length >= MAX_MEMBERS) { message(`The family album holds up to ${MAX_MEMBERS} people.`, true); return; }
      const now = Date.now();
      const member = { id: draft.id || newId(), name, relation, photo: draft.photo, voice: draft.voice, createdAt: draft.createdAt || now, updatedAt: now };
      await saveMembers([member]);
      await renderManager();
      startNewDraft();
      message(`${name}'s family photo is saved on this device!`);
    } catch (error) { message(error.message, true); }
  }

  async function base64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Unable to prepare the private family pack.'));
      reader.readAsDataURL(blob);
    });
  }
  function fromBase64(encoded, mime, limit) {
    if (typeof encoded !== 'string' || encoded.length > Math.ceil(limit * 4 / 3) + 8 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error('Invalid data in family pack.');
    const binary = atob(encoded);
    if (!binary.length || binary.length > limit) throw new Error('One of the family files is too large.');
    return new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: mime });
  }
  async function exportPack() {
    try {
      const members = await allMembers();
      if (!members.length) { message('Add at least one family member before exporting.'); return; }
      const size = members.reduce((sum, m) => sum + m.photo.size + (m.voice?.size || 0), 0);
      if (size * 1.37 > MAX_PACK) { message('Family pack is too large. Use shorter audio recordings.', true); return; }
      message('Preparing family pack. Keep it private: it includes real photos and voices.');
      const entries = await Promise.all(members.map(async m => ({
        id: m.id, name: m.name, relation: m.relation, createdAt: m.createdAt,
        photo: await base64(m.photo), photoType: m.photo.type,
        voice: m.voice ? await base64(m.voice) : null, voiceType: m.voice?.type || null,
      })));
      const file = new File([JSON.stringify({ format: PACK_FORMAT, version: 1, members: entries })], 'little-discoveries-my-family.json', { type: 'application/json' });
      if (file.size > MAX_PACK) { message('The family pack is too large. Try shorter recordings.', true); return; }
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Little Discoveries - My Family' }); message('Family pack shared.'); return; }
        catch (error) { if (error?.name === 'AbortError') { message('Sharing canceled.'); return; } }
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement('a'); link.href = url; link.download = file.name;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      message('Family pack download started. Keep it private.');
    } catch (error) { message(error.message || 'Could not export the family pack.', true); }
  }
  async function importPack(file) {
    if (!file || file.size > MAX_PACK) { message('Choose a family pack under 35 MB.', true); return; }
    try {
      const data = JSON.parse(await file.text());
      if (data?.format !== PACK_FORMAT || data.version !== 1 || !Array.isArray(data.members) || data.members.length > MAX_MEMBERS) throw new Error('Not a valid Little Discoveries family pack.');
      const seen = new Set();
      const entries = data.members.map(m => {
        if (!m || typeof m.id !== 'string' || !/^[a-z0-9-]{8,80}$/i.test(m.id) || seen.has(m.id)
          || typeof m.name !== 'string' || !m.name.trim() || m.name.length > 24 || !RELATIONS.includes(m.relation)
          || m.photoType !== 'image/jpeg' || (m.voice !== null && m.voice !== undefined && (typeof m.voiceType !== 'string' || !m.voiceType.startsWith('audio/')))) throw new Error('Family pack contains invalid entries.');
        seen.add(m.id);
        const photo = fromBase64(m.photo, m.photoType, MAX_PHOTO);
        const voice = m.voice ? fromBase64(m.voice, m.voiceType, MAX_AUDIO) : null;
        return { id: m.id, name: m.name.trim(), relation: m.relation, photo, voice, createdAt: Number(m.createdAt) || Date.now(), updatedAt: Date.now() };
      });
      const existing = await allMembers();
      if (new Set([...existing.map(m => m.id), ...entries.map(m => m.id)]).size > MAX_MEMBERS) throw new Error('This import would exceed 12 people. Delete unused cards first.');
      if (!entries.length) { message('The family pack is empty.'); return; }
      await saveMembers(entries);
      await renderManager();
      if ($('#family-gallery')) await renderGallery();
      message(`Imported ${entries.length} family cards. Matching cards were updated.`);
    } catch (error) { message(error.message || 'Could not import the family pack.', true); }
  }

  function init({ back, fallback, enabled }) {
    onBack = back; speak = fallback; soundOn = enabled;
    $('#family-open').addEventListener('click', open);
    $('#family-studio-back').addEventListener('click', finish);
    $('#family-studio').addEventListener('cancel', event => { event.preventDefault(); finish(); });
    $('#family-clear').addEventListener('click', startNewDraft);
    $('#family-member-form').addEventListener('submit', saveDraft);
    $('#family-member-list').addEventListener('click', async event => {
      const edit = event.target.closest('[data-family-edit]');
      const remove = event.target.closest('[data-family-delete]');
      if (edit) { try { await editMember(edit.dataset.familyEdit); } catch (error) { message(error.message, true); } }
      if (remove && !recording && window.confirm('Delete this family photo and its voice greeting from this device?')) {
        try {
          await deleteMember(remove.dataset.familyDelete);
          if (draft.id === remove.dataset.familyDelete) startNewDraft();
          await renderManager();
          message('Family card deleted from this device.');
        } catch (error) { message(error.message, true); }
      }
    });
    $('#family-photo-button').addEventListener('click', () => $('#family-photo-file').click());
    $('#family-photo-file').addEventListener('change', async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return;
      try { draft.photo = await resizePhoto(file); updateDraftPhoto(); message('Photo ready. Add a name and save.'); }
      catch (error) { message(error.message, true); }
    });
    $('#family-audio-button').addEventListener('click', () => $('#family-audio-file').click());
    $('#family-audio-file').addEventListener('change', event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return;
      if (!isAudio(file) || !file.size || file.size > MAX_AUDIO) { message('Choose audio under 4 MB (MP3, M4A, WAV or WebM).', true); return; }
      draft.voice = file.slice(0, file.size, file.type || 'audio/mp4');
      updateDraftPhoto(); message('Voice ready. Save the family card to keep it.');
    });
    $('#family-record-button').addEventListener('click', toggleRecording);
    $('#family-play-button').addEventListener('click', () => { if (draft.voice) playBlob(draft.voice); });
    $('#family-remove-voice').addEventListener('click', () => { stopAudio(); draft.voice = null; updateDraftPhoto(); message('Voice removed from this draft. Save changes to apply.'); });
    $('#family-export').addEventListener('click', exportPack);
    $('#family-import-button').addEventListener('click', () => $('#family-import-file').click());
    $('#family-import-file').addEventListener('change', async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) await importPack(file);
    });
  }

  return { init, renderGallery, play, stopAudio };
})();
