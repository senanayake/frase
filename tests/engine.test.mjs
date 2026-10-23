import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {grade,initialState,recordAnswer,makeSession,validatePack,validateBackup,mergeCourse,DAY} from '../dist/js/engine.js';
const course=JSON.parse(fs.readFileSync(new URL('../dist/data/course.json',import.meta.url)));

test('all built-in exercises have stable unique IDs and can grade their authored answers',()=>{
 assert.equal(new Set(course.cards.map(c=>c.id)).size,course.cards.length);
 for(const card of course.cards){assert.ok(course.tenses.some(t=>t.id===card.tense));if(card.type!=='create')for(const answer of card.answers)assert.equal(grade(answer,card).kind,'correct',card.id);}
});
test('punctuation, whitespace, and optional known subjects do not create false errors',()=>{
 const card={type:'translate',subject:'yo',answers:['Yo visité a mi abuela.']};
 assert.equal(grade('  ¡Visité a mi abuela! ',card).kind,'correct');
 assert.equal(grade('Ella visité a mi abuela.',card).kind,'unmatched');
});
test('written accents need repair and ñ is never reduced to n',()=>{
 assert.equal(grade('visite',{type:'cloze',answers:['visité']}).kind,'accent');
 assert.equal(grade('ano',{type:'cloze',answers:['año']}).kind,'unmatched');
 assert.equal(grade('visitaba',{type:'cloze',answers:['visité']}).kind,'unmatched');
});
test('open production is explicitly self-reviewed',()=>assert.equal(grade('Mi frase',{type:'create'}).kind,'self'));
test('review scheduling distinguishes independent, supported, and revealed answers',()=>{
 const state=initialState(),card=course.cards[0],now=1700000000000;
 assert.equal(recordAnswer(state,card,'correct','x',now).due,now+DAY);
 assert.equal(recordAnswer(state,card,'correct','x',now+DAY).due,now+4*DAY);
 assert.equal(recordAnswer(state,card,'assisted','x',now+4*DAY).due,now+5*DAY);
 assert.equal(recordAnswer(state,card,'revealed','',now+5*DAY).stage,0);
 assert.equal(state.history.length,4);
});
test('due reviews precede new material, with no duplicated cards',()=>{
 const state=initialState(),c=course.cards[500];state.records[c.id]={due:0,stage:1,attempts:1,correct:1};
 const plan=makeSession(course.cards,state,{length:12},Date.now(),()=>.5);
 assert.equal(plan[0].id,c.id);assert.equal(new Set(plan.map(c=>c.id)).size,12);
 assert.ok(plan.some(c=>c.type==='create'));assert.ok(plan.some(c=>c.type==='contrast'));
});
test('tense and mode filters respect the requested scope',()=>{
 assert.ok(makeSession(course.cards,initialState(),{tense:'imperfect',mode:'past'}).every(c=>c.tense==='imperfect'&&c.type==='contrast'));
 assert.equal(makeSession(course.cards,initialState(),{tense:'future',mode:'past'}).length,0);
});
test('packs can add a tense without changing existing course IDs or progress',()=>{
 const pack=validatePack(JSON.parse(fs.readFileSync(new URL('../dist/data/sample-lesson.json',import.meta.url))));
 const merged=mergeCourse(course,[pack]);assert.equal(merged.tenses.length,6);assert.equal(merged.cards.length,course.cards.length+2);assert.deepEqual(merged.cards[0],course.cards[0]);
});
test('malformed packs and backups fail before changing saved data',()=>{
 assert.throws(()=>validatePack({schemaVersion:1,id:'invalid',title:'x',tenses:[{id:'x',label:'x'}],cards:[{id:'bad',tense:'x',type:'translate',prompt:'test'}]}));
 assert.throws(()=>validateBackup({schemaVersion:100}));
 assert.throws(()=>validateBackup({...initialState(),records:{a:{due:'tomorrow',stage:1,attempts:1}}}));
});
test('key irregulars and plural agreement are retained in course content',()=>{
 const form=(verb,tense)=>course.verbs.find(v=>v.infinitive===verb).forms[tense];
 assert.deepEqual(form('ir','imperfect'),['iba','ibas','iba','íbamos','iban']);
 assert.equal(form('hacer','perfect')[3],'hemos hecho');
 assert.equal(form('tener','future')[0],'tendré');
 assert.equal(form('leer','preterite')[2],'leyó');
 assert.equal(form('abrir','perfect')[0],'he abierto');
 assert.ok(course.cards.find(c=>c.id==='form-present-ser-3').sample.includes('somos felices'));
 assert.ok(course.cards.find(c=>c.id==='sentence-perfect-ser-3').answers.every(a=>a.includes('felices')));
 assert.equal(course.cards.find(c=>c.id==='change-present-ser').prompt,'Yo fui feliz.');
});
