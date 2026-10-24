// Focused recall is additive: it never changes the ordinary practice scheduler.
const DAY=86400000;
const PEOPLE=['yo','tú','ella','nosotros','ellos'];
const CONTEXTS={hablar:['con mi familia','con mis amigos'],estudiar:['en la biblioteca','en casa'],trabajar:['en la oficina','en una tienda'],visitar:['a mi familia','a mis amigos'],comprar:['fruta','verduras'],cocinar:['arroz','sopa'],caminar:['por la ciudad','por el barrio'],nadar:['en el mar','en el lago'],viajar:['a México','a España'],escuchar:['la radio','un podcast'],terminar:['la tarea','el proyecto'],comer:['arroz','fruta'],beber:['leche','agua'],aprender:['francés','español'],vender:['fruta','ropa'],vivir:['en México','en una ciudad pequeña'],escribir:['un mensaje','una carta'],recibir:['un regalo','una carta'],abrir:['la puerta','la ventana'],correr:['por el barrio','por el parque'],leer:['una revista','un libro'],hacer:['la tarea','la cena'],ir:['al mercado','a la biblioteca'],ser:['feliz','feliz'],tener:['tiempo para estudiar','tiempo para leer']};
Object.assign(CONTEXTS,{hablar:['con mi familia','con mis amigos','con mi hermana','con mi profesora'],comer:['arroz','fruta','sopa','pan'],vivir:['en México','en una ciudad pequeña','en Madrid','en un apartamento'],estudiar:['en la biblioteca','en casa','en la escuela','con mi profesora'],beber:['leche','agua','agua mineral','café'],escribir:['un mensaje','una carta','un correo','un cuento']});
const CUES={present:['Normalmente','Cada semana','A menudo','Generalmente'],preterite:['Ayer','El lunes pasado','La semana pasada','El sábado pasado'],imperfect:['En aquella época','Antes','En aquellos años','En esa época'],future:['Mañana','La próxima semana','El próximo mes','El próximo año'],perfect:['Hoy','Esta semana','Este mes','Este año']};
export function emptyFocus(){return {version:1,sets:{},records:{},serial:0};}
export function validateFocus(value){
 if(value===undefined)return emptyFocus();
 if(!value||value.version!==1||!value.sets||typeof value.sets!=='object'||Array.isArray(value.sets)||!value.records||typeof value.records!=='object'||Array.isArray(value.records)||!Number.isSafeInteger(value.serial)||value.serial<0)throw new Error('Invalid focused practice backup.');
 for(const set of Object.values(value.sets))if(!set||!Array.isArray(set.ids)||set.ids.length!==6||new Set(set.ids).size!==6||set.ids.some(id=>typeof id!=='string'||id.length>160)||!Number.isFinite(set.created))throw new Error('Invalid focused set.');
 for(const r of Object.values(value.records)){
  if(!r||!Number.isSafeInteger(r.attempts)||r.attempts<0||!Number.isSafeInteger(r.days)||r.days<0||!Number.isFinite(r.due))throw new Error('Invalid focused recall record.');
  for(const k of ['last','lastSupport','lastIndependent'])if(r[k]!==null&&!Number.isFinite(r[k]))throw new Error('Invalid focused recall date.');
 }
 return value;
}
export function focusTargets(course,tense){
 const ids=new Map(course.cards.filter(c=>!c.questId).map(c=>[c.id,c]));
 return course.verbs.flatMap(v=>!CONTEXTS[v.infinitive]||!CUES[tense]?[]:(v.forms?.[tense]||[]).flatMap((form,person)=>{
  const id=`form-${tense}-${v.infinitive}-${person}`,source=ids.get(id);
  if(!source)return [];
  const regular=course.tenses.find(t=>t.id===tense)?.endings;
  const family=v.infinitive.slice(-2),stem=tense==='future'?v.infinitive:v.infinitive.slice(0,-2);
  const suffix=regular?.['-'+family]?.[person]||regular?.['-er / -ir']?.[person]||regular?.['All regular verbs']?.[person];
  const split=suffix&&stem+suffix===form?{stem,ending:suffix}:null;
  return [{id,tense,verb:v.infinitive,person,form,source,split,pattern:`${tense}:${split?(tense==='future'?'regular':family):v.infinitive}:${person}`}];
 }));
}
function patternDifficulty(target,targets,state){
 const ids=new Set(targets.filter(t=>t.pattern===target.pattern).map(t=>t.id));
 return state.history.slice(-300).filter(e=>ids.has(e.focusTarget||e.cardId)&&e.outcome!=='correct').length;
}
export function ensureFocusSet(course,state,tense,now=Date.now(),advance=false){
 state.focus=validateFocus(state.focus);
 const targets=focusTargets(course,tense),byId=new Map(targets.map(t=>[t.id,t]));
 const old=state.focus.sets[tense];
 if(old&&old.ids.every(id=>byId.has(id))&&!advance)return old.ids.map(id=>byId.get(id));
 if(targets.length<6)throw new Error('Focused mode needs six checked forms in this tense.');
 const preferred=['hablar','comer','vivir','estudiar','beber','escribir'];
 const ranked=targets.map((t,i)=>{const r=state.focus.records[t.id];return {t,i,score:patternDifficulty(t,targets,state)*10+(r?.days>=2?(r.due<=now?30:-1000):0)-(old?.ids.includes(t.id)&&advance?500:0)};}).sort((a,b)=>b.score-a.score||(preferred.indexOf(a.t.verb)<0?99:preferred.indexOf(a.t.verb))-(preferred.indexOf(b.t.verb)<0?99:preferred.indexOf(b.t.verb))||a.i-b.i);
 const chosen=[],verbs=new Map();
 // Cover every subject group, using no more than two forms from one verb.
 const add=t=>{chosen.push(t);verbs.set(t.verb,(verbs.get(t.verb)||0)+1);};
 for(let person=0;person<5;person++)add(ranked.find(({t})=>t.person===person&&(verbs.get(t.verb)||0)<2).t);
 add(ranked.find(({t})=>!chosen.includes(t)&&(verbs.get(t.verb)||0)<2).t);
 state.focus.sets[tense]={ids:chosen.map(t=>t.id),created:now};
 return chosen;
}
export function focusStatus(target,state,now=Date.now()){
 const r=state.focus?.records?.[target.id];
 if(!r)return {label:'Learn this form',due:true,days:0};
 return {label:r.days>=2?'Recalled on later days':r.days===1?'One later recall':'Building recall',due:r.due<=now,days:r.days,next:r.due};
}
export function focusCard(target,stage,variant=0,serial=0){
 const contexts=CONTEXTS[target.verb],subject=PEOPLE[target.person],complement=contexts[variant%contexts.length];
 const predicate=target.verb==='ser'&&target.person>=3?'felices':complement;
 const cue=CUES[target.tense][Math.floor(variant/contexts.length)%CUES[target.tense].length];
 const prompt=stage==='form'?`${target.verb} · ${subject} → ___`:`${cue}, ${subject} ___ ${predicate}.`;
 const sample=stage==='form'?`${subject} ${target.form}`:`${cue}, ${subject} ${target.form} ${predicate}.`;
 return {id:`focus-${target.id}-${stage}-${serial}-${variant}`,type:'cloze',tense:target.tense,verb:target.verb,prompt,sample,answers:[target.form],
  instruction:'Type or say the complete missing verb form.',explanation:target.source.explanation,focusTarget:target.id,focusPattern:target.pattern,focusStage:stage,
  focusCue:stage==='supported'?(target.split?`Start with ${target.split.stem} + the ${subject} ending. Type the whole form.`:`Recall ${subject} + ${target.verb}. Open the reference if you need the model.`):'',
  hint:target.source.hint};
}
export function makeFocusRound(targets,state,now=Date.now(),random=Math.random){
 state.focus.serial++;
 const serial=state.focus.serial;
 const order=targets.map(t=>({t,n:random()})).sort((a,b)=>(state.focus.records[a.t.id]?.due||0)-(state.focus.records[b.t.id]?.due||0)||a.n-b.n).map(x=>x.t);
 const first=order.map(t=>focusCard(t,state.focus.records[t.id]?.attempts?'form':'supported',serial,serial));
 // A changed complement and time cue test the form in another context.
 const second=[...order.slice(3),...order.slice(0,3)].map(t=>focusCard(t,'context',serial+1,serial));
 const round=[...first,...second];round.focused=true;round.focusTargets=targets;round.focusRetried=[];round.sessionId='focus-'+now+'-'+serial;
 return round;
}
export function queueFocusRetry(round,index){
 const card=round[index];
 if(!round.focused||round.focusRetried.includes(card.focusTarget))return false;
 round.focusRetried.push(card.focusTarget);
 // Keep at least three intervening prompts; each target gets at most one retry.
 const lastTarget=round.findLastIndex(c=>c.focusTarget===card.focusTarget);
 let intervening=round.length-lastTarget-1;
 for(const other of round.focusTargets){
  if(intervening>=3)break;
  if(other.id===card.focusTarget)continue;
  round.push(focusCard(other,'form',round.length,round.sessionId));intervening++;
 }
 const target=round.focusTargets.find(t=>t.id===card.focusTarget);
 round.push(focusCard(target,'retry',round.length,round.sessionId));
 return true;
}
export function recordFocus(state,card,outcome,now=Date.now()){
 state.focus=validateFocus(state.focus);
 const old=state.focus.records[card.focusTarget]||{attempts:0,days:0,due:now,last:null,lastSupport:null,lastIndependent:null};
 const r={...old,attempts:old.attempts+1,last:now};
 const independent=outcome==='correct'&&card.focusStage!=='supported';
 const anchor=Math.max(old.lastSupport??-Infinity,old.lastIndependent??-Infinity);
 const spaced=independent&&Number.isFinite(anchor)&&now-anchor>=DAY;
 if(!independent){r.days=0;r.lastSupport=now;r.due=now+DAY;}
 else if(spaced){r.days=old.days+1;r.lastIndependent=now;r.due=now+[1,3,7,14,30][Math.min(4,r.days-1)]*DAY;}
 // Immediate repeats never postpone or promote a later-day check.
 state.focus.records[card.focusTarget]=r;
 return {record:r,spaced};
}
