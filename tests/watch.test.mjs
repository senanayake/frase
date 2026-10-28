import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWatch,updateWatch,recommendWatch,embedUrl} from '../dist/js/watch.js';
import {watchView} from '../dist/js/watch-ui.js';
import {WATCH_CATALOG as catalog} from '../dist/js/watch-catalog.js';
import {initialState,validateBackup,loadState,saveState,STORAGE_KEY} from '../dist/js/engine.js';
import fs from 'node:fs';
test('curated shelf contains 8–12 unique verified source links with no invented transcript',()=>{
 assert.ok(catalog.length>=8&&catalog.length<=12);assert.equal(new Set(catalog.map(v=>v.id)).size,catalog.length);
 for(const v of catalog){assert.match(v.id,/^[A-Za-z0-9_-]{11}$/);assert.equal(v.source,`https://www.youtube.com/watch?v=${v.id}`);assert.ok(['visual','everyday','stretch'].includes(v.lane));assert.ok(v.title&&v.why&&v.metadataVerifiedAt);assert.equal(v.transcript,undefined);}
});
test('old notebooks migrate without changing exercise history, focus, packs or settings',()=>{
 const s=initialState();s.records.hello={due:1000,stage:2,attempts:3};s.history.push({at:100,cardId:'hello',outcome:'correct'});
 const copy=structuredClone(s),restored=validateBackup(s);assert.deepEqual(restored.records,copy.records);assert.deepEqual(restored.history,copy.history);assert.deepEqual(restored.packs,copy.packs);assert.deepEqual(restored.watch,{records:{},selectedId:null});
});
test('watching, rating and personal notes stay separate from mastery and are undoable',()=>{
 const s=initialState(),original=structuredClone(s),id=catalog[0].id;
 updateWatch(s,id,{rating:'mostly'},100);assert.equal(s.watch.records[id].watched,false);
 updateWatch(s,id,{watched:true,note:'A scene I remember'},200);updateWatch(s,id,{rating:null,watched:false},300);
 assert.deepEqual(s.records,original.records);assert.deepEqual(s.history,original.history);assert.equal(s.watch.records[id].note,'A scene I remember');assert.equal(s.watch.records[id].watched,false);assert.equal(s.watch.records[id].rating,null);
 assert.throws(()=>updateWatch(s,id,{rating:'fluent'}));
});
test('watch progress and notes survive save/load and export/restore under same storage key',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},s=initialState(),id=catalog[1].id;
 updateWatch(s,id,{watched:true,rating:'easy',note:'Repeat this tomorrow'},123);s.watch.selectedId=id;saveState(s,storage);
 assert.ok(values.has(STORAGE_KEY));const restored=loadState(storage);assert.deepEqual(restored.watch,s.watch);assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(restored))).watch,s.watch);
});
test('bad optional watch data cannot erase a valid old notebook',()=>{
 const s=initialState();s.watch={records:{'not-valid':{},[catalog[0].id]:{watched:'yes',rating:'perfect',note:'x'.repeat(600),updatedAt:NaN}},selectedId:'bad'};
 const restored=validateBackup(s);assert.equal(Object.keys(restored.watch.records).length,1);const r=restored.watch.records[catalog[0].id];assert.equal(r.watched,false);assert.equal(r.rating,null);assert.equal(r.note.length,500);assert.equal(restored.watch.selectedId,null);
});
test('recommendation starts visually, adapts to understanding and revisits after shelf completed',()=>{
 const s=initialState();assert.equal(recommendWatch(catalog,s).video.lane,'visual');const stretch=catalog.find(v=>v.lane==='stretch');updateWatch(s,stretch.id,{rating:'lost'},10);assert.notEqual(recommendWatch(catalog,s).video.lane,'stretch');
 const visual=catalog.find(v=>v.lane==='visual');updateWatch(s,visual.id,{rating:'easy'},20);assert.equal(recommendWatch(catalog,s).video.lane,'everyday');
 catalog.forEach((v,i)=>updateWatch(s,v.id,{watched:true},100+i));assert.match(recommendWatch(catalog,s).reason,/Revisit/);assert.equal(recommendWatch([],s),null);
});
test('watch view escapes personal notes, delays third-party load and offers fallback',()=>{
 const s=initialState(),id=catalog[0].id;updateWatch(s,id,{note:'</textarea><script>alert(1)</script>'});s.watch.selectedId=id;const html=watchView(catalog,s);
 assert.doesNotMatch(html,/<script>|<iframe/);assert.match(html,/&lt;\/textarea&gt;/);assert.match(html,/Load video/);assert.match(html,/Open on YouTube/);assert.match(html,/separate from recall mastery/);assert.match(embedUrl(id),/^https:\/\/www.youtube-nocookie.com\/embed\//);assert.throws(()=>embedUrl('javascript:alert(1)'));
});
test('watch is integrated into route/navigation without changing original storage key',()=>{
 const app=fs.readFileSync(new URL('../dist/js/app.js',import.meta.url),'utf8');assert.ok(app.includes("['watch','audio','Watch']"));assert.ok(app.includes("view==='watch'?watchView(WATCH_CATALOG,state)"));assert.ok(app.includes("['practice','quests','watch','lessons','progress','settings']"));assert.equal(STORAGE_KEY,'frase.learning.v1');
});

test('notes and watched edits never replace the latest rating signal',()=>{
 const s=initialState(),a=catalog.find(v=>v.lane==='visual'),b=catalog.find(v=>v.lane==='stretch');
 updateWatch(s,a.id,{rating:'easy'},10);updateWatch(s,b.id,{rating:'lost'},20);
 updateWatch(s,a.id,{note:'New note',watched:true},30);
 assert.equal(s.watch.records[a.id].ratedAt,10);assert.equal(recommendWatch(catalog,s).video.lane,'everyday');
 const legacy=validateWatch({records:{[a.id]:{rating:'easy',updatedAt:99}}});assert.equal(legacy.records[a.id].ratedAt,0);
});
test('Lost never forces a harder lane when supported videos have been watched',()=>{
 const s=initialState();catalog.filter(v=>v.lane==='visual').forEach(v=>updateWatch(s,v.id,{watched:true},10));
 updateWatch(s,catalog.find(v=>v.lane==='visual').id,{rating:'lost'},20);
 assert.equal(recommendWatch(catalog,s).video.lane,'visual');assert.match(recommendWatch(catalog,s).reason,/Revisit/);
});

test('malformed selectedId cannot discard valid exercise records on load',()=>{
 const s=initialState();s.records.hello={due:1000,stage:2,attempts:3};s.watch={selectedId:{toString:null},records:{}};
 const restored=loadState({getItem:()=>JSON.stringify(s)});
 assert.deepEqual(restored.records,s.records);assert.equal(restored.watch.selectedId,null);
});
