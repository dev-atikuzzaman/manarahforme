import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const METHOD_LABEL = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", upay: "উপায়", bank: "ব্যাংক", other: "অন্যান্য" };
const STATUS_LABEL = { pending: "যাচাইয়ের অপেক্ষায়", verified: "যাচাইকৃত", rejected: "প্রত্যাখ্যাত" };
const STATUS_COLOR = { pending: "bg-gold-500/15 text-gold-300", verified: "bg-emerald-500/15 text-emerald-300", rejected: "bg-red-500/15 text-red-300" };

export default function SubscriptionPayment({ institution, profile, onToast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");
  const [monthsCovered, setMonthsCovered] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("platform_payments").select("*").eq("institution_id", institution.id).order("created_at", { ascending: false });
    setHistory(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("platform-payments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_payments", filter: `institution_id=eq.${institution.id}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institution.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("platform_payments").insert({
      institution_id: institution.id,
      method,
      sender_number: senderNumber,
      transaction_id: transactionId,
      amount: Number(amount),
      months_covered: Number(monthsCovered),
      submitted_by: profile.id,
    });
    setSubmitting(false);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "পেমেন্ট জমা দেওয়া হয়েছে — যাচাইয়ের অপেক্ষায় আছে" });
    setSenderNumber(""); setTransactionId(""); setAmount("");
  }

  const trialExpired = institution.trial_ends_at && new Date(institution.trial_ends_at) < new Date() && (institution.plan_status === "trial" || !institution.plan_status);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="glass-card rounded-2xl p-6">
        <div className="text-sm text-cream/60 mb-1">বর্তমান অবস্থা</div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-3 py-1 rounded-full ${institution.plan_status === "active" ? "bg-emerald-500/15 text-emerald-300" : institution.plan_status === "suspended" ? "bg-red-500/15 text-red-300" : "bg-gold-500/15 text-gold-300"}`}>
            {institution.plan_status === "active" ? "সক্রিয়" : institution.plan_status === "suspended" ? "স্থগিত" : "ট্রায়াল"}
          </span>
          {institution.trial_ends_at && (
            <span className={`text-xs ${trialExpired ? "text-red-400" : "text-cream/40"}`}>
              {trialExpired ? "মেয়াদ শেষ হয়ে গেছে" : `মেয়াদ শেষ: ${new Date(institution.trial_ends_at).toLocaleDateString("bn-BD")}`}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-3">
        <div className="text-sm text-cream/60 mb-1">সাবস্ক্রিপশন পেমেন্ট জমা দিন</div>
        <p className="text-xs text-cream/40 mb-3">নিচের bKash/Nagad/Rocket/Upay নম্বরে টাকা পাঠিয়ে ট্রানজেকশন আইডি দিয়ে জমা দিন — মালিক যাচাই করার পর আপনার প্রতিষ্ঠান সক্রিয় হয়ে যাবে।</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <select className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input required placeholder="আপনার প্রেরক নম্বর" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} />
          <input required placeholder="ট্রানজেকশন আইডি (TrxID)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
          <input required type="number" placeholder="পরিমাণ (৳)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm sm:col-span-2" value={monthsCovered} onChange={(e) => setMonthsCovered(e.target.value)}>
            <option value={1}>১ মাসের সাবস্ক্রিপশন</option>
            <option value={3}>৩ মাসের সাবস্ক্রিপশন</option>
            <option value={6}>৬ মাসের সাবস্ক্রিপশন</option>
            <option value={12}>১২ মাসের সাবস্ক্রিপশন</option>
          </select>
        </div>
        <button disabled={submitting} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50">
          {submitting ? "জমা হচ্ছে..." : "পেমেন্ট জমা দিন"}
        </button>
      </form>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gold-500/10 text-sm text-cream/60">জমার ইতিহাস</div>
        {loading && <div className="px-5 py-6 text-center text-cream/40 text-sm">লোড হচ্ছে...</div>}
        {!loading && history.length === 0 && <div className="px-5 py-6 text-center text-cream/40 text-sm">এখনো কোনো পেমেন্ট জমা দেওয়া হয়নি।</div>}
        {history.map((p) => (
          <div key={p.id} className="px-5 py-3 border-b border-gold-500/5 flex items-center justify-between text-sm">
            <div>
              <div className="text-cream/80">{METHOD_LABEL[p.method]} · ৳{Number(p.amount).toLocaleString("bn-BD")} · {p.months_covered} মাস</div>
              <div className="text-xs text-cream/40">TrxID: {p.transaction_id} · {new Date(p.created_at).toLocaleDateString("bn-BD")}</div>
              {p.note && <div className="text-xs text-red-300/70 mt-0.5">{p.note}</div>}
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
