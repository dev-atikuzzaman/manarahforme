import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const EMPTY = { year: new Date().getFullYear(), animal_label: "", share_holder_name: "", phone: "", amount_due: "", amount_paid: "" };

export default function Qurbani({ institutionId, canEdit, onToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [year, setYear] = useState(new Date().getFullYear());

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("qurbani_shares")
      .select("*")
      .eq("institution_id", institutionId)
      .order("animal_label");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("qurbani-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "qurbani_shares", filter: `institution_id=eq.${institutionId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = await supabase.from("qurbani_shares").insert({
      institution_id: institutionId,
      year: Number(form.year),
      animal_label: form.animal_label,
      share_holder_name: form.share_holder_name,
      phone: form.phone,
      amount_due: Number(form.amount_due) || 0,
      amount_paid: Number(form.amount_paid) || 0,
    });
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "ভাগ যোগ হয়েছে" });
    setForm({ ...EMPTY, year: form.year, animal_label: form.animal_label });
  }

  async function toggleCollected(row) {
    if (!canEdit) return;
    const { error } = await supabase.from("qurbani_shares").update({ meat_collected: !row.meat_collected }).eq("id", row.id);
    if (error) onToast({ type: "error", message: error.message });
  }

  async function updatePaid(row, amount_paid) {
    if (!canEdit) return;
    const { error } = await supabase.from("qurbani_shares").update({ amount_paid: Number(amount_paid) || 0 }).eq("id", row.id);
    if (error) onToast({ type: "error", message: error.message });
  }

  async function handleDelete(id) {
    if (!window.confirm("এই ভাগ মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("qurbani_shares").delete().eq("id", id);
    if (error) onToast({ type: "error", message: error.message });
  }

  const years = useMemo(() => [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a), [rows]);
  const yearRows = rows.filter((r) => r.year === Number(year));

  const grouped = useMemo(() => {
    const g = {};
    yearRows.forEach((r) => {
      const label = r.animal_label || "অনির্ধারিত";
      g[label] = g[label] || [];
      g[label].push(r);
    });
    return g;
  }, [yearRows]);

  const totalDue = yearRows.reduce((s, r) => s + Number(r.amount_due || 0), 0);
  const totalPaid = yearRows.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const collected = yearRows.filter((r) => r.meat_collected).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm">
          {(years.length ? years : [new Date().getFullYear()]).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5"><div className="text-cream/40 text-xs mb-1">মোট ভাগ</div><div className="text-xl font-display text-gold-400">{yearRows.length}</div></div>
        <div className="glass-card rounded-2xl p-5"><div className="text-cream/40 text-xs mb-1">প্রাপ্য</div><div className="text-xl font-display text-cream/80">৳{totalDue.toLocaleString("bn-BD")}</div></div>
        <div className="glass-card rounded-2xl p-5"><div className="text-cream/40 text-xs mb-1">আদায়</div><div className="text-xl font-display text-emerald-400">৳{totalPaid.toLocaleString("bn-BD")}</div></div>
        <div className="glass-card rounded-2xl p-5"><div className="text-cream/40 text-xs mb-1">মাংস সংগ্রহ সম্পন্ন</div><div className="text-xl font-display text-gold-400">{collected}/{yearRows.length}</div></div>
      </div>

      {canEdit && (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <input required type="number" placeholder="সাল" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          <input required placeholder="পশুর নাম/নম্বর (যেমন: গরু-১)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.animal_label} onChange={(e) => setForm({ ...form, animal_label: e.target.value })} />
          <input required placeholder="ভাগীদারের নাম" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.share_holder_name} onChange={(e) => setForm({ ...form, share_holder_name: e.target.value })} />
          <input placeholder="ফোন নম্বর" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input type="number" placeholder="প্রাপ্য টাকা" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.amount_due} onChange={(e) => setForm({ ...form, amount_due: e.target.value })} />
          <div className="flex gap-2">
            <input type="number" placeholder="জমা টাকা" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm flex-1" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} />
            <button className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 rounded-xl text-sm shrink-0">যোগ করুন</button>
          </div>
          <p className="text-xs text-cream/35 sm:col-span-2 lg:col-span-6">টিপ: একই পশুর নাম (যেমন "গরু-১") বারবার ব্যবহার করে সাতজন ভাগীদার আলাদা এন্ট্রি হিসেবে যোগ করুন — নিচে তারা এক গ্রুপে দেখা যাবে।</p>
        </form>
      )}

      {loading && <div className="text-center text-cream/40 py-6">লোড হচ্ছে...</div>}
      {!loading && Object.keys(grouped).length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-cream/40">এই সালে কোনো কুরবানির ভাগ যোগ করা হয়নি — উপরের ফর্ম দিয়ে শুরু করুন।</div>
      )}

      {Object.entries(grouped).map(([label, shares]) => (
        <div key={label} className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gold-500/10 flex items-center justify-between">
            <span className="font-display text-gold-400">{label}</span>
            <span className="text-xs text-cream/40">{shares.length}/৭ ভাগ পূর্ণ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-cream/40 border-b border-gold-500/10">
                  <th className="px-4 py-2.5 font-medium">ভাগীদার</th>
                  <th className="px-4 py-2.5 font-medium">ফোন</th>
                  <th className="px-4 py-2.5 font-medium">প্রাপ্য</th>
                  <th className="px-4 py-2.5 font-medium">জমা</th>
                  <th className="px-4 py-2.5 font-medium">মাংস সংগ্রহ</th>
                  {canEdit && <th className="px-4 py-2.5"></th>}
                </tr>
              </thead>
              <tbody>
                {shares.map((r) => (
                  <tr key={r.id} className="border-b border-gold-500/5 hover:bg-white/5">
                    <td className="px-4 py-2.5">{r.share_holder_name}</td>
                    <td className="px-4 py-2.5 text-cream/60">{r.phone}</td>
                    <td className="px-4 py-2.5 text-cream/60">৳{Number(r.amount_due).toLocaleString("bn-BD")}</td>
                    <td className="px-4 py-2.5">
                      <input
                        disabled={!canEdit}
                        type="number"
                        defaultValue={r.amount_paid}
                        onBlur={(e) => updatePaid(r, e.target.value)}
                        className={`bg-ink-900/60 border rounded-lg px-2 py-1 text-xs w-24 ${Number(r.amount_paid) >= Number(r.amount_due) ? "border-emerald-500/40 text-emerald-300" : "border-gold-500/20"}`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <button disabled={!canEdit} onClick={() => toggleCollected(r)} className={`text-xs px-2.5 py-1 rounded-lg border ${r.meat_collected ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "border-white/10 text-cream/40"}`}>
                        {r.meat_collected ? "সংগৃহীত ✓" : "বাকি"}
                      </button>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 text-xs">মুছুন</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
