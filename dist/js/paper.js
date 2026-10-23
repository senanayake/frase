// Browser-local worksheet selection. Exporting never records a learning attempt.
export const PEOPLE=['yo','tú','él / ella / usted','nosotros','ellos / ellas / ustedes'];
export const PAPER_CONTEXTS={
 conjugation:{label:'Conjugations',description:'Retrieve the form for a person and tense; then use it in your own sentence.'},
 sentences:{label:'Sentences in context',description:'Complete gaps, change sentences and write from a meaning cue in this tense or quest.'},
 contrast:{label:'Choose the past tense',description:'Choose preterite or imperfect from the intended meaning; the tense is not given.'},
 review:{label:'Difficult items and due review',description:'Revisit checked exercises that needed support or are due. Exporting does not change review dates.'}
};
export function formTenses(course){return course.tenses.filter(t=>course.verbs.some(v=>v.forms?.[t.id]?.length===5));}
function random(seed){let x=Number(seed)>>>0;return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function endings(verb,tense,person,form){
 const regular={present:{ar:['o','as','a','amos','an'],er:['o','es','e','emos','en'],ir:['o','es','e','imos','en']},preterite:{ar:['é','aste','ó','amos','aron'],er:['í','iste','ió','imos','ieron'],ir:['í','iste','ió','imos','ieron']},imperfect:{ar:['aba','abas','aba','ábamos','aban'],er:['ía','ías','ía','íamos','ían'],ir:['ía','ías','ía','íamos','ían']}};
 const group=verb.slice(-2),stem=tense==='future'?verb:verb.slice(0,-2);
 const ending=tense==='future'?['é','ás','á','emos','án'][person]:regular[tense]?.[group]?.[person];
 return ending&&stem+ending===form?{stem,ending}:null;
}
function fromCard(c,course,hideTense=false){
 const tense=course.tenses.find(t=>t.id===c.tense)?.label||c.tense;
 const instruction=c.instruction||'Write your answer in Spanish.';
 return {id:c.id,sourceId:c.id,title:hideTense?(c.type==='cloze'?'Complete the verb from meaning.':'Choose the past from meaning.'):(c.type==='cloze'?'Complete the missing word or expression.':instruction),
  prompt:c.prompt.replaceAll('___','____________'),answer:c.type==='cloze'?c.answers[0]:c.sample||c.answers[0],
  notes:(c.type==='cloze'?'Full sentence: '+c.sample+' ':'')+(hideTense?'Target: '+tense+'. ':'')+(c.explanation||''),
  cue:!hideTense?(c.type==='cloze'?[tense,c.verb?'Use '+c.verb+'.':''].filter(Boolean).join(' - '):''):c.verb?'Use '+c.verb+'.':'',lines:c.type==='cloze'?1:2,type:c.type};
}
export function makeWorksheet(course,curriculum,state,options={},previous=[],seed=Date.now(),now=Date.now()){
 const focus=PAPER_CONTEXTS[options.focus]?options.focus:'conjugation';
 const tense=options.tense||'present',count=[6,8,12].includes(Number(options.count))?Number(options.count):8;
 const q=curriculum.quests.find(q=>q.id===options.questId);
 const rng=random(seed),times=new Map();
 for(const sheet of previous.slice(-30))for(const item of sheet.items||[])times.set(item.id,(times.get(item.id)||0)+1);
 const cardsById=new Map(course.cards.map(c=>[c.id,c]));
 const latest=new Map((state.history||[]).filter(e=>e.at<=now).sort((a,b)=>a.at-b.at).map(e=>[e.cardId,e]));
 let pool=[],scope='',personal='Write two short sentences using this pattern. Try saying them aloud after writing.';
 if(focus==='conjugation'){
  const t=course.tenses.find(t=>t.id===tense);scope=(t?.label||tense)+' - '+(options.verb&&options.verb!=='all'?options.verb:'mixed verbs');
  const people=options.person==='all'||options.person===undefined?[0,1,2,3,4]:[Number(options.person)].filter(i=>Number.isInteger(i)&&i>=0&&i<5);
  for(const v of course.verbs.filter(v=>(!options.verb||options.verb==='all'||options.verb===v.infinitive)&&v.forms?.[tense]?.length===5))for(const i of people){
   const answer=v.forms[tense][i],partial=options.support==='ending'?endings(v.infinitive,tense,i,answer):null;
   const sourceId='form-'+tense+'-'+v.infinitive+'-'+i;
   pool.push({id:'paper-'+sourceId,sourceId:cardsById.has(sourceId)?sourceId:null,bucket:i,title:v.infinitive+' - '+PEOPLE[i],prompt:partial?partial.stem+'____________________':'Full form: ____________________',
    cue:'',answer:partial?partial.ending+' (full form: '+answer+')':answer,
    notes:partial?'Regular ending.':options.support==='ending'?'Whole form used: this item has no supported regular-ending split.':'',lines:0,type:'form'});
  }
  personal='Write two sentences using '+(options.verb&&options.verb!=='all'?options.verb:'two verbs from this sheet')+' in the '+(t?.label||tense).toLowerCase()+'. Use two different subjects if possible.';
 }else{
  let selected;
  if(focus==='contrast'){
   const contrast=curriculum.quests.find(q=>q.id==='past-choose-meaning');
   selected=course.cards.filter(c=>contrast?.cardIds.includes(c.id)&&c.type!=='create');scope='Preterite versus imperfect';
   personal='Write two sentences: describe a former habit or background, then one completed event. Choose the tenses from meaning.';
  }else{
   selected=course.cards.filter(c=>c.type!=='create'&&(q?(q.cardIds.includes(c.id)&&(focus==='review'||!q.challengeIds?.includes(c.id))):c.tense===tense&&!c.questId));
   // For advanced tenses without free-practice prompts, draw from reviewed quest content.
   if(!q&&!selected.length)selected=course.cards.filter(c=>c.type!=='create'&&c.tense===tense);
   scope=q?q.title:course.tenses.find(t=>t.id===tense)?.label||tense;
   if(focus==='review')selected=selected.filter(c=>['assisted','revealed'].includes(latest.get(c.id)?.outcome)||state.records?.[c.id]?.due<=now);
   const own=q&&course.cards.find(c=>q.cardIds.includes(c.id)&&c.type==='create');if(own)personal=own.prompt;
  }
  pool=selected.map(c=>fromCard(c,course,focus==='contrast'||c.chooseTense||c.type==='contrast'));
 }
 if(!pool.length)throw new Error(focus==='review'?'No supported attempts or due checked exercises in this context yet. Try another context or practise a few items first.':'No checked forms or exercises match these choices. Choose another tense or verb.');
 // Balance fresh print exposure with difficult/due work; repeats are intentional.
 const ranked=pool.map(item=>({item,tie:rng()})).sort((a,b)=>{
  const priority=item=>{const e=latest.get(item.sourceId);return ['assisted','revealed'].includes(e?.outcome)||state.records?.[item.sourceId]?.due<=now?0:1;};
  return (focus==='review'?priority(a.item)-priority(b.item):0)||(times.get(a.item.id)||0)-(times.get(b.item.id)||0)||a.tie-b.tie;
 }).map(x=>x.item);
 const chosen=[];const add=item=>{if(item&&!chosen.some(c=>c.id===item.id))chosen.push(item);};
 if(focus==='conjugation'&&(options.person==='all'||options.person===undefined)&&count-1>=5)for(let i=0;i<5;i++)add(ranked.find(item=>item.bucket===i));
 for(const item of ranked){if(chosen.length>=count-1)break;add(item);}
 // Shuffle order after coverage selection to avoid teaching a fixed person sequence.
 if(focus==='conjugation')for(let i=chosen.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[chosen[i],chosen[j]]=[chosen[j],chosen[i]];}
 const requested=count-1,available=pool.length;
 chosen.push({id:'paper-personal-'+focus+'-'+(q?.id||tense),title:'Your own words',prompt:personal,answer:'Open response. Check the tense, subject, meaning and written accents. Other wording can be correct; ask your teacher about uncertain sentences.',notes:'Self-review or teacher review; no automatic grammar judgement.',lines:3,type:'create'});
 const serial=(Number(seed)>>>0).toString(36).toUpperCase();
 return {schemaVersion:1,id:'F-'+new Date(now).toISOString().slice(0,10).replaceAll('-','')+'-'+serial,createdAt:now,focus,options:{...options,focus,tense,count},
 title:PAPER_CONTEXTS[focus].label,scope,description:PAPER_CONTEXTS[focus].description,items:chosen,
 notice:available<requested?'Only '+available+' distinct checked items match these choices. This sheet uses them once; widen the focus for more variety.':'Fresh exports favour less-printed items; familiar items will return for useful repetition.'};
}
export function savedWorksheets(state){return Array.isArray(state.paperSheets)?state.paperSheets.filter(s=>s?.schemaVersion===1&&typeof s.id==='string'&&typeof s.title==='string'&&Array.isArray(s.items)&&s.items.length>0&&s.items.length<=13&&s.items.every(i=>typeof i.prompt==='string'&&typeof i.answer==='string'&&typeof i.id==='string')).slice(-30):[];}
