import {LANES,ensureWatch,recommendWatch,updateWatch,watchUrl,embedUrl} from './watch.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const laneNames={visual:'Visual & repetition',everyday:'Everyday scenes',stretch:'Stories & a little stretch'};
const ratingNames={easy:'Easy',mostly:'Mostly followed',lost:'Lost'};
export function watchView(catalog,state) {
 const watch=ensureWatch(state),suggestion=recommendWatch(catalog,state),selected=catalog.find(v=>v.id===watch.selectedId)||suggestion?.video;
 if(!selected)return '<p>The watching shelf is unavailable. Your practice notebook is unchanged.</p>';
 const r=watch.records[selected.id]||{};
 return `<div class="intro"><div><span class="eyebrow">ESPAÑOL EN CONTEXTO</span><h1>Watch &amp; Understand</h1><p>Follow the meaning. Enjoy the scene. Keep one phrase if you like.</p></div></div>
 <div class="watch-intro panel"><p><strong>Spanish After Hours · a hand-picked starter shelf</strong></p><p>These are full videos, not timestamped lessons. Try a few minutes or stay for the whole video. No quizzes interrupt you, and nothing is marked watched automatically.</p><p class="small muted">Spain-based Spanish adds listening variety alongside Frase’s Latin American practice. The paths below are suggestions from video titles/descriptions, not tested CEFR levels.</p></div>
 <section class="watch-recommendation" aria-label="Recommended next video"><div><span class="eyebrow">RECOMMENDED NEXT</span><h2 id="watch-next-title">${esc(suggestion.video.title)}</h2><p id="watch-next-reason">${esc(suggestion.reason)}</p></div><button class="btn primary" id="watch-next" data-watch-select="${suggestion.video.id}">Watch this</button></section>
 <section class="panel watch-player-card" aria-label="Selected video"><span class="eyebrow">${esc(laneNames[selected.lane])}</span><h2>${esc(selected.title)}</h2><p>${esc(selected.why)}</p>
 <div id="watch-player" class="watch-player"><div class="watch-player-placeholder"><strong>Watch at your own pace</strong><p>Load YouTube here, or open the original video.</p><button class="btn primary" id="watch-load" data-video-id="${selected.id}">Load video</button></div></div>
 <div class="watch-links"><a class="btn" href="${watchUrl(selected.id)}" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a><span class="small muted">Use the player’s captions and speed controls when available.</span></div>
 <p class="small muted">Loading the player connects to YouTube. Embedding or captions may be unavailable for some videos; the original link is always here.</p>
 <div class="watch-reflect"><h3>After watching, if you like</h3><p>How much did you follow? Your impression helps choose the next video.</p><div class="watch-ratings" role="group" aria-label="Understanding rating">${Object.entries(ratingNames).map(([key,label])=>`<button class="btn ${r.rating===key?'selected':''}" data-watch-rating="${key}" aria-pressed="${r.rating===key}">${label}</button>`).join('')}<button class="btn link" data-watch-rating="">Clear rating</button></div>
 <label class="watch-check"><input type="checkbox" id="watch-watched" ${r.watched?'checked':''}> I watched this video</label><p class="small muted">Mark it when you choose. Opening or rating a video does not count as finishing it.</p>
 <details class="disclosure"><summary>Keep one phrase · optional</summary><p>Write a short phrase you noticed, or a memory of the scene. You can include a timestamp yourself. This is your note, not a checked transcript or a graded answer.</p><label for="watch-note">My phrase or scene cue</label><textarea id="watch-note" maxlength="500" rows="3" placeholder="A phrase I want to hear again…">${esc(r.note||'')}</textarea><div class="watch-note-actions"><button class="btn" id="watch-note-save">Save note</button><span class="small muted">Saved locally with your notebook backup.</span></div></details>
 <p id="watch-save-status" role="status" aria-live="polite" class="small muted"></p></div></section>
 <section class="watch-library" aria-label="Video library"><div class="watch-library-heading"><div><span class="eyebrow">EXPLORE THE CHANNEL</span><h2>Your listening shelf</h2></div><p id="watch-count" class="small muted">${catalog.filter(v=>watch.records[v.id]?.watched).length} of ${catalog.length} marked watched · separate from recall mastery</p></div>
 ${LANES.map(lane=>`<section class="watch-lane"><h3>${laneNames[lane]}</h3><div class="watch-grid">${catalog.filter(v=>v.lane===lane).map(v=>`<article class="panel watch-card ${v.id===selected.id?'is-selected':''}"><span class="eyebrow">${esc(v.topic)}</span><h3>${esc(v.title)}</h3><p>${esc(v.why)}</p><p class="small muted" data-watch-badge="${v.id}">${watch.records[v.id]?.watched?'Watched':'Not marked watched'}${watch.records[v.id]?.rating?' · '+ratingNames[watch.records[v.id].rating]:''}</p><button class="btn" data-watch-select="${v.id}" ${v.id===selected.id?'aria-current="true"':''}>${v.id===selected.id?'Selected':'Choose video'}</button></article>`).join('')}</div></section>`).join('')}</section>
 <section class="panel watch-bridge"><h2>A small bridge to recall</h2><p>Watching and practising verb forms are different activities. When a phrase reminds you of a form you are learning, keep the scene in mind for your next Focused session. No video rating changes your review schedule or awards mastery.</p><button class="btn" data-nav="practice">Return to Practice</button><p class="small muted">Clip-specific exercises can be added after their language and timestamps are checked. This starter shelf does not copy the creator’s paid exercises or fetch transcripts.</p></section>`;
}
export function bindWatch(root,catalog,state,{persist,render,toast}) {
 const watch=ensureWatch(state),selected=catalog.find(v=>v.id===watch.selectedId)||recommendWatch(catalog,state)?.video;
 if(!selected)return;
 // Keep the playing selection stable when recommendations or the shell change.
 if(watch.selectedId!==selected.id){watch.selectedId=selected.id;persist();}
 root.querySelectorAll('[data-watch-select]').forEach(el=>el.onclick=()=>{watch.selectedId=el.dataset.watchSelect;persist();render();root.querySelector('.watch-player-card')?.scrollIntoView({behavior:'auto',block:'start'});});
 root.querySelector('#watch-load')?.addEventListener('click',()=>{
  const holder=root.querySelector('#watch-player'),frame=document.createElement('iframe');
  frame.src=embedUrl(selected.id);frame.title=selected.title+' — Spanish After Hours';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';holder.replaceChildren(frame);
 });
 function save(patch,message){
  updateWatch(state,selected.id,patch);persist();
  // Update only reflection and recommendation labels: never interrupt the iframe.
  const r=watch.records[selected.id];
  root.querySelectorAll('[data-watch-rating]').forEach(el=>{const pressed=el.dataset.watchRating===r.rating;el.setAttribute('aria-pressed',String(pressed));el.classList.toggle('selected',pressed);});
  const badge=root.querySelector(`[data-watch-badge="${selected.id}"]`);if(badge)badge.textContent=(r.watched?'Watched':'Not marked watched')+(r.rating?' · '+ratingNames[r.rating]:'');
  const suggestion=recommendWatch(catalog,state);root.querySelector('#watch-next-title').textContent=suggestion.video.title;root.querySelector('#watch-next-reason').textContent=suggestion.reason;root.querySelector('#watch-next').dataset.watchSelect=suggestion.video.id;
  root.querySelector('#watch-count').textContent=`${catalog.filter(v=>watch.records[v.id]?.watched).length} of ${catalog.length} marked watched · separate from recall mastery`;
  root.querySelector('#watch-save-status').textContent=message;
 }
 root.querySelectorAll('[data-watch-rating]').forEach(el=>el.onclick=()=>save({rating:el.dataset.watchRating||null},el.dataset.watchRating?'Understanding rating saved.':'Rating cleared.'));
 root.querySelector('#watch-watched')?.addEventListener('change',e=>save({watched:e.target.checked},e.target.checked?'Marked watched.':'Watched mark removed.'));
 root.querySelector('#watch-note')?.addEventListener('input',e=>{updateWatch(state,selected.id,{note:e.target.value});persist();});
 root.querySelector('#watch-note-save')?.addEventListener('click',()=>{save({note:root.querySelector('#watch-note').value},'Your note is saved in this browser.');});
}
