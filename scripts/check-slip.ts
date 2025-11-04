// Quick check script to parse the root Excel master
import { parseSlipWorkbook } from "../lib/slip-import";
import fs from "fs";

async function main() {
  const path = process.argv[2] ?? "slip_gaji_okt.xlsm";
  const buf = fs.readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const result = await parseSlipWorkbook(ab);
  console.log(JSON.stringify({
    headers: result.headers,
    totalRows: result.rowsFlat.length,
    sampleRow: result.rowsFlat[0],
    sampleNorm: result.normalized[0],
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

