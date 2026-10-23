import {DAY, grade, validatePack} from './engine.js';

export function validateCurriculum(data, course) {
 const fail=message=>{throw new Error('Curriculum: '+message);};
 if(!data||data.schemaVersion!==1||!['patterns','units','quests','cards'].every(k=>Array.isArray(data[k])))fail('expected schemaVersion 1 and lists of patterns, units, quests, cards.');
 const maps={};
 for(const key of ['patterns','units','quests','cards']){
  maps[key]=new Map();
  for(const item of data[key]){if(!item||!/^[a-z0-9][a-z0-9-]{1,99}$/.test(item.id||'')||maps[key].has(item.id))fail('invalid or duplicate '+key+' ID.');maps[key].set(item.id,item);}
 }
 const text=(o,key)=>{if(typeof o[key]!=='string'||!o[key].trim()||o[key].length>2500)fail('missing or invalid '+key+' on '+o.id);};
 for(const p of data.patterns)for(const k of ['label','rule','example','meaning'])text(p,k);
 const tenses=[...course.tenses,...(data.tenses||[])];
 if(new Set(tenses.map(t=>t.id)).size!==tenses.length)fail('duplicate tense ID.');
 const knownTenses=new Set(tenses.map(t=>t.id));
 for(const t of data.tenses||[])for(const k of ['id','label','rule','description','example'])text(t,k);
 for(const v of data.verbs||[]){
  if(!/^[a-záéíóúñ]+$/.test(v.infinitive||'')||!v.forms||!Object.keys(v.forms).length||!Object.entries(v.forms).every(([id,forms])=>knownTenses.has(id)&&Array.isArray(forms)&&forms.length===5&&forms.every(f=>typeof f==='string'&&f.trim())))fail('invalid verb reference.');
 }
 const cardIds=new Set(course.cards.map(c=>c.id));
 validatePack({schemaVersion:1,id:'curriculum-validation',title:'Curriculum',tenses,cards:data.cards});
 for(const c of data.cards){
  if(cardIds.has(c.id))fail('exercise ID collides with existing course: '+c.id);
  if(!maps.units.has(c.unitId)||!maps.quests.has(c.questId)||!maps.patterns.has(c.patternId))fail('unknown exercise mapping on '+c.id);
  if(c.familyId!==c.questId||!['form','build','checkpoint','personal'].includes(c.learningStage))fail('invalid family or learning stage on '+c.id);
  for(const k of ['level','theme','variant','sample'])text(c,k);
  if(!c.hints||c.hints.length!==3)fail('three hints required on '+c.id);
  if(c.type==='cloze'&&!c.answers.some(a=>c.prompt.replace('___',a)===c.sample))fail('cloze model does not complete its prompt on '+c.id);
  if(!['create','cloze'].includes(c.type)&&grade(c.sample,c).kind!=='correct')fail('sample is not an accepted answer on '+c.id);
 }
 const assigned=new Set(),questOwners=new Map();
 for(const u of data.units){
  for(const k of ['title','goal','level','variant'])text(u,k);
  if(!u.questIds?.length||new Set(u.questIds).size!==u.questIds.length)fail('unit needs unique quests.');
  for(const id of u.questIds){if(!maps.quests.has(id)||questOwners.has(id))fail('unknown or multiply assigned quest.');questOwners.set(id,u.id);}
 }
 for(const q of data.quests){
  for(const k of ['title','goal'])text(q,k);
  if(!questOwners.has(q.id)||!maps.patterns.has(q.patternId)||!q.cardIds?.length||!q.requiredIds?.length||!q.checkpointIds?.length)fail('incomplete quest '+q.id);
  if(new Set(q.cardIds).size!==q.cardIds.length||new Set(q.requiredIds).size!==q.requiredIds.length||new Set(q.checkpointIds).size!==q.checkpointIds.length)fail('duplicate quest card reference.');
  for(const id of q.cardIds){const c=maps.cards.get(id);if(!c||assigned.has(id)||c.questId!==q.id||c.unitId!==questOwners.get(q.id)||c.patternId!==q.patternId)fail('invalid card assignment '+id);assigned.add(id);}
  for(const id of q.requiredIds)if(!q.cardIds.includes(id)||maps.cards.get(id).type==='create')fail('required cards must be checked exercises.');
  for(const id of q.checkpointIds)if(!q.requiredIds.includes(id)||maps.cards.get(id).learningStage!=='checkpoint')fail('checkpoint must be a required checkpoint exercise.');
  if(q.bankIds){
   for(const key of ['bankIds','introIds','challengeIds'])if(!Array.isArray(q[key])||!q[key].length||new Set(q[key]).size!==q[key].length||q[key].some(id=>!q.cardIds.includes(id)))fail('invalid practice bank '+q.id);
   if(q.bankIds.some(id=>maps.cards.get(id).type==='create')||q.requiredIds.some(id=>!q.introIds.includes(id))||q.challengeIds.some(id=>!q.bankIds.includes(id)||q.introIds.includes(id)||maps.cards.get(id).type==='cloze'))fail('invalid bank stages '+q.id);
   if(q.cardIds.some(id=>maps.cards.get(id).type!=='create'&&!q.bankIds.includes(id)))fail('unchecked bank assignment '+q.id);
  }
 }
 if(assigned.size!==data.cards.length)fail('unassigned exercises.');
 for(const [kind,list] of [['quests',data.quests],['units',data.units]]){
  const visiting=new Set(),seen=new Set();
  const visit=id=>{if(visiting.has(id))fail('cyclic prerequisites.');if(seen.has(id))return;visiting.add(id);const o=maps[kind].get(id);if(!Array.isArray(o.prerequisites))fail('prerequisites must be a list.');for(const dep of o.prerequisites){if(!maps[kind].has(dep))fail('unknown prerequisite '+dep);visit(dep);}visiting.delete(id);seen.add(id);};
  for(const o of list)visit(o.id);
 }
 return data;
}
export function withCurriculum(course,data){
 const verbs=new Map(course.verbs.map(v=>[v.infinitive,v]));
 for(const v of data.verbs||[]){const old=verbs.get(v.infinitive);verbs.set(v.infinitive,{...old,...v,forms:{...old?.forms,...v.forms}});}
 return {...course,tenses:[...course.tenses,...(data.tenses||[])],cards:[...course.cards,...data.cards],verbs:[...verbs.values()]};
}
export function questProgress(quest,history,now=Date.now()) {
 const relevant=history.filter(e=>quest.cardIds.includes(e.cardId)&&e.at<=now).sort((a,b)=>a.at-b.at);
 const practised=new Set(relevant.filter(e=>['correct','assisted'].includes(e.outcome)).map(e=>e.cardId));
 const independent=new Set(relevant.filter(e=>e.outcome==='correct').map(e=>e.cardId));
 const recalled=new Set(),previous=new Map();
 for(const e of relevant){const old=previous.get(e.cardId);if(e.outcome==='correct'&&old?.outcome==='correct'&&e.at-old.at>=DAY)recalled.add(e.cardId);previous.set(e.cardId,e);}
 const count=(ids,set)=>ids.filter(id=>set.has(id)).length;
 const completed=count(quest.requiredIds,practised),checks=count(quest.checkpointIds,independent),later=count(quest.checkpointIds,recalled);
 const bankIds=quest.bankIds||quest.requiredIds,seen=new Set(relevant.map(e=>e.cardId));
 const bankSeen=count(bankIds,seen),bankMatched=count(bankIds,practised),bankIndependent=count(bankIds,independent);
 return {bankTotal:bankIds.length,bankSeen,bankMatched,bankIndependent,completed,total:quest.requiredIds.length,checks,later,checkpointTotal:quest.checkpointIds.length,practised:completed===quest.requiredIds.length,independent:checks===quest.checkpointIds.length,recalled:later===quest.checkpointIds.length};
}
// Short rounds balance due recall, supported attempts and unseen material.
export function questSession(quest,course,state,kind='learn',now=Date.now()) {
 const cards=new Map(course.cards.map(c=>[c.id,c]));
 const history=(state.history||[]).filter(e=>e.at<=now).sort((a,b)=>a.at-b.at);
 const latest=new Map(history.map(e=>[e.cardId,e]));
 const due=quest.cardIds.filter(id=>cards.get(id)?.type!=='create'&&state.records[id]?.due<=now).sort((a,b)=>state.records[a].due-state.records[b].due);
 if(!quest.bankIds){const ids=kind==='checkpoint'?quest.checkpointIds:kind==='review'?due:quest.cardIds;return ids.map(id=>cards.get(id)).filter(Boolean);}
 const rank=ids=>ids.slice().sort((a,b)=>{
  const x=latest.get(a),y=latest.get(b);
  return Number(Boolean(x))-Number(Boolean(y))||Number(x?.outcome==='correct')-Number(y?.outcome==='correct')||(x?.at||0)-(y?.at||0)||ids.indexOf(a)-ids.indexOf(b);
 });
 let ids;
 if(kind==='checkpoint')ids=quest.checkpointIds;
 else if(kind==='review')ids=due.slice(0,6);
 else if(kind==='challenge')ids=rank(quest.challengeIds).slice(0,5);
 else if(kind==='learn'&&!questProgress(quest,history,now).practised)ids=quest.introIds;
 else {
  const pool=quest.bankIds.filter(id=>!quest.challengeIds.includes(id));
  ids=[];const take=(list,n)=>{for(const id of list){if(n<=0)break;if(pool.includes(id)&&!ids.includes(id)){ids.push(id);n--;}}};
  take(due,2);
  take(rank(pool.filter(id=>latest.has(id)&&latest.get(id).outcome!=='correct')),1);
  take(pool.filter(id=>!latest.has(id)),3);
  take(rank(pool),6-ids.length);
  const personal=quest.cardIds.find(id=>cards.get(id)?.type==='create');if(personal)ids.push(personal);
 }
 return ids.map(id=>cards.get(id)).filter(Boolean);
}
export function weekActivity(history,now=new Date()) {
 const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));
 const end=new Date(start);end.setDate(end.getDate()+7);
 const days=new Set(history.filter(e=>e.at>=start.getTime()&&e.at<end.getTime()&&e.at<=now.getTime()).map(e=>new Date(e.at).toDateString()));
 return {days:days.size,start,end};
}
