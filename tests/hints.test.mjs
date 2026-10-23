import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {diagnose,graduatedHint} from '../dist/js/hints.js';
import {grade,validatePack} from '../dist/js/engine.js';
const course=JSON.parse(fs.readFileSync(new URL('../dist/data/course.json',import.meta.url)));
const cooking=course.cards.find(c=>c.id==='sentence-preterite-cocinar-3');

test('the reported cosinamos error marks only the s without disclosing c at step one',()=>{
 const answer='Ayer, nosotros cosinamos la cena';
 const d=diagnose(answer,cooking,course);
 assert.equal(d.kind,'spelling');assert.equal(d.marks.length,1);
 assert.equal(answer.slice(d.marks[0].start,d.marks[0].end),'s');
 assert.equal(d.endingMatches,true);
 const first=graduatedHint(answer,cooking,course,1);
 assert.equal(first.fragment,undefined);assert.ok(!first.message.includes('cocinamos'));
 const second=graduatedHint(answer,cooking,course,2);
 assert.equal(second.fragment,'co□inamos');assert.ok(second.message.includes('ending matches'));
 const third=graduatedHint(answer,cooking,course,3);
 assert.ok(third.message.includes('“s” to “c”'));assert.ok(!third.message.includes('cocinamos'));
});
test('accents are located, ñ stays meaningful, and neither changes answer acceptance',()=>{
 const card=course.cards.find(c=>c.id==='form-preterite-hablar-0');
 const d=diagnose('hable',card,course);assert.equal(d.kind,'accent');assert.equal('hable'.slice(d.marks[0].start,d.marks[0].end),'e');
 assert.equal(grade('ano',{type:'cloze',answers:['año']}).kind,'unmatched');
});
test('known tense and person errors are not mislabelled as spelling slips',()=>{
 const c=course.cards.find(c=>c.id==='form-preterite-comer-3');
 assert.equal(diagnose('comemos',c,course).kind,'tense');
 assert.equal(diagnose('comieron',c,course).kind,'person');
 assert.equal(diagnose('cocinábamos',{...c,verb:'cocinar',answers:['cocinamos']},course).kind,'tense');
});
test('a missing letter gets an insertion marker at the original answer position',()=>{
 const answer='Ayer, nosotros cocinmos la cena';
 const d=diagnose(answer,cooking,course);
 assert.ok(d.marks[0].start>=0);assert.ok(d.marks[0].end<=answer.length);
 assert.ok(graduatedHint(answer,cooking,course,1).message);
});
test('missing words, extra words, articles, and reordered wording get bounded comparison clues',()=>{
 assert.equal(diagnose('Ayer, nosotros cocinamos cena',cooking,course).kind,'missing');
 assert.equal(diagnose('Ayer, nosotros cocinamos la la cena',cooking,course).kind,'extra');
 assert.equal(diagnose('Ayer, nosotros cocinamos el cena',cooking,course).kind,'article');
 const order=diagnose('Nosotros cocinamos ayer la cena',cooking,course);
 assert.equal(order.kind,'order');assert.ok(graduatedHint('Nosotros cocinamos ayer la cena',cooking,course,1).message.includes('alternatives'));
});
test('synonyms and arbitrary wording are not confidently called spelling errors',()=>{
 const d=diagnose('Ayer, nosotros preparamos la cena',cooking,course);
 assert.equal(d.kind,'word');assert.ok(graduatedHint('Ayer, nosotros preparamos la cena',cooking,course,1).message.includes('wording difference'));
});
test('all exercise types and tenses have three usable clues, including self-reviewed production',()=>{
 for(const card of course.cards)for(let level=1;level<=3;level++){
  const clue=graduatedHint('',card,course,level);assert.ok(clue.message,card.id);assert.equal(clue.level,level);
  if(card.type==='create')assert.equal(clue.fragment,undefined);
 }
});
test('future lesson packs can author their own three-step hints',()=>{
 const pack=JSON.parse(fs.readFileSync(new URL('../dist/data/sample-lesson.json',import.meta.url)));
 pack.cards[0].hints=['Think about politeness.','Use the conditional of gustar.','The form starts with gusta…'];
 validatePack(pack);assert.equal(graduatedHint('',pack.cards[0],course,2).message,pack.cards[0].hints[1]);
 pack.cards[0].hints=[{bad:'format'}];assert.throws(()=>validatePack(pack));
});
test('custom teacher exercises can use known verb diagnostics without verb metadata',()=>{
 const custom={id:'teacher-cooking',type:'translate',tense:'preterite',prompt:'Yesterday, we cooked dinner.',answers:['Ayer, nosotros cocinamos la cena.']};
 const d=diagnose('Ayer, nosotros cosinamos la cena',custom,course);
 assert.equal(d.kind,'spelling');assert.equal(d.endingMatches,true);
});
test('punctuation and optional subjects preserve existing accepted answers',()=>{
 for(const answer of cooking.answers){assert.equal(grade(answer,cooking).kind,'correct');assert.equal(diagnose(answer,cooking,course),null);}
});
test('very long or unrelated responses fall back to general guidance',()=>{
 assert.equal(diagnose('x'.repeat(1501),cooking,course),null);
 assert.ok(graduatedHint('I am trying a very different unrelated sentence',cooking,course,1).message);
});
