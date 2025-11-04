export type SlipCategoryKey = "pendapatan" | "potongan_wajib" | "potongan_hutang" | "tunjangan_dibayarkan";

export type SlipItem = { nama: string; nilai: number };

export type SlipRecord = {
  nama_karyawan?: string;
  email?: string;
  nik?: string | number;
  jabatan?: string;
  no_rekening?: string;
  pendapatan: SlipItem[];
  potongan_wajib: SlipItem[];
  potongan_hutang: SlipItem[];
  tunjangan_dibayarkan: SlipItem[];
  meta?: Record<string, any>;
};

export type SlipImportResult = {
  headers: string[]; // original order
  rowsFlat: Record<string, any>[]; // table view rows (keys are headers)
  normalized: SlipRecord[]; // structured per row
  headerGroups?: (string | null)[]; // display group per header index
  periode?: string; // e.g., "Oktober 2025" from TABEL GAJI!C1
};

function normalizeHeader(h: any): string {
  if (!h) return "";
  return String(h).trim();
}

function detectCategory(header: string | undefined | null): SlipCategoryKey | undefined {
  if (header == null) return undefined;
  const h = String(header).toLowerCase();
  if (/(pendapatan|penerimaan)/.test(h)) return "pendapatan";
  if (h.includes("potongan wajib") || (h.includes("potongan") && h.includes("wajib"))) return "potongan_wajib";
  if (h.includes("potongan hutang") || (h.includes("potongan") && h.includes("hutang"))) return "potongan_hutang";
  if (h.includes("tunjangan") && (h.includes("dibayarkan") || h.includes("yg dibayarkan") || h.includes("yang dibayarkan"))) return "tunjangan_dibayarkan";
  return undefined;
}

function isIdentity(header: string | undefined | null): string | undefined {
  if (header == null) return undefined;
  const h = String(header).toLowerCase().replace(/\s+/g, " ").trim();
  if (/(nama\s*karyawan|nama)/.test(h)) return "nama_karyawan";
  if (/email/.test(h)) return "email";
  if (/nik/.test(h)) return "nik";
  if (/jabatan/.test(h)) return "jabatan";
  if (/(no\s*rek|rekening|no\.\s*rekening|norek)/.test(h)) return "no_rekening";
  return undefined;
}

