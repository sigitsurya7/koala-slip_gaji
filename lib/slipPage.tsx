import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface SlipPDFOptions {
  title?: string;
  periode?: string;
  printDate?: string;
  hospitalName?: string;
  hospitalAddress?: string;
  logo?: HTMLImageElement | null;
  logoDataUrl?: string; // for server-side usage
}

/** Bersihkan prefix header */
function cleanHeaderLabel(h: string): string {
  return String(h)
    .replace(/^(penerimaan|pendapatan)\s*[-:]?\s*/i, "")
    .replace(/^potongan\s*wajib\s*[-:]?\s*/i, "")
    .replace(/^potongan\s*hutang\s*[-:]?\s*/i, "")
    .replace(/^tunjangan.*dibayarkan\s*[-:]?\s*/i, "")
    .trim();
}

/** Format angka jadi Rupiah */
function formatCurrency(val: any): string {
  const num =
    typeof val === "number"
      ? val
      : Number(String(val ?? "").replace(/[^0-9.,-]/g, "").replace(/,/g, ".")) ||
        0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

/** Konversi angka ke terbilang */
function toTerbilang(num: number): string {
  num = Math.round(num);
  const satuan = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];

  if (num < 12) return satuan[num];
  if (num < 20) return `${toTerbilang(num - 10)} belas`;
  if (num < 100)
    return `${toTerbilang(Math.floor(num / 10))} puluh ${toTerbilang(num % 10)}`.trim();
  if (num < 200) return `seratus ${toTerbilang(num - 100)}`.trim();
  if (num < 1000)
    return `${toTerbilang(Math.floor(num / 100))} ratus ${toTerbilang(num % 100)}`.trim();
  if (num < 2000) return `seribu ${toTerbilang(num - 1000)}`.trim();
  if (num < 1000000)
    return `${toTerbilang(Math.floor(num / 1000))} ribu ${toTerbilang(num % 1000)}`.trim();
  if (num < 1000000000)
    return `${toTerbilang(Math.floor(num / 1000000))} juta ${toTerbilang(num % 1000000)}`.trim();
  if (num < 1000000000000)
    return `${toTerbilang(Math.floor(num / 1000000000))} milyar ${toTerbilang(
      num % 1000000000
    )}`.trim();
  return "";
}

/**
 * 🧾 Generate slip gaji landscape, 1 halaman auto-fit
 */
export function generateSlipPDF(
  data: Record<string, any>,
  opts: SlipPDFOptions = {}
) {
  const {
    title = "SLIP GAJI KARYAWAN",
    periode = "Periode Tidak Diketahui",
    printDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    hospitalName = undefined,
    hospitalAddress = undefined,
    logo = null,
  } = opts;

  // 🔹 buat PDF sementara untuk hitung skala
  const tempDoc = new jsPDF({ orientation: "landscape" });
  renderSlip(tempDoc, data, { title, periode, printDate, hospitalName, hospitalAddress, logo });

  const contentEndY = (tempDoc as any).lastAutoTable?.finalY ?? 200;
  const pageHeight = tempDoc.internal.pageSize.getHeight();
  const scale =
    contentEndY > pageHeight - 10 ? (pageHeight - 10) / contentEndY : 1;

  // 🔹 PDF final
  const doc = new jsPDF({ orientation: "landscape" });
  (doc.internal as any).scaleFactor *= scale;
  renderSlip(doc, data, { title, periode, printDate, hospitalName, hospitalAddress, logo });

  return doc;
}

/**
 * Render isi slip gaji (header sejajar + footer HRD + ayat)
 */
