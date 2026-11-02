import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const code=readFileSync(join(root,'pictures.js'),'utf8');
const saved=new Map();
const nodes=new Map();
let objectUrl=0;
const listeners={};
const makeNode=()=>({
  value:'',hidden:false,required:false,disabled:false,innerHTML:'',textContent:'',open:false,
  classList:{toggle(){}},listeners:new Map(),dataset:{},
  addEventListener(name,cb){this.listeners.set(name,cb);},
  reset(){nodes.get('#picture-settings-category').value='everyday';nodes.get('#picture-settings-action').value='add';nodes.get('#picture-settings-name').value='';},
  scrollIntoView(){},showModal(){this.open=true;},close(){this.open=false;},click(){},
});
const $=sel=>{if(!nodes.has(sel))nodes.set(sel,makeNode());return nodes.get(sel);};
$('#picture-settings-category').value='everyday';
$('#picture-settings-action').value='add';
$('#picture-settings-target').value='ball';
// Minimal asynchronous IndexedDB emulator that preserves blobs between calls.
const db={
  objectStoreNames:{contains:()=>true},createObjectStore(){},
  transaction(_name,mode){
    const tx={oncomplete:null,onerror:null,onabort:null};
    tx.objectStore=()=>({
      getAll(){
        const request={onsuccess:null,onerror:null,result:null};
        queueMicrotask(()=>{request.result=[...saved.values()];request.onsuccess?.();});
        return request;
      },
      put(record){saved.set(record.id,record);queueMicrotask(()=>tx.oncomplete?.());},
      delete(id){saved.delete(id);queueMicrotask(()=>tx.oncomplete?.());},
    });
    return tx;
  },
};
const indexedDB={open(){const req={result:db,onsuccess:null,onerror:null,onupgradeneeded:null};queueMicrotask(()=>req.onsuccess?.());return req;}};
const window={indexedDB,dispatchEvent(e){listeners[e.type]?.forEach(fn=>fn(e));},addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
const context={window,indexedDB,document:{querySelector:$},Event,Blob,File,console,URL:{createObjectURL:()=>`blob:photo-${++objectUrl}`,revokeObjectURL(){}},confirm:()=>true,setTimeout,clearTimeout,queueMicrotask};
vm.createContext(context);
vm.runInContext(code,context);
const library=window.LDPictures;
const base=[{file:'ball',name:'Ball',src:'./assets/first-words/ball.png'},{file:'cat',name:'Cat',src:'./assets/first-words/cat.png'}];
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
await tick();
assert.equal(library.getItems('everyday',base).length,2);
const banana=new File(['banana photo'],'banana.png',{type:'image/png'});
$('#picture-settings-name').value='Banana';
await $('#picture-settings-file').listeners.get('change')({target:{files:[banana]}});
await $('#picture-settings-form').listeners.get('submit')({preventDefault(){}});
assert.equal(saved.size,1,'saves one device-only photo');
assert.equal(library.getItems('everyday',base).length,3,'adds custom card without changing builtins');
assert.equal(library.getItems('everyday',base)[2].name,'Banana');
// Replace one built-in card, retaining the default's teaching word.
$('#picture-settings-action').value='replace';
$('#picture-settings-action').listeners.get('change')();
$('#picture-settings-target').value='cat';
$('#picture-settings-target').listeners.get('change')();
const cat=new File(['cat photo'],'cat.png',{type:'image/png'});
await $('#picture-settings-file').listeners.get('change')({target:{files:[cat]}});
await $('#picture-settings-form').listeners.get('submit')({preventDefault(){}});
const items=library.getItems('everyday',base);
assert.equal(items.length,3,'replace does not duplicate cat');
assert.equal(items[1].name,'Cat');
assert.match(items[1].src,/^blob:/,'replaced cat uses local photo');
assert.equal(items[1].gifSrc,undefined,'replacing a cat photo must not play the old cat GIF');
assert.equal(saved.size,2);
await $('#picture-settings-reset').listeners.get('click')();
assert.equal(saved.size,0,'restore removes all custom pictures');
assert.equal(library.getItems('everyday',base).length,2,'restore returns to built-in cards');
console.log('Passed: Settings local picture upload, new card, built-in replacement, restoring defaults, no cloud.');
