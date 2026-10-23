let questLevelFilter='all';
import {loadState,saveState,makeSession,grade,recordAnswer,mergeCourse,validatePack,validateBackup,DAY} from './engine.js';
import {validateCurriculum,withCurriculum,questProgress,questSession,weekActivity} from './curriculum.js';
import {makeWorksheet,savedWorksheets,formTenses,PAPER_CONTEXTS,PEOPLE} from './paper.js';
import {worksheetPdf} from './paper-pdf.js';
import {graduatedHint} from './hints.js';
import {createSpeechInput,recognitionConstructor,practiceInputLabel,guidedSession} from './voice.js';

const icons={
 book:'<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3z"/>',
 practice:'<path d="M5 4h14v16H5z"/><path d="m9 9 2 2 4-4M9 15h6"/>',
 chart:'<path d="M4 4v16h16M8 15v-4M12 15V7M16 15v-6"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
 moon:'<path d="M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11z"/>',
 bulb:'<path d="M9 18h6m-5 3h4M8 13a6 6 0 1 1 8 0c-1 .8-1.5 1.5-1.5 3h-5c0-1.5-.5-2.2-1.5-3"/>',
 audio:'<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 leaf:'<path d="M20 3c1 12-5 19-12 15S3 5 20 3zM4 21 16 9"/>',
 switch:'<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
 pen:'<path d="m4 17 12-12 3 3L7 20H4zM14 7l3 3"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
 external:'<path d="M14 3h7v7m0-7L11 13M9 4H4v16h16v-5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>'
};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.book}</svg>`;
const esc=(text)=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
let state,course,base,view='practice',mode='mixed',tense='all',session=null,index=0,phase='answer',hinted=false,tries=0,result=null,feedback='',showEditor=false,lessonFilter='',toastTimer,hintLevel=0,maxHintLevel=0,lastIssueKind=null;
let curriculum,practiceScreen='free';
const studyStates={practice:null,quests:null};
let referenceUsed=false,referenceTense=null;
let inputMode='type',guided=false,usedTyped=false,usedSpeech=false,modelHeard=false;
let speechStatus='idle',speechMessage='',previousDraft=null,playbackId=0,audioPlaying=false;
const speechSupported=Boolean(recognitionConstructor(window));
const app=document.querySelector('#app');
const speechInput=createSpeechInput(window,{
 status:(status,message)=>{speechStatus=status;speechMessage=message;refreshSpeechUI();},
 transcript:text=>{
  if(!['practice','quests'].includes(view)||phase!=='answer'||!current())return;
  const field=document.querySelector('#answer');
  if(!field)return;
  if(previousDraft===null)previousDraft=field.value;
  field.value=text.slice(0,1500);result={answer:field.value};usedSpeech=true;
  const undo=document.querySelector('[data-action="undo-speech"]');if(undo)undo.hidden=false;
 }
});
function stopMedia(){audioPlaying=false;playbackId++;speechInput.cancel();speechStatus='idle';speechMessage='';window.speechSynthesis?.cancel();}
function refreshSpeechUI(){
 const audioStop=document.querySelector('[data-action="stop-audio"]');if(audioStop)audioStop.hidden=!audioPlaying;
 const box=document.querySelector('#speech-status');if(box)box.textContent=speechMessage;
 const busy=['starting','listening'].includes(speechStatus);
 const start=document.querySelector('[data-action="record"]');if(start){start.disabled=busy||!speechSupported;start.textContent=busy?'Listening…':'Speak answer';}
 const stop=document.querySelector('[data-action="stop-record"]');if(stop)stop.hidden=!busy;
 const check=document.querySelector('[data-action="check"]');if(check)check.disabled=busy;
}
function voiceControls(showResult){
 return `<div class="voice-panel"><div class="voice-toolbar"><div class="input-tabs" role="group" aria-label="Answer input mode"><button class="btn small ${inputMode==='type'?'selected':''}" data-input-mode="type" aria-pressed="${inputMode==='type'}">Type</button><button class="btn small ${inputMode==='voice'?'selected':''}" data-input-mode="voice" aria-pressed="${inputMode==='voice'}">Speak</button></div><button class="btn small" data-action="guided-toggle" aria-pressed="${guided}">${guided?'Guided audio on':'Guided audio off'}</button><button class="btn small" data-action="read-prompt">${icon('audio')} Hear task</button><button class="btn link small" data-action="stop-audio">Stop audio</button></div>${guided&&current()?.guidedLead?`<p class="small guided-lead">${esc(current().guidedLead)}</p>`:''}${inputMode==='voice'&&!showResult?`<div class="speech-buttons"><button class="btn primary small" data-action="record" ${speechSupported?'':'disabled'}>Speak answer</button><button class="btn small" data-action="stop-record" hidden>Stop listening</button><button class="btn link small" data-action="undo-speech" ${previousDraft===null?'hidden':''}>Undo transcript</button></div><p class="small muted">${speechSupported?'Spanish · Tap to speak, then check the text below.':'Speech input is unavailable in this browser. You can type below, or try Safari on iPhone.'}</p><details class="voice-help"><summary>Voice help &amp; privacy</summary><p>A new recording replaces the answer. Undo restores your earlier draft. Speech supplies spelling and accents.</p><p>On iPhone, use Safari if speech is blocked in an in-app viewer.</p><p>Your browser’s speech provider may process audio online. No ChatGPT account or paid API is used.</p></details>`:''}<p id="speech-status" class="small speech-status" role="status" aria-live="polite">${esc(speechMessage)}</p>${usedSpeech?'<p class="small muted">Speech supplies spelling and accents. This is sentence recall practice, not an independent spelling check.</p>':''}</div>`;
}
function readPrompt(){
 const c=current();if(!c)return;
 const t=c.questId?curriculum.patterns.find(p=>p.id===c.patternId).label:getTense(c.tense).label;
 const prefix=guided&&c.guidedLead?c.guidedLead+' ':'';
 if(c.type==='cloze')speakParts([{text:prefix+(c.instruction||'Complete the sentence. Say only the missing word or expression.')+' Target: '+t+'.',lang:'en'},{text:c.prompt.replace('___',', … ,'),lang:'es'}]);
 else if(c.type==='transform')speakParts([{text:prefix+c.instruction,lang:'en'},{text:c.prompt,lang:'es'}]);
 else speakParts([{text:prefix+(c.type==='translate'?'Say in Spanish. Target: '+t+'. ':'')+c.prompt,lang:'en'}]);
}
function speakFeedback(){
 if(!guided||!current())return;
 if(phase==='done'||phase==='model')speakParts([{text:phase==='done'?'Review the sentence.':'One possible model.',lang:'en'},{text:current().sample||current().answers?.[0],lang:'es'}]);
 else {const clue=graduatedHint(result?.answer||'',current(),course,hintLevel);speakParts([{text:clue.title+'. '+clue.message,lang:'en'}]);}
}
let storage;
try{storage=window.localStorage;state=loadState(storage);}catch{state={schemaVersion:1,records:{},history:[],packs:[],settings:{theme:'paper',sessionLength:12,speechRate:.8,largeText:false}};}
const persist=()=>{try{saveState(state,storage);}catch{toast('Your browser could not save. Export a backup before closing.');}};
const toast=(message)=>{const t=document.querySelector('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),5000);};
const getTense=(id)=>course.tenses.find(t=>t.id===id)||{label:id,spanish:id,description:'Your custom lesson.',rule:'Review the model answer.'};
const dateKey=(at)=>new Date(at).toLocaleDateString('en-CA');
const current=()=>session?.[index];
const stats=()=>{
 const today=state.history.filter(h=>dateKey(h.at)===dateKey(Date.now()));
 return {today:today.length,due:course.cards.filter(c=>!c.questId&&state.records[c.id]?.due<=Date.now()).length,retained:course.cards.filter(c=>state.records[c.id]?.stage>=3).length};
};
function activateView(next){
 if(next===view)return;
 if(['practice','quests'].includes(view)){
  const field=document.querySelector('#answer');if(field&&!field.disabled)result={...result,answer:field.value};
  studyStates[view]={session,index,phase,hinted,tries,result,feedback,hintLevel,maxHintLevel,lastIssueKind,referenceUsed,referenceTense,inputMode,guided,usedTyped,usedSpeech,modelHeard,previousDraft,practiceScreen,mode,tense};
 }
 stopMedia();
 if(['practice','quests'].includes(next)){
  const saved=studyStates[next];
  if(saved)({session,index,phase,hinted,tries,result,feedback,hintLevel,maxHintLevel,lastIssueKind,referenceUsed,referenceTense,inputMode,guided,usedTyped,usedSpeech,modelHeard,previousDraft,practiceScreen,mode,tense}=saved);
  else {session=null;index=0;mode='mixed';tense='all';inputMode='type';guided=false;practiceScreen=next==='quests'?'path':'free';resetCard();}
 }
 view=next;
}
function navigateTo(next){activateView(next);location.hash=next;render();window.scrollTo({top:0});}
function applyPreferences(){document.body.classList.toggle('night',state.settings.theme==='night');document.body.classList.toggle('large-text',state.settings.largeText);}
function nav(){return `<aside class="sidebar"><a class="brand" href="#practice" aria-label="Frase home"><span class="brand-mark">f.</span>frase</a><div class="brand-sub">Your Spanish notebook</div><nav class="nav" aria-label="Main navigation">${[['practice','practice','Practice'],['quests','spark','Quests'],['lessons','book','My lessons'],['progress','chart','Progress'],['settings','settings','Settings']].map(([id,i,label])=>`<button data-nav="${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${icon(i)}${label}</button>`).join('')}</nav><div class="sidebar-note"><p>Poco a poco.</p><span class="small muted">A little, every day.</span></div><div class="profile"><span class="avatar">f.</span><div><strong class="small">Your practice</strong><div class="muted" style="font-size:10px">Mexican Spanish · v${esc(course.version)}</div></div></div></aside>`;}
function render(){
 stopMedia();applyPreferences();
 if(['practice','quests'].includes(view)&&current()&&phase==='answer'&&state.settings.practiceReferenceOpen){referenceUsed=true;hinted=true;}
 const labels={practice:'Practice',quests:'Quests',lessons:'My lessons',progress:'Progress',settings:'Settings'};
 app.innerHTML=`<div class="shell">${nav()}<div class="workspace"><header class="topbar"><div class="breadcrumb">My notebook <span>/</span><span>${labels[view]}</span></div><div class="top-actions"><span class="save-dot"><i class="dot"></i>Saved in this browser</span><button class="icon-btn" data-action="theme" aria-label="Switch to ${state.settings.theme==='night'?'paper':'night'} theme" title="Change reading theme">${icon(state.settings.theme==='night'?'sun':'moon')}</button></div></header><main class="main ${['practice','quests'].includes(view)&&practiceScreen!=='path'&&session&&index<session.length?'has-session':''}" id="main">${view==='practice'?practiceView():view==='quests'?(practiceScreen==='path'?learningPathView():practiceView()):view==='lessons'?lessonsView():view==='progress'?progressView():settingsView()}<footer class="footer"><span>Small steps. Sentences of your own.</span><span>Frase · Personal Spanish practice</span></footer></main></div></div>`;
 bind();refreshSpeechUI();
}
function intro(eyebrow,title,subtitle){return `<div class="intro"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div><div class="date-note"><strong>${new Intl.DateTimeFormat('en',{weekday:'long',month:'short',day:'numeric'}).format(new Date())}</strong>Make a little room for Spanish.</div></div>`;}
function statStrip(){const s=stats();return `<div class="stat-strip"><div class="stat">${icon('leaf')}<span class="number">${s.today}</span><div class="label"><strong>Sentences today</strong>Every attempt is practice</div></div><div class="stat">${icon('clock')}<span class="number">${s.due}</span><div class="label"><strong>Ready to review</strong>Keep your recall fresh</div></div><div class="stat">${icon('book')}<span class="number">${course.tenses.filter(t=>!t.questOnly).length}</span><div class="label"><strong>Tenses to explore</strong>${course.cards.filter(c=>!c.questId).length.toLocaleString()} practice prompts</div></div></div>`;}
function practiceView(){
 const finished=session && index>=session.length;
 return `${intro('Tu práctica','One sentence at a time.','Build your recall. Find the right tense. Make it your own.')}${statStrip()}<div class="paper-entry"><button class="btn" data-action="paper-open">${icon('pen')} Paper practice / PDF</button><span class="small muted">${view==='quests'?'Build a sheet for this quest':'Conjugations, context and review - by hand'}</span></div>${view==='quests'?`<div class="practice-return"><button class="btn small" data-action="learning-path">${icon('book')} All quests</button><span class="small muted">Quest practice</span></div>`:''}<div class="practice-grid"><section aria-label="Sentence practice"><div class="practice-top" ${view==='quests'?'hidden':''}><div class="tabs" aria-label="Practice mode">${[['mixed','spark','Daily mix'],['past','switch','Past tenses'],['create','pen','Your words']].map(([id,i,label])=>`<button class="tab ${mode===id?'active':''}" data-mode="${id}" aria-pressed="${mode===id}">${icon(i)}${label}</button>`).join('')}</div><select class="sub-select" id="tense-filter" aria-label="Tense filter"><option value="all">All tenses</option>${course.tenses.filter(t=>!t.questOnly).map(t=>`<option value="${esc(t.id)}" ${t.id===tense?'selected':''}>${esc(t.label)}</option>`).join('')}</select></div><div class="panel exercise">${finished?summaryView():session?exerciseView():welcomeView()}</div><div class="bottom-note">${icon('leaf')} Recall first. A small hint when you need it.</div>${view==='practice'?`<div class="section-label">A different way to practise</div><button class="path-card guided-start" data-action="start-guided"><span class="path-icon">${icon('audio')}</span><span><strong>Guided voice practice</strong><p>6 linked prompts · switch between speaking and typing</p></span></button><div class="path-cards"><button class="path-card" data-start="cloze"><span class="path-icon">${icon('pen')}</span><span><strong>Find the ending</strong><p>Focus on the verb form</p></span></button><button class="path-card" data-start="translate"><span class="path-icon">${icon('switch')}</span><span><strong>Build the sentence</strong><p>Turn meaning into Spanish</p></span></button><button class="path-card" data-start="transform"><span class="path-icon">${icon('spark')}</span><span><strong>Change the scene</strong><p>A new person. A new tense.</p></span></button></div>`:''}</section><aside class="aside">${asideView()}</aside></div>`;
}
function weeklyGoalView(){
 const week=weekActivity(state.history),target=state.settings.weeklyPracticeDays||3;
 return `<section class="weekly-goal" aria-label="Weekly practice goal"><div><span class="eyebrow">YOUR WEEK · MON–SUN</span><h2>${week.days} of ${target} practice days</h2><p>${week.days>=target?'Weekly goal reached. Every extra session is your choice.':'A little practice on any '+target+' days. A missed day costs you nothing.'}</p></div><div class="week-goal-control"><label for="weekly-days">Days per week</label><select id="weekly-days">${[1,2,3,4,5,6,7].map(n=>`<option value="${n}" ${n===target?'selected':''}>${n} ${n===1?'day':'days'}</option>`).join('')}</select></div></section>`;
}
function learningSummary(){
 const all=curriculum.quests.map(q=>questProgress(q,state.history));
 return {practised:all.filter(p=>p.practised).length,independent:all.filter(p=>p.independent).length,recalled:all.filter(p=>p.recalled).length};
}
function learningPathView(){
 const overall=learningSummary(),active=session&&index<session.length;
 const units=curriculum.units.filter(u=>questLevelFilter==='all'||u.levelBand===questLevelFilter);
 const first=units.find(u=>u.questIds.some(id=>!questProgress(curriculum.quests.find(q=>q.id===id),state.history).practised))||units[0];
 return `${intro('Tu camino','Useful Spanish. Small quests.','Build a sentence with help, try it independently, then come back to it later.')}<div class="path-top-actions">${active?`<button class="btn primary" data-action="resume-practice">Continue quest ${icon('arrow')}</button>`:''}<button class="btn" data-nav="practice">Go to Practice</button><button class="btn" data-action="paper-open">${icon('pen')} Paper practice / PDF</button></div>${weeklyGoalView()}<div class="milestone-strip" aria-label="Learning milestones"><div><strong>${overall.practised}</strong><span>Quest introductions practised</span></div><div><strong>${overall.independent}</strong><span>Checkpoint sets passed</span></div><div><strong>${overall.recalled}</strong><span>Sets recalled later</span></div></div><div class="quest-level-picker"><label for="quest-level">Choose a level</label><select id="quest-level" class="sub-select"><option value="all">All levels · A1 to early C1</option>${["A1","A2","B1","B2","C1 intro"].map(level=>`<option value="${level}" ${questLevelFilter===level?'selected':''}>${level==='C1 intro'?'Early C1':level}</option>`).join('')}</select><p class="small muted">${curriculum.units.length} units · ${curriculum.quests.length} quests · ${curriculum.cards.length} exercises. Follow the suggested order or choose where to begin.</p></div>${units.map(unit=>`<details class="curriculum-unit" ${unit.id===first?.id?'open':''}><summary class="unit-summary"><span>${esc(unit.level)}</span><strong>${esc(unit.title)}</strong><span>${unit.questIds.filter(id=>questProgress(curriculum.quests.find(q=>q.id===id),state.history).practised).length} / ${unit.questIds.length} practised</span></summary><div class="unit-heading"><span class="badge">EVERYDAY SPANISH · ${esc(unit.level)}</span><h2>${esc(unit.title)}</h2><p>${esc(unit.goal)}</p><p class="small muted">Suggested order. Every quest is available; start where it helps you.</p></div><div class="quest-grid">${unit.questIds.map((id,i)=>{
 const q=curriculum.quests.find(q=>q.id===id),p=questProgress(q,state.history),pattern=curriculum.patterns.find(p=>p.id===q.patternId),due=q.cardIds.filter(id=>state.records[id]?.due<=Date.now()).length;
 return `<article class="panel quest-card"><div class="quest-number">QUEST ${i+1}${p.practised?' · INTRO PRACTISED':''}</div><h3>${esc(q.title)}</h3><p>${esc(q.goal)}</p><div class="pattern-chip" lang="es">${esc(pattern.label)}</div><ol class="quest-stages"><li class="${p.practised?'achieved':''}"><strong>Practise the introduction</strong><span>${p.completed} / ${p.total} intro exercises completed</span></li><li class="${p.independent?'achieved':''}"><strong>Try the intro checkpoints independently</strong><span>${p.checks} / ${p.checkpointTotal} answered without hints or reference</span></li><li class="${p.recalled?'achieved':''}"><strong>Recall on a later day</strong><span>${p.later} / ${p.checkpointTotal} recalled after at least 24 hours</span></li></ol>${questBankView(q,p)}<div class="quest-buttons"><button class="btn primary" data-quest-learn="${esc(q.id)}">${p.practised&&q.bankIds?'Short practice round':p.completed?'Continue introduction':'Start quest'} ${icon('arrow')}</button><button class="btn" data-quest-checkpoint="${esc(q.id)}">Intro checkpoint</button>${q.bankIds?`<button class="btn" data-quest-practice="${esc(q.id)}">Vary the practice</button><button class="btn" data-quest-challenge="${esc(q.id)}">Mixed challenge</button>`:''}${due?`<button class="btn" data-quest-review="${esc(q.id)}">Review ${due} due</button>`:''}</div><button class="btn small" data-paper-quest="${esc(q.id)}">${icon('pen')} PDF for this quest</button><p class="quest-help small muted">Checkpoint starts with the reference closed. You can open it or ask for hints at any time.</p></article>`;
 }).join('')}</div></details>`).join('')}<details class="disclosure curriculum-notes"><summary>What these milestones mean</summary><p>Help is useful practice. The introduction is practised when you have matched its required exercises, with or without support. In the deeper foundation quests, this is the start: short rounds draw from a larger bank, while mixed challenges use a separate set. Bank coverage shows how much you have tried; it is not a fluency score. Personal sentences are self-reviewed and optional.</p><p>Independent means that the saved checkpoint answer matched without help during that attempt. Later recall requires two consecutive independent matches of the same checkpoint at least 24 hours apart, with no recorded attempt between them. Repeating immediately does not earn later recall.</p><p>These milestones describe these exercises. They are not a CEFR certificate or an assessment of general conversation. Spoken answers do not independently assess spelling.</p><p>${esc(curriculum.levelNote)}</p><p>Curriculum references:</p><ul>${(curriculum.sources||[]).map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a></li>`).join('')}</ul></details>`;
}
function questBankView(q,p){
 if(!q.bankIds)return '';
 return `<div class="quest-bank"><strong>${p.bankTotal} checked examples + an optional personal task</strong><p>${p.bankSeen}/${p.bankTotal} tried · ${p.bankMatched}/${p.bankTotal} matched with any help · ${p.bankIndependent}/${p.bankTotal} matched independently</p><details class="bank-help"><summary>How these rounds work</summary><p class="small muted">Short rounds: 6 checked prompts, then your own words. Due reviews, supported attempts and unseen examples rotate in. Mixed challenge: up to 5 full-sentence prompts from a separate set; unseen ones come first. Once tried, they can repeat.</p></details></div>`;
}
function startQuest(id,kind='learn'){
 const q=curriculum.quests.find(q=>q.id===id);if(!q)return;
 const cards=questSession(q,course,state,kind);
 if(!cards.length){toast('No exercises are due in this quest yet. You can practise again or try a checkpoint.');return;}
 activateView('quests');stopMedia();session=cards;session.sessionId=Date.now().toString(36);session.questId=q.id;session.questKind=kind;practiceScreen='exercise';view='quests';location.hash='quests';index=0;guided=false;
 if(['checkpoint','challenge'].includes(kind)){state.settings.practiceReferenceOpen=false;persist();}
 resetCard();render();window.scrollTo({top:0});
}
function questExerciseHeading(){
 const c=current();if(!c?.questId)return '';
 const q=curriculum.quests.find(q=>q.id===c.questId),unit=curriculum.units.find(u=>u.id===c.unitId),pattern=curriculum.patterns.find(p=>p.id===c.patternId);
 return `<div class="quest-exercise-context"><span class="eyebrow">${esc(unit.title)} · ${esc(q.title)}</span>${q.bankIds?`<p class="small muted">${({learn:questProgress(q,state.history).practised?'Short practice round':'Introduction',practice:'Varied practice',challenge:'Mixed challenge',review:'Due review',checkpoint:'Intro checkpoint'})[session.questKind]} · ${q.bankIds.length} checked examples in this bank</p>`:''}<p><strong>${esc({form:'Find the form',build:'Build & change',checkpoint:'Checkpoint',personal:'Your own words · optional'}[c.learningStage])}</strong> <span lang="es">${esc(pattern.label)}</span></p>${['checkpoint','challenge'].includes(session.questKind)||c.learningStage==='checkpoint'?'<p class="small muted">Try from memory if you can. Help remains available and counts as supported practice.</p>':''}${c.learningStage==='personal'?'<button class="btn small" data-action="skip-personal">Skip personal sentence</button>':''}</div>`;
}
function questSummaryView(){
 if(!session?.questId)return '';
 const q=curriculum.quests.find(q=>q.id===session.questId),p=questProgress(q,state.history),next=curriculum.quests[curriculum.quests.findIndex(x=>x.id===q.id)+1];
 return `<section class="quest-session-summary"><span class="badge">${p.practised?'INTRODUCTION PRACTISED':'QUEST PROGRESS SAVED'}</span><h3>${esc(q.title)}</h3><p>${p.completed} / ${p.total} intro exercises completed · ${p.checks} / ${p.checkpointTotal} checkpoints answered without help.</p><p class="small muted">${p.recalled?'You have also recalled all checkpoints on a later day.':'Later recall grows when you return after at least 24 hours. Same-day repeats remain useful practice.'}</p>${questBankView(q,p)}<div class="stack">${q.bankIds?`<button class="btn primary" data-quest-practice="${esc(q.id)}">Another varied round</button><button class="btn" data-quest-challenge="${esc(q.id)}">Mixed challenge</button>`:''}<button class="btn" data-action="learning-path">Back to quests</button>${next?`<button class="btn" data-quest-learn="${esc(next.id)}">Next quest ${icon('arrow')}</button>`:''}</div></section>`;
}
function curriculumProgressView(){
 if(!curriculum)return '';
 return `<section class="panel curriculum-progress"><h2>Your sentence patterns</h2><p class="small muted">A record of these exercises, with support and delayed recall shown separately.</p><details class="disclosure"><summary>Explore all ${curriculum.quests.length} sentence patterns</summary><div class="pattern-progress-list">${curriculum.quests.map(q=>{
 const p=questProgress(q,state.history),pattern=curriculum.patterns.find(x=>x.id===q.patternId);
 return `<div><strong lang="es">${esc(pattern.label)}</strong><p>${p.completed}/${p.total} intro practised · ${p.checks}/${p.checkpointTotal} checkpoints without help · ${p.later}/${p.checkpointTotal} recalled later</p>${q.bankIds?`<p>${p.bankSeen}/${p.bankTotal} bank examples tried · ${p.bankIndependent}/${p.bankTotal} matched independently</p>`:''}<button class="btn small" data-quest-learn="${esc(q.id)}">Practise this pattern</button></div>`;
 }).join('')}</div></details></section>`;
}
function welcomeView(){return `<div class="exercise-heading"><span class="badge">${icon('leaf')} YOUR DAILY PRACTICE</span><span class="session-count">${state.settings.sessionLength} prompts · at your pace</span></div><div class="empty-state"><div class="large-symbol">${icon('pen')}</div><h2>Let’s find your words.</h2><p>${mode==='past'?'Practise the difference between a completed past event and a past habit.':mode==='create'?'Make sentences about your own life. Compare with a model, then review your own work.':'A little conjugation, a little tense choice, and sentences you create yourself.'}</p><button class="btn primary" data-action="start">Start practising ${icon('arrow')}</button><p style="font-size:11px;margin-top:16px;margin-bottom:0">New here? Start with present tense, or try the daily mix.</p></div>`;}
function asideView(){return `<div class="aside-card"><div class="aside-title"><h3>Your practice map</h3>${icon('leaf')}</div><div class="mini-bars">${course.tenses.filter(t=>!t.questOnly).map(t=>{const events=state.history.filter(h=>h.tense===t.id),ind=events.filter(h=>h.outcome==='correct').length,percent=events.length?Math.round(ind/events.length*100):0;return `<div><div class="mini-bar-head"><span>${esc(t.label)}</span><span>${events.length?percent+'%':'—'}</span></div><div class="bar"><span style="width:${percent}%"></span></div></div>`;}).join('')}</div><p class="aside-foot">Independent matches across your attempts. Self-review is tracked separately.</p></div><div class="aside-card white"><div class="tip-icon">${icon('bulb')}</div><div class="tip-title">Meaning before endings.</div><p>A past habit? <em>Visitaba.</em><br>A completed visit? <em>Visité.</em><br>Picture the situation before choosing the verb.</p></div><div class="aside-card white"><div class="focus-line">${icon('check')}<div><strong style="font-size:11px">Built around your lessons</strong><p style="font-size:10px;margin-top:5px">Five core tenses, everyday verbs, and the little words that change the meaning.</p></div></div></div>`;}
function tenseReference(t){
 return `<p>${esc(t.rule||'Review your teacher’s notes for this tense.')}</p>${t.endings?`<div class="table-wrap rule-table" tabindex="0" role="region" aria-label="Regular endings for ${esc(t.label)}"><table><thead><tr><th>Person</th>${Object.keys(t.endings).map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${['yo','tú','él / ella / usted','nosotros','ellos / ustedes'].map((p,idx)=>`<tr><td>${p}</td>${Object.values(t.endings).map(forms=>`<td lang="es">${esc(forms[idx])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}`;
}
function practiceReferenceContent(){
 const c=current();
 const selected=referenceTense??(c.type==='contrast'||c.chooseTense?'':c.tense);
 if(!selected)return '<p>Is it a completed event or a past habit? Choose a tense above to compare its forms. This reference does not choose the answer for you.</p>';
 const t=getTense(selected),v=course.verbs.find(v=>v.infinitive===c.verb);
 const pattern=curriculum?.patterns.find(p=>p.id===c.patternId);
 return `${pattern?`<div class="pattern-reference"><h3 lang="es">${esc(pattern.label)}</h3><p>${esc(pattern.rule)}</p><p lang="es">${esc(pattern.example)}</p><p>${esc(pattern.meaning)}</p></div>`:''}${tenseReference(t)}${v?.forms?.[selected]?`<details class="reference-verb-forms"><summary>See <span lang="es">${esc(c.verb)}</span> conjugated</summary>${verbTable(c.verb,selected)}</details>`:''}`;
}
function practiceReference(){
 const c=current(),selected=referenceTense??(c.type==='contrast'||c.chooseTense?'':c.tense);
 return `<details class="disclosure practice-reference" id="practice-reference" ${state.settings.practiceReferenceOpen?'open':''}><summary>${icon('book')} Quick reference <span class="reference-summary-note">Forms &amp; endings</span></summary><div class="reference-body"><p class="small muted">Keep this open while you learn. Close it when you’re ready to try from memory. Opening it before checking counts as support.</p><label class="answer-label" for="practice-reference-tense">Reference tense</label><select class="sub-select" id="practice-reference-tense">${c.type==='contrast'||c.chooseTense?'<option value="">Choose a tense to compare…</option>':''}${course.tenses.map(t=>`<option value="${esc(t.id)}" ${t.id===selected?'selected':''}>${esc(t.label)}</option>`).join('')}</select><div id="practice-reference-content">${practiceReferenceContent()}</div></div></details><p class="small muted reference-note" id="reference-note">${referenceUsed?'Reference used · this attempt is supported practice.':''}</p>`;
}
function exerciseView(){
 const c=current(),t=getTense(c.tense);
 const typeLabel={cloze:'COMPLETE THE SENTENCE',translate:'BUILD THE SENTENCE',transform:'CHANGE THE SCENE',contrast:'CHOOSE THE PAST',create:'YOUR OWN WORDS'};
 const showResult=phase==='done'||phase==='model';
 const prompt=c.type==='cloze'?esc(c.prompt).replace('___','<span class="blank">…</span>'):esc(c.prompt);
 const listenReady=showResult && (c.sample||c.answers?.[0]);
 return `${questExerciseHeading()}<div class="exercise-heading"><span class="badge ${c.type==='contrast'?'orange':''}">${typeLabel[c.type]}</span><span class="session-count"><span class="dots">${session.map((_,i)=>`<i class="${i<index?'done':i===index?'current':''}"></i>`).join('')}</span>${index+1} / ${session.length}</span></div><div class="task-label">${esc(c.instruction||'Write your answer in Spanish.')}</div><p class="sentence" ${['cloze','transform'].includes(c.type)?'lang="es"':''}>${prompt}</p><div class="context">${c.type==='contrast'||c.chooseTense?(showResult?'Target: '+esc(t.label):'Choose from the meaning. The tense is revealed after your attempt.'):`Target: <strong>${esc(c.questId?curriculum.patterns.find(p=>p.id===c.patternId).label:t.label)}</strong> ${c.questId?'':`<span class="muted">· ${esc(t.spanish||t.label)}</span>`}`}${c.verb?`<span class="verb-chip">${esc(c.verb)}</span>`:''}</div>${voiceControls(showResult)}${practiceReference()}<div class="answer-area"><label class="answer-label" for="answer">${c.type==='cloze'?esc(c.answerLabel||'The missing verb'):'Your Spanish sentence'}</label><div class="answer-wrap"><textarea class="answer" id="answer" lang="es" maxlength="1500" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="none" writingsuggestions="false" placeholder="${c.type==='cloze'?(c.answerLabel?'Type the missing expression…':'Type the verb form…'):'Take your time. Write your sentence…'}" ${showResult?'disabled':''}>${esc(result?.answer||'')}</textarea></div><div class="accent-row"><div class="accents" aria-label="Spanish characters">${['á','é','í','ó','ú','ü','ñ','¿','¡'].map(ch=>`<button class="accent" data-char="${ch}" aria-label="Insert ${ch}" ${showResult?'disabled':''}>${ch}</button>`).join('')}</div><span class="key-note">Enter to check · Shift + Enter for a new line</span></div></div>${tries>0&&phase==='answer'?`<div class="switch-suggestion"><span>Another way in?</span> <button class="btn link small" data-input-mode="${inputMode==='type'?'voice':'type'}">${inputMode==='type'?'Try saying it aloud':'Try typing it'}</button><span class="small muted">Your draft and clues stay here.</span></div>`:''}<div id="feedback" role="status" aria-live="polite">${feedback}</div>${phase==='model'?`<div class="feedback"><strong>Self-review</strong><p>Your sentence can differ from the model. Check the tense, subject, and meaning. These ratings do not count as automatic grammar checks.</p><div class="stack" style="margin-top:12px"><button class="btn small" data-rate="self">I’m comfortable with it</button><button class="btn small" data-rate="revealed">I need more practice</button></div></div>`:''}<div class="exercise-actions"><div class="actions-left">${phase==='answer'?`<button class="btn link" data-action="hint" ${hintLevel>=3?'disabled':''}>${icon('bulb')} ${hintLevel===0?'A small hint':hintLevel<3?'Next clue':'All clues shown'}</button><button class="btn link" data-action="hear-model">${icon('audio')} Hear model · support</button><button class="btn link" data-action="reveal">Show model</button>`:`<button class="btn link" data-action="listen" ${listenReady?'':'disabled'}>${icon('audio')} Listen slowly</button>`}</div>${phase==='done'?`<button class="btn primary" data-action="next">${index===session.length-1?'See your session':'Next sentence'} ${icon('arrow')}</button>`:phase==='model'?'':`<button class="btn primary" data-action="check">${c.type==='create'?'Review my sentence':'Check answer'} ${icon('arrow')}</button>`}</div>${showResult?`<div class="reference-links">${c.verb?`<a href="https://www.conjugacion.es/del/verbo/${encodeURIComponent(c.verb)}.php" target="_blank" rel="noopener noreferrer">Conjugation reference ↗</a>`:''}<a href="https://www.deepl.com/es/translator" target="_blank" rel="noopener noreferrer">Open DeepL ↗</a><button class="btn link" style="min-height:0;padding:0;font-size:11px" data-action="copy">Copy my sentence</button></div>`:''}`;
}
function summaryView(){const events=state.history.filter(h=>h.session===session.sessionId);const correct=events.filter(h=>h.outcome==='correct').length;return `<div class="exercise-heading"><span class="badge">${icon('check')} SESSION COMPLETE</span><span class="session-count">Poco a poco.</span></div><div class="empty-state"><div class="large-symbol">${icon('leaf')}</div>${questSummaryView()}<h2>A little more Spanish is yours.</h2><p>You’ve practised recalling words and putting them together. Your review dates are saved.</p><div class="summary-stats"><div><strong>${events.length}</strong><span>attempts</span></div><div><strong>${correct}</strong><span>independent matches</span></div><div><strong>${events.filter(h=>h.outcome==='self').length}</strong><span>self-reviewed</span></div></div><div class="stack" style="justify-content:center"><button class="btn primary" data-action="start">Another short session ${icon('arrow')}</button><button class="btn" data-nav="progress">See progress</button></div></div>`;}
function startSession(newMode=mode){
 activateView('practice');location.hash='practice';
 practiceScreen='exercise';
 stopMedia();guided=false;mode=newMode;
 if(mode==='past'&&!['all','imperfect','preterite'].includes(tense))tense='all';
 session=makeSession(course.cards.filter(c=>!c.questId),state,{tense,mode,length:Number(state.settings.sessionLength)});
 session.sessionId=Date.now().toString(36);
 index=0;resetCard();view='practice';
 if(!session.length){session=null;toast('No exercises match this combination. Try another tense or mode.');}
 render();
}
function resetCard(){referenceUsed=false;referenceTense=null;stopMedia();usedTyped=false;usedSpeech=false;modelHeard=false;previousDraft=null;phase='answer';hinted=false;tries=0;result=null;feedback='';hintLevel=0;maxHintLevel=0;lastIssueKind=null;}
function finishCard(outcome,answer){
 if(phase==='done')return;
 stopMedia();
 const c=current();
 const quest=c.questId&&curriculum?.quests.find(q=>q.id===c.questId),before=quest?questProgress(quest,state.history):null;
 const record=recordAnswer(state,c,outcome,answer);
 state.history[state.history.length-1].session=session.sessionId;
 state.history[state.history.length-1].hintLevel=maxHintLevel;
 state.history[state.history.length-1].issueType=lastIssueKind;
 const event=state.history[state.history.length-1];
 event.questMode=session.questKind;event.referenceUsed=referenceUsed;event.questId=c.questId;event.unitId=c.unitId;event.patternId=c.patternId;event.learningStage=c.learningStage;
 event.inputMode=practiceInputLabel(usedTyped,usedSpeech);event.spellingIndependent=!usedSpeech&&!modelHeard&&outcome==='correct';event.modelHeard=modelHeard;event.guided=guided;
 persist();phase='done';result={answer,outcome};
 const days=Math.round((record.due-Date.now())/DAY);
 const review=outcome==='revealed'?'This will return for review soon.':`Next review ${days<=1?'tomorrow':`in ${days} days`}.`;
 const title=outcome==='correct'?'¡Muy bien! You recalled it.':outcome==='assisted'?'Good practice. Support helps build the pattern.':outcome==='self'?'Your self-review is saved.':'A useful one to revisit.';
 feedback=`<div class="feedback ${outcome==='correct'?'correct':''}"><strong>${title}</strong><p class="model" lang="es">${esc(c.sample||c.answers?.[0]||'')}</p><p>${esc(c.explanation||getTense(c.tense).rule||'')}</p><p class="small muted">${usedSpeech?'Spoken or mixed recall · spelling and accents supplied by recognition. ':''}${modelHeard?'Model audio used · supported recall. ':''}${referenceUsed?'Quick reference used · supported recall. ':''}${esc(review)}</p></div>`;
 if(quest){const after=questProgress(quest,state.history);const message=after.recalled&&!before.recalled?'Later recall milestone: all checkpoints recalled after a day away.':after.independent&&!before.independent?'Checkpoint milestone: all checkpoint answers produced without help.':after.practised&&!before.practised?'Introduction practised! Keep building flexibility with varied rounds and later review. Help counts as progress.':'';if(message)feedback+=`<div class="milestone-earned" role="status">${icon('leaf')} ${esc(message)}</div>`;}
 render();speakFeedback();
}
function checkAnswer(){
 if(document.querySelector('#practice-reference')?.open){referenceUsed=true;hinted=true;}
 if(speechInput.active){toast('Stop listening and review the transcript before checking.');return;}
 const answer=document.querySelector('#answer')?.value||'';
 const c=current(),g=grade(answer,c);
 if(g.kind==='empty'){toast('Try a word or sentence first. You can ask for a hint.');document.querySelector('#answer')?.focus();return;}
 if(g.kind==='self'){
   result={answer};phase='model';
   feedback=`<div class="feedback"><strong>One possible model</strong><p class="model" lang="es">${esc(c.sample||'Compare your sentence with your teacher’s notes.')}</p><p>${esc(c.explanation||getTense(c.tense).rule||'')}</p></div>`;render();speakFeedback();return;
 }
 if(g.kind==='correct'){finishCard(hinted||modelHeard||tries>0?'assisted':'correct',answer);return;}
 tries++;
 hintLevel=Math.max(1,hintLevel);showGraduatedHint(answer);
}
function markedAttempt(source,marks=[]){
 const sorted=marks.slice().sort((a,b)=>a.start-b.start);let cursor=0,html='';
 for(const mark of sorted){
  if(mark.start<cursor)continue;
  html+=esc(source.slice(cursor,mark.start));
  html+=mark.start===mark.end?'<span class="missing-marker" role="img" aria-label="Check for a missing letter or word here">▵</span>':`<span class="repair-mark" aria-label="Revisit this part">${esc(source.slice(mark.start,mark.end))}</span>`;
  cursor=mark.end;
 }
 return html+esc(source.slice(cursor));
}
function showGraduatedHint(answer){
 answer=answer.normalize('NFC');
 const clue=graduatedHint(answer,current(),course,hintLevel);
 hinted=true;maxHintLevel=Math.max(maxHintLevel,hintLevel);
 if(clue.diagnosis)lastIssueKind=clue.diagnosis.kind;
 feedback=`<div class="feedback warn graduated-feedback"><div class="hint-step">CLUE ${hintLevel} OF 3 · TRY A REPAIR</div><strong>${esc(clue.title)}</strong>${clue.source?`<div class="marked-attempt" lang="es">${markedAttempt(clue.source,clue.marks)}</div>`:''}<p>${esc(clue.message)}</p>${clue.fragment?`<div class="word-fragment" lang="es" aria-label="Partial word clue">${esc(clue.fragment)}</div>`:''}<p class="small muted">${hintLevel<3?'Ask for the next clue only if you need it.':'Try the repair. The full model remains available when you choose it.'}</p></div>`;
 result={answer};render();const field=document.querySelector('#answer');field?.focus();field?.setSelectionRange(answer.length,answer.length);speakFeedback();
}
function lessonsView(){
 const filtered=course.tenses.filter(t=>!lessonFilter||`${t.label} ${t.spanish}`.toLowerCase().includes(lessonFilter.toLowerCase()));
 return `${intro('Tu cuaderno','A notebook that grows with you.','Your five foundations, with room for every lesson that comes next.')}<div class="lesson-toolbar"><span class="muted small">${course.cards.length.toLocaleString()} exercises · ${course.verbs.length} core verbs · ${state.packs.length} personal packs</span><div class="stack"><button class="btn small" data-action="editor">${icon('plus')} Add an exercise</button><button class="btn small" data-action="import-pack">Import lesson pack</button>${state.packs.length?`<button class="btn small" data-action="personal-practice">Practise my exercises</button>`:''}</div></div><div class="help-box"><p><strong>Add lessons as you learn.</strong> Write your own exercises here, import a lesson pack, or ask ChatGPT to update this Frase site with your next teacher notes.</p><p>New tense IDs and exercise IDs keep content separate from your review history. Personal exercises and progress stay in this browser; export a backup to move them.</p></div>${showEditor?editorView():''}<div class="content-grid">${filtered.map((t,i)=>`<article class="panel lesson-card"><div class="eyebrow">${esc(t.spanish||'Your lesson')}</div><h2>${esc(t.label)}</h2><p>${esc(t.description||'Practise your own teacher exercises.')}</p><div class="lesson-example" lang="es">${esc(t.example||course.cards.find(c=>c.tense===t.id)?.sample||'A new space for your Spanish.')}</div><div class="lesson-bottom"><span class="small muted">${course.cards.filter(c=>c.tense===t.id).length} exercises</span><button class="btn small" data-practice-tense="${esc(t.id)}">Practise ${icon('arrow')}</button></div><details class="disclosure" style="margin-top:16px"><summary>Quick reference</summary><p>${esc(t.rule||'Review your teacher’s notes for this tense.')}</p>${t.endings?`<div class="table-wrap rule-table"><table><thead><tr><th>Person</th>${Object.keys(t.endings).map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${['yo','tú','él / ella / usted','nosotros','ellos / ustedes'].map((p,idx)=>`<tr><td>${p}</td>${Object.values(t.endings).map(forms=>`<td>${esc(forms[idx])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}</details></article>`).join('')}<article class="panel lesson-card full-width"><div class="eyebrow">Small words, big changes</div><h2>Ya · todavía · ya no</h2><p><em>Ya he terminado</em> — I’ve already finished. <em>Todavía no he terminado</em> — I haven’t finished yet. <em>Ya no trabajo allí</em> — I no longer work there.</p><p>The daily mix includes these expressions. Advanced constructions from your notes can be added as you reach them.</p><div class="stack"><button class="btn small" data-action="ya">Practise these expressions ${icon('arrow')}</button><a class="btn small" href="./data/sample-lesson.json" download="frase-sample-lesson.json">${icon('download')} Example lesson pack</a></div></article><article class="panel lesson-card full-width"><div class="eyebrow">Conjugation notebook</div><h2>Look up a pattern.</h2><div class="stack"><select id="verb-reference" class="sub-select" aria-label="Verb reference">${course.verbs.map(v=>`<option value="${v.infinitive}">${v.infinitive}</option>`).join('')}</select><select id="reference-tense" class="sub-select" aria-label="Reference tense">${base.tenses.map(t=>`<option value="${t.id}">${t.label}</option>`).join('')}</select></div><div id="verb-table">${verbTable('hablar','present')}</div><p class="small muted" style="margin-top:15px;margin-bottom:0">Mexico / Latin America focus: ustedes uses the third-person plural. Spain’s vosotros forms can be added in a later lesson.</p></article></div><input id="pack-file" type="file" accept=".json,application/json" hidden>`;
}
function verbTable(verb,tense){const v=course.verbs.find(v=>v.infinitive===verb);if(!v?.forms?.[tense])return `<p class="help-box">A full table for this verb and tense is not included yet. Use the quest’s pattern reference or <a href="https://www.conjugacion.es/del/verbo/${encodeURIComponent(verb)}.php" target="_blank" rel="noopener noreferrer">look up ${esc(verb)} on Conjugacion.es</a>.</p>`;return `<div class="table-wrap rule-table"><table><thead><tr><th>Person</th><th>${esc(verb)} · ${esc(getTense(tense).label)}</th></tr></thead><tbody>${['yo','tú','él / ella / usted','nosotros','ellos / ellas / ustedes'].map((s,i)=>`<tr><td>${s}</td><td lang="es">${esc(v.forms[tense][i])}</td></tr>`).join('')}</tbody></table></div><div class="reference-links"><a href="https://www.conjugacion.es/del/verbo/${encodeURIComponent(verb)}.php" target="_blank" rel="noopener noreferrer">Check on Conjugacion.es ↗</a></div>`;}
function editorView(){return `<section class="panel editor" style="margin-bottom:22px"><h2>Add a teacher exercise</h2><p class="small muted">Use one clear task. Give complete accepted answers for checked exercises, or choose “Your own words” for self-review.</p><form id="exercise-form"><div class="form-grid"><div class="field"><label for="new-tense">Tense</label><select id="new-tense" name="tense">${course.tenses.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('')}<option value="__new">+ Add a new tense</option></select></div><div class="field"><label for="new-type">Exercise type</label><select id="new-type" name="type"><option value="translate">Build the sentence</option><option value="cloze">Complete the sentence</option><option value="transform">Change the scene</option><option value="contrast">Choose the past</option><option value="create">Your own words (self-review)</option></select></div><div class="field span2" id="new-tense-field" hidden><label for="new-tense-name">New tense name</label><input id="new-tense-name" name="tenseName" maxlength="70" placeholder="e.g. Present subjunctive"></div><div class="field span2"><label for="new-prompt">Prompt</label><textarea id="new-prompt" name="prompt" required maxlength="2500" placeholder="e.g. I would like a coffee."></textarea></div><div class="field span2"><label for="new-answers">Accepted answers / model sentence</label><textarea id="new-answers" name="answers" required maxlength="6000" placeholder="One accepted answer per line. For self-review, enter one example sentence."></textarea></div><div class="field"><label for="new-hint">Clue 1 · the smallest useful hint</label><input id="new-hint" name="hint" maxlength="1000" placeholder="What should I look at first?"></div><div class="field"><label for="new-hint-2">Clue 2 · rule or meaning (optional)</label><input id="new-hint-2" name="hint2" maxlength="1000" placeholder="A rule that helps me repair it"></div><div class="field"><label for="new-hint-3">Clue 3 · partial form (optional)</label><input id="new-hint-3" name="hint3" maxlength="1000" placeholder="A little more help, without the full answer"></div><div class="field"><label for="new-explanation">Explanation</label><input id="new-explanation" name="explanation" maxlength="1000" placeholder="Why this form fits"></div></div><div id="editor-error" class="error-text" role="alert"></div><div class="stack" style="margin-top:17px"><button class="btn primary" type="submit">Save exercise ${icon('plus')}</button><button class="btn" type="button" data-action="editor">Close</button></div></form></section>`;}
function progressView(){
 const h=state.history,matched=h.filter(e=>e.outcome==='correct').length,assisted=h.filter(e=>e.outcome==='assisted').length,self=h.filter(e=>e.outcome==='self').length;
 return `${intro('Tu progreso','See what’s taking root.','Recall gets stronger with a little space between attempts.')}${curriculumProgressView()}<div class="stat-strip"><div class="stat"><span class="number">${h.length}</span><div class="label"><strong>Total attempts</strong>Practice across your notebook</div></div><div class="stat"><span class="number">${matched}</span><div class="label"><strong>Independent matches</strong>Sentence recall · typed or spoken</div></div><div class="stat"><span class="number">${self}</span><div class="label"><strong>Self-reviewed</strong>Your own sentence production</div></div></div><div class="help-box"><p><strong>Progress, with honest labels.</strong> A saved answer match checks known wording. Open sentences are self-reviewed. An unfamiliar valid phrasing can miss the answer key; compare the model or bring it to your teacher.</p><p>Typed, spoken and mixed attempts are labelled below. Speech supplies spelling and accents, so spoken matches do not establish independent spelling. Switching input keeps the same exercise and review date.</p><p>Review stages describe recall of an exercise, not a claim that you have mastered a tense. After an independent match: 1, 3, 7, 14, then 30 days. Hints shorten the interval.</p></div><div class="table-wrap"><table><thead><tr><th>Tense</th><th>Attempts</th><th>Independent</th><th>Assisted</th><th>Self-review</th><th>Due</th></tr></thead><tbody>${course.tenses.map(t=>{const events=h.filter(e=>e.tense===t.id);return `<tr><td><strong>${esc(t.label)}</strong></td><td>${events.length}</td><td>${events.filter(e=>e.outcome==='correct').length}</td><td>${events.filter(e=>e.outcome==='assisted').length}</td><td>${events.filter(e=>e.outcome==='self').length}</td><td>${course.cards.filter(c=>c.tense===t.id&&state.records[c.id]?.due<=Date.now()).length}</td></tr>`;}).join('')}</tbody></table></div><div class="lesson-toolbar" style="margin-top:28px"><h2 style="margin-bottom:0;font-size:24px">Your recent sentences</h2><button class="btn small" data-action="export">${icon('download')} Export backup</button></div>${h.length?`<div class="table-wrap"><table><thead><tr><th>Your attempt</th><th>Practice</th><th>Result</th><th>When</th></tr></thead><tbody>${h.slice(-30).reverse().map(e=>`<tr><td class="record-sentence" lang="es">${esc(e.answer||'Model revealed')}</td><td>${esc(getTense(e.tense).label)}<br><span class="muted small">${esc(e.type)} · ${esc(e.inputMode||'typed')}${e.modelHeard?' · model heard':''}${e.referenceUsed?' · quick reference':''}${e.hintLevel?` · clue ${e.hintLevel}/3`:``}${e.issueType?` · ${esc(e.issueType)}`:``}</span></td><td>${esc({correct:'Independent match',assisted:'With support',revealed:'Review again',self:'Self-reviewed'}[e.outcome])}</td><td class="small muted">${esc(new Date(e.at).toLocaleDateString(undefined,{month:'short',day:'numeric'}))}</td></tr>`).join('')}</tbody></table></div>`:`<div class="panel empty-state"><div class="large-symbol">${icon('leaf')}</div><h2>Your first sentence starts the story.</h2><p>Practice a few sentences, and your patterns will appear here.</p><button class="btn primary" data-nav="practice">Go to practice ${icon('arrow')}</button></div>`}`;
}
function settingsView(){return `${intro('A tu manera','Make room for your practice.','A comfortable pace, a calmer screen, and your notebook to keep.')}<div class="content-grid"><section class="panel setting-card"><h2>Practice preferences</h2><div class="setting-row"><div><label for="session-length">Session length</label><p>Finish a small set, then choose whether to continue.</p></div><select id="session-length"><option value="6" ${Number(state.settings.sessionLength)===6?'selected':''}>6 prompts</option><option value="12" ${Number(state.settings.sessionLength)===12?'selected':''}>12 prompts</option><option value="20" ${Number(state.settings.sessionLength)===20?'selected':''}>20 prompts</option></select></div><div class="setting-row"><div><label for="speech-rate">Spanish audio pace</label><p>Uses an available Spanish voice on your device.</p></div><select id="speech-rate"><option value="0.65" ${state.settings.speechRate===.65?'selected':''}>Very slow</option><option value="0.8" ${state.settings.speechRate===.8?'selected':''}>Slow</option><option value="1" ${state.settings.speechRate===1?'selected':''}>Natural</option></select></div><div class="setting-row"><div><label for="large-text">Larger practice text</label><p>More room for the words that matter.</p></div><input class="toggle" id="large-text" type="checkbox" ${state.settings.largeText?'checked':''}></div><div class="setting-row"><div><label for="night-theme">Night reading theme</label><p>A muted palette for a darker screen.</p></div><input class="toggle" id="night-theme" type="checkbox" ${state.settings.theme==='night'?'checked':''}></div></section><section class="panel setting-card"><h2>Your notebook and backups</h2><p class="muted small">Progress, personal exercises, and preferences are saved in this browser. They do not automatically sync between devices. Clearing browser data removes them.</p><div class="stack" style="margin:20px 0"><button class="btn" data-action="export">${icon('download')} Export backup</button><button class="btn" data-action="restore">Restore backup</button></div><p class="muted small">Restore replaces the notebook in this browser after confirmation. Export first if you want to keep both versions.</p><details class="disclosure"><summary>How future upgrades work</summary><p>The app keeps content and review history separate. Existing exercises retain their IDs when the app is updated. New tenses and exercise packs can be added without clearing progress.</p><p>Add individual exercises in My lessons, import a JSON lesson pack, or ask ChatGPT to update this site with your teacher’s new notes.</p></details><input type="file" id="restore-file" accept=".json,application/json" hidden></section><section class="panel setting-card full-width"><h2>Language references</h2><p class="muted small">Use these after recalling an answer, or to compare an unfamiliar phrasing. DeepL opens as a separate reference; this version does not send your answers to a translation or AI service.</p><div class="stack"><a class="btn" href="https://www.deepl.com/es/translator" target="_blank" rel="noopener noreferrer">DeepL translator ${icon('external')}</a><a class="btn" href="https://www.conjugacion.es/del/verbo/visitar.php" target="_blank" rel="noopener noreferrer">Conjugation reference ${icon('external')}</a></div><p class="muted small" style="margin-top:20px;margin-bottom:0">This course focuses on Mexico / Latin America pronouns. The present perfect is practised as a target form; real-world choices between it and the preterite vary by region. Speech input uses your browser’s available recognition service and may require internet access. Open-ended sentences still use self-review. Spoken input does not independently test spelling or written accents.</p></section></div>`;}
function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bind(){
 app.querySelectorAll('[data-paper-quest]').forEach(el=>el.onclick=()=>openPaper(el.dataset.paperQuest));
 document.querySelector('#quest-level')?.addEventListener('change',e=>{questLevelFilter=e.target.value;render();});
 for(const [attr,kind] of [['quest-learn','learn'],['quest-checkpoint','checkpoint'],['quest-review','review'],['quest-practice','practice'],['quest-challenge','challenge']])app.querySelectorAll('[data-'+attr+']').forEach(el=>el.onclick=()=>startQuest(el.getAttribute('data-'+attr),kind));
 document.querySelector('#weekly-days')?.addEventListener('change',e=>{state.settings.weeklyPracticeDays=Number(e.target.value);persist();render();});
 document.querySelector('#practice-reference')?.addEventListener('toggle',e=>{
  const open=e.target.open;state.settings.practiceReferenceOpen=open;
  if(open&&phase==='answer'){referenceUsed=true;hinted=true;}
  const note=document.querySelector('#reference-note');if(note)note.textContent=referenceUsed?'Reference used · this attempt is supported practice.':'';
  persist();
 });
 document.querySelector('#practice-reference-tense')?.addEventListener('change',e=>{
  referenceTense=e.target.value;
  if(phase==='answer'){referenceUsed=true;hinted=true;}
  document.querySelector('#practice-reference-content').innerHTML=practiceReferenceContent();
 });
 app.querySelectorAll('[data-input-mode]').forEach(el=>el.onclick=()=>{
  const field=document.querySelector('#answer');if(field&&!field.disabled)result={answer:field.value};
  stopMedia();inputMode=el.dataset.inputMode;render();
  if(inputMode==='type')document.querySelector('#answer')?.focus();
 });
 app.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>navigateTo(el.dataset.nav));
 app.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{mode=el.dataset.mode;startSession();});
 app.querySelectorAll('[data-start]').forEach(el=>el.onclick=()=>startSession(el.dataset.start));
 app.querySelectorAll('[data-practice-tense]').forEach(el=>el.onclick=()=>{const id=el.dataset.practiceTense;if(getTense(id).questOnly){const c=curriculum.cards.find(c=>c.tense===id);if(c)startQuest(c.questId);return;}activateView('practice');tense=id;startSession('mixed');window.scrollTo({top:0});});
 app.querySelectorAll('[data-char]').forEach(el=>el.onclick=()=>{const field=document.querySelector('#answer');const start=field.selectionStart,end=field.selectionEnd;field.setRangeText(el.dataset.char,start,end,'end');field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();});
 app.querySelectorAll('[data-rate]').forEach(el=>el.onclick=()=>finishCard(el.dataset.rate,result.answer));
 app.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>action(el.dataset.action));
 document.querySelector('#answer')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();checkAnswer();}});
 document.querySelector('#answer')?.addEventListener('input',e=>{usedTyped=true;result={answer:e.target.value};hintLevel=0;feedback='';const box=document.querySelector('#feedback');if(box)box.innerHTML='';const button=document.querySelector('[data-action=hint]');if(button){button.disabled=false;button.innerHTML=icon('bulb')+' A small hint';}});
 document.querySelector('#tense-filter')?.addEventListener('change',e=>{tense=e.target.value;session=null;practiceScreen='free';resetCard();render();});
 document.querySelector('#exercise-form')?.addEventListener('submit',saveExercise);
 document.querySelector('#new-tense')?.addEventListener('change',e=>{const field=document.querySelector('#new-tense-field');field.hidden=e.target.value!=='__new';field.style.display=e.target.value==='__new'?'grid':'none';});
 document.querySelector('#pack-file')?.addEventListener('change',importPack);
 document.querySelector('#restore-file')?.addEventListener('change',restoreBackup);
 for(const key of ['verb-reference','reference-tense'])document.getElementById(key)?.addEventListener('change',()=>{document.querySelector('#verb-table').innerHTML=verbTable(document.querySelector('#verb-reference').value,document.querySelector('#reference-tense').value);});
 document.querySelector('#session-length')?.addEventListener('change',e=>{state.settings.sessionLength=Number(e.target.value);persist();toast('New sessions will use this length.');});
 document.querySelector('#speech-rate')?.addEventListener('change',e=>{state.settings.speechRate=Number(e.target.value);persist();});
 document.querySelector('#large-text')?.addEventListener('change',e=>{state.settings.largeText=e.target.checked;applyPreferences();persist();});
 document.querySelector('#night-theme')?.addEventListener('change',e=>{state.settings.theme=e.target.checked?'night':'paper';applyPreferences();persist();render();});
}
function action(name){
 if(name==='paper-open'){openPaper(view==='quests'&&practiceScreen!=='path'?session?.questId:null);return;}
 if(name==='learning-path'){activateView('quests');stopMedia();practiceScreen='path';location.hash='quests';render();window.scrollTo({top:0});return;}
 if(name==='resume-practice'){practiceScreen='exercise';render();return;}
 if(name==='free-practice'){navigateTo('practice');return;}
 if(name==='skip-personal'&&current()?.learningStage==='personal'){index++;resetCard();render();return;}
 if(name==='hear-model'){modelHeard=true;hinted=true;speechMessage='Model audio counts as support. Try repeating it, or return to typing.';speak(current().sample||current().answers?.[0]);speechMessage='Model audio counts as support. Try repeating it, or return to typing.';refreshSpeechUI();return;}
 if(name==='stop-audio'){audioPlaying=false;playbackId++;window.speechSynthesis?.cancel();refreshSpeechUI();return;}
 if(name==='record'){audioPlaying=false;playbackId++;const before=previousDraft;previousDraft=document.querySelector('#answer')?.value||'';if(!speechInput.start())previousDraft=before;return;}
 if(name==='stop-record'){speechInput.stop();return;}
 if(name==='undo-speech'){if(previousDraft!==null){result={answer:previousDraft};previousDraft=null;render();}return;}
 if(name==='read-prompt'){readPrompt();return;}
 if(name==='guided-toggle'){guided=!guided;stopMedia();render();if(guided)readPrompt();return;}
 if(name==='start-guided'){
  activateView('practice');
  practiceScreen='exercise';
  stopMedia();session=guidedSession(course.cards);session.sessionId=Date.now().toString(36);index=0;resetCard();guided=true;inputMode='voice';mode='mixed';tense='all';view='practice';render();readPrompt();return;
 }
 if(name==='theme'){state.settings.theme=state.settings.theme==='night'?'paper':'night';persist();render();}
 if(name==='start'){if(session?.questId&&index>=session.length)startQuest(session.questId);else startSession();}
 if(name==='check')checkAnswer();
 if(name==='next'){index++;resetCard();render();if(guided&&current())readPrompt();}
 if(name==='hint'){stopMedia();const answer=document.querySelector('#answer')?.value||'';hintLevel=Math.min(3,hintLevel+1);showGraduatedHint(answer);}
 if(name==='reveal'){
   stopMedia();   const answer=document.querySelector('#answer')?.value||'';
   if(current().type==='create'){result={answer};phase='model';feedback=`<div class="feedback"><strong>One possible model</strong><p class="model" lang="es">${esc(current().sample)}</p><p>${esc(current().explanation||'Compare with your own sentence.')}</p></div>`;render();speakFeedback();}
   else finishCard('revealed',answer);
 }
 if(name==='listen')speak(current().sample||current().answers?.[0]);
 if(name==='editor'){showEditor=!showEditor;render();}
 if(name==='export'){download('frase-notebook-backup.json',state);toast('Backup exported. Keep it to move your notebook between devices.');}
 if(name==='restore')document.querySelector('#restore-file').click();
 if(name==='import-pack')document.querySelector('#pack-file').click();
 if(name==='personal-practice'){activateView('practice');location.hash='practice';practiceScreen='exercise';session=course.cards.filter(c=>c.pack).slice(0,Number(state.settings.sessionLength));session.sessionId=Date.now().toString(36);index=0;resetCard();mode='mixed';view='practice';render();window.scrollTo({top:0});}
 if(name==='copy'){navigator.clipboard?.writeText(result?.answer||current().sample).then(()=>toast('Sentence copied.')).catch(()=>toast('Select your sentence to copy it.'));}
 if(name==='ya'){activateView('practice');location.hash='practice';practiceScreen='exercise';session=course.cards.filter(c=>c.tag==='ya');session.sessionId=Date.now().toString(36);index=0;resetCard();mode='mixed';view='practice';render();window.scrollTo({top:0});}
}
function speak(text){speakParts([{text,lang:'es'}]);}
function speakParts(parts){
 if(!('speechSynthesis'in window)){toast('Spanish audio is not available in this browser.');return;}
 speechInput.cancel();speechStatus='idle';speechMessage='';refreshSpeechUI();
 const token=++playbackId;const voices=speechSynthesis.getVoices();
 speechSynthesis.cancel();
 const queue=parts.filter(p=>p.text);let at=0;
 function next(){
  if(token!==playbackId)return;
  if(at>=queue.length){audioPlaying=false;refreshSpeechUI();return;}
  const part=queue[at++],utterance=new SpeechSynthesisUtterance(part.text);
  const voice=part.lang==='es'?(voices.find(v=>v.lang.toLowerCase()==='es-mx')||voices.find(v=>v.lang.startsWith('es'))):voices.find(v=>v.lang.startsWith('en'));
  if(voice)utterance.voice=voice;
  utterance.lang=voice?.lang||(part.lang==='es'?'es-MX':'en-US');utterance.rate=part.lang==='es'?state.settings.speechRate:.9;
  utterance.onend=next;utterance.onerror=e=>{if(token===playbackId){audioPlaying=false;refreshSpeechUI();}if(token===playbackId&&!['canceled','interrupted'].includes(e.error))toast('Audio could not play. Try Hear task again or check your device voices.');};
  audioPlaying=true;refreshSpeechUI();speechSynthesis.speak(utterance);
 }
 next();
}

function saveExercise(event){
 event.preventDefault();const f=new FormData(event.target);let id=f.get('tense');let t=getTense(id);
 try{
  if(id==='__new'){const label=String(f.get('tenseName')).trim();if(!label)throw new Error('Give your new tense a name.');id=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);if(!id)throw new Error('Include letters or numbers in the tense name.');t={id,label,description:'Your teacher exercises.',spanish:label};}
  let pack=state.packs.find(p=>p.id==='personal-exercises');if(!pack)pack={schemaVersion:1,id:'personal-exercises',title:'My teacher exercises',tenses:[],cards:[]};
  const candidate=structuredClone(pack);if(!candidate.tenses.some(x=>x.id===id))candidate.tenses.push({...t,id});
  const answers=String(f.get('answers')).split('\n').map(s=>s.trim()).filter(Boolean);
  if(!String(f.get('hint')).trim()&&(String(f.get('hint2')).trim()||String(f.get('hint3')).trim()))throw new Error('Add clue 1 before the later clues.');
  if(!String(f.get('hint2')).trim()&&String(f.get('hint3')).trim())throw new Error('Add clue 2 before clue 3.');
  candidate.cards.push({id:'exercise-'+Date.now().toString(36),tense:id,type:f.get('type'),prompt:String(f.get('prompt')).trim(),answers,sample:answers[0],hint:String(f.get('hint')).trim(),...(String(f.get('hint')).trim()?{hints:[String(f.get('hint')).trim(),String(f.get('hint2')).trim(),String(f.get('hint3')).trim()].filter(Boolean)}:{}),explanation:String(f.get('explanation')).trim()});
  validatePack(candidate);state.packs=state.packs.filter(p=>p.id!==candidate.id).concat(candidate);persist();course=mergeCourse(base,state.packs);showEditor=false;render();toast('Exercise saved. You can practise it with this tense.');
 }catch(error){document.querySelector('#editor-error').textContent=error.message;}
}
async function importPack(event){
 try{const file=event.target.files[0];if(!file)return;if(file.size>3000000)throw new Error('Choose a lesson pack smaller than 3 MB.');const pack=validatePack(JSON.parse(await file.text()));if(state.packs.some(p=>p.id===pack.id)&&!confirm('Replace this lesson pack? Progress for matching exercise IDs will be kept.'))return;state.packs=state.packs.filter(p=>p.id!==pack.id).concat(pack);persist();course=mergeCourse(base,state.packs);render();toast(`Added ${pack.cards.length} exercises from ${pack.title}.`);}catch(error){toast(error.message||'This lesson pack could not be read.');}
}
async function restoreBackup(event){
 try{const file=event.target.files[0];if(!file)return;if(file.size>12000000)throw new Error('Choose a backup smaller than 12 MB.');const restored=validateBackup(JSON.parse(await file.text()));if(!confirm('Replace this browser’s progress, personal lessons, and preferences with this backup? Export your current notebook first if you want to keep it.'))return;state=restored;persist();course=mergeCourse(base,state.packs);session=null;studyStates.practice=null;studyStates.quests=null;practiceScreen='free';view='practice';location.hash='practice';render();toast('Notebook restored.');}catch(error){toast(error.message||'This backup could not be read.');}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMedia();});
