import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const INCOME_CATEGORIES = ["মাসিক ফি", "দান/যাকাত", "ওয়াকফ আয়", "ভাড়া", "অন্যান্য আয়"];
const EXPENSE_CATEGORIES = ["শিক্ষক/স্টাফ বেতন", "বিদ্যুৎ/পানি", "মেরামত", "শিক্ষা উপকরণ", "খাদ্য/আপ্যায়ন", "অন্যান্য ব্যয়"];

const EMPTY = { entry_type: "income", category: INCOME_CATEGORIES[0], amount: "", note: "", entry_date: new Date().toISOString().slice(0, 10) };

export default function Accounting({ institutionId, canEdit, onToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("ledger_entries")
      .select("*")
      .eq("institution_id", institutionId)
      .order("entry_date", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("ledger-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ledger_entries", filter: `institution_id=eq.${institutionId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = await supabase.from("ledger_entries").insert({
      institution_id: institutionId,
      entry_type: form.entry_type,
      category: form.category,
      amount: Number(form.amount),
      note: form.note,
      entry_date: form.entry_date,
    });
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "এন্ট্রি যোগ হয়েছে" });
    setForm({ ...EMPTY, entry_type: form.entry_type, category: form.entry_type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] });
  }

  async function handleDelete(id) {
    if (!window.confirm("এই এন্ট্রি মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("ledger_entries").delete().eq("id", id);
    if (error) onToast({ type: "error", message: error.message });
    else onToast({ message: "মুছে ফেলা হয়েছে" });
  }

  const monthRows = useMemo(
    () => rows.filter((r) => (r.entry_date || "").slice(0, 7) === monthFilter),
    [rows, monthFilter]
  );

  const totals = useMemo(() => {
    const income = monthRows.filter((r) => r.entry_type === "income").reduce((s, r) => s + Number(r.amount), 0);
    const expense = monthRows.filter((r) => r.entry_type === "expense").reduce((s, r) => s + Number(r.amount), 0);
    return { income, expense, balance: income - expense };
  }, [monthRows]);

  const trend = useMemo(() => {
    const byDate = {};
    monthRows.forEach((r) => {
      const key = r.entry_date;
      byDate[key] = byDate[key] || { date: key, income: 0, expense: 0 };
      byDate[key][r.entry_type] += Number(r.amount);
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="text-cream/40 text-xs mb-1">মোট আয়</div>
          <div className="text-xl font-display text-emerald-400">৳{totals.income.toLocaleString("bn-BD")}</div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="text-cream/40 text-xs mb-1">মোট ব্যয়</div>
          <div className="text-xl font-display text-red-400">৳{totals.expense.toLocaleString("bn-BD")}</div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="text-cream/40 text-xs mb-1">নীট ব্যালেন্স</div>
          <div className={`text-xl font-display ${totals.balance >= 0 ? "text-gold-400" : "text-red-400"}`}>৳{totals.balance.toLocaleString("bn-BD")}</div>
        </div>
      </div>

      {trend.length > 1 && (
        <div className="glass-card rounded-2xl p-5">
          <div className="text-xs text-cream/40 mb-3">এই মাসের প্রবণতা</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid stroke="rgba(245,180,0,0.08)" />
              <XAxis dataKey="date" tick={{ fill: "#f4ead9aa", fontSize: 11 }} tickFormatter={(d) => d.slice(8)} />
              <YAxis tick={{ fill: "#f4ead9aa", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#0c2b1e", border: "1px solid rgba(245,180,0,0.2)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2} dot={false} name="আয়" />
              <Line type="monotone" dataKey="expense" stroke="#f87171" strokeWidth={2} dot={false} name="ব্যয়" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {canEdit && (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <select
            className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm"
            value={form.entry_type}
            onChange={(e) => {
              const t = e.target.value;
              setForm({ ...form, entry_type: t, category: t === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] });
            }}
          >
            <option value="income">আয়</option>
            <option value="expense">ব্যয়</option>
          </select>
          <select className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {(form.entry_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c}>{c}</option>)}
          </select>
          <input required type="number" placeholder="পরিমাণ (৳)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input type="date" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
          <input placeholder="মন্তব্য (ঐচ্ছিক)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 rounded-xl text-sm">যোগ করুন</button>
        </form>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cream/40 border-b border-gold-500/10">
                <th className="px-4 py-3 font-medium">তারিখ</th>
                <th className="px-4 py-3 font-medium">ধরন</th>
                <th className="px-4 py-3 font-medium">খাত</th>
                <th className="px-4 py-3 font-medium">পরিমাণ</th>
                <th className="px-4 py-3 font-medium">মন্তব্য</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
              {!loading && monthRows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-cream/40">এই মাসে কোনো এন্ট্রি নেই।</td></tr>}
              {monthRows.map((r) => (
                <tr key={r.id} className="border-b border-gold-500/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-cream/60">{r.entry_date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.entry_type === "income" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                      {r.entry_type === "income" ? "আয়" : "ব্যয়"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.category}</td>
                  <td className="px-4 py-3 text-gold-300">৳{Number(r.amount).toLocaleString("bn-BD")}</td>
                  <td className="px-4 py-3 text-cream/50">{r.note}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 text-xs">মুছুন</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
