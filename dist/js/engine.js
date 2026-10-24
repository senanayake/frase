import {validateFocus} from './focus.js';
export const STORAGE_KEY = 'frase.learning.v1';
export const DAY = 86400000;
export const TYPES = ['cloze', 'translate', 'transform', 'contrast', 'create'];

export function normalize(text) {
  return String(text).normalize('NFC').toLocaleLowerCase('es').replace(/[.,;:!?¿¡“”"()]/g, '').replace(/\s+/g, ' ').trim();
}
export function stripAccents(text) {
  return text.replace(/[áéíóúü]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u'})[c]);
}
function variants(text, subject) {
  const result = [normalize(text)];
  const prefix = normalize(subject || '') + ' ';
  if (subject && result[0].startsWith(prefix)) result.push(result[0].slice(prefix.length));
  return result;
}
export function grade(answer, card) {
  if (!normalize(answer)) return {kind:'empty'};
  if (card.type === 'create') return {kind:'self'};
  const input = variants(answer, card.subject);
  const expected = card.answers.flatMap(a => variants(a, card.subject));
  if (input.some(v => expected.includes(v))) return {kind:'correct'};
  if (input.some(v => expected.some(a => stripAccents(v) === stripAccents(a)))) return {kind:'accent'};
  return {kind:'unmatched'};
}
export function initialState() {
  return {schemaVersion:1, records:{}, history:[], packs:[], settings:{theme:'paper',sessionLength:12,speechRate:0.8,largeText:false,practiceReferenceOpen:false,weeklyPracticeDays:3}};
}
export function loadState(storage) {
  try {
    const raw=storage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed=JSON.parse(raw);
    return validateBackup(parsed);
  } catch { return initialState(); }
}
export function validateBackup(value) {
  if (!value || value.schemaVersion !== 1 || !value.records || typeof value.records !== 'object' || Array.isArray(value.records) || !Array.isArray(value.history) || !Array.isArray(value.packs)) throw new Error('This is not a Frase backup.');
  for (const [id,r] of Object.entries(value.records)) {
    if (!id || !r || !Number.isFinite(r.due) || !Number.isFinite(r.stage) || r.stage < 0 || r.stage > 5 || !Number.isFinite(r.attempts) || r.attempts < 0) throw new Error('The backup has an invalid review record.');
  }
  for (const event of value.history) if (!event || !Number.isFinite(event.at) || typeof event.cardId !== 'string' || !['correct','assisted','revealed','self'].includes(event.outcome)) throw new Error('The backup has an invalid practice entry.');
  value.packs.forEach(validatePack);
  const settings={...initialState().settings,...value.settings};
  if (!['paper','night'].includes(settings.theme)) settings.theme='paper';
  if (![6,12,20].includes(Number(settings.sessionLength))) settings.sessionLength=12;
  settings.speechRate=Math.min(1.2,Math.max(0.5,Number(settings.speechRate)||0.8));
  settings.largeText=Boolean(settings.largeText);
  settings.practiceReferenceOpen=settings.practiceReferenceOpen===true;
  if(!Number.isInteger(settings.weeklyPracticeDays)||settings.weeklyPracticeDays<1||settings.weeklyPracticeDays>7)settings.weeklyPracticeDays=3;
  return {...value,settings,focus:validateFocus(value.focus)};
}
export function saveState(state,storage) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function recordAnswer(state, card, outcome, answer, now=Date.now()) {
  const old=state.records[card.id] || {stage:0,attempts:0,correct:0};
  const stage=outcome==='correct' ? Math.min(5,old.stage+1) : outcome==='revealed' ? 0 : Math.max(0,old.stage-1);
  const interval=outcome==='revealed' ? 10/1440 : outcome==='correct' ? [1,1,3,7,14,30][stage] : 1;
  state.records[card.id]={stage,attempts:old.attempts+1,correct:old.correct+(outcome==='correct'?1:0),due:now+interval*DAY,last:now,outcome};
  state.history.push({cardId:card.id,tense:card.tense,type:card.type,outcome,answer:String(answer).slice(0,1500),at:now});
  if(state.history.length>10000) state.history=state.history.slice(-10000);
  return state.records[card.id];
}
export function makeSession(cards,state,{tense='all',mode='mixed',length=12}={},now=Date.now(),random=Math.random) {
  const pool=cards.filter(c=>(tense==='all'||c.tense===tense) && (mode==='mixed' || (mode==='past' ? c.type==='contrast' : mode==='create' ? c.type==='create' : c.type===mode)));
  const shuffled=[...pool].sort(()=>random()-0.5);
  const due=shuffled.filter(c=>state.records[c.id] && state.records[c.id].due<=now).sort((a,b)=>state.records[a.id].due-state.records[b.id].due);
  const seen=new Set(due.map(c=>c.id));
  const fresh=shuffled.filter(c=>!state.records[c.id]);
  const future=shuffled.filter(c=>!seen.has(c.id)&&state.records[c.id]);
  let chosen=due.slice(0,length);
  if(mode==='mixed' && chosen.length<length) {
    const types=['cloze','translate','contrast','transform','create'];
    const queues=types.map(type=>fresh.filter(c=>c.type===type));
    while(chosen.length<length && queues.some(q=>q.length)) for(const q of queues) if(q.length && chosen.length<length) chosen.push(q.shift());
  } else chosen.push(...fresh.slice(0,length-chosen.length));
  if(chosen.length<length) chosen.push(...future.slice(0,length-chosen.length));
  return chosen;
}
export function validatePack(pack) {
  if (!pack || typeof pack !== 'object' || pack.schemaVersion !== 1 || !/^[a-z0-9][a-z0-9-]{1,70}$/.test(pack.id || '') || typeof pack.title !== 'string' || !pack.title.trim() || pack.title.length>120 || !Array.isArray(pack.tenses) || !Array.isArray(pack.cards) || pack.cards.length>3000 || !pack.cards.length) throw new Error('Use a lesson pack with schemaVersion 1, an id, title, tenses, and 1–3,000 cards.');
  const tenses=new Set();
  for(const t of pack.tenses) {
    if(!t || typeof t.id!=='string' || !/^[a-z0-9-]{1,60}$/.test(t.id) || typeof t.label!=='string' || t.label.length>100 || !t.label.trim()) throw new Error('Every tense needs a short id and label.');
    if(tenses.has(t.id)) throw new Error('Tense IDs must be unique.');
    tenses.add(t.id);
  }
  const ids=new Set();
  for(const c of pack.cards) {
    if(!c || typeof c.id!=='string' || !/^[a-z0-9-]{1,100}$/.test(c.id) || ids.has(c.id) || !tenses.has(c.tense) || !TYPES.includes(c.type) || typeof c.prompt!=='string' || !c.prompt.trim() || c.prompt.length>2500) throw new Error('Cards need unique IDs, a declared tense, a supported type, and a prompt.');
    if(c.type!=='create' && (!Array.isArray(c.answers)||!c.answers.length||c.answers.some(a=>typeof a!=='string'||!a.trim()||a.length>1500))) throw new Error('Checked exercises need at least one accepted answer.');
    for(const key of ['hint','explanation','sample','sentence','instruction','subject','verb']) if(c[key]!==undefined && (typeof c[key]!=='string'||c[key].length>2500)) throw new Error('Exercise text is too long or has an invalid format.');
    if(c.hints!==undefined && (!Array.isArray(c.hints)||c.hints.length>3||c.hints.some(h=>typeof h!=='string'||!h.trim()||h.length>1500))) throw new Error('Graduated hints must be a list of up to three short clues.');
    ids.add(c.id);
  }
  return pack;
}
export function mergeCourse(course,packs) {
  const tenses=new Map(course.tenses.map(t=>[t.id,t]));
  const cards=new Map(course.cards.map(c=>[c.id,c]));
  for(const pack of packs) {
    for(const t of pack.tenses) if(!tenses.has(t.id)) tenses.set(t.id,t);
    for(const c of pack.cards) {
      const id=`custom-${pack.id}-${c.id}`;
      cards.set(id,{...c,id,pack:pack.title});
    }
  }
  return {...course,tenses:[...tenses.values()],cards:[...cards.values()]};
}
