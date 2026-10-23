"""Build the versioned course independently of the practice UI. Keep card IDs stable."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
TENSES=[
 {'id':'present','label':'Present','spanish':'Presente','description':'Current habits, facts, and states. Begin with regular -ar, -er, and -ir endings.','example':'Normalmente, hablo español con mi familia.','rule':'For regular verbs, remove -ar, -er, or -ir and add the present ending.','endings':{'-ar':['o','as','a','amos','an'],'-er':['o','es','e','emos','en'],'-ir':['o','es','e','imos','en']}},
 {'id':'preterite','label':'Preterite','spanish':'Pretérito indefinido / perfecto simple','description':'Present an event as a completed whole in the past. Use context to distinguish it from background or a habit.','example':'Ayer, hablé español con mi familia.','rule':'Regular -er and -ir verbs share the same preterite endings. Watch the written accents in yo and él/ella.','endings':{'-ar':['é','aste','ó','amos','aron'],'-er / -ir':['í','iste','ió','imos','ieron']}},
 {'id':'imperfect','label':'Imperfect','spanish':'Pretérito imperfecto','description':'Describe past habits, background, or an action viewed as ongoing. It does not by itself say the action never ended.','example':'Cuando era niño, hablaba español con mi familia.','rule':'Regular -ar verbs use -aba; -er and -ir use -ía. Ser, ir, and ver have irregular imperfect forms.','endings':{'-ar':['aba','abas','aba','ábamos','aban'],'-er / -ir':['ía','ías','ía','íamos','ían']}},
 {'id':'future','label':'Simple future','spanish':'Futuro simple','description':'Practise the simple future for future events. Other constructions can also express the future in natural Spanish.','example':'Mañana, hablaré español con mi familia.','rule':'Add the ending to the full infinitive. Some common verbs use irregular stems such as tendr- and har-.','endings':{'All regular verbs':['é','ás','á','emos','án']}},
 {'id':'perfect','label':'Present perfect','spanish':'Pretérito perfecto compuesto','description':'Haber in the present + a participle. Practise experiences and past events viewed from the present. Usage varies by region.','example':'He hablado español con mi familia.','rule':'Use he, has, ha, hemos, han + an unchanged participle. Learn irregular participles such as hecho, escrito, and abierto.','endings':{'Haber':['he','has','ha','hemos','han'],'Regular participle':['-ado (-ar)','-ido (-er/-ir)','—','—','—']}}
]
# English forms: base, third-person present, past, participle. Objects have no subject agreement.
VERBS=[
 ('hablar','español','speak','speaks','spoke','spoken','Spanish'),
 ('estudiar','español','study','studies','studied','studied','Spanish'),
 ('trabajar','en casa','work','works','worked','worked','at home'),
 ('visitar','a mi abuela','visit','visits','visited','visited','my grandmother'),
 ('comprar','pan','buy','buys','bought','bought','bread'),
 ('cocinar','la cena','cook','cooks','cooked','cooked','dinner'),
 ('caminar','por el parque','walk','walks','walked','walked','through the park'),
 ('nadar','en la piscina','swim','swims','swam','swum','in the pool'),
 ('viajar','a México','travel','travels','traveled','traveled','to Mexico'),
 ('escuchar','música','listen','listens','listened','listened','to music'),
 ('terminar','el trabajo','finish','finishes','finished','finished','the work'),
 ('comer','pan','eat','eats','ate','eaten','bread'),
 ('beber','agua','drink','drinks','drank','drunk','water'),
 ('aprender','español','learn','learns','learned','learned','Spanish'),
 ('vender','libros','sell','sells','sold','sold','books'),
 ('vivir','en Madrid','live','lives','lived','lived','in Madrid'),
 ('escribir','una carta','write','writes','wrote','written','a letter'),
 ('recibir','una carta','receive','receives','received','received','a letter'),
 ('abrir','la ventana','open','opens','opened','opened','the window'),
 ('correr','en el parque','run','runs','ran','run','in the park'),
 ('leer','un libro','read','reads','read','read','a book'),
 ('hacer','la cena','make','makes','made','made','dinner'),
 ('ir','al parque','go','goes','went','gone','to the park'),
 ('ser','feliz','be','is','was','been','happy'),
 ('tener','tiempo','have','has','had','had','time')
]
SUBJECTS=['yo','tú','ella','nosotros','ellos']
EN_SUBJECTS=['I','you','she','we','they']
ENDINGS={
 'present':{'ar':['o','as','a','amos','an'],'er':['o','es','e','emos','en'],'ir':['o','es','e','imos','en']},
 'preterite':{'ar':['é','aste','ó','amos','aron'],'er':['í','iste','ió','imos','ieron'],'ir':['í','iste','ió','imos','ieron']},
 'imperfect':{'ar':['aba','abas','aba','ábamos','aban'],'er':['ía','ías','ía','íamos','ían'],'ir':['ía','ías','ía','íamos','ían']}
}
OVERRIDES={
 'ser':{'present':['soy','eres','es','somos','son'],'preterite':['fui','fuiste','fue','fuimos','fueron'],'imperfect':['era','eras','era','éramos','eran']},
 'ir':{'present':['voy','vas','va','vamos','van'],'preterite':['fui','fuiste','fue','fuimos','fueron'],'imperfect':['iba','ibas','iba','íbamos','iban']},
 'hacer':{'present':['hago','haces','hace','hacemos','hacen'],'preterite':['hice','hiciste','hizo','hicimos','hicieron']},
 'tener':{'present':['tengo','tienes','tiene','tenemos','tienen'],'preterite':['tuve','tuviste','tuvo','tuvimos','tuvieron']},
 'leer':{'preterite':['leí','leíste','leyó','leímos','leyeron']}
}
PARTICIPLES={'escribir':'escrito','abrir':'abierto','hacer':'hecho','leer':'leído'}
def conjugate(verb,tense,person):
    if tense in OVERRIDES.get(verb,{}): return OVERRIDES[verb][tense][person]
    if tense=='perfect': return ['he','has','ha','hemos','han'][person]+' '+PARTICIPLES.get(verb,verb[:-2]+('ado' if verb.endswith('ar') else 'ido'))
    if tense=='future': return {'hacer':'har','tener':'tendr'}.get(verb,verb)+['é','ás','á','emos','án'][person]
    return verb[:-2]+ENDINGS[tense][verb[-2:]][person]
def english(entry,tense,p):
    verb,tail,base,third,past,part,obj=entry
    subject=EN_SUBJECTS[p]
    if tense=='present':
        form=(['am','are','is','are','are'][p] if base=='be' else third if p==2 else base)
        return f'Normally, {subject} {form} {obj}.'
    if tense=='preterite':
        form=('was' if p in [0,2] else 'were') if base=='be' else past
        return f'Yesterday, {subject} {form} {obj}.'
    if tense=='imperfect': return f'{subject.capitalize() if p else subject} used to {base} {obj}.'
    if tense=='future': return f'Tomorrow, {subject} will {base} {obj}.'
    return f'{subject.capitalize() if p else subject} '+('has' if p==2 else 'have')+f' {part} {obj}.'
PREFIX={'present':'Normalmente, ','preterite':'Ayer, ','imperfect':'Antes, ','future':'Mañana, ','perfect':''}
cards=[]
for entry in VERBS:
    verb,tail,*_=entry
    for tense in [t['id'] for t in TENSES]:
        for p,subject in enumerate(SUBJECTS):
            tail='felices' if verb=='ser' and p>=3 else entry[1]
            form=conjugate(verb,tense,p)
            start=PREFIX[tense]+subject+' '
            answer=form
            sentence=start+form+' '+tail+'.'
            sentence=sentence[0].upper()+sentence[1:]
            cards.append({'id':f'form-{tense}-{verb}-{p}','tense':tense,'type':'cloze','prompt':start+'___ '+tail+'.','instruction':'Complete the sentence. Type only the missing verb form.','answers':[answer],'sample':sentence,'verb':verb,'hint':f'The subject is {subject}. '+next(t['rule'] for t in TENSES if t['id']==tense),'explanation':f'{subject.capitalize()} + {form}. '+next(t['rule'] for t in TENSES if t['id']==tense)})
        # Two full-sentence prompts per verb/tense; no unknown vocabulary is introduced.
        for p in [0,3]:
            tail='felices' if verb=='ser' and p>=3 else entry[1]
            form=conjugate(verb,tense,p)
            subject=SUBJECTS[p]
            prefix=PREFIX[tense]
            sentence=prefix+subject+' '+form+' '+tail+'.'
            sentence=sentence[0].upper()+sentence[1:]
            variants=[sentence,prefix+form+' '+tail+'.']
            if tense=='imperfect': variants+=['Antes, '+subject+' '+form+' '+tail+'.',subject+' '+form+' '+tail+'.',form+' '+tail+'.']
            if tense in ['present','preterite','future']:
                time={'present':'normalmente','preterite':'ayer','future':'mañana'}[tense]
                variants += [subject+' '+form+' '+tail+' '+time+'.',form+' '+tail+' '+time+'.']
            cards.append({'id':f'sentence-{tense}-{verb}-{p}','tense':tense,'type':'translate','prompt':english(entry,tense,p),'instruction':'Write the whole sentence in Spanish using the target tense.','answers':variants,'subject':subject,'sample':sentence,'verb':verb,'hint':f'Use {verb} ({subject}). Useful words: {tail}.','explanation':next(t['rule'] for t in TENSES if t['id']==tense)})
        p=0
        tail='felices' if verb=='ser' else entry[1]
        form=conjugate(verb,tense,p)
        source='Yo '+conjugate(verb,'present' if tense!='present' else 'preterite',p)+' '+entry[1]+'.'
        target=PREFIX[tense]+conjugate(verb,tense,3)+' '+tail+'.'
        cards.append({'id':f'change-{tense}-{verb}','tense':tense,'type':'transform','prompt':source,'instruction':f'Change the subject to nosotros and use {next(t["label"].lower() for t in TENSES if t["id"]==tense)}. '+({'present':'Describe a current habit.','preterite':'Describe a completed event yesterday.','imperfect':'Describe a former habit.','future':'Describe tomorrow.','perfect':'Use hemos + participle.'}[tense]),'answers':[target,PREFIX[tense]+'nosotros '+conjugate(verb,tense,3)+' '+tail+'.'],'sample':target[0].upper()+target[1:],'verb':verb,'hint':f'Use nosotros + {verb}.','explanation':next(t['rule'] for t in TENSES if t['id']==tense)})

# Carefully contextualised meaning contrasts. No tense badge is shown before the answer.
contrasts=[
 ('visitar','imperfect','Describe a regular childhood habit: every Sunday, you visited your grandmother. Speak as yo.','Cuando era niño, visitaba a mi abuela todos los domingos.',['De niño, visitaba a mi abuela todos los domingos.','Visitaba a mi abuela todos los domingos.'],'The repeated childhood habit is presented with visitaba.'),
 ('visitar','preterite','Report one completed visit: last Sunday, you visited your grandmother. Speak as yo.','El domingo pasado, visité a mi abuela.',['Visité a mi abuela el domingo pasado.'],'A particular completed visit is presented with visité.'),
 ('comer','imperfect','Describe your former routine: you used to eat bread every morning. Speak as yo.','Antes, comía pan todas las mañanas.',['Comía pan todas las mañanas.'],'Comía presents the former routine.'),
 ('comer','preterite','Report a finished event: yesterday, you ate bread. Speak as yo.','Ayer, comí pan.',['Comí pan ayer.'],'Comí presents the eating as a completed event.'),
 ('vivir','imperfect','Give the background to a childhood story: at that time, you lived in Madrid. Speak as yo.','En aquella época, vivía en Madrid.',['Vivía en Madrid.','En esa época, vivía en Madrid.'],'Vivía supplies background to the story.'),
 ('vivir','preterite','Summarise a finished period: you lived in Madrid for two years and then moved away. Translate only: I lived in Madrid for two years.','Viví en Madrid durante dos años.',['Viví en Madrid dos años.'],'Viví presents the period as a completed whole. A long duration can still take the preterite.'),
 ('correr','imperfect','Describe a former habit: you used to run in the park on Saturdays. Speak as yo.','Antes, corría en el parque los sábados.',['Corría en el parque los sábados.'],'Corría describes the routine, without counting completed runs.'),
 ('correr','preterite','Report one finished run: yesterday, you ran in the park. Speak as yo.','Ayer, corrí en el parque.',['Corrí en el parque ayer.'],'Corrí presents that run as a completed event.'),
 ('leer','imperfect','Set the background: yesterday at eight you were in the middle of reading a book. Use leer in the imperfect, as yo.','Ayer a las ocho, leía un libro.',['Ayer, a las ocho, yo leía un libro.','Leía un libro ayer a las ocho.'],'Leía views the activity as ongoing at that moment. Ayer does not automatically require the preterite.'),
 ('leer','preterite','Report a completed achievement: yesterday, you read a whole book. Speak as yo.','Ayer, leí un libro entero.',['Leí un libro entero ayer.'],'Leí presents reading the whole book as completed.'),
 ('hacer','imperfect','Describe your former habit: you used to make dinner every day. Speak as yo.','Antes, hacía la cena todos los días.',['Hacía la cena todos los días.'],'Hacía expresses the past habit.'),
 ('hacer','preterite','Report a completed event: yesterday, you made dinner. Speak as yo.','Ayer, hice la cena.',['Hice la cena ayer.'],'Hice is the irregular preterite of hacer for yo.'),
 ('ir','imperfect','Describe a former habit: you used to go to the park on Sundays. Speak as yo.','Antes, iba al parque los domingos.',['Iba al parque los domingos.'],'Iba is the imperfect of ir.'),
 ('ir','preterite','Report one completed outing: yesterday, you went to the park. Speak as yo.','Ayer, fui al parque.',['Fui al parque ayer.'],'Fui is the preterite of ir in this context.'),
 ('tener','imperfect','Give background: when you were a child, you had a dog. Speak as yo.','Cuando era niño, tenía un perro.',['De niño, tenía un perro.'],'Tenía describes the background situation.'),
 ('hablar','preterite','Report one completed conversation: yesterday, you spoke Spanish with Teresa. Speak as yo.','Ayer, hablé español con Teresa.',['Hablé español con Teresa ayer.'],'Hablé presents a completed event.'),
]
for i,(verb,tense,prompt,sample,alts,explanation) in enumerate(contrasts):
    cards.append({'id':f'contrast-{i+1:02d}','tense':tense,'type':'contrast','prompt':prompt,'instruction':'Choose the past tense that expresses the intended meaning. Write a full sentence.','answers':[sample,*alts],'sample':sample,'verb':verb,'subject':'yo','hint':'A completed whole: preterite. A past habit or background: imperfect. Useful verb: '+verb+'.','explanation':explanation})

creative={
 'present':[('Describe one thing you normally do on Saturdays.','Normalmente, corro en el parque los sábados.'),('Write a sentence about where you work.','Trabajo en casa.'),('Describe a current habit involving your family.','Hablo español con mi familia.'),('Write a sentence about something you enjoy reading.','Leo libros de filosofía.')],
 'preterite':[('Describe one thing you completed yesterday.','Ayer, terminé el trabajo.'),('Write about a particular visit you made last weekend.','El sábado pasado, visité a un amigo.'),('Describe a completed meal you cooked recently.','Ayer, cociné la cena.'),('Report one completed run or walk.','El sábado pasado, corrí en el parque.')],
 'imperfect':[('Describe something you regularly did as a child.','Cuando era niño, nadaba todos los días.'),('Describe where you lived when you were younger.','Cuando era niño, vivía en Inglaterra.'),('Describe a former habit that has changed.','Antes, estudiaba por la noche.'),('Give the background to a story about a family holiday.','El hotel era pequeño y la piscina estaba tranquila.')],
 'future':[('Say something you will do tomorrow. Use the simple future.','Mañana, estudiaré español.'),('Describe a future trip in one sentence. Use the simple future.','El próximo año, viajaré a México.'),('Make a promise about your Spanish practice. Use the simple future.','Practicaré español todos los días.'),('Say what you and Teresa will do next weekend. Use nosotros and the simple future.','El próximo sábado, visitaremos a unos amigos.')],
 'perfect':[('Describe a life experience using he + participle.','He visitado México.'),('Say something you have already finished, using ya and the present perfect.','Ya he terminado el trabajo.'),('Say something you have not done yet, using todavía no and the present perfect.','Todavía no he leído el libro.'),('Write about a shared experience using hemos + participle.','Hemos viajado a México.')]
}
for tense,items in creative.items():
    for i,(prompt,sample) in enumerate(items):
        cards.append({'id':f'create-{tense}-{i+1}','tense':tense,'type':'create','prompt':prompt,'instruction':'Make a sentence of your own. This exercise uses self-review.','answers':[],'sample':sample,'hint':next(t['rule'] for t in TENSES if t['id']==tense),'explanation':'Check your intended meaning, subject, verb form, and word order. The model is one possible sentence; your sentence can be different.'})

ya=[
 ('ya-01','present','Say: I no longer work there.','Ya no trabajo allí.',['Ya no trabajo ahí.'],'Ya no describes something that used to be true and has stopped.'),
 ('ya-02','present','Say: I still live in Madrid.','Todavía vivo en Madrid.',['Aún vivo en Madrid.','Vivo todavía en Madrid.'],'Todavía / aún expresses continuation.'),
 ('ya-03','perfect','Say: I have already finished the work. Use the present perfect.','Ya he terminado el trabajo.',['He terminado ya el trabajo.'],'Ya marks completion; he terminado is the present perfect.'),
 ('ya-04','perfect','Say: I have not read the book yet. Use todavía no and the present perfect.','Todavía no he leído el libro.',['Aún no he leído el libro.'],'Todavía no / aún no says something has not happened yet.'),
 ('ya-05','preterite','Say: I already ate. Use the preterite.','Ya comí.',[],'Ya can appear with the preterite; it does not force a compound tense.'),
 ('ya-06','present','Say: I no longer live in Madrid.','Ya no vivo en Madrid.',[],'Ya no marks a change from living there to no longer living there.')
]
for id,tense,prompt,sample,alts,explanation in ya:
    cards.append({'id':id,'tense':tense,'type':'translate','prompt':prompt,'instruction':'Practise ya, ya no, and todavía. Write the whole sentence.','answers':[sample,*alts],'sample':sample,'subject':'yo','hint':explanation,'explanation':explanation,'tag':'ya'})

course={'schemaVersion':1,'version':'1.8.0','title':'Your first five tenses','tenses':TENSES,'verbs':[{'infinitive':v[0],'meaning':v[2]+' '+v[6],'forms':{t['id']:[conjugate(v[0],t['id'],p) for p in range(5)] for t in TENSES}} for v in VERBS],'cards':cards,'sources':[{'label':'Conjugation reference','url':'https://www.conjugacion.es/del/verbo/visitar.php'},{'label':'DeepL translation reference','url':'https://www.deepl.com/es/translator'}]}
(ROOT/'dist/data/course.json').write_text(json.dumps(course,ensure_ascii=False,indent=2)+'\n')
sample={'schemaVersion':1,'id':'my-next-lesson','title':'My next lesson','tenses':[{'id':'conditional','label':'Conditional','spanish':'Condicional simple','description':'Polite requests and hypothetical situations.','example':'Me gustaría un café.','rule':'Add conditional endings to the infinitive or irregular stem.'}],'cards':[{'id':'polite-coffee','tense':'conditional','type':'translate','prompt':'I would like a coffee.','instruction':'Use gustar in the conditional.','answers':['Me gustaría un café.'],'sample':'Me gustaría un café.','hint':'Use me + gustaría.','explanation':'Me gustaría is a common polite way to say I would like.'},{'id':'own-request','tense':'conditional','type':'create','prompt':'Make a polite request using the conditional.','sample':'Me gustaría un vaso de agua.','hint':'Try me gustaría + a noun.','explanation':'Self-review: check the verb ending and the meaning.'}]}
sample['cards'][0]['hints']=['Think of a polite expression for what you would like.','Use me + the conditional of gustar.','The conditional form begins with gusta… and includes an accented í.']
(ROOT/'dist/data/sample-lesson.json').write_text(json.dumps(sample,ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(cards)} exercises, {len(TENSES)} tenses, {len(VERBS)} verbs.')
