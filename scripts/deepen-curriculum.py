"""Add reviewed foundation banks. Stable original cards/checkpoints are retained.
Run after expand-curriculum.py, or rerun alone (idempotent).
"""
import json
from pathlib import Path
path=Path(__file__).resolve().parents[1]/'dist/data/curriculum.json'
d=json.loads(path.read_text())
new_id='past-choose-meaning'
d['cards']=[c for c in d['cards'] if not c.get('depthBank') and c.get('questId')!=new_id]
d['quests']=[q for q in d['quests'] if q['id']!=new_id]
d['patterns']=[p for p in d['patterns'] if p['id']!='past-choose-meaning-pattern']
for u in d['units']:u['questIds']=[i for i in u['questIds'] if i!=new_id]
for q in d['quests']:
 q['cardIds']=[c['id'] for c in d['cards'] if c['questId']==q['id']]
 for key in ['bankIds','introIds','challengeIds']:q.pop(key,None)

# Entries are explicitly authored, not arbitrary Cartesian substitutions.
# c: cloze with lemma, t: translation, x: transformation. Last six are challenges.
def C(prompt,answer,verb,tense=None):return ('cloze',prompt,answer,'Complete the sentence. Enter only the missing form. Use '+verb+'.',verb,tense)
def T(prompt,answer,tense=None):return ('translate',prompt,answer,'Write the sentence in Spanish. Follow any wording cue in the prompt.',None,tense)
def X(source,instruction,answer,tense=None):return ('transform',source,answer,instruction,None,tense)
banks={
'daily-obligations':[
 C('Tú ___ que estudiar hoy.','tienes','tener'),
 C('Ana ___ que comprar leche.','tiene','tener'),
 C('Ustedes ___ que llegar a las ocho.','tienen','tener'),
 C('Nosotros no ___ que trabajar el domingo.','tenemos','tener'),
 X('Tengo que salir temprano.','Change the subject to ustedes.','Ustedes tienen que salir temprano.'),
 X('Tenemos que cocinar hoy.','Make the sentence negative.','No tenemos que cocinar hoy.'),
 T('Do you have to work tomorrow? Use tú.',['¿Tienes que trabajar mañana?','¿Mañana tienes que trabajar?']),
 T('My sister has to study tonight.','Mi hermana tiene que estudiar esta noche.'),
 T('We have to buy bread.','Tenemos que comprar pan.'),
 T('You all do not have to pay today. Use ustedes.','Ustedes no tienen que pagar hoy.'),
 X('Ella tiene que leer el libro.','Change the subject to nosotros.','Nosotros tenemos que leer el libro.'),
 X('Tienes que esperar aquí.','Turn this into a yes/no question.','¿Tienes que esperar aquí?'),
 T('We have to call Ana before leaving. Use antes de salir.','Tenemos que llamar a Ana antes de salir.'),
 T('I do not have to get up early tomorrow. Use levantarse.',['No tengo que levantarme temprano mañana.','No me tengo que levantar temprano mañana.']),
 T('What do you have to do today? Use tú.','¿Qué tienes que hacer hoy?'),
 T('The students have to write a letter.','Los estudiantes tienen que escribir una carta.'),
 T('Does your brother have to cook tonight?','¿Tu hermano tiene que cocinar esta noche?'),
 T('We have to leave because it is late.','Tenemos que salir porque es tarde.')],
'past-completed':[
 C('Anoche tú ___ pasta.','cocinaste','cocinar'),
 C('El sábado Ana ___ el museo.','visitó','visitar'),
 C('Ayer ustedes ___ el trabajo.','terminaron','terminar'),
 C('El lunes nosotros ___ el pan.','compramos','comprar'),
 X('Ayer compré verduras.','Change the subject to ella.','Ayer ella compró verduras.'),
 X('Anoche cocinamos en casa.','Make the sentence negative.','Anoche no cocinamos en casa.'),
 T('Did you finish the book yesterday? Use tú.','¿Terminaste el libro ayer?'),
 T('We visited Ana last week.','Visitamos a Ana la semana pasada.'),
 T('Last night they did not cook.',['Anoche no cocinaron.','Ellos no cocinaron anoche.']),
 T('I bought bread this morning. Use the preterite.',['Compré pan esta mañana.','Esta mañana compré pan.']),
 X('Ayer visité a mi madre.','Change the subject to ustedes.','Ayer ustedes visitaron a mi madre.'),
 X('El domingo caminó al parque.','Change the subject to yo.','El domingo caminé al parque.'),
 T('Yesterday we ate at home.',['Ayer comimos en casa.','Comimos en casa ayer.']),
 T('Ana wrote a letter last night.',['Ana escribió una carta anoche.','Anoche Ana escribió una carta.']),
 T('When did you buy the tickets? Use tú and boletos.','¿Cuándo compraste los boletos?'),
 T('We did not visit the museum on Monday.',['No visitamos el museo el lunes.','El lunes no visitamos el museo.']),
 T('Yesterday I opened the window because it was hot. Use hacía calor for the background.','Ayer abrí la ventana porque hacía calor.'),
 T('First we cooked, and then we ate. Use primero and después.','Primero cocinamos y después comimos.')],
'past-irregulars':[
 C('Ayer tú ___ al banco.','fuiste','ir'),
 C('El sábado Ana ___ una fiesta.','hizo','hacer'),
 C('Anoche nosotros ___ al cine.','fuimos','ir'),
 C('Ellos ___ la tarea ayer.','hicieron','hacer'),
 X('Ayer fui al mercado.','Make the sentence negative.','Ayer no fui al mercado.'),
 X('Ella hizo la cena.','Change the subject to ustedes.','Ustedes hicieron la cena.'),
 T('Where did you go yesterday? Use tú.','¿Adónde fuiste ayer?'),
 T('We did the homework last night.',['Hicimos la tarea anoche.','Anoche hicimos la tarea.']),
 T('Ana did not go to work on Monday.',['Ana no fue al trabajo el lunes.','El lunes Ana no fue al trabajo.']),
 T('What did you do on Saturday? Use tú.','¿Qué hiciste el sábado?'),
 X('Fuimos al parque el domingo.','Change the subject to yo.','Fui al parque el domingo.'),
 X('Hice una sopa.','Change the subject to nosotros.','Hicimos una sopa.'),
 T('They went to Mexico last year.',['Fueron a México el año pasado.','Ellos fueron a México el año pasado.']),
 T('Yesterday I made dinner for my family.','Ayer hice la cena para mi familia.'),
 T('Did you all go to the museum? Use ustedes.','¿Ustedes fueron al museo?'),
 T('We did not do the homework because we did not have time. Use teníamos for the background.','No hicimos la tarea porque no teníamos tiempo.'),
 T('First I went to the market, and then I made dinner. Use primero and después.','Primero fui al mercado y después hice la cena.'),
 T('Who made the coffee this morning? Use the preterite.','¿Quién hizo el café esta mañana?')],
'past-habits':[
 C('De niña, Ana ___ cerca del mar.','vivía','vivir'),
 C('Antes tú ___ al trabajo.','caminabas','caminar'),
 C('De niños nosotros ___ libros cada noche.','leíamos','leer'),
 C('Antes ustedes ___ en casa los viernes.','comían','comer'),
 X('Antes trabajaba en casa.','Change the subject to ellas.','Antes ellas trabajaban en casa.'),
 X('De niño comía carne.','Make the sentence negative.','De niño no comía carne.'),
 T('Where did you use to live? Use tú.','¿Dónde vivías antes?'),
 T('As children, we used to visit our grandparents.',['De niños visitábamos a nuestros abuelos.','De niñas visitábamos a nuestros abuelos.']),
 T('Ana used to read every night.','Ana leía todas las noches.'),
 T('We used to go to school on foot. Use ir and a pie.','Íbamos a la escuela a pie.'),
 X('Antes yo bebía café.','Change the subject to tú.','Antes tú bebías café.'),
 X('Ellos vivían en Puebla.','Change the subject to nosotros.','Nosotros vivíamos en Puebla.'),
 T('What did you use to eat for breakfast? Use tú and desayunar.','¿Qué desayunabas antes?'),
 T('When I was little, I did not like milk. Use de pequeño or de pequeña.',['De pequeño no me gustaba la leche.','De pequeña no me gustaba la leche.']),
 T('My parents used to work on Saturdays.','Mis padres trabajaban los sábados.'),
 T('We always used to eat together.','Siempre comíamos juntos.'),
 T('Did you use to speak Spanish at home? Use tú.','¿Hablabas español en casa?'),
 T('Before, I lived in Mexico and worked in a school.','Antes vivía en México y trabajaba en una escuela.')],
'story-background':[
 C('Yo leía cuando Ana ___ la puerta.','abrió','abrir','preterite'),
 C('Mientras nosotros ___, empezó a llover.','caminábamos','caminar','imperfect'),
 C('Los niños dormían cuando nosotros ___.','llegamos','llegar','preterite'),
 C('Yo ___ cuando sonó el teléfono.','estudiaba','estudiar','imperfect'),
 X('Yo cocinaba cuando llegó Ana.','Change the cooking subject to nosotros; keep Ana.','Nosotros cocinábamos cuando llegó Ana.'),
 X('Ella estudiaba cuando la llamé.','Change only the studying subject to tú and adjust la to te.','Tú estudiabas cuando te llamé.'),
 T('We were eating when the phone rang.','Comíamos cuando sonó el teléfono.'),
 T('It was raining when Ana arrived.','Llovía cuando llegó Ana.'),
 T('While I was reading, the children arrived.','Mientras leía, llegaron los niños.'),
 T('What were you doing when I called you? Use tú and hacer.','¿Qué hacías cuando te llamé?'),
 X('Caminaba al trabajo cuando empezó a llover.','Change the walking subject to nosotros.','Caminábamos al trabajo cuando empezó a llover.'),
 X('Los niños dormían cuando llegamos.','Change los niños to Ana.','Ana dormía cuando llegamos.'),
 T('I opened the window because it was hot.','Abrí la ventana porque hacía calor.'),
 T('When we left, it was raining.','Cuando salimos, llovía.'),
 T('Ana was studying, but Luis went out. Use pero.','Ana estudiaba, pero Luis salió.'),
 T('We were talking when the teacher came in. Use hablar and entrar.','Hablábamos cuando entró el profesor.'),
 T('The restaurant was closed, so we ate at home. Use estaba cerrado and por eso.','El restaurante estaba cerrado; por eso comimos en casa.'),
 T('While you were cooking, I washed the dishes. Use tú, lavar and los platos.','Mientras cocinabas, lavé los platos.')],
'story-experiences':[
 C('Yo nunca ___ comido aquí.','he','haber'),
 C('¿Tú ya ___ leído este libro?','has','haber'),
 C('Ana todavía no ___ llegado.','ha','haber'),
 C('Ustedes nunca ___ visitado Mérida.','han','haber'),
 X('He terminado el trabajo.','Change the subject to nosotros; keep the present perfect.','Hemos terminado el trabajo.'),
 X('Ya hemos comprado los boletos.','Make this not yet, using todavía no.','Todavía no hemos comprado los boletos.'),
 T('Have you ever eaten here? Use tú, alguna vez and the present perfect.','¿Has comido aquí alguna vez?'),
 T('Ana has already opened the window. Use the present perfect.','Ana ya ha abierto la ventana.'),
 T('We have not seen that film yet. Use todavía no and the present perfect.','Todavía no hemos visto esa película.'),
 T('I have never done that. Use the present perfect.','Nunca he hecho eso.'),
 X('Ana ha escrito una carta.','Change the subject to ustedes. Use the present perfect.','Ustedes han escrito una carta.'),
 X('Nunca he vivido en Puebla.','Change the subject to nosotros.','Nunca hemos vivido en Puebla.'),
 T('What have you done so far? Use tú, hasta ahora and the present perfect.','¿Qué has hecho hasta ahora?'),
 T('We have already told Ana the truth. Use decir and the present perfect.','Ya le hemos dicho la verdad a Ana.'),
 T('My parents have never been to Mérida. Use estar and the present perfect.','Mis padres nunca han estado en Mérida.'),
 T('Have you all finished yet? Use ustedes, ya and the present perfect.','¿Ustedes ya han terminado?'),
 T('I have not written the letter yet. Use todavía no and the present perfect.','Todavía no he escrito la carta.'),
 T('We have read three books so far. Use hasta ahora and the present perfect.',['Hasta ahora hemos leído tres libros.','Hemos leído tres libros hasta ahora.'])],
'plans-future':[
 C('Mañana tú ___ a Ana.','llamarás','llamar'),
 C('El lunes Ana ___ el informe.','terminará','terminar'),
 C('El próximo año ustedes ___ a México.','viajarán','viajar'),
 C('Nosotros ___ el trabajo mañana.','haremos','hacer'),
 X('Mañana compraré pan.','Change the subject to nosotros. Use the simple future.','Mañana compraremos pan.'),
 X('Te llamaré esta noche.','Make the sentence negative.','No te llamaré esta noche.'),
 T('Will you work tomorrow? Use tú and the simple future.','¿Trabajarás mañana?'),
 T('We will visit Ana next week. Use the simple future.','Visitaremos a Ana la próxima semana.'),
 T('I will have time on Sunday. Use the simple future.','Tendré tiempo el domingo.'),
 T('They will not come tomorrow. Use the simple future.','No vendrán mañana.'),
 X('Ana escribirá una carta.','Change the subject to ustedes.','Ustedes escribirán una carta.'),
 X('Haremos la cena mañana.','Change the subject to yo.','Haré la cena mañana.'),
 T('When will you leave? Use tú, salir and the simple future.','¿Cuándo saldrás?'),
 T('We will be able to pay tomorrow. Use poder and the simple future.','Podremos pagar mañana.'),
 T('I will tell you the truth tonight. Use tú, decir and the simple future.','Te diré la verdad esta noche.'),
 T('Will you all have time on Monday? Use ustedes and the simple future.','¿Ustedes tendrán tiempo el lunes?'),
 T('If I have time, I will cook tonight. Use the simple future only in the result.','Si tengo tiempo, cocinaré esta noche.'),
 T('First we will eat, and then we will go out. Use primero, después and the simple future.','Primero comeremos y después saldremos.')]
}

