import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,validateBackup,grade,recordAnswer,DAY} from '../dist/js/engine.js';
import {ensureFocusSet,focusTargets,focusCard,makeFocusRound,recordFocus,queueFocusRetry,focusStatus} from '../dist/js/focus.js';
const course=JSON.parse(fs.readFileSync(new URL('../dist/data/course.json',import.meta.url)));
const now=1700000000000;

test('six stable targets cover five subjects, survive backup transport, and keep separate tense sets',()=>{
 const state=initialState(),targets=ensureFocusSet(course,state,'present',now);
 assert.equal(targets.length,6);assert.equal(new Set(targets.map(t=>t.person)).size,5);
 assert.ok(targets.every(t=>targets.filter(x=>x.verb===t.verb).length<=2));
 const restored=validateBackup(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(ensureFocusSet(course,restored,'present',now+DAY).map(t=>t.id),targets.map(t=>t.id));
 ensureFocusSet(course,restored,'preterite',now+DAY);
 assert.deepEqual(restored.focus.sets.present.ids,state.focus.sets.present.ids);
 assert.throws(()=>validateBackup({...state,focus:{version:1,serial:0,sets:{bad:{ids:['a'],created:0}},records:{}}}));
 assert.equal(validateBackup(initialState()).focus.version,1);
});
test('all generated prompts use checked forms, safe endings, complete samples and plural agreement',()=>{
 for(const tense of course.tenses.map(t=>t.id))for(const target of focusTargets(course,tense)){
  if(target.split)assert.equal(target.split.stem+target.split.ending,target.form);
  for(const stage of ['supported','form','context','retry'])for(let variant=0;variant<2;variant++){
   const card=focusCard(target,stage,variant);
   assert.equal(grade(target.form,card).kind,'correct');
   assert.equal(card.prompt.replace('___',target.form),stage==='form'?`${target.verb} · ${['yo','tú','ella','nosotros','ellos'][target.person]} → ${target.form}`:card.sample);
   if(target.verb==='ser'&&target.person>=3&&stage!=='form')assert.ok(card.sample.includes('felices'));
  }
 }
});
test('same-day success cannot earn delayed recall or postpone due dates; support resets the count',()=>{
 const state=initialState(),target=ensureFocusSet(course,state,'present',now)[0],card=focusCard(target,'context');
 recordFocus(state,focusCard(target,'supported'),'assisted',now);
 let result=recordFocus(state,card,'correct',now+1000);
 assert.equal(result.record.days,0);assert.equal(result.spaced,false);assert.equal(result.record.due,now+DAY);
 result=recordFocus(state,card,'correct',now+DAY-1);assert.equal(result.spaced,false);
 result=recordFocus(state,card,'correct',now+DAY);assert.equal(result.record.days,1);
 const due=result.record.due;
 result=recordFocus(state,card,'correct',now+DAY+1000);assert.equal(result.record.days,1);assert.equal(result.record.due,due);
 result=recordFocus(state,card,'correct',now+2*DAY);assert.equal(result.record.days,2);
 assert.equal(focusStatus(target,state).days,2);
 result=recordFocus(state,card,'assisted',now+4*DAY);assert.equal(result.record.days,0);
});
test('rounds fade automatic cues, rotate contexts, and delay bounded retries beyond the last occurrence',()=>{
 const state=initialState(),targets=ensureFocusSet(course,state,'present',now),round=makeFocusRound(targets,state,now,()=>.5);
 assert.equal(round.length,12);assert.ok(round.slice(0,6).every(c=>c.focusStage==='supported'));
 assert.ok(round.slice(6).every(c=>c.focusStage==='context'));
 for(let i=0;i<12;i++){
  const card=round[i],before=round.length;
  const previous=round.findLastIndex(c=>c.focusTarget===card.focusTarget);
  const queued=queueFocusRetry(round,i);
  if(queued){assert.ok(round.length-1-previous>=4);assert.equal(round.at(-1).focusTarget,card.focusTarget);}
  else assert.equal(round.length,before);
 }
 assert.ok(round.length<=36);assert.equal(round.focusRetried.length,6);
 for(const t of targets)recordFocus(state,focusCard(t,'supported'),'assisted',now);
 const next=makeFocusRound(targets,state,now+DAY,()=>.5);
 assert.ok(next.slice(0,6).every(c=>c.focusStage==='form'&&!c.focusCue));
 assert.notEqual(next[6].prompt,round[6].prompt);
});
test('related pattern errors guide new selection without changing ordinary review records',()=>{
 const state=initialState(),targets=focusTargets(course,'present');
 const weak=targets.find(t=>t.verb==='vender'&&t.person===4);
 recordAnswer(state,weak.source,'assisted','venden',now);
 const before=JSON.stringify(state.records);
 const chosen=ensureFocusSet(course,state,'present',now);
 assert.ok(chosen.some(t=>t.person===4&&t.pattern===weak.pattern));
 recordFocus(state,focusCard(chosen[0],'form'),'correct',now);
 assert.equal(JSON.stringify(state.records),before);
 for(const t of chosen)state.focus.records[t.id]={attempts:3,days:2,due:now,last:now,lastSupport:null,lastIndependent:now};
 const next=ensureFocusSet(course,state,'present',now,true);
 assert.equal(next.length,6);assert.ok(next.every(t=>!chosen.some(old=>old.id===t.id)));
});
