/* Little Discoveries — private, device-only learning picture manager. */
'use strict';
const LDPictures = (() => {
  const $ = selector => document.querySelector(selector);
  const DB_NAME = 'little-discoveries-local-pictures';
  const STORE = 'pictures';
  const MAX_IMAGE = 8 * 1024 * 1024;
  const MAX_ITEMS = 60;
  const MAX_IMPORT = 70 * 1024 * 1024;
  const PACK_ID = 'little-discoveries-picture-backup';
  const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const BUILTIN = {
    everyday: [['ball','Ball'],['cat','Cat'],['milk','Milk'],['apple','Apple'],['water','Water'],['house','House'],['sun','Sun'],['flower','Flower'],['book','Book'],['car','Car'],['hand','Hand'],['shoe','Shoe']],
    animals: [['cat','Cat'],['dog','Dog'],['cow','Cow'],['elephant','Elephant'],['bird','Bird'],['sheep','Sheep'],['lion','Lion'],['tiger','Tiger'],['hen','Hen']],
  };
  let dbPromise;
  let loaded = false;
  let records = [];
  let visual = new Map();
  let editing = null;
  let chosenBlob = null;
  let previewUrl = null;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uuid = () => (globalThis.crypto?.randomUUID?.() || `pic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  const errorText = err => err?.name === 'QuotaExceededError' ? 'Device storage is full. Remove a picture or free up space.' : (err?.message || 'Could not save picture on this device.');

  function database() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('Photo storage is unavailable in this browser.'));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath:'id' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Unable to open private picture storage.'));
    }).catch(error => { dbPromise = null; throw error; });
    return dbPromise;
  }
  async function readAll() {
    const db = await database();
    return new Promise((resolve,reject) => {
      const req = db.transaction(STORE,'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Unable to read photos.'));
    });
  }
  async function writeRecord(record) {
    const db = await database();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save photo.'));
      tx.onabort = () => reject(tx.error || new Error('Save was cancelled.'));
    });
  }
  async function deleteRecords(ids) {
    const db = await database();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(STORE,'readwrite');
      ids.forEach(id => tx.objectStore(STORE).delete(id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not remove photo.'));
      tx.onabort = () => reject(tx.error || new Error('Remove was cancelled.'));
    });
  }
  async function refresh() {
    const fresh = await readAll();
    const next = new Map();
    for (const r of fresh) {
      if (!(r.picture instanceof Blob)) continue;
      const src = URL.createObjectURL(r.poster instanceof Blob ? r.poster : r.picture);
      next.set(r.id, { ...r, src, gifSrc: r.picture.type === 'image/gif' ? URL.createObjectURL(r.picture) : undefined });
    }
    const old = visual;
    records = fresh;
    visual = next;
    loaded = true;
    window.dispatchEvent(new Event('ld-pictures-changed'));
    for (const item of old.values()) {
      URL.revokeObjectURL(item.src);
      if (item.gifSrc) URL.revokeObjectURL(item.gifSrc);
    }
    renderList();
  }
  function getItems(category, defaults) {
    if (!loaded) return defaults;
    const categoryPictures = [...visual.values()].filter(r => r.category === category);
    const replacements = new Map(categoryPictures.filter(r => r.replaces).map(r => [r.replaces, r]));
    const base = defaults.map(item => {
      const repl = replacements.get(item.file);
      if (!repl) return item;
      return { ...item, src: repl.src, gifSrc: repl.gifSrc, motionMs: repl.gifSrc ? 3100 : 2600, localPicture: true };
    });
    const additions = categoryPictures.filter(r => !r.replaces).sort((a,b) => a.updatedAt - b.updatedAt).map(r => ({
      name: r.name,
      // A new record has no built-in animation, but an uploaded GIF plays on tap.
      file: `local${r.id.replace(/[^a-z0-9]/gi,'').toLowerCase()}`,
      src: r.src,
      gifSrc: r.gifSrc,
      motionMs: r.gifSrc ? 3100 : 2600,
      localPicture: true,
    }));
    return base.concat(additions);
  }
  function message(text, error=false) {
    const el=$('#picture-settings-message');
    if (el) { el.textContent=text; el.classList.toggle('is-error',error); }
  }
  function setPreview(src) {
    const node=$('#picture-settings-preview');
    if (!node) return;
    node.innerHTML = src ? `<img src="${esc(src)}" alt="Picture preview">` : '<span aria-hidden="true">📷</span>';
  }
  function clearChosen() {
    chosenBlob=null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl=null;
    $('#picture-settings-file').value='';
    setPreview(null);
  }
  function updateTargetOptions() {
    const category=$('#picture-settings-category').value;
    const old=$('#picture-settings-target').value;
    $('#picture-settings-target').innerHTML=BUILTIN[category].map(([id,label]) => `<option value="${id}">${label}</option>`).join('');
    if (BUILTIN[category].some(([id])=>id===old)) $('#picture-settings-target').value=old;
    updateAction();
  }
  function updateAction() {
    const replacing=$('#picture-settings-action').value==='replace';
    $('#picture-settings-target-label').hidden=!replacing;
    $('#picture-settings-name-label').hidden=replacing;
    $('#picture-settings-name').required=!replacing;
    if (replacing) $('#picture-settings-name').value=BUILTIN[$('#picture-settings-category').value].find(([id])=>id===$('#picture-settings-target').value)?.[1] || '';
  }
  function startNew() {
    editing=null;
    $('#picture-settings-form').reset();
    $('#picture-settings-form-heading').textContent='Add a learning picture';
    $('#picture-settings-save').textContent='Save picture';
    updateTargetOptions();
    clearChosen();
  }
  async function posterForGif(file) {
    // Make a still preview from the first displayed frame; tapping starts GIF playback.
    const url=URL.createObjectURL(file);
    try {
      const img=new Image();
      await new Promise((resolve,reject) => { img.onload=resolve; img.onerror=reject; img.src=url; });
      const canvas=document.createElement('canvas');
      const scale=Math.min(1, 720 / Math.max(img.naturalWidth,img.naturalHeight));
      canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
      canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      const poster=await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
      return poster || null;
    } finally { URL.revokeObjectURL(url); }
  }
  async function pickPhoto(event) {
    const file=event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type) || file.size>MAX_IMAGE || !file.size) {
      message('Choose PNG, JPG, WebP or GIF under 8 MB.',true); return;
    }
    clearChosen();
    chosenBlob=file;
    previewUrl=URL.createObjectURL(file);
    setPreview(previewUrl);
    message('Picture selected. Tap Save picture to keep it on this device.');
  }
  async function save(event) {
    event.preventDefault();
    const category=$('#picture-settings-category').value;
    const replacing=$('#picture-settings-action').value==='replace';
    const replaces=replacing ? $('#picture-settings-target').value : null;
    const name=replacing ? BUILTIN[category].find(([id])=>id===replaces)?.[1] : $('#picture-settings-name').value.trim();
    if (!BUILTIN[category] || !name || name.length>35 || (replacing && !BUILTIN[category].some(([id])=>id===replaces))) { message('Choose a valid category and picture name.',true); return; }
    const current=records.find(r=>r.id===editing);
    const existingReplacement=records.find(r=>r.category===category && r.replaces===replaces && replaces);
    const picture=chosenBlob || current?.picture || existingReplacement?.picture;
    if (!picture) { message('Choose a picture before saving.',true); return; }
    const id=current?.id || existingReplacement?.id || uuid();
    if (!current && !existingReplacement && records.length>=MAX_ITEMS) { message('This device has reached the 60-picture limit.',true); return; }
    const button=$('#picture-settings-save');button.disabled=true;
    try {
      if (current && existingReplacement && current.id !== existingReplacement.id) throw new Error('This picture is already replaced. Edit its existing saved entry instead.');
      const record={ id, category, name, replaces, picture, poster: picture.type==='image/gif' ? (chosenBlob ? await posterForGif(picture) : current?.poster || existingReplacement?.poster || null) : null, updatedAt:Date.now() };
      await writeRecord(record);
      await refresh();
      startNew();
      message(`${name} saved on this device!`);
    } catch(error) { message(errorText(error),true); }
    finally { button.disabled=false; }
  }
  function renderList() {
    const holder=$('#picture-settings-list');
    if (!holder) return;
    $('#picture-settings-summary').textContent=`${records.length} locally saved picture${records.length===1?'':'s'} · Built-in pictures stay available`;
    if (!records.length) { holder.innerHTML='<p class="picture-settings-empty">No custom pictures yet. Your original learning photos are still here.</p>';return; }
    holder.innerHTML=records.slice().sort((a,b)=>b.updatedAt-a.updatedAt).map(r=>{
      const v=visual.get(r.id);
      const detail = r.replaces ? `Replaces ${BUILTIN[r.category]?.find(([id])=>id===r.replaces)?.[1] || 'picture'}` : 'New picture';
      return `<div class="picture-settings-item"><img src="${esc(v?.src || '')}" alt=""><div><strong>${esc(r.name)}</strong><small>${r.category==='animals'?'Animals':'Everyday Words'} · ${esc(detail)}</small></div><button type="button" class="button light" data-picture-edit="${esc(r.id)}">Edit</button><button type="button" class="picture-settings-delete" data-picture-delete="${esc(r.id)}" aria-label="Remove ${esc(r.name)}">×</button></div>`;
    }).join('');
  }
  function edit(id) {
    const r=records.find(r=>r.id===id);if(!r)return;
    editing=id;
    $('#picture-settings-category').value=r.category;
    updateTargetOptions();
    $('#picture-settings-action').value=r.replaces?'replace':'add';
    if(r.replaces) $('#picture-settings-target').value=r.replaces;
    updateAction();
    $('#picture-settings-name').value=r.name;
    clearChosen();
    setPreview(visual.get(id)?.src || '');
    $('#picture-settings-form-heading').textContent=`Edit ${r.name}`;
    $('#picture-settings-save').textContent='Save changes';
    $('#picture-settings-form').scrollIntoView?.({behavior:'smooth',block:'start'});
  }
  async function remove(id) {
    const r=records.find(r=>r.id===id);if(!r)return;
    if (!confirm(`Remove ${r.name} from this device? ${r.replaces?'The built-in picture will return.':'The custom card will disappear.'}`)) return;
    try { await deleteRecords([id]);await refresh();if(editing===id)startNew();message(`${r.name} removed.`); }
    catch(err){message(errorText(err),true);}
  }
  async function reset() {
    if(!records.length)return;
    if(!confirm('Remove ALL custom learning photos from this device and restore the original pictures? This cannot be undone unless you exported a backup.'))return;
    try { await deleteRecords(records.map(r=>r.id));await refresh();startNew();message('Original learning pictures restored.'); }
    catch(err){message(errorText(err),true);}
  }
  function toBase64(blob) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Could not export picture.'));
      reader.onload=()=>resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }
  function fromBase64(base64,type) {
    if (!ALLOWED.includes(type) || !/^[a-zA-Z0-9+/]*={0,2}$/.test(base64) || base64.length>MAX_IMAGE*1.4+100) throw new Error('Invalid backup picture data.');
    const binary=atob(base64);
    if(binary.length>MAX_IMAGE || !binary.length)throw new Error('Picture exceeds size limit.');
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type});
  }
  async function exportBackup() {
    if(!records.length){message('Add a picture before exporting a backup.');return;}
    try {
      const data=[];
      for(const r of records) data.push({id:r.id,category:r.category,name:r.name,replaces:r.replaces,updatedAt:r.updatedAt,type:r.picture.type,image:await toBase64(r.picture),poster:r.poster instanceof Blob?await toBase64(r.poster):null});
      const blob=new Blob([JSON.stringify({format:PACK_ID,version:1,pictures:data})],{type:'application/json'});
      if(blob.size>MAX_IMPORT)throw new Error('Backup exceeds 70 MB; remove some pictures first.');
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='little-discoveries-my-pictures.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      message(`Backup created with ${records.length} pictures. Keep the file somewhere safe.`);
    } catch(err){message(errorText(err),true);}
  }
  async function importBackup(event) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(file.size>MAX_IMPORT){message('Choose a picture backup smaller than 70 MB.',true);return;}
    try {
      const pack=JSON.parse(await file.text());
      if(pack?.format!==PACK_ID||pack?.version!==1||!Array.isArray(pack.pictures)||pack.pictures.length>MAX_ITEMS)throw new Error('Not a valid Little Discoveries picture backup.');
      const validated=[];
      for(const r of pack.pictures){
        if(!r||typeof r.id!=='string'||r.id.length>85||typeof r.name!=='string'||!r.name.trim()||r.name.length>35||!BUILTIN[r.category]||typeof r.image!=='string')throw new Error('Backup contains an invalid picture.');
        if(r.replaces!=null&&!BUILTIN[r.category].some(([id])=>id===r.replaces))throw new Error('Backup contains an invalid replacement.');
        const picture=fromBase64(r.image,r.type);
        const poster=r.poster?fromBase64(r.poster,'image/png'):null;
        validated.push({id:r.id,category:r.category,name:r.name,replaces:r.replaces||null,picture,poster,updatedAt:Number(r.updatedAt)||Date.now()});
      }
      const merged=new Map(records.map(r=>[r.id,r]));
      validated.forEach(r=>merged.set(r.id,r));
      if(merged.size>MAX_ITEMS)throw new Error('Import would exceed the 60-picture limit.');
      if(!confirm(`Import ${validated.length} learning pictures? Existing pictures with matching IDs will be replaced.`))return;
      for(const r of validated)await writeRecord(r);
      await refresh();startNew();message(`Imported ${validated.length} pictures on this device.`);
    }catch(err){message(errorText(err),true);}
  }
  function back() {
    $('#picture-settings-dialog').close();
    $('#parent-panel').showModal();
  }
  function init() {
    $('#picture-settings-open').addEventListener('click',()=>{
      $('#parent-panel').close();
      $('#picture-settings-dialog').showModal();
      startNew();renderList();
      message(loaded?'Pictures stay on this device.':'Opening private photo storage…');
    });
    $('#picture-settings-back').addEventListener('click',back);
    $('#picture-settings-dialog').addEventListener('cancel',ev=>{ev.preventDefault();back();});
    $('#picture-settings-category').addEventListener('change',updateTargetOptions);
    $('#picture-settings-action').addEventListener('change',updateAction);
    $('#picture-settings-target').addEventListener('change',updateAction);
    $('#picture-settings-pick').addEventListener('click',()=>$('#picture-settings-file').click());
    $('#picture-settings-file').addEventListener('change',pickPhoto);
    $('#picture-settings-new').addEventListener('click',startNew);
    $('#picture-settings-form').addEventListener('submit',save);
    $('#picture-settings-list').addEventListener('click',event=>{
      const editBtn=event.target.closest('[data-picture-edit]');
      const delBtn=event.target.closest('[data-picture-delete]');
      if(editBtn)edit(editBtn.dataset.pictureEdit);
      if(delBtn)void remove(delBtn.dataset.pictureDelete);
    });
    $('#picture-settings-reset').addEventListener('click',reset);
    $('#picture-settings-export').addEventListener('click',exportBackup);
    $('#picture-settings-import').addEventListener('click',()=>$('#picture-settings-import-file').click());
    $('#picture-settings-import-file').addEventListener('change',importBackup);
    updateTargetOptions();
    refresh().catch(err=>message(errorText(err),true));
  }
  return {init,getItems};
})();
window.LDPictures=LDPictures;
LDPictures.init();
