// Standard PDF font metrics, in thousandths of an em. PDF output stays entirely local.
const REGULAR=[556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const BOLD=[556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,350,556,350,278,556,500,1000,556,556,333,1000,667,333,1000,350,611,350,350,278,278,500,500,350,556,1000,333,1000,556,333,944,350,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
function plain(s){return String(s??'').normalize('NFC').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—−]/g,'-').replace(/…/g,'...').replace(/→/g,'->').replace(/↗/g,'').replace(/\s+/g,' ').trim();}
function codes(s){return Array.from(plain(s),c=>{const n=c.charCodeAt(0);return n<=255?n:63;});}
function hex(s){return codes(s).map(n=>n.toString(16).padStart(2,'0')).join('');}
function width(s,size,bold){return codes(s).reduce((sum,n)=>sum+(bold?BOLD:REGULAR)[n],0)*size/1000;}
function wrap(s,max,size,bold=false){
 const lines=[];let row='';
 for(const word of plain(s).split(' ')){
  if(width((row?row+' ':'')+word,size,bold)<=max){row+=(row?' ':'')+word;continue;}
  if(row){lines.push(row);row='';}
  if(width(word,size,bold)<=max){row=word;continue;}
  for(const letter of word){if(width(row+letter,size,bold)>max){lines.push(row);row='';}row+=letter;}
 }
 if(row)lines.push(row);return lines;
}
// A small standards-compliant PDF 1.4 writer using standard Helvetica / WinAnsi.
export function worksheetPdf(sheet,{paper='letter',answerKey=true}={}){
 if(!sheet?.items?.length)throw new Error('A worksheet needs items.');
 const W=paper==='a4'?595.28:612,H=paper==='a4'?841.89:792,M=48,body=W-2*M;
 const pages=[];let page,y,currentKey=false;
 const text=(s,x,at,size=12,bold=false)=>page.push(`BT /${bold?'F2':'F1'} ${size} Tf 0.10 0.16 0.12 rg 1 0 0 1 ${x.toFixed(2)} ${at.toFixed(2)} Tm <${hex(s)}> Tj ET`);
 const rule=(at,x=M,end=W-M)=>page.push(`0.65 0.70 0.66 RG 0.45 w ${x} ${at} m ${end} ${at} l S`);
 const para=(s,size=12,bold=false,indent=0)=>{for(const row of wrap(s,body-indent,size,bold)){if(y<85)header(currentKey,true);text(row,M+indent,y,size,bold);y-=size*1.35;}};
 const header=(key=false,continued=false)=>{
  page=[];pages.push(page);currentKey=key;y=H-48;text(key?'frase / answer key':'frase / pen practice',M,y,12,true);y-=28;
  para((key?'Answer key - ':'')+sheet.title+(continued?' (continued)':''),19,true);y-=3;
  para(sheet.scope,11);y-=3;para('Sheet '+sheet.id,9);y-=12;
  if(key){para('Models are not an exhaustive list. Other natural wording can be correct. Keep this key separate until after recall.',10);y-=12;}
  else{para('Date: __________________   First try: no help / with reference',10);y-=3;para('Try from memory. Check, cover the model and retrieve a repair. Retry selected items on another day.',10);y-=12;}
 };
 const ensure=(need,key)=>{if(y-need<85&&y<H-200)header(key,true);};
 header();
 for(const [i,item] of sheet.items.entries()){
  const title=(i+1)+'. '+item.title;
  const titleRows=wrap(title,body,11,true),cueRows=item.cue?wrap(item.cue,body-12,10):[],promptRows=wrap(item.prompt,body-12,13);
  const lines=Math.min(5,Math.max(0,item.lines??1)),need=titleRows.length*14.85+cueRows.length*13.5+promptRows.length*17.55+lines*23+14;
  ensure(need,false);para(title,11,true);if(item.cue)para(item.cue,10,false,12);para(item.prompt,13,false,12);y-=5;
  for(let j=0;j<lines;j++){ensure(25,false);rule(y,M+12);y-=23;}y-=9;
 }
 ensure(54,false);para('RETURN TO IT',10,true);y-=3;para('Retry tomorrow: __________    Ask my teacher about: __________',10);y-=12;
 if(answerKey){
  header(true);
  for(const [i,item] of sheet.items.entries()){
   const title=(i+1)+'. '+item.title,ans=item.answer,notes=item.notes||'';
   const need=wrap(title,body,11,true).length*14.85+wrap(ans,body-12,12).length*16.2+wrap(notes,body-12,9).length*12.15+17;
   ensure(Math.min(need,H-270),true);para(title,11,true);para(ans,12,false,12);
   // Notes may be long in imported lessons; paginate paragraph lines individually.
   for(const row of wrap(notes,body-12,9)){ensure(15,true);text(row,M+12,y,9);y-=12.15;}
   y-=14;
  }
 }
 for(const [i,p] of pages.entries()){
  page=p;rule(42);text('Frase | '+(paper==='a4'?'A4':'US Letter')+' | '+sheet.id,M,27,8);text((i+1)+' / '+pages.length,W-M-30,27,8);
 }
 const objs=['<< /Type /Catalog /Pages 2 0 R >>','',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
 const kids=[];
 for(const p of pages){const pageId=objs.length+1,streamId=pageId+1;kids.push(pageId+' 0 R');
  objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`);
  const stream=p.join('\n');objs.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');
 }
 objs[1]='<< /Type /Pages /Count '+pages.length+' /Kids ['+kids.join(' ')+'] >>';
 let pdf='%PDF-1.4\n',offsets=[0];
 for(const [i,o] of objs.entries()){offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';}
 const xref=pdf.length;pdf+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
 for(const n of offsets.slice(1))pdf+=String(n).padStart(10,'0')+' 00000 n \n';
 pdf+='trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 return new TextEncoder().encode(pdf);
}
