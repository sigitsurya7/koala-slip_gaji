"use client";

import React, { useMemo, useRef, useState, useEffect, ChangeEvent } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Pagination } from "@heroui/pagination";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import toast from "react-hot-toast";
import { parseSlipWorkbook, SlipImportResult } from "@/lib/slip-import";
import { generateSlipPDF } from "@/lib/slipPage";
import { MdPictureAsPdf, MdEmail, MdOutlineArrowBack } from "react-icons/md";

function cleanHeaderLabel(h: string): string {
  return h
    .replace(/^(penerimaan|pendapatan)\s*[-:]?\s*/i, "")
    .replace(/^potongan\s*wajib\s*[-:]?\s*/i, "")
    .replace(/^potongan\s*hutang\s*[-:]?\s*/i, "")
    .replace(/^tunjangan.*dibayarkan\s*[-:]?\s*/i, "")
    .trim();
}

function slugify(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export default function SlipPage(): JSX.Element {
  const [data, setData] = useState<SlipImportResult | null>(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [search, setSearch] = useState("");
  const hospitals: Record<string, string> = {
    "RS ANANDA BEKASI": "Jl. Sultan Agung No.173, Medan Satria, Kecamatan Medan Satria, Kota Bks, Jawa Barat 17132",
    "RS ANANDA TAMBUN SELATAN": "Jl. Perumahan Jl. Jatimulya Raya No.1, Jatimulya, Kec. Tambun Sel., Kabupaten Bekasi, Jawa Barat 17510",
    "RS ANANDA BABELAN": "Jl. Raya Babelan No.KM. 9.6, Kebalen, Kec. Babelan, Kabupaten Bekasi, Jawa Barat 17610",
  };
  const [selectedRS, setSelectedRS] = useState<string>("RS ANANDA BEKASI");
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<Array<{ id:number; email:string; name?:string; rsName?:string; periode:string; createdAt:string }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsQuery, setLogsQuery] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const logsPerPage = 15;

  // Filter + paginate logs
  const filteredLogs = useMemo(() => {
    const q = logsQuery.toLowerCase();
    const arr = !q
      ? logs
      : logs.filter((l) =>
          l.email.toLowerCase().includes(q) ||
          (l.name || "").toLowerCase().includes(q) ||
          (l.rsName || "").toLowerCase().includes(q)
        );
    return arr;
  }, [logs, logsQuery]);
  const totalLogsPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
  const currentLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPerPage;
    return filteredLogs.slice(start, start + logsPerPage);
  }, [filteredLogs, logsPage, logsPerPage]);
  useEffect(() => { setLogsPage(1); }, [logsQuery]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoImg(img);
    img.onerror = () => setLogoImg(null);
    img.src = "/rs_ananda_group.png";
  }, []);

  const onImport = (): void => fileRef.current?.click();

  const onFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const parsed = await parseSlipWorkbook(buf);
      if (!parsed.headers.length) {
        toast.error("Tidak bisa membaca sheet 'table gaji'. Pastikan format benar.");
      } else {
        setData(parsed);
        toast.success(`Berhasil import ${parsed.rowsFlat.length} baris`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file. Pastikan unggah .xlsx/.xlsm dari master.");
    } finally {
      e.target.value = "";
    }
  };

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    const all = data.rowsFlat;
    const filtered = !q
      ? all
      : all.filter((r) =>
          Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))
        );
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [data, search, page, perPage]);

  if (!data) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Slip Gaji</h2>
        <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.xlsm" onChange={onFile} />
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="w-64">
            <Select label="Pilih Rumah Sakit" selectedKeys={[selectedRS]} onChange={(e) => setSelectedRS(e.target.value)}>
              {Object.keys(hospitals).map((k) => (
                <SelectItem key={k}>{k}</SelectItem>
              ))}
            </Select>
          </div>
          <Button color="primary" onPress={onImport}>Import Master Excel</Button>
        </div>
        <p className="text-sm text-default-500 max-w-3xl">Alamat: {hospitals[selectedRS]}</p>
        <p className="text-default-500">Unggah file .xlsx/.xlsm (sheet "TABEL GAJI").</p>
      </div>
    );
  }

  const { headers, rowsFlat } = data;
  const totalRows = rowsFlat.length;

  // 🧩 Group header sesuai Excel pattern
  const identity = headers.filter((h) =>
    /^(no|nama|nik|jabatan|no.?rek)/i.test(h)
  );

  const penerimaan = headers.filter(
    (h) => /penerimaan|pendapatan/i.test(h) && !/jml\s*pendapatan/i.test(h)
  );
  const jmlPendapatan = headers.find(/jml\s*pendapatan/i.test.bind(/jml\s*pendapatan/i));

  const potonganWajib = headers.filter(/potongan\s*wajib/i.test.bind(/potongan\s*wajib/i));
  const potonganHutang = headers.filter(
    (h) => /potongan\s*hutang/i.test(h) && !/(jml\s*potongan|gaji\s*bersih)/i.test(h)
  );
  const jmlPotongan = headers.find(/jml\s*potongan/i.test.bind(/jml\s*potongan/i));
  const gajiBersih = headers.find(/gaji\s*bersih/i.test.bind(/gaji\s*bersih/i));

  const tunjangan = headers.filter(/tunjangan.*dibayarkan/i.test.bind(/tunjangan.*dibayarkan/i));
  const kontak = headers.filter(/(whatsapp|email)/i.test.bind(/(whatsapp|email)/i));

  const order = [
    { key: "IDENTITAS", cols: identity },
    { key: "PENERIMAAN", cols: penerimaan },
    { key: "PENDAPATAN", cols: jmlPendapatan ? [jmlPendapatan] : [] },
    { key: "POTONGAN WAJIB", cols: potonganWajib },
    { key: "POTONGAN HUTANG", cols: potonganHutang },
    { key: "TOTAL", cols: [jmlPotongan, gajiBersih].filter(Boolean) as string[] },
    { key: "TUNJANGAN", cols: tunjangan },
    { key: "KONTAK", cols: kontak },
  ];

  const handlePreviewPDF = () => {
    if (!filteredRows.length) return toast.error("Tidak ada data");
    const doc = generateSlipPDF(filteredRows[0], {
      periode: data.periode ?? "",
      hospitalName: selectedRS,
      hospitalAddress: hospitals[selectedRS],
      logo: logoImg ?? null,
    });
    // Pure preview: buka di tab baru, tanpa download fallback
    const url = doc.output("bloburl");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const validateEmail = (s: string) => /.+@.+\..+/.test(s);

  const handleSendEmail = async () => {
    if (!data) return toast.error("Tidak ada data");
    const rows = data.rowsFlat;
    const valids = rows.filter((k) => validateEmail((k["Email"] || k["EMAIL"] || k["email"] || "").toString()));
    if (!valids.length) return toast.error("Tidak ada email valid");
    const recipients = valids.map((k) => ({
      email: (k["Email"] || k["EMAIL"] || k["email"]).toString(),
      filename: `${k["NIK"] || "slip"}_${k["NAMA"] || k["Nama"] || ""}.pdf`.replace(/[^\w\-.]+/g, "_"),
      name: (k["NAMA"] || k["Nama"] || "").toString(),
      row: k,
    }));

    // 1) Generate semua dulu (lebih cepat) agar kirim bisa langsung baca dari disk
    const toastId = toast.loading("Menyiapkan berkas PDF untuk pengiriman...");
    try {
      const genRes = await fetch("/api/slips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsName: selectedRS,
          rsAddress: hospitals[selectedRS],
          periode: data.periode ?? "",
          rows: valids,
        }),
      });
      if (!genRes.ok) throw new Error("Gagal generate PDF di server");
    } catch (e: any) {
      console.error(e);
      return toast.error(e?.message || "Gagal generate di server", { id: toastId });
    }

    // 2) Kirim satu per satu dengan update nama pada toast
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const r of recipients) {
      toast.loading(`Menyiapkan generate dan email ke (${r.name || r.email})...`, { id: toastId });
      try {
        const mailRes = await fetch("/api/slips/email/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rsName: selectedRS, periode: data.periode ?? "", recipients: [{ email: r.email, filename: r.filename, name: r.name }] }),
        });
        if (!mailRes.ok) throw new Error("Gagal kirim email di server");
        const js = await mailRes.json();
        if (js.sent === 1) sent++;
        else if (js.skipped === 1) skipped++;
        else failed++;
      } catch (e) {
        failed++;
      }
    }
    toast.success(`Email terkirim: ${sent}, lewati: ${skipped}, gagal: ${failed}`, { id: toastId });
  };

  const handleGeneratePDF = async () => {
    if (!data) return toast.error("Tidak ada data");
    const toastId = toast.loading("Mengirim tugas generate ke server...");
    try {
      const res = await fetch("/api/slips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsName: selectedRS,
          rsAddress: hospitals[selectedRS],
          periode: data.periode ?? "",
          rows: data.rowsFlat,
        }),
      });
      if (!res.ok) throw new Error("Server gagal generate");
      const out = await res.json();
      toast.success(`Tersimpan ${out.saved} file ke ${out.dir}`, { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Gagal generate di server", { id: toastId });
    }
  };


  return (
    <>
      <div className="p-6 space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              <Button variant="flat" onPress={() => { setData(null); setSearch(""); setPage(1); }} isIconOnly><MdOutlineArrowBack /></Button>
              <h2 className="text-2xl font-semibold">Slip Gaji (Preview)</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button color="secondary" onPress={handlePreviewPDF}>Preview PDF</Button>
              <Button color="primary" onPress={handleGeneratePDF}>Generate PDF</Button>
              <Button color="success" variant="flat" startContent={<MdEmail />} onPress={handleSendEmail}>Kirim Email</Button>
              <Button variant="flat" onPress={async ()=>{
                try {
                  setLoadingLogs(true); setShowLogs(true);
                  const q = encodeURIComponent(data.periode ?? "");
                  const res = await fetch(`/api/slips/email/logs?periode=${q}`);
                  const js = await res.json();
                  setLogs(js.logs || []);
                } catch (e){ console.error(e); setLogs([]);} finally { setLoadingLogs(false); }
              }}>List Terkirim</Button>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-64">
              <Select label="Pilih Rumah Sakit" selectedKeys={[selectedRS]} onChange={(e) => setSelectedRS(e.target.value)}>
                {Object.keys(hospitals).map((k) => (
                  <SelectItem key={k}>{k}</SelectItem>
                ))}
              </Select>
            </div>
            <div className="text-xs text-default-500 max-w-md">Alamat: {hospitals[selectedRS]}</div>
          </div>
          <Input
            placeholder="Cari nama, jabatan..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="max-w-xs"
          />
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              {/* HEADER 1 */}
              <tr>
                {order.map((g) => {
                  if (!g.cols.length) return null;

                  // Kolom rowspan (IDENTITAS, KONTAK, TOTAL, PENDAPATAN)
                  if (["IDENTITAS", "KONTAK", "PENDAPATAN", "TOTAL"].includes(g.key)) {
                    return g.cols.map((h) => (
                      <th
                        key={`grp-${g.key}-${h}`}
                        rowSpan={2}
                        className="border px-2 py-1 text-center"
                      >
                        {cleanHeaderLabel(h)}
                      </th>
                    ));
                  }

                  return (
                    <React.Fragment key={`grp-${g.key}`}>
                      <th
                        colSpan={g.cols.length}
                        className="border px-2 py-1 text-center"
                      >
                        {g.key.replace("TUNJANGAN", "TUNJANGAN YG DIBAYARKAN")}
                      </th>
                    </React.Fragment>
                  );
                })}
                  {/* Tambah kolom aksi (rowspan=2) */}
                  <th rowSpan={2} className="border px-2 py-1 text-center">Aksi</th>
              </tr>

              {/* HEADER 2 */}
              <tr>
                {order.map((g) => {
                  if (
                    ["IDENTITAS", "KONTAK", "PENDAPATAN", "TOTAL"].includes(g.key)
                  )
                    return null;
                  return g.cols.map((h) => (
                    <th
                      key={`sub-${g.key}-${h}`}
                      className="border px-2 py-1 text-center"
                    >
                      {cleanHeaderLabel(h)}
                    </th>
                  ));
                })}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={`row-${i}`} className="hover:bg-gray-50 hover:dark:text-black hover:cursor-pointer">
                  {headers.map((h) => {
                    const v = row[h];
                    const num = typeof v === "number"
                      ? v
                      : Number(String(v ?? "").replace(/[^0-9.,-]/g, "").replace(/,/g, ".")) || NaN;
                    const formatted =
                      !isNaN(num) && /gaji|pendapatan|potongan|tunjangan|lembur|bpjs/i.test(h)
                        ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num)
                        : String(v ?? "");
                    return (
                      <td key={`cell-${i}-${h}`} className="border px-2 py-1 text-center">
                        {formatted}
                      </td>
                    );
                  })}
                  <td className="border px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                    <Button size="sm" variant="flat" startContent={<MdPictureAsPdf />}
                      onPress={() => {
                        try {
                          const doc = generateSlipPDF(row, {
                            periode: data.periode ?? "",
                            hospitalName: selectedRS,
                            hospitalAddress: hospitals[selectedRS],
                            logo: logoImg ?? null,
                          });
                          const filename = `${row["NIK"] || "slip"}_${row["NAMA"] || row["Nama"] || ""}.pdf`;
                          doc.save(filename);
                        } catch (e) {
                          console.error(e);
                          toast.error("Gagal membuat PDF");
                        }
                      }}
                    >PDF</Button>
                    <Button size="sm" color="success" variant="flat" startContent={<MdEmail />}
                      onPress={async () => {
                        try {
                          const email: string = (row["Email"] || row["EMAIL"] || row["email"] || "").toString();
                          if (!validateEmail(email)) return toast.error("Email tidak valid / kosong");
                          const filename = `${row["NIK"] || "slip"}_${row["NAMA"] || row["Nama"] || ""}.pdf`.replace(/[^\w\-.]+/g, "_");
                          const rsSlug = slugify(selectedRS);
                          const periodeSlug = slugify(data.periode ?? "");
                          const publicPath = `/${rsSlug}/${periodeSlug}/${filename}`;

                          // Cek apakah file sudah ada di public
                          let exists = false;
                          try {
                            const head = await fetch(publicPath, { method: "HEAD" });
                            exists = head.ok;
                          } catch {}

                          if (!exists) {
                            // generate hanya untuk baris ini di server
                            const gen = await fetch("/api/slips/generate", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                rsName: selectedRS,
                                rsAddress: hospitals[selectedRS],
                                periode: data.periode ?? "",
                                rows: [row],
                              }),
                            });
                            if (!gen.ok) return toast.error("Gagal generate PDF di server");
                          }

                          // Kirim via bulk untuk 1 penerima (lebih cepat karena baca file dari disk)
                        const mail = await fetch("/api/slips/email/bulk", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            rsName: selectedRS,
                            periode: data.periode ?? "",
                            recipients: [{ email, filename, name: (row["NAMA"] || row["Nama"] || "").toString() }],
                          }),
                        });
                          if (!mail.ok) return toast.error(`Gagal kirim ke ${email}`);
                          const resJson = await mail.json();
                          if (resJson.sent === 1) toast.success(`Email terkirim ke ${email}`);
                          else if (resJson.skipped === 1) toast.success(`Lewati: sudah pernah terkirim (${email})`);
                          else toast(`Status: sent=${resJson.sent}, skipped=${resJson.skipped}`);
                        } catch (err) {
                          console.error(err);
                          toast.error("Gagal mengirim email");
                        }
                      }}
                    >Email</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500">
            Menampilkan {filteredRows.length} dari {totalRows} data
          </p>
          <Pagination
            page={page}
            total={Math.ceil(totalRows / perPage)}
            onChange={setPage}
            showControls
            size="sm"
          />
        </div>
      </div>
      {/* Modal List Terkirim */}
    <Modal isOpen={showLogs} onOpenChange={setShowLogs} size="5xl" scrollBehavior="inside">
      <ModalContent>
        {(onClose)=> (
          <>
            <ModalHeader className="flex flex-col gap-2">
              <div>List Terkirim — Periode: {data.periode ?? '-'}</div>
              <div className="flex items-end gap-3">
                <Input
                  size="sm"
                  label="Cari email / nama"
                  placeholder="Ketik untuk mencari..."
                  value={logsQuery}
                  onValueChange={setLogsQuery}
                  className="max-w-md"
                />
                <span className="text-xs text-default-500">Total: {filteredLogs.length}</span>
              </div>
            </ModalHeader>
            <ModalBody>
              {loadingLogs ? (
                <p className="text-sm text-default-500">Memuat...</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-default-500">Belum ada log pengiriman.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-default-100">
                        <th className="text-left px-3 py-2">Email</th>
                        <th className="text-left px-3 py-2">Nama</th>
                        <th className="text-left px-3 py-2">RS</th>
                        <th className="text-left px-3 py-2">Periode</th>
                        <th className="text-left px-3 py-2">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLogs.map((l)=> (
                        <tr key={l.id} className="border-b border-default-100">
                          <td className="px-3 py-2">{l.email}</td>
                          <td className="px-3 py-2">{l.name || '-'}</td>
                          <td className="px-3 py-2">{l.rsName || '-'}</td>
                          <td className="px-3 py-2">{l.periode}</td>
                          <td className="px-3 py-2">{
                            (() => {
                              const d = new Date(l.createdAt);
                              const tanggal = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                              const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
                              return `${tanggal}, ${jam}`;
                            })()
                          }</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ModalBody>
              <ModalFooter className="w-full flex items-center justify-between">
                <div className="text-xs text-default-500">Halaman {logsPage} dari {totalLogsPages}</div>
                <div className="flex items-center gap-3">
                  <Pagination
                    page={logsPage}
                    total={totalLogsPages}
                    onChange={setLogsPage}
                    showControls
                    size="sm"
                  />
                  <Button variant="flat" onPress={onClose}>Tutup</Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
