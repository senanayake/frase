import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpeechInput,guidedSession,practiceInputLabel} from '../dist/js/voice.js';
const course=JSON.parse(readFileSync(new URL('../dist/data/course.json',import.meta.url)));
function setup(){
 const instances=[],states=[],texts=[];
 class Recognition {
  constructor(){instances.push(this);}
  start(){this.onstart();} stop(){this.onend();} abort(){this.onend?.();}
 }
 const input=createSpeechInput({webkitSpeechRecognition:Recognition,speechSynthesis:{cancel(){}}},{status:(...s)=>states.push(s),transcript:t=>texts.push(t)});
 const result=(r,text,final=true)=>{const item=[{transcript:text}];item.isFinal=final;r.onresult({results:[item]});};
 return {input,instances,states,texts,result};
}
test('Spanish input accepts final transcripts, never grades interim hypotheses',()=>{
 const x=setup();x.input.start();const r=x.instances[0];assert.equal(r.lang,'es-MX');assert.equal(r.continuous,false);
 x.result(r,'cocina',false);assert.deepEqual(x.texts,[]);x.result(r,'Ayer cocinamos.');assert.deepEqual(x.texts,['Ayer cocinamos.']);x.input.stop();assert.equal(x.input.active,false);assert.match(x.states.at(-1)[1],/Check what I heard/);
});
test('cancelled recognition cannot overwrite the next exercise or a typed draft',()=>{
 const x=setup();x.input.start();const old=x.instances[0];x.input.cancel();x.result(old,'stale answer');assert.deepEqual(x.texts,[]);
 x.input.start();x.result(old,'late result');assert.deepEqual(x.texts,[]);x.result(x.instances[1],'new answer');assert.deepEqual(x.texts,['new answer']);
});
test('unsupported browsers and permission errors leave typing available',()=>{
 const statuses=[];const input=createSpeechInput({}, {status:(...s)=>statuses.push(s)});assert.equal(input.start(),false);assert.match(statuses[0][1],/Typing is always available/);
 const x=setup();x.input.start();const r=x.instances[0];r.onerror({error:'not-allowed'});r.onend();assert.equal(x.states.at(-1)[0],'error');assert.match(x.states.at(-1)[1],/denied/);assert.deepEqual(x.texts,[]);
});
test('guided follow-ups retain reviewed answers and stable IDs in three tense pairs',()=>{
 const cards=guidedSession(course.cards);assert.equal(cards.length,6);assert.equal(new Set(cards.map(c=>c.id)).size,6);
 for(let i=0;i<cards.length;i+=2){assert.equal(cards[i].verb,cards[i+1].verb);assert.notEqual(cards[i].tense,cards[i+1].tense);assert.equal(cards[i+1].guidedFollowUp,true);}
 for(const c of cards)assert.deepEqual(c.answers,course.cards.find(x=>x.id===c.id).answers);
});
test('mixed entry is not labelled as independent typing',()=>{
 assert.equal(practiceInputLabel(false,true),'voice');assert.equal(practiceInputLabel(true,true),'mixed');assert.equal(practiceInputLabel(true,false),'typed');
});
