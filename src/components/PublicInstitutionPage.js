import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const METHOD_LABEL = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", upay: "উপায়", bank: "ব্যাংক", other: "অন্যান্য" };

export default function PublicInstitutionPage({ slug }) {
  const [institution, setInstitution] = useState(undefined); // undefined = loading, null = not found
  const [totalDonations, setTotalDonations] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("institutions").select("*").eq("public_slug", slug).maybeSingle();
      setInstitution(data || null);
      if (data) {
        const { data: donations } = await supabase
          .from("donations")
          .select("amount")
          .eq("institution_id", data.id)
          .eq("verification_status", "verified");
        setTotalDonations((donations || []).reduce((s, d) => s + Number(d.amount || 0), 0));
      }
    })();
  }, [slug]);

  if (institution === undefined) {
    return <div className="min-h-screen bg-ink-950 flex items-center justify-center text-cream/40">লোড হচ্ছে...</div>;
  }

  if (institution === null) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center px-6 text-center">
        <div className="glass-card rounded-3xl p-10 max-w-md">
          <div className="font-display text-xl text-gold-400 mb-2">পেজ পাওয়া যায়নি</div>
          <p className="text-sm text-cream/50">এই লিংকে কোনো প্রতিষ্ঠানের পাবলিক পেজ পাওয়া যায়নি।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-hidden">
      <div className="blob w-96 h-96 bg-gold-500 -top-24 -left-24" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-ink-900/60 border border-gold-500/20 flex items-center justify-center overflow-hidden mx-auto mb-4">
            {institution.logo_url ? <img src={institution.logo_url} alt="লোগো" className="w-full h-full object-cover" /> : <span className="text-gold-400/40 text-3xl">✦</span>}
          </div>
          <div className="font-display text-3xl text-gold-400 mb-1">{institution.name}</div>
          {institution.public_address && <div className="text-sm text-cream/40">{institution.public_address}</div>}
        </div>

        {institution.description && (
          <div className="glass-card rounded-2xl p-6 mb-6">
            <p className="text-sm text-cream/70 leading-relaxed whitespace-pre-wrap">{institution.description}</p>
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-cream/40">এ পর্যন্ত সংগৃহীত দান (যাচাইকৃত)</div>
            <div className="text-2xl font-display text-gold-400">৳{totalDonations.toLocaleString("bn-BD")}</div>
          </div>
          {institution.public_phone && (
            <a href={`tel:${institution.public_phone}`} className="text-xs text-gold-400 hover:text-gold-300 border border-gold-500/30 rounded-full px-4 py-2">
              📞 {institution.public_phone}
            </a>
          )}
        </div>

        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-2xl py-4 text-lg shadow-glow">
            দান করুন
          </button>
        ) : (
          <DonationForm institutionId={institution.id} onDone={() => setShowForm(false)} />
        )}

        <div className="text-center mt-10 text-xs text-cream/25">এই পেজটা মানারাহ দিয়ে তৈরি</div>
      </div>
    </div>
  );
}

function DonationForm({ institutionId, onDone }) {
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("সাধারণ দান");
  const [method, setMethod] = useState("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(""); setSubmitting(true);
    const noteParts = [];
    if (donorPhone) noteParts.push(`ফোন: ${donorPhone}`);
    if (senderNumber) noteParts.push(`প্রেরক নম্বর: ${senderNumber}`);
    const { error } = await supabase.from("donations").insert({
      institution_id: institutionId,
      donor_name: donorName,
      note: noteParts.join(" · ") || null,
      amount: Number(amount),
      purpose,
      payment_method: method,
      transaction_id: transactionId,
      verification_status: "pending",
    });
    setSubmitting(false);
    if (error) return setErr(error.message);
    setDone(true);
  }

  if (done) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="font-display text-lg text-emerald-400 mb-2">জাযাকাল্লাহু খইরান!</div>
        <p className="text-sm text-cream/60 mb-4">আপনার দান জমা হয়েছে, প্রতিষ্ঠান যাচাই করে নিশ্চিত করবে।</p>
        <button onClick={onDone} className="text-xs text-gold-400 hover:text-gold-300">← ফিরে যান</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-3">
      <div className="text-sm text-cream/60 mb-1">দানের তথ্য দিন</div>
      {err && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{err}</div>}

      <div className="grid sm:grid-cols-2 gap-3">
        <input required placeholder="আপনার নাম" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
        <input placeholder="ফোন নম্বর (ঐচ্ছিক)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} />
        <input required type="number" placeholder="পরিমাণ (৳)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          <option>সাধারণ দান</option>
          <option>যাকাত</option>
          <option>ফিতরা</option>
          <option>ওয়াকফ</option>
          <option>নির্মাণ কাজ</option>
        </select>
        <select className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
          {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input required placeholder="প্রেরক নম্বর" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} />
      </div>
      <input required placeholder="ট্রানজেকশন আইডি (TrxID)" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />

      <button disabled={submitting} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50">
        {submitting ? "জমা হচ্ছে..." : "দান জমা দিন"}
      </button>
      <button type="button" onClick={onDone} className="w-full text-center text-xs text-cream/40 hover:text-cream/60">বাতিল করুন</button>
    </form>
  );
}
