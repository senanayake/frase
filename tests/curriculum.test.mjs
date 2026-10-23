import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCurriculum,withCurriculum,questProgress,questSession,weekActivity} from '../dist/js/curriculum.js';
import {initialState,validateBackup,DAY,grade} from '../dist/js/engine.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const base=read('../dist/data/course.json'),data=read('../dist/data/curriculum.json');
const q=data.quests[0],at=Date.UTC(2026,9,23,12);
const e=(cardId,outcome='correct',when=at)=>({cardId,outcome,at:when});
test('authored curriculum has valid links, gradeable answer variants and safe extension IDs',()=>{
 validateCurriculum(data,base);const course=withCurriculum(base,data);assert.equal(course.cards.length,base.cards.length+data.cards.length);
 for(const c of data.cards)if(c.type!=='create')for(const answer of c.answers)assert.equal(grade(answer,c).kind,'correct',c.id);
 assert.ok(course.verbs.find(v=>v.infinitive==='querer').forms.present.includes('queremos'));
});
test('broken prerequisites, dangling cards and incomplete answer keys fail validation',()=>{
 const bad=structuredClone(data);bad.quests[0].prerequisites=[bad.quests[1].id];assert.throws(()=>validateCurriculum(bad,base),/cyclic/);
 const missing=structuredClone(data);missing.quests[0].requiredIds.push('absent');assert.throws(()=>validateCurriculum(missing,base));
 const answers=structuredClone(data);answers.cards[0].answers=[];assert.throws(()=>validateCurriculum(answers,base),/answer/);
 const sample=structuredClone(data);sample.cards[0].sample='wrong';assert.throws(()=>validateCurriculum(sample,base),/model|sample/);
});
test('help earns practice completion, but models and self-ratings do not earn checkpoints',()=>{
 const history=q.requiredIds.map(id=>e(id,'assisted'));const p=questProgress(q,history,at);
 assert.equal(p.practised,true);assert.equal(p.independent,false);assert.equal(p.recalled,false);
 assert.equal(questProgress(q,q.requiredIds.map(id=>e(id,'revealed')),at).completed,0);
 assert.equal(questProgress(q,q.checkpointIds.map(id=>e(id,'self')),at).checks,0);
});
test('checkpoint achievement is scoped to checkpoints rather than easy form repetitions',()=>{
 const forms=q.requiredIds.filter(id=>!q.checkpointIds.includes(id));assert.equal(questProgress(q,forms.map(id=>e(id)),at).independent,false);
 assert.equal(questProgress(q,q.checkpointIds.map(id=>e(id)),at).independent,true);
});
test('later recall needs a full day between consecutive independent matches',()=>{
 const id=q.checkpointIds[0];
 assert.equal(questProgress(q,[e(id),e(id,'correct',at+DAY-1)],at+DAY).later,0);
 assert.equal(questProgress(q,[e(id),e(id,'correct',at+DAY)],at+DAY).later,1);
 assert.equal(questProgress(q,[e(id),e(id,'assisted',at+DAY-1),e(id,'correct',at+DAY)],at+DAY).later,0);
 assert.equal(questProgress(q,[e(id),e(id,'correct',at+DAY)],at).later,0);
});
test('learning preserves authored sequence, checkpoint selects two cards, review selects due cards only',()=>{
 const course=withCurriculum(base,data),state=initialState();state.records[q.cardIds[2]]={due:at-1};state.records[q.cardIds[3]]={due:at+DAY};
 assert.deepEqual(questSession(q,course,state).map(c=>c.id),q.cardIds);
 assert.deepEqual(questSession(q,course,state,'checkpoint').map(c=>c.id),q.checkpointIds);
 assert.deepEqual(questSession(q,course,state,'review',at).map(c=>c.id),[q.cardIds[2]]);
});
test('weekly goal counts distinct local days, resets Monday, ignores future entries',()=>{
 const monday=new Date(2026,9,19,12),tuesday=new Date(2026,9,20,12),sunday=new Date(2026,9,18,12),nextMonday=new Date(2026,9,26,12);
 const h=[e('a','assisted',monday.getTime()),e('b','revealed',monday.getTime()),e('c','correct',tuesday.getTime()),e('d','correct',sunday.getTime()),e('future','correct',nextMonday.getTime())];
 assert.equal(weekActivity(h,tuesday).days,2);assert.equal(weekActivity(h,nextMonday).days,1);
});
test('old backups retain exercise history and get a sensible weekly goal without migration',()=>{
 const old={schemaVersion:1,records:{old:{stage:2,attempts:4,due:at}},history:[e('old')],packs:[],settings:{}};
 const restored=validateBackup(old);assert.deepEqual(restored.records,old.records);assert.deepEqual(restored.history,old.history);assert.equal(restored.settings.weeklyPracticeDays,3);
 restored.settings.weeklyPracticeDays=100;assert.equal(validateBackup(restored).settings.weeklyPracticeDays,3);
});

