import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportReceipt } from "../../lib/exportUtils";

const NISAB_GRAMS_SILVER = 612.36; // শরীয়াহ মতে নিসাব সাধারণত রূপার হিসাবে ধরা হয় (দরিদ্রদের জন্য উপকারী)

export default function Donations({ institutionId, institutionName, canEdit, onToast }) {
  const [tab, setTab] = useState("donations"); // donations | zakat
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ donor_name: "", amount: "", purpose: "সাধারণ দান", note: "" });

  // যাকাত ক্যালকুলেটর স্টেট
  const [silverPrice, setSilverPrice] = useState("");
  const [cash, setCash] = useState("");
  const [goldValue, setGoldValue] = useState("");
  const [businessAssets, setBusinessAssets] = useState("");
  const [receivables, setReceivables] = useState("");
  const [liabilities, setLiabilities] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("donations")
      .select("*")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("donations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "donations", filter: `institution_id=eq.${institutionId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const donorName = form.donor_name.trim();

    // দাতার নাম মিলিয়ে বিদ্যমান donor রেকর্ড খুঁজে বের করা, না পেলে নতুন তৈরি —
    // ফর্মের ইউআই একই থাকছে, ব্যাকগ্রাউন্ডেই CRM ডাটা তৈরি হচ্ছে।
    let donorId = null;
    const { data: existingDonor } = await supabase
      .from("donors")
      .select("id")
      .eq("institution_id", institutionId)
      .ilike("name", donorName)
      .maybeSingle();
    if (existingDonor) {
      donorId = existingDonor.id;
    } else {
      const { data: newDonor, error: donorErr } = await supabase
        .from("donors")
        .insert({ institution_id: institutionId, name: donorName })
        .select()
        .single();
      if (!donorErr) donorId = newDonor?.id;
    }

    const { error } = await supabase.from("donations").insert({
      institution_id: institutionId,
      donor_id: donorId,
      donor_name: form.donor_name,
      amount: Number(form.amount),
      purpose: form.purpose,
      note: form.note,
    });
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "দান রেকর্ড করা হয়েছে" });
    setForm({ donor_name: "", amount: "", purpose: "সাধারণ দান", note: "" });
  }

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  const [downloadingId, setDownloadingId] = useState(null);
  async function downloadReceipt(r) {
    setDownloadingId(r.id);
    try {
      await exportReceipt({
        institutionName,
        receiptNo: `MNR-${r.id.slice(0, 8).toUpperCase()}`,
        donorName: r.donor_name,
        amount: r.amount,
        purpose: r.purpose,
        note: r.note,
        date: new Date(r.created_at).toLocaleDateString("bn-BD"),
      });
    } finally {
      setDownloadingId(null);
    }
  }

  const nisabValue = silverPrice ? NISAB_GRAMS_SILVER * Number(silverPrice) : 0;
  const totalAssets = [cash, goldValue, businessAssets, receivables].reduce((s, v) => s + (Number(v) || 0), 0) - (Number(liabilities) || 0);
  const isEligible = nisabValue > 0 && totalAssets >= nisabValue;
  const zakatDue = isEligible ? totalAssets * 0.025 : 0;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setTab("donations")} className={`px-4 py-2 rounded-xl text-sm ${tab === "donations" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>দান তালিকা</button>
        <button onClick={() => setTab("zakat")} className={`px-4 py-2 rounded-xl text-sm ${tab === "zakat" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>যাকাত ক্যালকুলেটর</button>
      </div>

      {tab === "donations" && (
        <>
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
            <span className="text-cream/50 text-sm">সর্বমোট সংগৃহীত দান</span>
            <span className="text-2xl font-display text-gold-400">৳{total.toLocaleString("bn-BD")}</span>
          </div>

          {canEdit && (
            <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input required placeholder="দাতার নাম" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.donor_name} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} />
              <input required type="number" placeholder="পরিমাণ (৳)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <select className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                <option>সাধারণ দান</option>
                <option>যাকাত</option>
                <option>ফিতরা</option>
                <option>ওয়াকফ</option>
                <option>নির্মাণ কাজ</option>
              </select>
              <input placeholder="মন্তব্য (ঐচ্ছিক)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <button className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 rounded-xl text-sm">রেকর্ড করুন</button>
            </form>
          )}

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-cream/40 border-b border-gold-500/10">
                    <th className="px-4 py-3 font-medium">দাতা</th>
                    <th className="px-4 py-3 font-medium">খাত</th>
                    <th className="px-4 py-3 font-medium">পরিমাণ</th>
                    <th className="px-4 py-3 font-medium">মন্তব্য</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
                  {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-cream/40">এখনও কোনো দান রেকর্ড হয়নি।</td></tr>}
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-gold-500/5 hover:bg-white/5">
                      <td className="px-4 py-3">{r.donor_name}</td>
                      <td className="px-4 py-3 text-cream/60">{r.purpose}</td>
                      <td className="px-4 py-3 text-gold-300">৳{Number(r.amount).toLocaleString("bn-BD")}</td>
                      <td className="px-4 py-3 text-cream/50">{r.note}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => downloadReceipt(r)} disabled={downloadingId === r.id} className="text-xs text-gold-400 hover:text-gold-300 disabled:opacity-50">
                          {downloadingId === r.id ? "..." : "রশিদ PDF"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "zakat" && (
        <div className="glass-card rounded-2xl p-6 max-w-2xl space-y-4">
          <p className="text-xs text-cream/45 leading-relaxed">
            এই ক্যালকুলেটর রূপার নিসাব (৬১২.৩৬ গ্রাম) ভিত্তিতে হিসাব করে, যা দরিদ্রদের জন্য বেশি উপকারী মত।
            সঠিক ফতোয়ার জন্য স্থানীয় আলেমের পরামর্শ নেওয়া উত্তম — এটি শুধু একটি সহায়ক টুল, ফতোয়া নয়।
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-cream/50 space-y-1">
              <span>আজকের প্রতি গ্রাম রূপার দাম (৳)</span>
              <input type="number" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm text-cream" value={silverPrice} onChange={(e) => setSilverPrice(e.target.value)} />
            </label>
            <label className="text-xs text-cream/50 space-y-1">
              <span>হাতে থাকা নগদ ও ব্যাংক ব্যালেন্স (৳)</span>
              <input type="number" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm text-cream" value={cash} onChange={(e) => setCash(e.target.value)} />
            </label>
            <label className="text-xs text-cream/50 space-y-1">
              <span>সোনা/রূপার বাজারমূল্য (৳)</span>
              <input type="number" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm text-cream" value={goldValue} onChange={(e) => setGoldValue(e.target.value)} />
            </label>
            <label className="text-xs text-cream/50 space-y-1">
              <span>ব্যবসায়িক পণ্য/মজুদের মূল্য (৳)</span>
              <input type="number" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm text-cream" value={businessAssets} onChange={(e) => setBusinessAssets(e.target.value)} />
            </label>
            <label className="text-xs text-cream/50 space-y-1">
              <span>পাওনা টাকা (৳)</span>
              <input type="number" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm text-cream" value={receivables} onChange={(e) => setReceivables(e.target.value)} />
            </label>
            <label className="text-xs text-cream/50 space-y-1">
              <span>ঋণ/দেনা (৳)</span>
              <input type="number" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm text-cream" value={liabilities} onChange={(e) => setLiabilities(e.target.value)} />
            </label>
          </div>

          <div className="motif-divider text-xs pt-2"><span>ফলাফল</span></div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-ink-900/40 rounded-xl p-4">
              <div className="text-cream/40 text-xs mb-1">নিসাবের পরিমাণ</div>
              <div className="text-gold-400 font-semibold">৳{nisabValue.toLocaleString("bn-BD", { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-ink-900/40 rounded-xl p-4">
              <div className="text-cream/40 text-xs mb-1">মোট সম্পদ (দেনা বাদে)</div>
              <div className="text-gold-400 font-semibold">৳{totalAssets.toLocaleString("bn-BD", { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-ink-900/40 rounded-xl p-4">
              <div className="text-cream/40 text-xs mb-1">যাকাত (২.৫%)</div>
              <div className="text-emerald-400 font-semibold">৳{zakatDue.toLocaleString("bn-BD", { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
          {silverPrice && (
            <p className="text-xs">
              {isEligible ? (
                <span className="text-emerald-400">নিসাব পূর্ণ হয়েছে — যাকাত ওয়াজিব।</span>
              ) : (
                <span className="text-cream/40">সম্পদ নিসাবের নিচে — যাকাত ওয়াজিব নয়।</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
