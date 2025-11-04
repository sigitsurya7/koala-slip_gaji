const fs = require('fs');
const XLSX = require('xlsx');

function normalizeHeader(h){return (h??'').toString().trim();}

function main(){
  const path = process.argv[2] || 'slip_gaji_okt.xlsm';
  const buf = fs.readFileSync(path);
  const wb = XLSX.read(buf, {type:'buffer', cellDates:true});
  const sheetName = wb.SheetNames.find(n=>/table/i.test(n)&&/gaji/i.test(n)) || wb.SheetNames.find(n=>/gaji/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, {header:1, raw:true});
  // probe for likely header row containing identity/category keywords
  const KEYWORDS = [/nik/i, /nama/i, /jabatan/i, /pendapatan/i, /potongan/i, /rekening/i, /email/i];
  let headerRow = null;
  for (let i=0;i<aoa.length;i++){
    const r = aoa[i];
    if (!r) continue;
    const nonEmpty = r.filter(c=>c!=null && String(c).trim()!=='').length;
    if (nonEmpty < 4) continue;
    const hasKey = r.some(c=> KEYWORDS.some(k=> k.test(String(c||''))));
    if (hasKey){ headerRow = r; break; }
  }
  if (!headerRow) headerRow = aoa.find(r=>r && r.some(c=>c!=null && String(c).trim()!=='')) || [];
  const headers = headerRow.map(normalizeHeader);
  const body = aoa.slice(aoa.indexOf(headerRow)+1).filter(r=>r && r.some(c=>c!=null && String(c).trim()!==''));
  const firstRow = {};
  headers.forEach((h,i)=>{firstRow[h]=body[0]?.[i];});
  console.log(JSON.stringify({sheetName, headers, rows: body.length, firstRow}, null, 2));
}

main();