window.addEventListener('pagehide',stopMedia);
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(['practice','quests','lessons','progress','settings'].includes(next)&&next!==view){activateView(next);render();}});
try{
 const [response,pathResponse]=await Promise.all([fetch(new URL('../data/course.json',import.meta.url)),fetch(new URL('../data/curriculum.json',import.meta.url))]);if(!response.ok||!pathResponse.ok)throw new Error('Course could not be loaded.');const original=await response.json();curriculum=validateCurriculum(await pathResponse.json(),original);base=withCurriculum(original,curriculum);course=mergeCourse(base,state.packs);const requested=location.hash.slice(1);if(['practice','quests','lessons','progress','settings'].includes(requested)){view=requested;practiceScreen=requested==='quests'?'path':'free';}render();
}catch(error){app.innerHTML=`<div class="main"><h1>Your notebook needs a moment.</h1><p>${esc(error.message)}</p><button class="btn" onclick="location.reload()">Try again</button></div>`;}

let paperObjectUrl=null;
function openPaper(questId=null){
 stopMedia();
 let dialog=document.getElementById('paper-dialog');if(dialog)dialog.remove();
 dialog=document.createElement('dialog');dialog.id='paper-dialog';dialog.className='paper-dialog';dialog.setAttribute('aria-labelledby','paper-title');
 const contextual=current(),q=curriculum.quests.find(q=>q.id===questId);
 const preferred=q?(contextual?.questId===q.id?contextual.tense:course.cards.find(c=>q.cardIds.includes(c.id))?.tense):(contextual?.tense||(tense==='all'?'present':tense));
 dialog.innerHTML=`<div class="paper-dialog-header"><div><span class="eyebrow">PEN, PAPER & RECALL</span><h2 id="paper-title">Build your practice sheet</h2></div><button class="btn small" id="paper-close" aria-label="Close worksheet builder">Close</button></div><p class="muted">${q?'Opened from '+esc(q.title)+'.':'Start with one tense and all five subject groups. Then apply the forms in context.'}</p><div class="paper-fields"><div class="field"><label for="paper-focus">Learning context</label><select id="paper-focus">${Object.entries(PAPER_CONTEXTS).map(([id,v])=>`<option value="${id}" ${id===(q?'sentences':'conjugation')?'selected':''}>${esc(v.label)}</option>`).join('')}</select></div><div class="field"><label for="paper-scope">Sentence source</label><select id="paper-scope"><option value="">Selected tense</option>${q?`<option value="${esc(q.id)}" selected>This quest: ${esc(q.title)}</option>`:''}</select></div><div class="field"><label for="paper-tense">Tense</label><select id="paper-tense"></select></div><div class="field" id="paper-verb-field"><label for="paper-verb">Verb</label><select id="paper-verb"></select></div><div class="field" id="paper-person-field"><label for="paper-person">Person</label><select id="paper-person"><option value="all">All five subject groups</option>${PEOPLE.map((p,i)=>`<option value="${i}">${esc(p)}</option>`).join('')}</select></div><div class="field" id="paper-support-field"><label for="paper-support">Conjugation prompt</label><select id="paper-support"><option value="full">Recall the whole form</option><option value="ending">Missing ending when regular</option></select></div><div class="field"><label for="paper-count">Sheet length</label><select id="paper-count"><option value="6">Up to 5 checked + your own words</option><option value="8" selected>Up to 7 checked + your own words</option><option value="12">Up to 11 checked + your own words</option></select></div><div class="field"><label for="paper-size">Paper size</label><select id="paper-size"><option value="letter">US Letter</option><option value="a4">A4</option></select></div></div><label class="paper-key-choice"><input id="paper-key" type="checkbox" checked> Include an answer key on separate pages</label><p id="paper-context-description" class="help-box"></p><div class="paper-context-guide"><strong>How to use the contexts</strong><p>Conjugations: recall person + form. Context: build a meaningful sentence. Past choice: decide the tense. Review: return to difficult or due work. Finish by writing and saying your own sentence.</p></div><button class="btn primary" id="paper-build">Build fresh PDF</button><p id="paper-message" role="status" aria-live="polite"></p><div id="paper-output"></div><details class="disclosure paper-history"><summary>Recent sheets - download the same version again</summary><div id="paper-history-list"></div></details><p class="small muted">Generated on this device. Building or downloading a sheet does not mark exercises complete or change review dates. Recent sheets travel with your exported notebook backup.</p>`;
 document.body.append(dialog);dialog.querySelector('#paper-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{if(paperObjectUrl){URL.revokeObjectURL(paperObjectUrl);paperObjectUrl=null;}dialog.remove();});
 const $=id=>dialog.querySelector('#'+id);
 function verbs(){const old=$('paper-verb').value;const t=$('paper-tense').value;const available=course.verbs.filter(v=>v.forms?.[t]?.length===5);$('paper-verb').innerHTML='<option value="all">Mixed verbs</option>'+available.map(v=>`<option value="${esc(v.infinitive)}">${esc(v.infinitive)}</option>`).join('');if(available.some(v=>v.infinitive===old))$('paper-verb').value=old;else if(!old&&available.some(v=>v.infinitive===contextual?.verb))$('paper-verb').value=contextual.verb;}
 function syncTenses(){const focus=$('paper-focus').value,old=$('paper-tense').value||preferred;const available=focus==='conjugation'?formTenses(course):course.tenses;$('paper-tense').innerHTML=available.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');if(available.some(t=>t.id===old))$('paper-tense').value=old;verbs();syncContext();}
 function syncContext(){const focus=$('paper-focus').value,forms=focus==='conjugation',contrast=focus==='contrast',hasQuest=Boolean($('paper-scope').value);for(const id of ['paper-verb-field','paper-person-field','paper-support-field'])$(id).hidden=!forms;$('paper-scope').disabled=forms||contrast;$('paper-tense').disabled=contrast||(!forms&&hasQuest);$('paper-context-description').textContent=PAPER_CONTEXTS[focus].description+(forms&&$('paper-support').value==='ending'?' Irregular, compound and unsupported ending patterns ask for the whole form.':'');$('paper-message').textContent='Change the choices, then build a fresh sheet. Existing downloads keep their original questions.';}
 function renderHistory(){const sheets=savedWorksheets(state).slice(-8).reverse();$('paper-history-list').innerHTML=sheets.length?sheets.map((sheet,i)=>`<div class="paper-history-row"><span><strong>${esc(sheet.title)}</strong><br>${esc(sheet.scope)}<br><span class="small muted">${esc(sheet.id)} · ${new Date(sheet.createdAt).toLocaleDateString()}</span></span><button class="btn small" data-paper-saved="${i}">Get PDF</button></div>`).join(''):'<p>No sheets generated yet.</p>';dialog.querySelectorAll('[data-paper-saved]').forEach(el=>el.onclick=()=>showSheet(sheets[Number(el.dataset.paperSaved)],false));}
 function showSheet(sheet,fresh){
  const bytes=worksheetPdf(sheet,sheet.pdfOptions||{});if(paperObjectUrl)URL.revokeObjectURL(paperObjectUrl);paperObjectUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  $('paper-output').innerHTML=`<section class="paper-ready"><h3>Your sheet is ready</h3><p><strong>${esc(sheet.scope)}</strong> · ${sheet.items.length-1} checked prompts + your own words</p><p class="small muted">${esc(sheet.id)} · ${esc(sheet.notice||'')}</p><div class="stack"><a class="btn primary" href="${paperObjectUrl}" download="Frase-${esc(sheet.id)}.pdf">Download PDF</a><a class="btn" href="${paperObjectUrl}" target="_blank" rel="noopener">Open PDF to print</a></div><p class="small muted">On iPhone, open the PDF and use Share to print or save it to Files. ${sheet.pdfOptions?.answerKey===false?'This copy has no answer key.':'The answer key starts on a separate page.'}</p><details class="disclosure"><summary>See the questions before printing</summary><ol>${sheet.items.map(item=>`<li><strong>${esc(item.title)}</strong><p>${esc(item.prompt)}</p></li>`).join('')}</ol></details></section>`;
  $('paper-message').textContent=fresh?'New sheet built and saved in this browser.':'Original sheet restored with the same questions and key.';
 }
 $('paper-focus').onchange=syncTenses;$('paper-tense').onchange=()=>{verbs();syncContext();};$('paper-scope').onchange=syncContext;$('paper-support').onchange=syncContext;
 $('paper-build').onclick=()=>{try{
  const options={focus:$('paper-focus').value,questId:$('paper-scope').value,tense:$('paper-tense').value,verb:$('paper-verb').value,person:$('paper-person').value,support:$('paper-support').value,count:Number($('paper-count').value)};
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];const sheet=makeWorksheet(course,curriculum,state,options,savedWorksheets(state),seed);
  sheet.pdfOptions={paper:$('paper-size').value,answerKey:$('paper-key').checked};showSheet(sheet,true);state.paperSheets=[...savedWorksheets(state),sheet].slice(-30);persist();renderHistory();
 }catch(error){$('paper-message').textContent=error.message||'This sheet could not be built. Please try another context.';}};
 syncTenses();renderHistory();dialog.showModal();
}