export async function parseSlipWorkbook(arrayBuffer: ArrayBuffer): Promise<SlipImportResult> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

  // Choose sheet: prefer one containing 'table' and 'gaji'
  const sheetName =
    wb.SheetNames.find((n) => /table/i.test(n) && /gaji/i.test(n)) ||
    wb.SheetNames.find((n) => /gaji/i.test(n)) ||
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  // Extract periode from C1 as requested
  let periode: string | undefined;
  try {
    const c1 = (ws as any)["C1"]?.v ?? (ws as any)["C1"]?.w;
    if (c1 != null) periode = String(c1);
  } catch {}

  // Read as 2D array to keep header order
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  // Prefer a header row that contains explicit identity/category keywords
  const KEYWORDS = [
    /nik/i,
    /nama/i,
    /jabatan/i,
    /pendapatan|penerimaan/i,
    /potongan/i,
    /rekening|no\.?\s*rek|norek/i,
    /email/i,
    /tunjangan.*dibayarkan/i,
  ];
  let headerIdx = -1;
  for (let i = 0; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row) continue;
    const nonEmpty = row.filter((c: any) => c != null && String(c).trim() !== "").length;
    if (nonEmpty < 4) continue;
    const hasKeyword = row.some((c: any) => KEYWORDS.some((k) => k.test(String(c ?? ""))));
    if (hasKeyword) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    // Fallback: heuristic best score among early rows
    const MAX_SCAN = Math.min(200, aoa.length);
    let bestIdx = -1;
    let bestScore = -1;
    for (let i = 0; i < MAX_SCAN; i++) {
      const row = aoa[i];
      if (!row) continue;
      const cells = row.map((c) => (c == null ? "" : String(c)));
      const nonEmpty = cells.filter((c) => c.trim() !== "").length;
      if (nonEmpty < 4) continue;
      let identityHits = 0;
      let categoryHits = 0;
      for (const c of cells) {
        const id = isIdentity(c);
        if (id) identityHits++;
        const cat = detectCategory(c);
        if (cat) categoryHits++;
      }
      const next = aoa[i + 1] || [];
      const nextNonEmpty = next.filter((c: any) => c != null && String(c).trim() !== "").length;
      const score = identityHits * 3 + categoryHits * 4 + nonEmpty + (nextNonEmpty > 2 ? 2 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    headerIdx = bestIdx;
  }
  if (headerIdx === -1) return { headers: [], rowsFlat: [], normalized: [], headerGroups: [], periode };
  const headerRow = aoa[headerIdx];
  const headerRow2 = aoa[headerIdx + 1] || [];
  // propagate merged top headers to following columns
  const topHeadersRaw = headerRow.map(normalizeHeader);
  const subHeadersRaw = headerRow2.map(normalizeHeader);
  const topHeaders: string[] = [];
  let lastTop: string | null = null;
  for (let i = 0; i < Math.max(topHeadersRaw.length, subHeadersRaw.length); i++) {
    const t = normalizeHeader(topHeadersRaw[i]);
    if (t) lastTop = t; // carry forward merged header value
    topHeaders[i] = lastTop ?? "";
  }
  const subHeaders = subHeadersRaw;

  // try to enrich sub headers for category columns if missing
  const probeRows = aoa.slice(headerIdx + 1, headerIdx + 6); // look ahead few rows
  function probeLabel(colIdx: number): string | undefined {
    for (const r of probeRows) {
      const v = r?.[colIdx];
      if (v == null) continue;
      const s = String(v).trim();
      if (!s) continue;
      // ignore pure numeric
      if (/^[0-9.,\-]+$/.test(s)) continue;
      return s;
    }
    return undefined;
  }

  const displayHeaders: string[] = [];
  const headerGroups: (string | null)[] = [];
  for (let i = 0; i < topHeaders.length; i++) {
    const top = topHeaders[i];
    const sub = subHeaders[i] || probeLabel(i) || "";
    const cat = detectCategory(top);
    if (cat) {
      headerGroups[i] =
        cat === "pendapatan"
          ? "PENERIMAAN"
          : cat === "potongan_wajib"
            ? "POTONGAN WAJIB"
            : cat === "potongan_hutang"
              ? "POTONGAN HUTANG"
              : "TUNJANGAN YG DIBAYARKAN";
    } else {
      headerGroups[i] = null;
    }
    let label = "";
    if (cat) {
      label = sub ? `${top} - ${sub}` : top || `COL_${i}`;
    } else {
      label = top || sub || `COL_${i}`;
    }
    displayHeaders[i] = label;
  }

  // de-duplicate labels to ensure uniqueness
  const seen = new Map<string, number>();
  const headers = displayHeaders.map((h, i) => {
    const base = h || `COL_${i}`;
    const count = seen.get(base) || 0;
    const next = count ? `${base} #${count + 1}` : base;
    seen.set(base, count + 1);
    return next;
  });

  // body rows start after the two header rows
  const bodyRows = aoa.slice(headerIdx + 2);

  const rowsFlat: Record<string, any>[] = [];
  const normalized: SlipRecord[] = [];

  for (const row of bodyRows) {
    if (!row || row.every((cell) => (cell == null || String(cell).trim() === ""))) continue;
    const flat: Record<string, any> = {};
    headers.forEach((h, i) => {
      flat[h] = row[i];
    });

    // Build normalized structure
    const rec: SlipRecord = {
      pendapatan: [],
      potongan_wajib: [],
      potongan_hutang: [],
      tunjangan_dibayarkan: [],
    } as SlipRecord;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const v = row[i];
      if (v == null || v === "") continue;
      const top = topHeaders[i] ?? h;
      const sub = subHeaders[i] ?? h;
      const idKey = isIdentity(h) || isIdentity(top) || isIdentity(sub);
      if (idKey) {
        (rec as any)[idKey] = v;
        continue;
      }
      // Skip totals columns
      const isTotal = /^(jml|jumlah|total)/i.test(h) || /^(jml|jumlah|total)/i.test(top);
      if (isTotal) continue;

      const cat = detectCategory(h) || detectCategory(top);
      if (cat) {
        // item name is typically the sub header
        const nameRaw = (sub && sub !== top) ? sub : h;
        const name = nameRaw
          .replace(/pendapatan|penerimaan[:\-]?/i, "")
          .replace(/potongan\s*wajib[:\-]?/i, "")
          .replace(/potongan\s*hutang[:\-]?/i, "")
          .replace(/tunjangan.*dibayarkan[:\-]?/i, "")
          .trim();
        const nilai = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.,-]/g, "").replace(/,/g, ".")) || 0;
        (rec[cat] as SlipItem[]).push({ nama: name || h, nilai });
        continue;
      }
      // Save other meta
      if (!rec.meta) rec.meta = {};
      rec.meta[h] = v;
    }

    rowsFlat.push(flat);
    normalized.push(rec);
  }

  return { headers, rowsFlat, normalized, headerGroups, periode };
}