def add(q,rows,tense):
 pattern=next(p for p in d['patterns'] if p['id']==q['patternId'])
 unit=next(u for u in d['units'] if q['id'] in u['questIds'])
 q['introIds']=list(q['cardIds'])
 q['challengeIds']=[]
 for i,(typ,prompt,answer,instruction,verb,override) in enumerate(rows,1):
  answers=[answer] if isinstance(answer,str) else answer
  sample=prompt.replace('___',answers[0]) if typ=='cloze' else answers[0]
  partial=answers[0][:2]+'…' if typ=='cloze' else answers[0].split()[0]+'…'
  c=dict(id='quest-'+q['id']+'-depth-'+str(i),type=typ,tense=override or tense,prompt=prompt,answers=answers,sample=sample,instruction=instruction,
   hints=['Identify the subject, time cue and intended meaning before choosing a form.',pattern['rule'],'A small start: '+partial],hint=pattern['rule'],explanation=pattern['rule'],
   unitId=unit['id'],questId=q['id'],familyId=q['id'],patternId=q['patternId'],level=unit['level'],theme=unit['id'],variant='es-MX',learningStage='build',depthBank=True)
  if typ=='cloze':c['answerLabel']='Missing word or expression'
  if verb:c['verb']=verb
  if q['id']==new_id:c['chooseTense']=True
  if typ!='cloze':
   for subject in ['yo','tú','ella','nosotros','ellos','ustedes']:
    if answers[0].lower().startswith(subject+' '):c['subject']=subject;break
  if typ=='translate' and not c.get('subject'):
   subject='yo' if prompt.startswith(('I ','Yesterday I ','Before, I ')) else 'nosotros' if prompt.startswith(('We ','Yesterday we ','Last night we ')) else 'ellos' if prompt.startswith('They ') else None
   if subject and not any(answers[0].startswith(prefix) for prefix in ['Ana ','Mi ','Mis ','Los ','El ','La ','First']):
    c['subject']=subject
    for a in list(answers):
     if not a.startswith('¿'):answers.append(subject.capitalize()+' '+a[0].lower()+a[1:])
  d['cards'].append(c);q['cardIds'].append(c['id'])
  if i>len(rows)-6 and typ!='cloze':q['challengeIds'].append(c['id'])
 q['bankIds']=[c['id'] for c in d['cards'] if c['questId']==q['id'] and c['type']!='create']