function renderSlip(
  doc: jsPDF,
  data: Record<string, any>,
  opts: { title: string; periode: string; printDate: string; hospitalName?: string; hospitalAddress?: string; logo?: HTMLImageElement | null; logoDataUrl?: string }
) {
  const { title, periode, printDate, hospitalName, hospitalAddress, logo, logoDataUrl } = opts;

  // === HEADER (logo + RS kiri, judul & periode kanan, align right) ===
  if (logo) {
    try { doc.addImage(logo as any, "PNG", 15, 8, 20, 20); } catch {}
  } else if (logoDataUrl) {
    try { doc.addImage(logoDataUrl as any, "PNG", 15, 8, 20, 20); } catch {}
  }
  if (hospitalName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(String(hospitalName), 40, 14);
  }
  if (hospitalAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(hospitalAddress), 40, 20, { maxWidth: 95 });
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.text(title ?? "", pageWidth - 20, 14, { align: "right" });
  doc.setFontSize(10);
  doc.text(`Periode: ${periode ?? ""}`, pageWidth - 20, 20, { align: "right" });

  // === IDENTITAS sejajar ===
  const yStart = 35;
  const nama = data["NAMA"] ?? "-";
  const nik = data["NIK"] ?? "-";
  const jabatan = data["JABATAN"] ?? "-";
  const norek = data["NO. REK"] ?? "-";

  doc.setFontSize(10);
  doc.text(`Nama: ${nama}`, 20, yStart);
  doc.text(`NIK   : ${nik}`, 20, yStart + 6);
  doc.text(`Jabatan: ${jabatan}`, 150, yStart);
  doc.text(`No. Rek: ${norek}`, 150, yStart + 6);

  // === KUMPUL DATA ===
  const pendapatan = Object.entries(data)
    .filter(([k]) => /penerimaan|pendapatan/i.test(k))
    .filter(([k]) => !/jml\s*pendapatan/i.test(k))
    .map(([k, v]) => [cleanHeaderLabel(k), formatCurrency(v)]);
  const totalPendapatan = (() => {
    const key = Object.keys(data).find((k) => /jml\s*pendapatan/i.test(k));
    return key ? data[key] : 0;
  })();

  const potongan = Object.entries(data)
    .filter(([k]) => /potongan/i.test(k) && !/tunjangan/i.test(k))
    .filter(([k]) => !/(jml\s*potongan|gaji\s*bersih)/i.test(k))
    .map(([k, v]) => [cleanHeaderLabel(k), formatCurrency(v)]);
  const totalPotongan = (() => {
    const key = Object.keys(data).find((k) => /jml\s*potongan/i.test(k));
    return key ? data[key] : 0;
  })();

  // ✅ Fix: jangan buang "JML TUNJANGAN YG DIBAYARKAN"
  const tunjangan = Object.entries(data)
    .filter(([k]) => /tunjangan.*dibayarkan/i.test(k))
    .filter(([k]) => !/jml\s*tunjangan.*dibayarkan/i.test(k))
    .map(([k, v]) => [cleanHeaderLabel(k), formatCurrency(v)]);
  const totalTunjangan = (() => {
    const key = Object.keys(data).find((k) => /jml\s*tunjangan.*dibayarkan/i.test(k));
    return key ? data[key] : 0;
  })();

  const gajiBersih = (() => {
    const key = Object.keys(data).find((k) => /gaji\s*bersih/i.test(k));
    return key ? data[key] : 0;
  })();

  const startY = yStart + 20;

  // === Pendapatan (kiri) ===
  autoTable(doc, {
    startY,
    margin: { left: 20, right: 155 },
    head: [["Pendapatan", "Jumlah (Rp)"]],
    body: [
      ...pendapatan,
      [
        { content: "Total Pendapatan", styles: { fontStyle: "bold" } },
        { content: formatCurrency(totalPendapatan), styles: { fontStyle: "bold" } },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { halign: "left" },
    columnStyles: { 0: { halign: "left" }, 1: { halign: "right" } },
    pageBreak: "avoid",
  });

  // === Potongan (kanan) ===
  autoTable(doc, {
    startY,
    margin: { left: 155, right: 20 },
    head: [["Potongan", "Jumlah (Rp)"]],
    body: [
      ...potongan,
      [
        { content: "Total Potongan", styles: { fontStyle: "bold" } },
        { content: formatCurrency(totalPotongan), styles: { fontStyle: "bold" } },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { halign: "left" },
    columnStyles: { 0: { halign: "left" }, 1: { halign: "right" } },
    pageBreak: "avoid",
  });

  // === GAJI BERSIH ===
  const lastY = (doc as any).lastAutoTable?.finalY ?? (startY + 10);
  const totalY = lastY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Gaji Bersih: ${formatCurrency(gajiBersih)}`, 20, totalY);

  // === TERBILANG ===
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(`${toTerbilang(gajiBersih)} rupiah`, 20, totalY + 6);

  // === TUNJANGAN ===
  const tunjanganY = totalY + 15;
  autoTable(doc, {
    startY: tunjanganY,
    margin: { left: 20, right: 155 },
    head: [["Tunjangan yg Dibayarkan", "Jumlah (Rp)"]],
    body: [
      ...tunjangan,
      [
        { content: "JML TUNJANGAN YG DIBAYARKAN", styles: { fontStyle: "bold" } },
        { content: formatCurrency(totalTunjangan), styles: { fontStyle: "bold" } },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { halign: "left" },
    columnStyles: { 0: { halign: "left" }, 1: { halign: "right" } },
    pageBreak: "avoid",
  });

  // === FOOTER (HRD + ayat kanan bawah) ===
  const footerY = 190;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Dicetak pada: ${printDate ?? ""}`, 20, footerY);

  // HRD di kanan bawah
  doc.setFont("helvetica", "bold");
  doc.text("HRD.", pageWidth - 20, footerY - 10, { align: "right" });

  // Ayat di bawah HRD
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.text(
    "“Sesungguhnya jika kamu bersyukur, pasti Kami akan menambah nikmat kepadamu” (QS. Ibrahim;7)",
    pageWidth - 20,
    footerY,
    { align: "right", maxWidth: 200 }
  );
}
