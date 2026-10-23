import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {withCurriculum} from '../dist/js/curriculum.js';
import {initialState,DAY} from '../dist/js/engine.js';
import {makeWorksheet,formTenses,savedWorksheets} from '../dist/js/paper.js';
import {worksheetPdf} from '../dist/js/paper-pdf.js';
const base=JSON.parse(readFileSync(new URL('../dist/data/course.json',import.meta.url))),curriculum=JSON.parse(readFileSync(new URL('../dist/data/curriculum.json',import.meta.url))),course=withCurriculum(base,curriculum),now=Date.UTC(2026,9,23,18);
const build=(options,state=initialState(),previous=[],seed=17)=>makeWorksheet(course,curriculum,state,options,previous,seed,now);
test('conjugation sheet covers all five people and uses stored forms without changing learning state',()=>{
 const state=initialState(),before=structuredClone(state),sheet=build({focus:'conjugation',tense:'preterite',verb:'all',person:'all',count:8},state);
 assert.equal(sheet.items.length,8);assert.deepEqual(new Set(sheet.items.filter(i=>i.type==='form').map(i=>i.bucket)),new Set([0,1,2,3,4]));
 for(const item of sheet.items.filter(i=>i.type==='form')){const verb=item.title.split(' - ')[0];assert.equal(item.answer,course.verbs.find(v=>v.infinitive===verb).forms.preterite[item.bucket]);}
 assert.equal(new Set(sheet.items.map(i=>i.id)).size,sheet.items.length);assert.deepEqual(state,before);
 assert.equal(sheet.items.at(-1).type,'create');
});
test('single person/verb limits are honest and full forms replace unsafe ending splits',()=>{
 const regular=build({focus:'conjugation',tense:'preterite',verb:'hablar',person:'0',support:'ending'});
 assert.equal(regular.items.length,2);assert.match(regular.items[0].prompt,/^habl_+$/);assert.equal(regular.items[0].answer,'é (full form: hablé)');assert.match(regular.notice,/Only 1 distinct/);
 const irregular=build({focus:'conjugation',tense:'present',verb:'tener',person:'0',support:'ending'});
 assert.equal(irregular.items[0].answer,'tengo');assert.match(irregular.items[0].prompt,/^Full form: _+$/);
 const compound=build({focus:'conjugation',tense:'perfect',verb:'hablar',person:'0',support:'ending'});assert.equal(compound.items[0].answer,'he hablado');assert.match(compound.items[0].prompt,/^Full form: _+$/);
 assert.throws(()=>build({focus:'conjugation',tense:'conditional'}),/No checked/);
 assert.ok(formTenses(course).some(t=>t.id==='present-subjunctive'));
});
test('sheet rotation favours unprinted forms and recreating the same seed is deterministic',()=>{
 const options={focus:'conjugation',tense:'present',verb:'all',person:'all',count:8};
 const first=build(options),same=build(options);assert.deepEqual(first,same);
 const second=build(options,initialState(),[first],18);const old=new Set(first.items.filter(i=>i.type==='form').map(i=>i.id));assert.ok(second.items.filter(i=>i.type==='form').every(i=>!old.has(i.id)));
});
test('quest source, tense choice and review use real checked card keys',()=>{
 const q=curriculum.quests.find(q=>q.id==='past-habits');const sheet=build({focus:'sentences',questId:q.id,tense:'future'});
 assert.equal(sheet.scope,q.title);assert.ok(sheet.items.filter(i=>i.type!=='create').every(i=>q.cardIds.includes(i.id)));
 const mixed=build({focus:'contrast',tense:'present'});for(const item of mixed.items.filter(i=>i.type!=='create')){assert.doesNotMatch(item.cue,/Preterite|Imperfect/);assert.match(item.notes,/Target: /);}
 const state=initialState();assert.throws(()=>build({focus:'review',questId:q.id},state),/No supported/);
 state.history.push({cardId:q.requiredIds[0],outcome:'assisted',at:now-DAY});state.records[q.requiredIds[1]]={due:now-1};
 const review=build({focus:'review',questId:q.id},state);assert.equal(review.items.filter(i=>i.type!=='create').length,2);assert.ok(review.items.filter(i=>i.type!=='create').every(i=>q.requiredIds.slice(0,2).includes(i.id)));
});
test('PDF has valid object offsets and separate answer-key pages, with optional key and A4',()=>{
 const sheet=build({focus:'conjugation',tense:'imperfect',verb:'vivir',person:'all'});
 const bytes=worksheetPdf(sheet),pdf=new TextDecoder().decode(bytes);assert.ok(pdf.startsWith('%PDF-1.4'));assert.match(pdf,/\/Encoding \/WinAnsiEncoding/);
 const xref=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(xref,xref+4),'xref');
 const offsets=pdf.slice(xref).split('\n').slice(3).filter(s=>/^\d{10} 00000 n/.test(s)).map(s=>Number(s.slice(0,10)));for(const [i,offset]of offsets.entries())assert.ok(pdf.slice(offset).startsWith((i+1)+' 0 obj'));
 const keyPages=Number(pdf.match(/\/Type \/Pages \/Count (\d+)/)[1]);const noKey=new TextDecoder().decode(worksheetPdf(sheet,{answerKey:false,paper:'a4'}));assert.ok(keyPages>Number(noKey.match(/\/Type \/Pages \/Count (\d+)/)[1]));assert.match(noKey,/595.28 841.89/);
});
test('recent sheets survive notebook transport without becoming exercise attempts',()=>{
 const sheet=build({focus:'conjugation'}),state=initialState();state.paperSheets=[null,...Array.from({length:35},()=>sheet)];assert.equal(savedWorksheets(state).length,30);assert.equal(state.history.length,0);assert.deepEqual(state.records,{});
});

test('long teacher prompts paginate without losing text or exposing the key in worksheet-only output',()=>{
 const sheet=build({focus:'conjugation'});sheet.items=[{id:'long',title:'Long teacher exercise',prompt:'¿Qué escribías cuando llegó Ana? '.repeat(90),answer:'Escribía una carta.',notes:'Check the background and completed event.',lines:2}];
 const pdf=new TextDecoder().decode(worksheetPdf(sheet,{answerKey:false}));
 assert.ok(Number(pdf.match(/\/Type \/Pages \/Count (\d+)/)[1])>1);
 assert.ok(!pdf.includes(Buffer.from('Escribía una carta.','latin1').toString('hex')));
});