for id,rows in banks.items():
 q=next(q for q in d['quests'] if q['id']==id)
 tense=next(c['tense'] for c in d['cards'] if c['questId']==id)
 add(q,rows,tense)

# One dedicated contrast quest with explicit meanings, not adverb-only rules.
unit=next(u for u in d['units'] if u['id']=='past-stories')
pid=new_id+'-pattern'
rule='Choose the imperfect for a habit, ongoing background or description in these contexts. Choose the preterite for the event presented as bounded or complete. A time expression alone does not determine the tense: compare antes caminaba with ayer caminé.'
d['patterns'].append(dict(id=pid,label='habit / background versus completed event',rule=rule,example='Cocinaba cuando sonó el teléfono.',meaning='I was cooking when the phone rang.'))
q=dict(id=new_id,title='Choose preterite or imperfect',goal='Choose from the meaning, without being told the tense.',patternId=pid,prerequisites=['story-background'],cardIds=[],requiredIds=[],checkpointIds=[],levelBand='B1')
d['quests'].append(q);unit['questIds'].insert(1,new_id)
rows=[
 C('Cuando era niño, ___ al parque todos los domingos.','caminaba','caminar','imperfect'),
 C('Ayer ___ al parque una sola vez.','caminé','caminar','preterite'),
 T('As a child, I used to eat with my grandparents. Use de niño or de niña.',['De niño comía con mis abuelos.','De niña comía con mis abuelos.'],'imperfect'),
 X('Todos los domingos cocinaba en casa.','Replace the habit with one completed event yesterday. Begin Ayer.','Ayer cociné en casa.','preterite'),
 T('Last night we ate at eight. Present it as a completed event.','Anoche comimos a las ocho.','preterite'),
 T('We used to eat at eight every day. Use todos los días.',['Comíamos a las ocho todos los días.','Todos los días comíamos a las ocho.'],'imperfect'),
 C('Antes, Ana ___ en Puebla. Era su hogar habitual.','vivía','vivir','imperfect'),
 C('Ana ___ en Puebla de 2010 a 2012. Presenta el periodo como completo.','vivió','vivir','preterite'),
 C('Mientras yo ___, sonó el teléfono.','estudiaba','estudiar','imperfect'),
 C('Yo estudiaba cuando ___ el teléfono.','sonó','sonar','preterite'),
 T('It was cold when we left. Use hacer for the weather.','Hacía frío cuando salimos.','imperfect'),
 T('Yesterday I bought bread. Present it as a completed purchase.','Ayer compré pan.','preterite'),
 X('Ayer visité a mi abuela.','Make it a former weekly habit. Begin Antes and include cada semana.','Antes visitaba a mi abuela cada semana.','imperfect'),
 X('Antes trabajaba los sábados.','Make it one completed event last Saturday. Begin El sábado pasado.','El sábado pasado trabajé.','preterite'),
 T('When I was little, I lived near the sea. Use de pequeño or de pequeña.',['De pequeño vivía cerca del mar.','De pequeña vivía cerca del mar.'],'imperfect'),
 T('On Monday we opened the shop at nine. Present it as a completed action.','El lunes abrimos la tienda a las nueve.','preterite'),
 T('We used to open the shop at nine every day. Use todos los días.',['Abríamos la tienda a las nueve todos los días.','Todos los días abríamos la tienda a las nueve.'],'imperfect'),
 T('Ana was reading when Luis arrived. Use leer.','Ana leía cuando llegó Luis.','imperfect'),
 T('Yesterday I worked from nine to five. Present the work period as complete.','Ayer trabajé de nueve a cinco.','preterite'),
 T('At that time, I worked in a school. Describe my usual situation. Use en esa época.','En esa época trabajaba en una escuela.','imperfect'),
 T('We were cooking when Ana called us. Use cocinar and llamar.','Cocinábamos cuando Ana nos llamó.','imperfect'),
 T('First I opened the window, and then I sat down. Use primero, después and sentarse.','Primero abrí la ventana y después me senté.','preterite'),
 T('Why did you open the window? Ask about the completed action, using tú.','¿Por qué abriste la ventana?','preterite'),
 T('I opened the window because it was hot. Use hacer for the weather.','Abrí la ventana porque hacía calor.','preterite')]
