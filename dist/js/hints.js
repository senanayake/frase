import {normalize,stripAccents} from './engine.js';

// Compare only with authored answer variants. This is not a general grammar checker.
const words=text=>[...text.matchAll(/[\p{L}\p{M}]+/gu)].map(m=>({text:m[0],key:normalize(m[0]),start:m.index,end:m.index+m[0].length}));
const fold=text=>stripAccents(normalize(text));
function editTable(a,b){
 const table=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
 for(let i=0;i<=a.length;i++)table[i][0]=i;
 for(let j=0;j<=b.length;j++)table[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)table[i][j]=Math.min(table[i-1][j]+1,table[i][j-1]+1,table[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
 return table;
}
function charEdits(a,b){
 if(a.length>80||b.length>80)return [];
 const table=editTable(a,b),edits=[];let i=a.length,j=b.length;
 while(i||j){
  if(i&&j&&a[i-1]===b[j-1]){i--;j--;continue;}
  if(i&&j&&table[i][j]===table[i-1][j-1]+1){edits.push({start:i-1,end:i,targetStart:j-1,targetEnd:j,from:a[i-1],to:b[j-1]});i--;j--;}
  else if(i&&table[i][j]===table[i-1][j]+1){edits.push({start:i-1,end:i,targetStart:j,targetEnd:j,from:a[i-1],to:''});i--;}
  else{edits.push({start:i,end:i,targetStart:j-1,targetEnd:j,from:'',to:b[j-1]});j--;}
 }
 return edits.reverse();
}
function cost(a,b){
 if(a===b)return 0;
 if(fold(a)===fold(b))return .2;
 if(a.length<=80&&b.length<=80){const edits=editTable(a,b)[a.length][b.length];if(edits<=2)return .5+edits*.1;}
 return 1;
}
function align(source,target){
 const n=source.length,m=target.length,dp=Array.from({length:n+1},()=>Array(m+1).fill(0));
 for(let i=0;i<=n;i++)dp[i][0]=i;
 for(let j=0;j<=m;j++)dp[0][j]=j;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost(source[i-1].key,target[j-1].key));
 const differences=[];let i=n,j=m;
 const near=(a,b)=>Math.abs(a-b)<.00001;
 while(i||j){
  if(i&&j&&near(dp[i][j],dp[i-1][j-1]+cost(source[i-1].key,target[j-1].key))){if(source[i-1].key!==target[j-1].key)differences.push({source:source[i-1],target:target[j-1],kind:'word'});i--;j--;}
  else if(i&&near(dp[i][j],dp[i-1][j]+1)){differences.push({source:source[i-1],kind:'extra'});i--;}
  else{differences.push({target:target[j-1],kind:'missing',position:i<source.length?source[i].start:source.at(-1)?.end||0});j--;}
 }
 return {score:dp[n][m],differences:differences.reverse()};
}
export function diagnose(answer,card,course={verbs:[]}){
 answer=answer.normalize('NFC');
 if(!answer.trim()||answer.length>1500||card.type==='create'||!card.answers?.length)return null;
 const source=words(answer);if(source.length>100)return null;
 const candidates=card.answers.flatMap(text=>{
  const list=[text];const prefix=(card.subject||'')+' ';
  if(card.subject&&normalize(text).startsWith(normalize(prefix)+' '))list.push(text.trim().slice(prefix.length));
  return list;
 }).map(text=>({text,...align(source,words(text))})).sort((a,b)=>a.score-b.score);
 const best=candidates[0];
 if(!best||!best.differences.length)return null;
 if(source.length===words(best.text).length && source.map(w=>w.key).sort().join('|')===words(best.text).map(w=>w.key).sort().join('|')){
  const position=source.findIndex((w,i)=>w.key!==words(best.text)[i].key);
  return {kind:'order',source:answer,differences:best.differences.length,word:source[position].text,targetWord:words(best.text)[position].text,marks:[{start:source[position].start,end:source[position].end}],edits:[],isVerb:false};
 }
 if(best.differences.length>3)return null;
 const diff=best.differences[0];
 const result={kind:diff.kind,source:answer,differences:best.differences.length,word:diff.source?.text||'',targetWord:diff.target?.text||'',marks:diff.source?[{start:diff.source.start,end:diff.source.end}]:[{start:diff.position,end:diff.position}],edits:[],isVerb:false};
 if(diff.kind!=='word')return result;
 const from=diff.source.key,to=diff.target.key,edits=charEdits(from,to);
 const verb=course.verbs?.find(v=>v.infinitive===card.verb)||course.verbs?.find(v=>v.forms?.[card.tense]?.some(form=>normalize(form).split(' ').includes(to)));
 const targetForms=verb?.forms?.[card.tense]?.flatMap(s=>normalize(s).split(' '))||[];
 const knownForms=verb?Object.values(verb.forms).flat().flatMap(s=>normalize(s).split(' ')):[];
 result.isVerb=targetForms.includes(to);
 const stemLength=Math.max(1,(card.verb?.length||verb?.infinitive?.length||0)-2);
 const inEnding=edits.length&&edits.every(e=>e.start>=stemLength);
 if(fold(from)===fold(to))result.kind='accent';
 else if(result.isVerb&&(knownForms.includes(from)||inEnding)){
  result.kind='inflection';
  const targetPeople=verb.forms[card.tense].flatMap((form,i)=>normalize(form).split(' ').includes(to)?[i]:[]);
  const samePersonOtherTense=Object.entries(verb.forms).some(([tense,forms])=>tense!==card.tense&&targetPeople.some(i=>normalize(forms[i]).split(' ').includes(from)));
  if(samePersonOtherTense)result.kind='tense';
  else if(targetForms.includes(from))result.kind='person';
 }
 else if(['el','la','los','las','un','una','unos','unas','al','del'].includes(from)&&['el','la','los','las','un','una','unos','unas','al','del'].includes(to))result.kind='article';
 else if(['yo','tú','él','ella','nosotros','nosotras','ellos','ellas','usted','ustedes'].includes(from)&&['yo','tú','él','ella','nosotros','nosotras','ellos','ellas','usted','ustedes'].includes(to))result.kind='subject';
 else if(edits.length>0&&edits.length<=2&&best.differences.length===1&&result.isVerb)result.kind='spelling';
 if(['spelling','accent'].includes(result.kind)){
  result.edits=edits;
  result.marks=edits.map(e=>({start:diff.source.start+e.start,end:diff.source.start+e.end}));
  result.endingMatches=result.isVerb&&edits.every(e=>e.end<=stemLength);
 }
 return result;
}
const skeleton=word=>{
 if(!word)return '';
 const prefix=word.length>5?Math.min(4,Math.floor(word.length/2)):word.length>1?1:0;
 return word.slice(0,prefix)+'□'.repeat(Math.max(1,word.length-prefix));
};
export function graduatedHint(answer,card,course,level=1){
 const d=diagnose(answer,card,course),step=Math.min(3,Math.max(1,level));
 const genericRule=card.hint||course.tenses?.find(t=>t.id===card.tense)?.rule||'Think about the subject and the intended meaning.';
 const authored=card.hints?.[step-1];
 if(authored)return {level:step,title:['A small clue','Recall the pattern','A little more support'][step-1],message:authored,diagnosis:d,...(d?{marks:d.marks,source:d.source}:{})};
 if(!d){
  if(step===1)return {level:step,title:'Start with the meaning',message:card.type==='create'?'Choose one short idea. Who is doing it, and when?':'Check who is doing the action and when it happens. Try to retrieve the verb before asking for more help.'};
  if(step===2)return {level:step,title:'A clue about the pattern',message:genericRule};
  return {level:step,title:'A little more support',message:card.type==='cloze'?'The missing form begins like this. Complete the boxes yourself.':'Keep the sentence short. Use the target tense and the vocabulary you know.',fragment:card.type==='cloze'?skeleton(card.answers?.[0]||''):undefined};
 }
 const hint={level:step,diagnosis:d,marks:d.marks,source:d.source};
 if(step===1){
  if(d.kind==='spelling')return {...hint,title:d.edits.length===1?'One letter to revisit':'A small spelling detail',message:'The marked detail differs from a saved answer. Try repairing it without seeing the replacement.'};
  if(d.kind==='accent')return {...hint,title:'A written accent to revisit',message:'Check the marked position for an accent or diaeresis. The remaining letters match this word in the saved answer.'};
  if(d.kind==='tense')return {...hint,title:'Revisit the tense choice',message:'The marked form belongs to another tense in your verb notebook. Think about how the prompt places the action in time.'};
  if(d.kind==='person')return {...hint,title:'Revisit the person',message:'The marked form belongs to this tense, but a different person. Check who is doing the action.'};
  if(d.kind==='inflection')return {...hint,title:'Check this verb form',message:'This form differs from the target. Think about the person and tense before changing the ending.'};
  if(d.kind==='article')return {...hint,title:'Revisit the article',message:'Check the noun’s gender and number, and whether a contraction such as al or del is needed.'};
  if(d.kind==='subject')return {...hint,title:'Check who is doing it',message:'Compare the subject you wrote with the person requested by the prompt.'};
  if(d.kind==='order')return {...hint,title:'Compare the word order',message:'You have the same words in a different order from a saved answer. Spanish allows alternatives; check whether your order fits the meaning.'};
  if(d.kind==='missing')return {...hint,title:'Check this gap',message:'The marker shows where a word appears in the closest saved answer. Another wording may also be valid.'};
  return {...hint,title:'Look at the marked part',message:'This part differs from the closest saved answer. It may be a wording difference, so this is a comparison rather than a complete grammar judgment.'};
 }
 if(step===2){
  if(d.kind==='spelling')return {...hint,title:'Keep what already works',message:d.endingMatches?'The verb ending matches this saved answer. Focus on the spelling in its stem.':'Focus on the spelling of the marked word. Keep the surrounding sentence.',fragment:maskEdits(d)};
  if(d.kind==='accent')return {...hint,title:'Focus on the written mark',message:'An accent can distinguish verb forms or meanings. Restore the mark at the highlighted position.',fragment:maskEdits(d)};
  return {...hint,title:'Recall the pattern',message:genericRule};
 }
 if(['spelling','accent'].includes(d.kind)){
  const e=d.edits[0];
  const message=!e.from?`Add “${e.to}” at the first marker.`:!e.to?`Remove the first marked “${e.from}”.`:`Change the first marked “${e.from}” to “${e.to}”.`;
  return {...hint,title:'The smallest repair',message:message+' Then check the sentence again.'};
 }
 if(d.kind==='extra')return {...hint,title:'Try one small deletion',message:'The marked word is extra compared with the closest saved answer. Try leaving it out, then check whether your sentence still expresses the intended meaning.'};
 if(d.kind==='order')return {...hint,title:'Try another placement',message:'Move the marked word to another position and read your sentence again. This is a comparison with saved wording, not a rule that Spanish has only one valid order.'};
 return {...hint,title:'A partial word to work from',message:'Complete this part yourself, then check your answer. The full model stays hidden until you choose it.',fragment:skeleton(d.targetWord||card.answers?.[0]?.split(' ')[0])};
}
function maskEdits(d){
 const chars=[...d.targetWord];
 for(const e of d.edits)for(let i=e.targetStart;i<e.targetEnd;i++)chars[i]='□';
 return chars.join('');
}
