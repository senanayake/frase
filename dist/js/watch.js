// Listening is self-reported and never changes recall records or mastery.
export const RATINGS = ['easy','mostly','lost'];
export const LANES = ['visual','everyday','stretch'];
export function validateWatch(value) {
 const records={};
 if(value && typeof value==='object' && !Array.isArray(value)) {
  for(const [id,r] of Object.entries(value.records||{}).slice(0,500)) {
   if(!/^[A-Za-z0-9_-]{11}$/.test(id)||!r||typeof r!=='object')continue;
   records[id]={watched:r.watched===true,rating:RATINGS.includes(r.rating)?r.rating:null,ratedAt:Number.isFinite(r.ratedAt)&&r.ratedAt>=0?r.ratedAt:0,note:typeof r.note==='string'?r.note.slice(0,500):'',updatedAt:Number.isFinite(r.updatedAt)&&r.updatedAt>=0?r.updatedAt:0};
  }
 }
 return {records,selectedId:typeof value?.selectedId==='string'&&/^[A-Za-z0-9_-]{11}$/.test(value.selectedId)?value.selectedId:null};
}
export function ensureWatch(state){return state.watch||(state.watch=validateWatch(null));}
export function updateWatch(state,id,patch,now=Date.now()) {
 if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw Error('Unknown video ID.');
 if('rating'in patch && patch.rating!==null&&!RATINGS.includes(patch.rating))throw Error('Choose a supported understanding rating.');
 const watch=ensureWatch(state),old=watch.records[id]||{watched:false,rating:null,note:'',ratedAt:0,updatedAt:0};
 watch.records[id]={...old,...('watched'in patch?{watched:patch.watched===true}:{}),...('rating'in patch?{rating:patch.rating,ratedAt:now}:{}),...('note'in patch?{note:String(patch.note).slice(0,500)}:{}),updatedAt:now};
 return watch.records[id];
}
export function recommendWatch(catalog,state) {
 if(!catalog.length)return null;
 const records=state.watch?.records||{};
 const rated=catalog.filter(v=>records[v.id]?.rating).sort((a,b)=>(records[b.id].ratedAt||0)-(records[a.id].ratedAt||0));
 const latest=rated[0],rating=records[latest?.id]?.rating;
 let lane=latest?LANES.indexOf(latest.lane):0;
 if(rating==='lost')lane=Math.max(0,lane-1);
 if(rating==='easy')lane=Math.min(2,lane+1);
 const eligible=rating==='lost'?catalog.filter(v=>LANES.indexOf(v.lane)<=lane):catalog;
 const unseen=eligible.filter(v=>!records[v.id]?.watched && v.id!==latest?.id);
 const candidate=unseen.find(v=>LANES.indexOf(v.lane)===lane)||unseen.find(v=>LANES.indexOf(v.lane)<lane)||unseen[0];
 if(candidate)return {video:candidate,reason:!latest?'Begin with visual support. Choose another whenever you like.':rating==='lost'?'Try familiar or more visually supported material next.':rating==='easy'?'Try a small step toward a different context.':'Stay with a similar kind of listening and a new context.'};
 const revisit=[...eligible].sort((a,b)=>(records[a.id]?.updatedAt||0)-(records[b.id]?.updatedAt||0))[0];
 return {video:revisit,reason:rating==='lost'?'Revisit a familiar, more supported video; there is no need to move up.':'You have explored this shelf. Revisit a familiar video; repetition is welcome.'};
}
export const watchUrl=id=>`https://www.youtube.com/watch?v=${id}`;
export function embedUrl(id){if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw Error('Invalid video ID.');return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`;}
