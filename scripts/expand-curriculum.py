"""Author the A1-to-early-C1 quest path. Existing pilot exercise IDs stay stable."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'dist/data/curriculum.json'
data=json.loads(path.read_text())
pilot=['dinner-wants','dinner-needs','dinner-plans-next']
data['quests']=[q for q in data['quests'] if q['id'] in pilot]
data['cards']=[c for c in data['cards'] if c['questId'] in pilot]
data['patterns']=[p for p in data['patterns'] if p['id'] in ['want-infinitive','need-infinitive','plan-infinitive']]
data['units']=[u for u in data['units'] if u['id']=='dinner-plans']
data['units'][0].update(level='A1',levelBand='A1',curriculumFocus='Express wants, needs and simple intentions in familiar situations.')
data['verbs']=[v for v in data.get('verbs',[]) if v['infinitive'] in ['querer','necesitar']]
data.update(version='1.1.0',title='Everyday Spanish to nuanced expression',levelNote='A1 through B2 and an introduction to C1-oriented sentence skills. This is a selected practice path, not a complete CEFR syllabus, exam preparation course or proficiency certification.')
data['sources']=[
 {'id':'pcic-a','label':'Cervantes: A1–A2 inventories','url':'https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/indice.htm'},
 {'id':'pcic-b','label':'Cervantes: B1–B2 grammar inventory','url':'https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/02_gramatica_inventario_b1-b2.htm'},
 {'id':'cervantes-b1','label':'Cervantes: B1 communicative and grammar progression','url':'https://shanghai.cervantes.es/es/cursos_espanol/nivel_B1.htm'},
 {'id':'pcic-c','label':'Cervantes: C1–C2 communicative functions','url':'https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/05_funciones_inventario_c1-c2.htm'},
 {'id':'cefr','label':'Council of Europe: CEFR descriptors','url':'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors'}]
data['units'][0]['sourceIds']=['pcic-a','cefr']

def tense(id,label,spanish,rule,example,endings):
 return dict(id=id,label=label,spanish=spanish,rule=rule,description=rule,example=example,endings=endings,questOnly=True)
data['tenses']=[
 tense('conditional','Conditional','Condicional simple','Add -ía, -ías, -ía, -íamos, -ían to the infinitive. Irregular future stems also occur in the conditional: tendría, podría, haría.','Me gustaría reservar una mesa.',{'-ar / -er / -ir':['-ía','-ías','-ía','-íamos','-ían']}),
 tense('pluperfect','Past perfect','Pretérito pluscuamperfecto de indicativo','Use imperfect haber + a past participle for an event before another past event. The participle does not agree with the subject.','Cuando llegué, ya habían salido.',{'haber + participle':['había + participio','habías + participio','había + participio','habíamos + participio','habían + participio']}),
 tense('present-subjunctive','Present subjunctive','Presente de subjuntivo','Use the subjunctive in these selected wishes, evaluations, purposes, unknown referents and future-time clauses. The trigger and meaning matter. Regular -ar verbs use e endings; -er/-ir use a endings.','Espero que llegues temprano.',{'-ar':['e','es','e','emos','en'],'-er / -ir':['a','as','a','amos','an']}),
 tense('imperfect-subjunctive','Imperfect subjunctive','Pretérito imperfecto de subjuntivo','Start from the preterite ellos form, remove -ron, then add -ra, -ras, -ra, -ramos, -ran with the appropriate nosotros accent. The -se series is also valid. Used here in hypothetical conditions and reported past requests.','Si tuviera tiempo, viajaría más.',{'-ar':['ara','aras','ara','áramos','aran'],'-er / -ir':['iera','ieras','iera','iéramos','ieran']}),
 tense('pluperfect-subjunctive','Past perfect subjunctive','Pluscuamperfecto de subjuntivo','Use hubiera (or hubiese) + participle for the unreal past condition in this path. A past counterfactual result often uses habría + participle.','Si hubiera estudiado, habría aprobado.',{'haber + participle':['hubiera + participio','hubieras + participio','hubiera + participio','hubiéramos + participio','hubieran + participio']}),
 tense('conditional-perfect','Conditional perfect','Condicional compuesto','Use habría, habrías, habría, habríamos, habrían + participle for an unreal past result in these exercises.','Habría llamado, pero no tenía tu número.',{'haber + participle':['habría + participio','habrías + participio','habría + participio','habríamos + participio','habrían + participio']}),
 tense('future-perfect','Future perfect','Futuro compuesto','Use future haber + participle. This can express completion before a future point or a conjecture about an already completed event; read the context.','Para mañana habremos terminado.',{'haber + participle':['habré + participio','habrás + participio','habrá + participio','habremos + participio','habrán + participio']})]
unit=None

def U(id,title,level,goal,focus):
 global unit
 previous=data['units'][-1]['id']
 unit=dict(id=id,title=title,level=level,levelBand=level,goal=goal,curriculumFocus=focus,variant='Mexican / Latin American Spanish',prerequisites=[previous],questIds=[],sourceIds=['pcic-a','cefr'] if level in ['A1','A2'] else ['pcic-b','cervantes-b1','cefr'] if level in ['B1','B2'] else ['pcic-c','cefr'])
 data['units'].append(unit)

def variants(answer):
 answers=[answer] if isinstance(answer,str) else list(answer)
 for a in list(answers):
  b=a
  for x,y in [('tuviéramos','tuviésemos'),('habláramos','hablásemos'),('ayudaras','ayudases'),('tuviera','tuviese'),('pudiera','pudiese'),('viniera','viniese'),('fuera','fuese'),('hiciera','hiciese'),('hubiera','hubiese'),('hubiéramos','hubiésemos')]:b=b.replace(x,y)
  if b!=a:answers.append(b)
 return list(dict.fromkeys(answers))

def Q(id,title,goal,pattern,rule,forms,translation,transformation,checks,personal,tense='present',verb=None):
 pid=id+'-pattern'
 data['patterns'].append(dict(id=pid,label=pattern,rule=rule,example=translation[1] if isinstance(translation[1],str) else translation[1][0],meaning=translation[0]))
 q=dict(id=id,title=title,goal=goal,patternId=pid,prerequisites=unit['questIds'][-1:] if unit['questIds'] else [],cardIds=[],requiredIds=[],checkpointIds=[])
 data['quests'].append(q);unit['questIds'].append(id)
 def card(suffix,typ,prompt,answers,stage,instruction=None):
  ans=variants(answers) if answers else []
  sample=ans[0] if ans else personal[1]
  if typ=='cloze':sample=prompt.replace('___',ans[0])
  partial=(ans[0][:2]+'…') if typ=='cloze' else (' '.join(ans[0].split()[:2])+'…') if ans else 'Choose a subject, then apply the pattern.'
  c=dict(id='quest-'+id+'-'+suffix,type=typ,tense=tense,prompt=prompt,answers=ans,sample=sample,instruction=instruction or ('Complete the sentence. Enter only the missing word or expression.' if typ=='cloze' else 'Use the target pattern to express this meaning. The model is one possible wording.'),hints=['Focus on '+pattern+'. Identify the person and the relationship between the ideas.',rule,'A small start: '+partial],hint='Focus on '+pattern+'.',explanation=rule,unitId=unit['id'],questId=id,familyId=id,patternId=pid,level=unit['level'],theme=unit['id'],variant='es-MX',learningStage=stage)
  if verb:c['verb']=verb
  if typ=='cloze':c['answerLabel']='Missing word or expression'
  if typ!='cloze' and ans:
   for subject in ['yo','tú','ella','nosotros','ellos']:
    if ans[0].lower().startswith(subject+' '):c['subject']=subject;break
  data['cards'].append(c);q['cardIds'].append(c['id'])
  if typ!='create':q['requiredIds'].append(c['id'])
  if stage=='checkpoint':q['checkpointIds'].append(c['id'])
 for i,(prompt,answer) in enumerate(forms):card('form-'+str(i+1),'cloze',prompt,answer,'form')
 card('sentence','translate',translation[0],translation[1],'build')
 source,instruction,target=transformation;card('change','transform',source,target,'build',instruction)
 for i,(en,es) in enumerate(checks):card('checkpoint-'+str(i+1),'translate',en,es,'checkpoint')
 card('personal','create',personal[0],[],'personal','Make a sentence of your own. Compare with the model and self-review; this task is optional.')

U('daily-life','Describe your day','A1','Talk about routines, obligations and preferences.','Familiar daily activities; basic verb agreement and common sentence patterns.')
Q('daily-obligations','Explain what you have to do','State a simple obligation.','tener que + infinitive','Conjugate tener, keep que, and leave the activity in the infinitive: tengo que trabajar, tenemos que salir.',
 [('Yo ___ que trabajar hoy.','tengo'),('Nosotros ___ que salir temprano.','tenemos')],
 ('I have to study today.','Tengo que estudiar hoy.'),('Tengo que cocinar.','Change the subject to nosotros.','Tenemos que cocinar.'),
 [('We have to leave at eight.','Tenemos que salir a las ocho.'),('I do not have to work tomorrow.',['No tengo que trabajar mañana.','Mañana no tengo que trabajar.'])],
 ('What do you have to do tomorrow? Use tener que + an infinitive.','Mañana tengo que trabajar.'),verb='tener')
Q('daily-reflexives','Describe your morning','Use a reflexive verb for a daily routine.','levantarse: me / te / se / nos / se','Use the reflexive pronoun that matches the subject before the conjugated verb: me levanto, te levantas, se levanta, nos levantamos, se levantan.',
 [('Yo ___ levanto a las siete.','me'),('Nosotros nos ___ temprano.','levantamos')],
 ('I get up at seven.','Me levanto a las siete.'),('Me levanto temprano.','Change the subject to ella.','Ella se levanta temprano.'),
 [('We get up early on Mondays.',['Nos levantamos temprano los lunes.','Los lunes nos levantamos temprano.']),('She gets up at eight.','Ella se levanta a las ocho.')],
 ('Describe when you get up. Use levantarse.','Me levanto a las seis.'),verb='levantarse')
Q('daily-likes','Say what you like','Match gusta or gustan to the thing liked.','me gusta / me gustan','In this pattern the thing liked controls the verb: me gusta el café, me gustan los tacos. An infinitive takes singular gusta: me gusta cocinar.',
 [('Me ___ el café.','gusta'),('Me ___ los tacos.','gustan')],
 ('I like cooking.','Me gusta cocinar.'),('Me gusta el taco.','Make el taco plural and adjust the verb.','Me gustan los tacos.'),
 [('We like rice.','Nos gusta el arroz.'),('I do not like coffee.','No me gusta el café.')],
 ('Describe something you like and something you do not like.','Me gusta el arroz, pero no me gusta el café.'),verb='gustar')

U('around-town','Get things done in town','A2','Ask for help, refer to objects and locate places.','Everyday transactions, permission, pronoun reference and place descriptions.')
Q('town-permission','Ask for permission','Use poder for simple permission.','poder + infinitive','Conjugate poder and keep the next verb in the infinitive: puedo, puedes, puede, podemos, pueden.',
 [('¿Yo ___ entrar?','puedo'),('¿Nosotros ___ pagar aquí?','podemos')],
 ('Can I pay by card?','¿Puedo pagar con tarjeta?'),('¿Puedo entrar?','Change the question to nosotros.','¿Podemos entrar?'),
 [('Can we sit here?','¿Podemos sentarnos aquí?'),('Can you help me? Use tú.',['¿Puedes ayudarme?','¿Me puedes ayudar?'])],
 ('Ask permission to do something in a shop or restaurant.','¿Puedo pagar aquí?'),verb='poder')
Q('town-objects','Refer to something already mentioned','Replace a known object with lo or la.','lo / la before a conjugated verb','Lo replaces a masculine singular direct object; la replaces a feminine singular one. In these simple sentences place it before the conjugated verb.',
 [('El pan: ___ compro hoy.','lo'),('La leche: ___ compro mañana.','la')],
 ('I buy it today. It refers to el pan.','Lo compro hoy.'),('Compro la leche.','Replace la leche with a direct-object pronoun.','La compro.'),
 [('I need it. It refers to el boleto.','Lo necesito.'),('I do not buy it. It refers to la camisa.','No la compro.')],
 ('Name an object, then refer to it with lo or la in a second sentence.','Necesito el boleto. Lo compro hoy.'),verb='comprar')
Q('town-locations','Find a place','Distinguish existence from location.','hay / estar','Use hay to introduce the existence of something. Use estar to locate an identified person or thing: hay una farmacia; la farmacia está cerca.',
 [('___ una farmacia cerca.','Hay'),('La farmacia ___ al lado del banco.','está')],
 ('There is a bank near here.','Hay un banco cerca de aquí.'),('Hay una farmacia cerca.','Locate that identified pharmacy instead: The pharmacy is near here.','La farmacia está cerca de aquí.'),
 [('The bank is next to the station.','El banco está al lado de la estación.'),('There are two restaurants here.','Hay dos restaurantes aquí.')],
 ('Introduce a place near your home, then say where it is.','Hay una tienda. La tienda está cerca de mi casa.'),verb='estar')

U('past-basics','Tell someone about your weekend','A2','Describe completed events and repeated past activities.','Preterite events, common irregular past forms and imperfect habits.')
Q('past-completed','Tell a completed event','Use regular preterite forms with a finished time cue.','preterite + ayer','Use the preterite for these completed events. Regular -ar yo uses -é; nosotros uses -amos. The written accent distinguishes cociné from cocine.',
 [('Ayer yo ___ arroz.','cociné'),('Ayer nosotros ___ a mi hermana.','visitamos')],
 ('Yesterday I cooked rice.','Ayer cociné arroz.'),('Ayer cociné arroz.','Change the subject to nosotros.','Ayer cocinamos arroz.'),
 [('Yesterday I visited my sister.','Ayer visité a mi hermana.'),('We cooked at home yesterday.',['Cocinamos en casa ayer.','Ayer cocinamos en casa.'])],
 ('Describe one completed event from yesterday.','Ayer cociné para mi familia.'),tense='preterite',verb='cocinar')
Q('past-irregulars','Use everyday irregular past forms','Say where you went and what you did.','fui / hice','Ir has preterite forms fui, fuiste, fue, fuimos, fueron. Hacer uses hice, hiciste, hizo, hicimos, hicieron. Context distinguishes fui as went or was.',
 [('Ayer yo ___ al mercado.','fui'),('Ayer yo ___ la cena.','hice')],
 ('Yesterday I went to the market.','Ayer fui al mercado.'),('Ayer fui al mercado.','Change the subject to nosotros.','Ayer fuimos al mercado.'),
 [('Yesterday we made dinner.','Ayer hicimos la cena.'),('She went to the park.','Ella fue al parque.')],
 ('Say where you went and what you did there.','Fui al mercado y compré verduras.'),tense='preterite',verb='ir')
Q('past-habits','Describe an old routine','Use imperfect forms for repeated past habits.','imperfect + antes','In these sentences the imperfect presents a habitual past situation: trabajaba, comía, vivía. Regular -ar uses -aba; -er and -ir use -ía.',
 [('Antes yo ___ en casa.','trabajaba'),('De niño yo ___ arroz todos los días.','comía')],
 ('I used to work at home.','Antes trabajaba en casa.'),('Antes trabajaba en casa.','Change the subject to nosotros.','Antes trabajábamos en casa.'),
 [('As a child I used to live in Mexico.',['De niño vivía en México.','De niña vivía en México.']),('We used to eat at eight.','Antes comíamos a las ocho.')],
 ('Describe a regular habit from your childhood.','De niño caminaba a la escuela.'),tense='imperfect',verb='trabajar')

U('past-stories','Build a past story','B1','Combine background, events and earlier experiences.','Contrasts between past tenses and links between events.')
Q('story-background','Set the scene and add an event','Combine imperfect background with a preterite event.','imperfect background + preterite event','The imperfect supplies the ongoing background; the preterite presents the bounded event: cocinaba cuando sonó el teléfono. The choice follows how the speaker presents the situation.',
 [('Yo cocinaba cuando ___ el teléfono.','sonó'),('Mientras yo ___, llegó Ana.','cocinaba')],
 ('I was cooking when the phone rang.','Cocinaba cuando sonó el teléfono.'),('Cocinaba cuando sonó el teléfono.','Change the cooking subject to nosotros. Keep the phone event.','Cocinábamos cuando sonó el teléfono.'),
 [('While I was studying, Ana arrived.','Mientras estudiaba, llegó Ana.'),('It was raining when we left.','Llovía cuando salimos.')],
 ('Describe a background activity and an event that happened during it.','Leía cuando llegó mi hermana.'),tense='imperfect')
Q('story-earlier','Explain what had already happened','Place one event before another past event.','había + past participle','The past perfect uses imperfect haber + a participle. The participle stays unchanged: había comido, habíamos comido. Use it here for an event already complete before another past event.',
 [('Cuando llegué, Ana ya ___ salido.','había'),('Cuando llamaste, nosotros ya ___ comido.','habíamos')],
 ('When I arrived, Ana had already left.','Cuando llegué, Ana ya había salido.'),('Yo ya había comido.','Change the subject to nosotros.','Nosotros ya habíamos comido.'),
 [('When you called, I had already finished.','Cuando llamaste, ya había terminado.'),('We had already bought the tickets.','Ya habíamos comprado los boletos.')],
 ('Say what you had already done before another event.','Ya había cenado cuando llamó Ana.'),tense='pluperfect')
Q('story-experiences','Connect experience to the present','Use present perfect for experience up to now.','haber + past participle','The present perfect uses present haber + a participle: he visitado, hemos visto. These tasks target experience up to now. Mexico often uses the preterite in contexts where Spain uses the perfect; both choices depend on context and region.',
 [('Hasta ahora no ___ visitado Puebla.','he'),('Nosotros nunca ___ visto esa película.','hemos')],
 ('I have never visited Puebla. Use the present perfect.','Nunca he visitado Puebla.'),('Nunca he visto esa película.','Change the subject to nosotros.','Nunca hemos visto esa película.'),
 [('We have already finished. Use the present perfect.','Ya hemos terminado.'),('I have not read that book yet. Use the present perfect.',['Todavía no he leído ese libro.','No he leído ese libro todavía.','Aún no he leído ese libro.'])],
 ('Describe an experience you have or have not had, using the present perfect.','Nunca he visitado Mérida.'),tense='perfect')

U('plans-advice','Discuss plans and give advice','B1','Make predictions, soften requests and express a real condition.','Future, conditional politeness and possible future situations.')
Q('plans-future','Make a future commitment','Use the simple future to say what will happen.','simple future','Add the future ending to the infinitive: llamaré, llamaremos. Some verbs have irregular stems, such as haré and tendré.',
 [('Mañana yo te ___.','llamaré'),('El lunes nosotros ___ el informe.','terminaremos')],
 ('I will call you tomorrow.','Te llamaré mañana.'),('Terminaré el informe mañana.','Change the subject to nosotros.','Terminaremos el informe mañana.'),
 [('We will travel in December.','Viajaremos en diciembre.'),('I will do it tomorrow.','Lo haré mañana.')],
 ('Make a small promise using the simple future.','Te llamaré mañana.'),tense='future')
Q('plans-polite','Soften a request or suggestion','Use conditional forms to sound less direct.','podría / debería / me gustaría','The conditional can soften requests and advice: ¿podrías ayudarme?, deberías descansar. Poder has the irregular stem podr-; gustar and deber use the infinitive plus conditional endings.',
 [('¿Tú ___ ayudarme?','podrías'),('Me ___ reservar una mesa.','gustaría')],
 ('Could you help me? Use tú and the conditional.',['¿Podrías ayudarme?','¿Me podrías ayudar?']),('¿Podrías ayudarme?','Change the address from tú to usted.','¿Podría ayudarme?'),
 [('I would like to reserve a table. Use me gustaría.','Me gustaría reservar una mesa.'),('You should rest. Use tú and the conditional of deber.','Deberías descansar.')],
 ('Make a polite request using the conditional.','¿Podría pagar con tarjeta?'),tense='conditional')
Q('plans-real-condition','Make a realistic if-plan','Connect a possible condition to a future result.','si + present, future','For these realistic future conditions, use present indicative after si and future in the result: si tengo tiempo, iré. Do not use the simple future directly after this conditional si.',
 [('Si tengo tiempo, te ___.','llamaré'),('Si ___, nos quedaremos en casa.','llueve')],
 ('If I have time, I will call you.','Si tengo tiempo, te llamaré.'),('Si tengo tiempo, iré al parque.','Change both clauses to nosotros.','Si tenemos tiempo, iremos al parque.'),
 [('If it rains, we will stay at home.','Si llueve, nos quedaremos en casa.'),('If you arrive early, we will eat together.','Si llegas temprano, comeremos juntos.')],
 ('Describe a realistic condition and what you will do.','Si hace buen tiempo, caminaré al parque.'),tense='future')

U('wishes-recommendations','Express wishes and recommendations','B1','Express a wish, evaluate an action and refer to a future event.','Selected present-subjunctive triggers in everyday communication.')
Q('wish-new-subject','Say what you want someone to do','Use que and subjunctive when the subject changes.','querer que + subjunctive','Use quiero + infinitive for your own action, but quiero que + a conjugated subjunctive for a different person: quiero que vengas. Venir has venga, vengas, venga, vengamos, vengan.',
 [('Quiero que tú ___ temprano.','vengas'),('Queremos que Ana ___ con nosotros.','coma')],
 ('I want you to come early. Use tú.','Quiero que vengas temprano.'),('Quiero que vengas temprano.','Change the subordinate subject from tú to ella.','Quiero que ella venga temprano.'),
 [('We want Ana to eat with us.','Queremos que Ana coma con nosotros.'),('I hope you have time. Use tú and espero que.','Espero que tengas tiempo.')],
 ('Express a wish about another person using que and the subjunctive.','Espero que mi hermana venga mañana.'),tense='present-subjunctive')
Q('wish-evaluate','Explain what is important','Evaluate an action with an impersonal expression.','es importante que + subjunctive','In these evaluations, es importante que and es mejor que take the subjunctive. Keep que before the clause: es importante que descanses.',
 [('Es importante que tú ___.','descanses'),('Es mejor que nosotros ___ temprano.','salgamos')],
 ('It is important that you rest. Use tú.','Es importante que descanses.'),('Es importante que descanses.','Change the subordinate subject to nosotros.','Es importante que descansemos.'),
 [('It is better that we leave early.','Es mejor que salgamos temprano.'),('It is important that she knows the truth.','Es importante que ella sepa la verdad.')],
 ('Say what is important for someone to do.','Es importante que lleguemos a tiempo.'),tense='present-subjunctive')
Q('wish-future-time','Talk about a future event','Use the subjunctive after cuando for an event still pending.','cuando + future-reference subjunctive','Cuando takes present subjunctive when the event is still pending: te llamaré cuando llegue. For a habitual fact, it can take indicative. The main clause may be future.',
 [('Te llamaré cuando ___ a casa.','llegue'),('Comeremos cuando Ana ___.','venga')],
 ('I will call you when I get home.','Te llamaré cuando llegue a casa.'),('Te llamaré cuando llegue a casa.','Change the person arriving from yo to nosotros; keep I will call you.','Te llamaré cuando lleguemos a casa.'),
 [('We will eat when Ana comes.','Comeremos cuando Ana venga.'),('I will leave when you finish. Use tú.','Saldré cuando termines.')],
 ('Describe what you will do when a future event happens.','Descansaré cuando termine el trabajo.'),tense='present-subjunctive')

U('opinions-purpose','Express doubt, purpose and what you seek','B2','Choose a mood to express your stance or an unrealised aim.','Mood contrasts in opinion, relative and purpose clauses; extending B1 foundations.')
Q('opinion-doubt','Distinguish assertion from doubt','Choose indicative or subjunctive after an opinion expression.','creo que / no creo que','An affirmative creo que normally asserts an opinion with indicative. These negative no creo que clauses use subjunctive: creo que tiene razón; no creo que tenga razón.',
 [('Creo que Ana ___ razón.','tiene'),('No creo que Ana ___ razón.','tenga')],
 ('I do not think Ana is right.','No creo que Ana tenga razón.'),('Creo que Ana tiene tiempo.','Negate the belief and adjust the subordinate mood.','No creo que Ana tenga tiempo.'),
 [('I doubt that they can come. Use dudo que.','Dudo que puedan venir.'),('I think the plan works. Use creo que and indicative.','Creo que el plan funciona.')],
 ('State one belief and one doubt, choosing the mood deliberately.','Creo que el plan funciona, pero no creo que sea fácil.'),tense='present-subjunctive')
Q('opinion-unknown-relative','Describe something you are looking for','Use subjunctive for a desired, unidentified referent.','busco algo que + subjunctive','A relative clause about a desired but unidentified thing can use subjunctive: busco un hotel que tenga piscina. Indicative presents an identified or asserted example: conozco un hotel que tiene piscina.',
 [('Busco un hotel que ___ piscina.','tenga'),('Conozco un hotel que ___ piscina.','tiene')],
 ('I am looking for a hotel that has a pool. No specific hotel is identified.','Busco un hotel que tenga piscina.'),('Conozco a alguien que habla francés.','Say that you are looking for such a person and have nobody specific in mind.','Busco a alguien que hable francés.'),
 [('We need a person who knows Spanish. Nobody specific is identified.','Necesitamos a alguien que sepa español.'),('I know a restaurant that serves good food. Assert a known place.','Conozco un restaurante que sirve buena comida.')],
 ('Describe a place or person you seek without identifying one.','Busco un lugar donde pueda estudiar.'),tense='present-subjunctive')
Q('opinion-purpose','Explain why you are doing something','Use an infinitive or a subjunctive purpose clause.','para + infinitive / para que + subjunctive','Use para + infinitive when the subject of purpose stays the same. Use para que + subjunctive when another subject performs the intended action: te llamo para que sepas.',
 [('Estudio para ___ más.','aprender'),('Te lo explico para que lo ___.','entiendas')],
 ('I am explaining it to you so that you understand it.','Te lo explico para que lo entiendas.'),('Te llamo para que sepas la verdad.','Change the person knowing the truth from tú to ustedes.',['Los llamo para que sepan la verdad.','Las llamo para que sepan la verdad.']),
 [('I study in order to learn more.','Estudio para aprender más.'),('We speak slowly so that she understands us.','Hablamos despacio para que ella nos entienda.')],
 ('Explain an action and its purpose with para que.','Te escribo para que tengas la información.'),tense='present-subjunctive')

U('hypothetical-worlds','Imagine alternatives and regrets','B2','Express hypothetical situations and unreal past alternatives.','Imperfect and past-perfect subjunctive with conditional results.')
Q('hypothesis-present','Imagine a different present','Combine an unreal condition with a conditional result.','si + imperfect subjunctive, conditional','Use imperfect subjunctive in the hypothetical si clause and conditional in its result: si tuviera tiempo, viajaría. The -se subjunctive series is also accepted.',
 [('Si ___ tiempo, viajaría más.','tuviera'),('Si pudiera, te ___.','ayudaría')],
 ('If I had time, I would travel more.','Si tuviera tiempo, viajaría más.'),('Si tuviera tiempo, viajaría más.','Change both clauses to nosotros.','Si tuviéramos tiempo, viajaríamos más.'),
 [('If I could, I would help you.','Si pudiera, te ayudaría.'),('If I were you, I would rest. Use si yo fuera tú.','Si yo fuera tú, descansaría.')],
 ('Imagine one change in your circumstances and its consequence.','Si tuviera más tiempo, leería más.'),tense='imperfect-subjunctive')
Q('hypothesis-past-request','Report an earlier request','Report a request using a past main verb.','me pidió que + imperfect subjunctive','After the past request me pidió que, use imperfect subjunctive for the requested action: me pidió que viniera. This reports a request, not an assertion that it happened.',
 [('Ana me pidió que ___ temprano.','viniera'),('Nos pidieron que ___ más despacio.','habláramos')],
 ('Ana asked me to come early.','Ana me pidió que viniera temprano.'),('Ana me pide que venga temprano.','Move the request into the past: Ana asked me to come early.','Ana me pidió que viniera temprano.'),
 [('They asked us to speak more slowly.','Nos pidieron que habláramos más despacio.'),('I wanted you to help me. Use tú.','Quería que me ayudaras.')],
 ('Report a request or wish from a past situation.','Mi profesor me pidió que estudiara más.'),tense='imperfect-subjunctive')
Q('hypothesis-past-regret','Consider an unreal past','Connect a past counterfactual condition and result.','si + hubiera, habría + participle','Use si + hubiera/hubiese + participle for an unreal past condition. These tasks use habría + participle for the result. The participles do not agree with the subject.',
 [('Si ___ estudiado, habría aprobado.','hubiera'),('Si hubiéramos salido antes, ___ llegado a tiempo.','habríamos')],
 ('If I had studied, I would have passed.','Si hubiera estudiado, habría aprobado.'),('Si hubiera estudiado, habría aprobado.','Change both clauses to nosotros.','Si hubiéramos estudiado, habríamos aprobado.'),
 [('If we had left earlier, we would have arrived on time.','Si hubiéramos salido antes, habríamos llegado a tiempo.'),('I would have called you, but I did not have your number.','Te habría llamado, pero no tenía tu número.')],
 ('Invent an unreal past condition and its possible result.','Si hubiera salido antes, habría llegado a tiempo.'),tense='pluperfect-subjunctive')

U('work-and-messages','Discuss work and relay information','B2','Describe processes, report messages and acknowledge obstacles.','Impersonal/passive se, reported speech and concessive meaning.')
Q('work-impersonal','Describe a process without naming an actor','Distinguish passive agreement from impersonal se.','se vende / se venden / se vive','In passive se constructions the verb agrees with the thing: se venden boletos. Impersonal se has no subject and uses singular: se vive bien aquí. These are different uses of se.',
 [('Aquí se ___ boletos.','venden'),('En esta ciudad se ___ bien.','vive')],
 ('Tickets are sold here. Use se.','Aquí se venden boletos.'),('Aquí se vende un boleto.','Make un boleto plural and adjust the verb.','Aquí se venden boletos.'),
 [('Spanish is spoken here. Use se.','Aquí se habla español.'),('Good food is served here. Use se.','Aquí se sirve buena comida.')],
 ('Describe a service or general situation using se.','En este restaurante se come bien.'),verb='vender')
Q('work-reported','Relay what somebody said','Shift a present assertion into a past reporting frame.','dijo que + imperfect / conditional','With a past reporting verb, a present situation may be reported with imperfect: dijo que estaba cansada. A future promise can become conditional: dijo que vendría. The exact shift depends on the reporting context.',
 [('Ana dijo que ___ cansada.','estaba'),('Ana dijo que ___ al día siguiente.','vendría')],
 ('Ana said that she was tired.','Ana dijo que estaba cansada.'),('Ana dice que está cansada.','Report the statement from a past perspective: Ana said she was tired.','Ana dijo que estaba cansada.'),
 [('He told me that he would come the next day.','Me dijo que vendría al día siguiente.'),('They said that they had already finished.','Dijeron que ya habían terminado.')],
 ('Report a short statement from an earlier conversation.','Mi hermana dijo que estaba ocupada.'),tense='imperfect')
Q('work-concession','Acknowledge a fact or a possibility','Choose the mood after aunque from the intended meaning.','aunque + indicative / subjunctive','Aunque with indicative here asserts a known fact. With subjunctive here it presents a hypothetical or conceded possibility: aunque llueva, saldremos. These are contextual choices, not a rule based on the word aunque alone.',
 [('Aunque ___, salimos: la lluvia es un hecho conocido.','llueve'),('Aunque ___ mañana, saldremos: es una posibilidad.','llueva')],
 ('Even if it rains tomorrow, we will go out. Treat rain as a possibility.','Aunque llueva mañana, saldremos.'),('Aunque está cansada, trabaja.','Treat her tiredness as a hypothetical possibility: Even if she is tired, she works.','Aunque esté cansada, trabaja.'),
 [('Although I am tired, I keep working. Assert that I am tired.',['Aunque estoy cansado, sigo trabajando.','Aunque estoy cansada, sigo trabajando.']),('Even if it is difficult, we will try. Treat difficulty as a possibility.','Aunque sea difícil, lo intentaremos.')],
 ('Concede an obstacle and say what you will do despite it.','Aunque llueva, saldré a caminar.'),tense='present-subjunctive')

U('build-an-argument','Build a nuanced argument','C1 intro','Connect claims, qualify conclusions and concede a point.','Introduction to argument organisation, stance and qualified disagreement.')
Q('argument-connectors','Contrast and draw a conclusion','Link ideas with explicit discourse relations.','sin embargo / por lo tanto','Sin embargo marks contrast; por lo tanto introduces a consequence. Choose the connector from the relation between the ideas, not merely from the punctuation.',
 [('El plan es caro; ___, puede funcionar.','sin embargo'),('No tenemos datos suficientes; ___, no podemos concluir.','por lo tanto')],
 ('The plan is expensive; however, it can work. Use sin embargo.','El plan es caro; sin embargo, puede funcionar.'),('El plan es caro, pero puede funcionar.','Replace pero with sin embargo and adjust punctuation.','El plan es caro; sin embargo, puede funcionar.'),
 [('We do not have enough data; therefore, we cannot draw a conclusion. Use por lo tanto.','No tenemos datos suficientes; por lo tanto, no podemos concluir.'),('The proposal is interesting; nevertheless, it needs changes. Use no obstante.','La propuesta es interesante; no obstante, necesita cambios.')],
 ('Write two linked claims, using a contrast or consequence connector.','La idea es útil; sin embargo, necesitamos más datos.'))
Q('argument-caution','Qualify a claim','Present an interpretation without overstating certainty.','parecería que / no necesariamente','Conditional parecería can soften an interpretation. No necesariamente limits a generalisation. Neither expression turns a possibility into an established fact.',
 [('___ que el problema es más complejo.','Parecería'),('Un resultado positivo no ___ demuestra la causa.','necesariamente')],
 ('It would seem that the problem is more complex. Use parecería que.','Parecería que el problema es más complejo.'),('El problema es más complejo.','Present this as a tentative interpretation using parecería que.','Parecería que el problema es más complejo.'),
 [('A positive result does not necessarily prove the cause. Use no necesariamente.','Un resultado positivo no necesariamente demuestra la causa.'),('The proposal could work, but we lack evidence. Use podría and carecemos de.','La propuesta podría funcionar, pero carecemos de pruebas.')],
 ('State a cautious interpretation and name a limit to the evidence.','Parecería que la medida funciona, pero faltan datos.'),tense='conditional')
Q('argument-concede','Concede a point before disagreeing','Use a concession to frame a qualified objection.','si bien / aun así','Si bien introduces a concession presented here as a fact. Aun así means even so and does not carry a written accent on aun in this expression.',
 [('___ la medida es útil, no resuelve todo.','Si bien'),('La medida es útil; ___, no basta.','aun así')],
 ('While the measure is useful, it does not solve everything. Use si bien.','Si bien la medida es útil, no resuelve todo.'),('La medida es útil, pero no basta.','Express the contrast using aun así.','La medida es útil; aun así, no basta.'),
 [('Although I understand your position, I disagree. Use si bien.','Si bien entiendo tu postura, no estoy de acuerdo.'),('The proposal has advantages; even so, we should revise it. Use aun así.','La propuesta tiene ventajas; aun así, deberíamos revisarla.')],
 ('Concede a reasonable point and add a respectful objection.','Si bien la idea es interesante, necesitamos más pruebas.'))

U('refine-and-mediate','Refine, summarise and interpret','C1 intro','Reformulate ideas, relay contrasting viewpoints and distinguish inference from certainty.','Introduction to reformulation, short mediation and qualified interpretation.')
Q('refine-reformulate','Clarify what you mean','Reformulate an idea and prevent a misunderstanding.','es decir / mejor dicho / no se trata de','Es decir restates or clarifies an idea. Mejor dicho corrects or refines an earlier wording. No se trata de X, sino de Y redirects the focus; the contrast needs sino after the negation.',
 [('No es una prohibición; ___, es una recomendación.','mejor dicho'),('No se trata de ganar, ___ de aprender.','sino')],
 ('It is a temporary measure; that is, it will not be permanent. Use es decir.','Es una medida temporal; es decir, no será permanente.'),('No se trata de ganar. Se trata de aprender.','Combine the ideas using sino de.','No se trata de ganar, sino de aprender.'),
 [('It is not a ban; more precisely, it is a recommendation. Use mejor dicho.','No es una prohibición; mejor dicho, es una recomendación.'),('I do not mean that it is easy, but that it is possible. Use no digo que and sino que.','No digo que sea fácil, sino que es posible.')],
 ('Clarify or correct a claim using one reformulation expression.','No se trata de terminar rápido, sino de comprender bien.'))
Q('refine-mediate','Relay two viewpoints fairly','Summarise a short disagreement without adding your own judgement.','según / mientras que','Según introduces an attributed viewpoint. Mientras que can contrast two positions. In mediation, preserve who believes what and keep any uncertainty in the source.',
 [('___ Ana, el plan es viable.','Según'),('Ana apoya el plan, ___ Luis pide cambios.','mientras que')],
 ('According to Ana, the plan is viable. Use según.','Según Ana, el plan es viable.'),('Ana apoya el plan. Luis pide cambios.','Combine the two viewpoints with mientras que.','Ana apoya el plan, mientras que Luis pide cambios.'),
 [('Relay the two positions: Ana supports the measure; Luis considers it insufficient. Use mientras que and considerar.','Ana apoya la medida, mientras que Luis la considera insuficiente.'),('Attribute the claim without endorsing it: According to the report, the measure could reduce costs. Use según and podría.','Según el informe, la medida podría reducir los costos.')],
 ('Summarise two different views about a proposal without choosing a side.','Ana apoya la propuesta, mientras que Luis pide más información.'))
Q('refine-inference','Distinguish completion from inference','Interpret the future perfect in two different contexts.','habrá + participle','Future perfect can mark completion before a future deadline: para mañana habremos terminado. It can also express a conjecture about a completed event: no contesta; habrá salido. The second use is an inference, not certainty.',
 [('Para mañana ya ___ terminado el informe.','habremos'),('No contesta; ___ salido. Es una suposición.','habrá')],
 ('By tomorrow we will have finished the report.','Para mañana habremos terminado el informe.'),('Ya ha salido.','Present this as a conjecture using the future perfect, rather than a fact.','Ya habrá salido.'),
 [('She is not answering; she has probably gone out. Use a future-perfect conjecture.','No contesta; habrá salido.'),('By eight we will have arrived. Use the future perfect.','Para las ocho habremos llegado.')],
 ('Use the future perfect for either a deadline or an explicitly signalled conjecture.','No responde; habrá apagado el teléfono.'),tense='future-perfect')

# Add a small set of accurate subjunctive reference supplements. Other patterns
# carry their own explanations; missing whole-verb tables are not invented.
supplements={
 'ir':['vaya','vayas','vaya','vayamos','vayan'],
 'tener':['tenga','tengas','tenga','tengamos','tengan'],
 'ser':['sea','seas','sea','seamos','sean'],
 'hacer':['haga','hagas','haga','hagamos','hagan'],
 'querer':['quiera','quieras','quiera','queramos','quieran'],
 'necesitar':['necesite','necesites','necesite','necesitemos','necesiten']}
for verb,forms in supplements.items():
 existing=next((v for v in data['verbs'] if v['infinitive']==verb),None)
 if existing:existing['forms']['present-subjunctive']=forms
 else:data['verbs'].append({'infinitive':verb,'meaning':verb,'forms':{'present-subjunctive':forms}})
for u in data['units']:
 for q in data['quests']:
  if q['id'] in u['questIds']:q['levelBand']=u['levelBand']
# Supply the lexical cue before recall; a blank should not require guessing the verb.
form_verbs={
 'tengo':'tener','tenemos':'tener','levantamos':'levantarse','gusta':'gustar','gustan':'gustar',
 'puedo':'poder','podemos':'poder','Hay':'haber','está':'estar','cociné':'cocinar','visitamos':'visitar',
 'fui':'ir','hice':'hacer','trabajaba':'trabajar','comía':'comer','sonó':'sonar','cocinaba':'cocinar',
 'había':'haber','habíamos':'haber','he':'haber','hemos':'haber','llamaré':'llamar','terminaremos':'terminar',
 'podrías':'poder','gustaría':'gustar','llueve':'llover','vengas':'venir','coma':'comer','descanses':'descansar',
 'salgamos':'salir','llegue':'llegar','venga':'venir','tiene':'tener','tenga':'tener','aprender':'aprender',
 'entiendas':'entender','tuviera':'tener','ayudaría':'ayudar','viniera':'venir','habláramos':'hablar',
 'hubiera':'haber','habríamos':'haber','venden':'vender','vive':'vivir','estaba':'estar','vendría':'venir',
 'llueva':'llover','Parecería':'parecer','habremos':'haber','habrá':'haber'}
for c in data['cards'][21:]:
 if c['type']=='cloze' and c['answers'][0] in form_verbs:
  c['verb']=form_verbs[c['answers'][0]]
  c['instruction']+=' Use '+c['verb']+'.'
# Form drills with two clauses track the tense of the actual blank.
for id,tense_id in {
 'story-background-form-1':'preterite','plans-real-condition-form-2':'present',
 'opinion-doubt-form-1':'present','opinion-unknown-relative-form-2':'present',
 'hypothesis-present-form-2':'conditional','hypothesis-past-regret-form-2':'conditional-perfect',
 'work-reported-form-2':'conditional','work-concession-form-1':'present'}.items():
 next(c for c in data['cards'] if c['id']=='quest-'+id)['tense']=tense_id
next(c for c in data['cards'] if c['id']=='quest-hypothesis-past-regret-checkpoint-2')['tense']='conditional-perfect'
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f"Authored {len(data['units'])} units, {len(data['quests'])} quests, {len(data['cards'])} exercises")