add(q,rows,'preterite')
# Use the first six as an introduction; the last six are held out from normal rounds.
q['requiredIds']=q['cardIds'][:6]
q['checkpointIds']=q['cardIds'][4:6]
for c in d['cards']:
 if c['id'] in q['checkpointIds']:c['learningStage']='checkpoint'
personal=dict(id='quest-'+new_id+'-personal',type='create',tense='imperfect',prompt='Tell a short story in two or three sentences: describe a past habit or background, then a completed event. Say it aloud if useful.',answers=[],sample='Antes caminaba al trabajo. Un día empezó a llover y tomé el autobús.',instruction='Write or say your own short story. Compare the tenses with the model, then self-review.',hints=['Set the scene first. What used to happen?','Use the imperfect for the habit or background; the preterite for the completed event.','Start with Antes… or Cuando era niño/niña…'],hint=rule,explanation=rule,unitId=unit['id'],questId=q['id'],familyId=q['id'],patternId=pid,level='B1',theme=unit['id'],variant='es-MX',learningStage='personal')
d['cards'].append(personal);q['cardIds'].append(personal['id']);q['introIds']=q['cardIds'][:6]+[personal['id']]
d['version']='1.2.0'
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(f"Deepened {len(banks)+1} quests: {len(d['quests'])} quests, {len(d['cards'])} exercises total.")
