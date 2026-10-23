import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../dist/',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8'),app=fs.readFileSync(new URL('js/app.js',root),'utf8');
test('entry assets and course data resolve under both root and GitHub project hosting',()=>{
 const assets=[...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map(m=>m[1]).filter(s=>!s.includes('://'));
 for(const base of ['https://example.test/','https://example.test/frase/']){
  for(const asset of assets){const resolved=new URL(asset,base);assert.ok(resolved.pathname.startsWith(new URL(base).pathname));const relative=resolved.pathname.slice(new URL(base).pathname.length);assert.ok(fs.existsSync(new URL(relative,root)),relative);}
  const module=new URL('js/app.js',base);for(const file of ['course.json','curriculum.json'])assert.equal(new URL('../data/'+file,module).pathname,new URL('data/'+file,base).pathname);
 }
 assert.ok(app.includes("fetch(new URL('../data/course.json',import.meta.url))"));assert.ok(app.includes("fetch(new URL('../data/curriculum.json',import.meta.url))"));assert.ok(app.includes('href="./data/sample-lesson.json"'));
 assert.doesNotMatch(html,/(?:src|href)="\/(?!\/)/);
});
