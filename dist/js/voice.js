// Browser services only. Never upload audio to a Frase backend.
export function recognitionConstructor(host=globalThis) {
  return host.SpeechRecognition || host.webkitSpeechRecognition || null;
}
export function createSpeechInput(host, {status=()=>{}, transcript=()=>{}}={}) {
  let active=null, generation=0;
  const messages={
    'not-allowed':'Microphone or speech access was denied. Allow access in your browser settings, or type your answer.',
    'service-not-allowed':'Speech recognition is unavailable or blocked in this browser. You can keep typing.',
    'audio-capture':'No working microphone was found. Check your microphone or type your answer.',
    'network':'The speech service could not connect. Check your connection or type your answer.',
    'no-speech':'No speech was recognised. Try again, or type your answer.',
    'language-not-supported':'Spanish recognition is unavailable in this browser. You can keep typing.'
  };
  function cancel() {
    generation++;
    const old=active;active=null;
    if(old) { try {old.abort();} catch {} }
  }
  function start() {
    cancel();
    const Constructor=recognitionConstructor(host);
    if(!Constructor){status('unavailable','Speech input is not supported in this browser. Try Safari on iPhone or another supported browser. Typing is always available.');return false;}
    const token=generation;
    let received=false,failed=false;
    try {
      host.speechSynthesis?.cancel();
      const recognizer=new Constructor();active=recognizer;
      recognizer.lang='es-MX';recognizer.continuous=false;recognizer.interimResults=true;recognizer.maxAlternatives=1;
      recognizer.onstart=()=>{if(token===generation)status('listening','Listening in Spanish… Speak one answer, then pause.');};
      recognizer.onresult=event=>{
        if(token!==generation)return;
        let final='',interim='';
        for(let i=0;i<event.results.length;i++) {
          const item=event.results[i];
          if(item.isFinal)final+=item[0].transcript+' ';else interim+=item[0].transcript+' ';
        }
        if(final.trim()){received=true;transcript(final.trim());}
        else if(interim.trim())status('listening','Hearing: '+interim.trim());
      };
      recognizer.onerror=event=>{if(token!==generation)return;failed=true;status('error',messages[event.error]||'Speech recognition stopped. Try again, or type your answer.');};
      recognizer.onend=()=>{
        if(token!==generation)return;
        active=null;
        if(!failed)status('idle',received?'Check what I heard, edit if needed, then check your answer.':'No final transcript received. Your previous answer is kept. Try again or type.');
      };
      status('starting','Starting microphone… Allow speech access if your browser asks.');
      recognizer.start();return true;
    } catch {
      active=null;status('error','Speech input could not start. Try again from the microphone button, or type your answer.');return false;
    }
  }
  function stop(){try{active?.stop();}catch{cancel();status('idle','Microphone stopped.');}}
  return {start,stop,cancel,get active(){return Boolean(active);}};
}

export function practiceInputLabel(typed,spoken){return typed&&spoken?'mixed':spoken?'voice':'typed';}

export function guidedSession(cards) {
  // All prompts and accepted answers come from reviewed course content.
  const pairs=[['cocinar','imperfect','preterite'],['escribir','present','future'],['visitar','preterite','perfect']];
  return pairs.flatMap(([verb,first,second])=>[first,second].map((tense,i)=>{
    const card=cards.find(c=>c.id===`sentence-${tense}-${verb}-0`);
    return card?{...card,guidedLead:i?'Now change the time. Keep the same person and activity.':'Let’s build a sentence.',guidedFollowUp:i===1}:null;
  }).filter(Boolean));
}
