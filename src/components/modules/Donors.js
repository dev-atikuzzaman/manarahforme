import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Donors({ institutionId, canEdit, onToast }) {
  const [donors, setDonors] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  async function load() {
    setLoading(true);
    const [{ data: d }, { data: don }] = await Promise.all([
      supabase.from("donors").select("*").eq("institution_id", institutionId),
      supabase.from("donations").select("*").eq("institution_id", institutionId).order("created_at", { ascending: false }),
    ]);
    setDonors(d || []);
    setDonations(don || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("donors-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "donors", filter: `institution_id=eq.${institutionId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "donations", filter: `institution_id=eq.${institutionId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  const summary = useMemo(() => {
    const rows = donors.map((d) => {
      const mine = donations.filter((x) => x.donor_id === d.id);
      const total = mine.reduce((s, x) => s + Number(x.amount || 0), 0);
      const last = mine[0]?.created_at;
      return { donor: d, donations: mine, total, count: mine.length, last };
    });
    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [donors, donations]);

  const filtered = summary.filter((r) => r.donor.name.toLowerCase().includes(query.toLowerCase()));
  const topIds = new Set(summary.slice(0, 3).filter((r) => r.total > 0).map((r) => r.donor.id));

  return (
    <div className="space-y-6">
      <input
        placeholder="দাতার নাম দিয়ে খুঁজুন..."
        className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <div className="text-center text-cream/40 py-10">লোড হচ্ছে...</div>}
      {!loading && filtered.length === 0 && <div className="glass-card rounded-2xl p-8 text-center text-cream/40">কোনো দাতা পাওয়া যায়নি — "দান ও যাকাত" ট্যাব থেকে দান রেকর্ড করলে দাতা স্বয়ংক্রিয়ভাবে এখানে যোগ হবে।</div>}

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.donor.id} className="glass-card rounded-2xl overflow-hidden">
            <button onClick={() => setExpandedId(expandedId === r.donor.id ? null : r.donor.id)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5">
              <div className="flex items-center gap-2 min-w-0">
                {topIds.has(r.donor.id) && <span className="text-gold-400" title="শীর্ষ দাতা">★</span>}
                <span className="text-sm font-medium text-cream/90 truncate">{r.donor.name}</span>
                <span className="text-xs text-cream/35">({r.count} বার)</span>
              </div>
              <span className="text-gold-300 font-semibold text-sm shrink-0">৳{r.total.toLocaleString("bn-BD")}</span>
            </button>

            {expandedId === r.donor.id && (
              <DonorDetail donor={r.donor} donations={r.donations} institutionId={institutionId} canEdit={canEdit} onToast={onToast} onDonorUpdated={load} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DonorDetail({ donor, donations, institutionId, canEdit, onToast, onDonorUpdated }) {
  const [phone, setPhone] = useState(donor.phone || "");
  const [email, setEmail] = useState(donor.email || "");
  const [address, setAddress] = useState(donor.address || "");
  const [donorType, setDonorType] = useState(donor.donor_type || "individual");
  const [notes, setNotes] = useState(donor.notes || "");
  const [saving, setSaving] = useState(false);

  const [followups, setFollowups] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [newDate, setNewDate] = useState("");

  async function loadFollowups() {
    const { data } = await supabase.from("donor_followups").select("*").eq("donor_id", donor.id).order("follow_up_date", { ascending: true });
    setFollowups(data || []);
  }

  useEffect(() => { loadFollowups(); }, [donor.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveDonorInfo(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("donors").update({ phone, email, address, donor_type: donorType, notes }).eq("id", donor.id);
    setSaving(false);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "দাতার তথ্য হালনাগাদ হয়েছে" });
    onDonorUpdated();
  }

  async function addFollowup(e) {
    e.preventDefault();
    const { error } = await supabase.from("donor_followups").insert({
      institution_id: institutionId,
      donor_id: donor.id,
      note: newNote,
      follow_up_date: newDate || null,
    });
    if (error) return onToast({ type: "error", message: error.message });
    setNewNote(""); setNewDate("");
    loadFollowups();
  }

  async function toggleFollowup(f) {
    const { error } = await supabase.from("donor_followups").update({ completed: !f.completed }).eq("id", f.id);
    if (error) onToast({ type: "error", message: error.message });
    else loadFollowups();
  }

  async function deleteFollowup(id) {
    const { error } = await supabase.from("donor_followups").delete().eq("id", id);
    if (error) onToast({ type: "error", message: error.message });
    else loadFollowups();
  }

  const yearlyTrend = useMemo(() => {
    const byYear = {};
    donations.forEach((d) => {
      const y = new Date(d.created_at).getFullYear();
      byYear[y] = (byYear[y] || 0) + Number(d.amount || 0);
    });
    return Object.entries(byYear).map(([year, amount]) => ({ year, amount })).sort((a, b) => a.year - b.year);
  }, [donations]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-5 pb-5 border-t border-gold-500/10 pt-4 space-y-5">
      {canEdit && (
        <form onSubmit={saveDonorInfo} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input placeholder="ফোন নম্বর" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-xs" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="ইমেইল" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-xs" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="ঠিকানা" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-xs" value={address} onChange={(e) => setAddress(e.target.value)} />
          <select className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-xs" value={donorType} onChange={(e) => setDonorType(e.target.value)}>
            <option value="individual">ব্যক্তি</option>
            <option value="organization">প্রতিষ্ঠান</option>
          </select>
          <textarea placeholder="মন্তব্য/নোট" rows={2} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-xs sm:col-span-2 lg:col-span-3" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button disabled={saving} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 rounded-xl text-xs disabled:opacity-50">
            {saving ? "..." : "তথ্য সংরক্ষণ করুন"}
          </button>
        </form>
      )}

      {yearlyTrend.length > 0 && (
        <div>
          <div className="text-xs text-cream/40 mb-2">বার্ষিক দানের প্রবণতা</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={yearlyTrend}>
              <CartesianGrid stroke="rgba(245,180,0,0.08)" />
              <XAxis dataKey="year" tick={{ fill: "#f4ead9aa", fontSize: 11 }} />
              <YAxis tick={{ fill: "#f4ead9aa", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#0c2b1e", border: "1px solid rgba(245,180,0,0.2)", borderRadius: 8 }} />
              <Bar dataKey="amount" fill="#f5b400" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <div className="text-xs text-cream/40 mb-2">দানের ইতিহাস</div>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {donations.map((d) => (
            <div key={d.id} className="flex justify-between text-xs text-cream/60 border-b border-gold-500/5 py-1.5">
              <span>{new Date(d.created_at).toLocaleDateString("bn-BD")} · {d.purpose}</span>
              <span className="text-gold-300">৳{Number(d.amount).toLocaleString("bn-BD")}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-cream/40 mb-2">ফলো-আপ রিমাইন্ডার</div>
        {canEdit && (
          <form onSubmit={addFollowup} className="flex flex-wrap gap-2 mb-3">
            <input required placeholder="নোট (যেমন: কুরবানির আপিলের জন্য ফোন করতে হবে)" className="flex-1 min-w-[180px] bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-xs" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
            <input type="date" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-xs" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <button className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-3 rounded-xl text-xs">যোগ করুন</button>
          </form>
        )}
        <div className="space-y-1.5">
          {followups.length === 0 && <div className="text-xs text-cream/30">কোনো ফলো-আপ নেই।</div>}
          {followups.map((f) => {
            const overdue = f.follow_up_date && f.follow_up_date < today && !f.completed;
            return (
              <div key={f.id} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${f.completed ? "bg-emerald-500/10 text-emerald-300/70 line-through" : overdue ? "bg-red-500/10 text-red-300" : "bg-ink-900/40 text-cream/70"}`}>
                <span className="flex-1">{f.note} {f.follow_up_date && <span className="opacity-60">— {f.follow_up_date}</span>}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleFollowup(f)} className="hover:underline">{f.completed ? "পুনরায় চালু" : "সম্পন্ন"}</button>
                  <button onClick={() => deleteFollowup(f.id)} className="text-red-400 hover:text-red-300">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