test('expanded path spans A1 to early C1 without replacing core cards or verb forms',()=>{
 assert.equal(data.units.length,12);assert.equal(data.quests.length,37);assert.equal(data.cards.length,403);
 assert.deepEqual([...new Set(data.units.map(u=>u.levelBand))],['A1','A2','B1','B2','C1 intro']);
 const course=withCurriculum(base,data);
 assert.deepEqual(course.cards.filter(c=>!c.questId),base.cards);
 assert.deepEqual(course.tenses.filter(t=>!t.questOnly),base.tenses);
 for(const old of base.verbs)assert.deepEqual(course.verbs.find(v=>v.infinitive===old.infinitive).forms.present,old.forms.present);
 assert.equal(course.verbs.find(v=>v.infinitive==='ir').forms['present-subjunctive'][0],'vaya');
 for(const t of data.tenses)assert.ok(data.cards.some(c=>c.tense===t.id),'exercises for '+t.id);
 for(const u of data.units){assert.ok(u.questIds.length>=3);for(const id of u.sourceIds)assert.ok(data.sources.some(s=>s.id===id));}
});

test('deeper banks retain introductions, use 24 checked examples and reserve full-sentence challenges',()=>{
 const banks=data.quests.filter(q=>q.bankIds);assert.equal(banks.length,8);
 for(const q of banks){
  assert.equal(q.bankIds.length,24);assert.equal(q.cardIds.length,25);assert.equal(q.introIds.length,7);assert.equal(q.requiredIds.length,6);
  assert.equal(q.challengeIds.length,6);assert.ok(q.challengeIds.every(id=>!q.introIds.includes(id)));
  const course=withCurriculum(base,data),state=initialState();
  assert.deepEqual(questSession(q,course,state,'learn',at).map(c=>c.id),q.introIds);
  const round=questSession(q,course,state,'practice',at);assert.equal(round.length,7);
  assert.equal(round.filter(c=>c.type==='create').length,1);
  assert.ok(round.every(c=>!q.challengeIds.includes(c.id)));assert.equal(new Set(round.map(c=>c.id)).size,7);
  const challenge=questSession(q,course,state,'challenge',at);assert.equal(challenge.length,5);
  assert.ok(challenge.every(c=>c.type==='translate'||c.type==='transform'));
 }
});
test('short rounds move beyond the introduction, balance review with unseen material, and cap due review',()=>{
 const q=data.quests.find(q=>q.id==='past-completed'),course=withCurriculum(base,data),state=initialState();
 state.history=q.requiredIds.map(id=>e(id,'assisted',at-DAY));
 for(const id of q.requiredIds)state.records[id]={due:at-1,outcome:'assisted'};
 const round=questSession(q,course,state,'learn',at);
 assert.equal(round.length,7);assert.ok(round.filter(c=>!state.history.some(e=>e.cardId===c.id)&&c.type!=='create').length>=3);
 assert.ok(round.some(c=>state.records[c.id]?.due<=at));
 const seen=new Set(round.map(c=>c.id));state.history.push(...round.filter(c=>c.type!=='create').map(c=>e(c.id)));
 const next=questSession(q,course,state,'practice',at+1);assert.ok(next.some(c=>!seen.has(c.id)&&!q.introIds.includes(c.id)));
 for(const id of q.bankIds)state.records[id]={due:at-1};
 assert.equal(questSession(q,course,state,'review',at).length,6);
 assert.deepEqual(questSession(q,course,state,'checkpoint',at).map(c=>c.id),q.checkpointIds);
});
test('bank coverage is separate from preserved introduction milestones',()=>{
 const q=data.quests.find(q=>q.id==='past-habits');
 const history=q.requiredIds.map(id=>e(id,'assisted'));
 const p=questProgress(q,history,at);assert.equal(p.practised,true);assert.equal(p.bankMatched,6);assert.equal(p.bankTotal,24);assert.equal(p.bankIndependent,0);
 const independent=questProgress(q,[...history,e(q.challengeIds[0])],at);assert.equal(independent.bankIndependent,1);assert.equal(independent.checks,0);
 const future=questProgress(q,[e(q.challengeIds[0],'correct',at+DAY)],at);assert.equal(future.bankSeen,0);
 const bad=structuredClone(data);bad.quests.find(x=>x.id===q.id).challengeIds=[q.requiredIds[0]];assert.throws(()=>validateCurriculum(bad,base),/bank/);
});
test('mixed tense task hides the tense cue and includes both meanings',()=>{
 const q=data.quests.find(q=>q.id==='past-choose-meaning'),cards=data.cards.filter(c=>q.bankIds.includes(c.id));
 assert.ok(cards.some(c=>c.tense==='imperfect'));assert.ok(cards.some(c=>c.tense==='preterite'));assert.ok(cards.every(c=>c.chooseTense));
});
