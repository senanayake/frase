import {readFileSync} from 'node:fs';
import {validateCurriculum} from '../dist/js/curriculum.js';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const data=validateCurriculum(read('../dist/data/curriculum.json'),read('../dist/data/course.json'));
console.log(`Curriculum valid: ${data.units.length} unit, ${data.quests.length} quests, ${data.cards.length} exercises.`);
