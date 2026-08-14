import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportExcel, exportPDF } from "../../lib/exportUtils";

const TABS = [
  { key: "students", label: "শিক্ষার্থী/সদস্য" },
  { key: "attendance", label: "উপস্থিতি" },
  { key: "donations", label: "দান" },
  { key: "accounting", label: "একাউন্টিং" },
  { key: "qurbani", label: "কুরবানি" },
];

export default function Reports({ institutionId, institutionName }) {
  const [tab, setTab] = useState("students");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [year, setYear] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let data = [];
      if (tab === "students") {
        const r = await supabase.from("students").select("*").eq("institution_id", institutionId).order("name");
        data = r.data || [];
      } else if (tab === "attendance") {
        const r = await supabase
          .from("attendance")
          .select("*, students(name, class_name)")
          .eq("institution_id", institutionId)
          .eq("date", date);
        data = r.data || [];
      } else if (tab === "donations") {
        const r = await supabase.from("donations").select("*").eq("institution_id", institutionId).order("created_at", { ascending: false });
        data = r.data || [];
      } else if (tab === "accounting") {
        const r = await supabase.from("ledger_entries").select("*").eq("institution_id", institutionId).order("entry_date");
        data = (r.data || []).filter((x) => (x.entry_date || "").slice(0, 7) === month);
      } else if (tab === "qurbani") {
        const r = await supabase.from("qurbani_shares").select("*").eq("institution_id", institutionId).eq("year", Number(year)).order("animal_label");
        data = r.data || [];
      }
      setRows(data);
      setLoading(false);
    })();
  }, [tab, institutionId, date, month, year]);

  const table = useMemo(() => buildTable(tab, rows), [tab, rows]);

  async function handlePDF() {
    setBusy(true);
    try {
      await exportPDF({
        filename: `manarah-${tab}-${filterSuffix(tab, { date, month, year })}.pdf`,
        title: `মানারাহ — ${TABS.find((t) => t.key === tab).label}`,
        subtitle: `${institutionName || ""} | ${filterLabel(tab, { date, month, year })} | মোট: ${rows.length}`,
        headers: table.headers,
        rows: table.rows,
      });
    } finally {
      setBusy(false);
    }
  }

  function handleExcel() {
    exportExcel({
      filename: `manarah-${tab}-${filterSuffix(tab, { date, month, year })}.xlsx`,
      sheetName: TABS.find((t) => t.key === tab).label,
      headers: table.headers,
      rows: table.rows,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-xl text-sm ${tab === t.key ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {tab === "attendance" && (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" />
          )}
          {tab === "accounting" && (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" />
          )}
          {tab === "qurbani" && (
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm w-28" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExcel} disabled={rows.length === 0} className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 px-4 py-2 rounded-xl text-sm disabled:opacity-40">
            Excel ডাউনলোড
          </button>
          <button onClick={handlePDF} disabled={rows.length === 0 || busy} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-40">
            {busy ? "তৈরি হচ্ছে..." : "PDF ডাউনলোড"}
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cream/40 border-b border-gold-500/10">
                {table.headers.map((h) => <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={table.headers.length} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={table.headers.length} className="px-4 py-6 text-center text-cream/40">এই ফিল্টারে কোনো তথ্য নেই।</td></tr>}
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-gold-500/5 hover:bg-white/5">
                  {r.map((c, j) => <td key={j} className="px-4 py-2.5 whitespace-nowrap text-cream/70">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function buildTable(tab, rows) {
  if (tab === "students") {
    return {
      headers: ["নাম", "অভিভাবক", "ফোন", "ক্লাস", "মাসিক ফি"],
      rows: rows.map((r) => [r.name, r.guardian_name || "-", r.phone || "-", r.class_name || "-", r.monthly_fee ?? "-"]),
    };
  }
  if (tab === "attendance") {
    return {
      headers: ["নাম", "ক্লাস", "অবস্থা", "হিফজ অগ্রগতি"],
      rows: rows.map((r) => [
        r.students?.name || "-",
        r.students?.class_name || "-",
        r.status === "present" ? "উপস্থিত" : r.status === "absent" ? "অনুপস্থিত" : "ছুটি",
        r.hifz_progress || "-",
      ]),
    };
  }
  if (tab === "donations") {
    return {
      headers: ["দাতা", "খাত", "পরিমাণ", "মন্তব্য", "তারিখ"],
      rows: rows.map((r) => [r.donor_name, r.purpose, r.amount, r.note || "-", new Date(r.created_at).toLocaleDateString("bn-BD")]),
    };
  }
  if (tab === "accounting") {
    return {
      headers: ["তারিখ", "ধরন", "খাত", "পরিমাণ", "মন্তব্য"],
      rows: rows.map((r) => [r.entry_date, r.entry_type === "income" ? "আয়" : "ব্যয়", r.category, r.amount, r.note || "-"]),
    };
  }
  if (tab === "qurbani") {
    return {
      headers: ["পশু", "ভাগীদার", "ফোন", "প্রাপ্য", "জমা", "মাংস সংগ্রহ"],
      rows: rows.map((r) => [r.animal_label, r.share_holder_name, r.phone || "-", r.amount_due, r.amount_paid, r.meat_collected ? "হ্যাঁ" : "না"]),
    };
  }
  return { headers: [], rows: [] };
}

function filterLabel(tab, { date, month, year }) {
  if (tab === "attendance") return `তারিখ: ${date}`;
  if (tab === "accounting") return `মাস: ${month}`;
  if (tab === "qurbani") return `সাল: ${year}`;
  return "সর্বমোট তালিকা";
}

function filterSuffix(tab, { date, month, year }) {
  if (tab === "attendance") return date;
  if (tab === "accounting") return month;
  if (tab === "qurbani") return year;
  return new Date().toISOString().slice(0, 10);
}
