import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import Logo from "./Logo";

// error.message কখনো কখনো ফাঁকা অবজেক্ট বা খালি স্ট্রিং হয়ে আসে — এই ফাংশন সবসময়
// একটা বোঝা যায় এমন বার্তা নিশ্চিত করে।
function safeMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === "string" && error.trim()) return error;
  const msg = error.message || error.error_description || error.msg;
  if (typeof msg === "string" && msg.trim() && msg.trim() !== "{}") return msg;
  try {
    const raw = JSON.stringify(error);
    if (raw && raw !== "{}" && raw !== "null") return `${fallback} [${raw.slice(0, 120)}]`;
  } catch (_) {}
  return fallback;
}

// এই স্ক্রিনটা দেখানো হয় যখন একটা সেশন (লগইন) আছে, কিন্তু সেই ইউজারের সাথে কোনো
// profiles/platform_admins/guardian_links রো জোড়া নেই — যেমনটা হয় যখন কেউ লগইন
// পেজ থেকে সরাসরি "Google দিয়ে প্রবেশ করুন" চাপে নতুন ইমেইল দিয়ে (এতে Supabase
// একটা অ্যাকাউন্ট বানিয়ে ফেলে, কিন্তু প্রতিষ্ঠান/ভূমিকা তৈরি হয় না)।
// আগে এই অবস্থায় একটা ডেড-এন্ড এরর কার্ড দেখানো হতো; এখন এখান থেকেই সরাসরি
// প্রতিষ্ঠান তৈরি বা কোড দিয়ে জয়েন করা যায় — নতুন করে সাইন-আপ ছাড়াই, কারণ
// সেশন already আছে।
export default function CompleteSetup({ session, onDone, onGuardianPortal, onLogout }) {
  const [mode, setMode] = useState("choose"); // choose | create | join
  const [fullName, setFullName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handleCreateInstitution(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data: inst, error: instErr } = await supabase
        .from("institutions")
        .insert({ name: institutionName, invite_code: code })
        .select()
        .single();
      if (instErr) return setErr(safeMessage(instErr, "প্রতিষ্ঠান তৈরি করা যায়নি।"));

      const { error: profErr } = await supabase.from("profiles").insert({
        id: session.user.id,
        full_name: fullName,
        institution_id: inst.id,
        role: "super_admin",
        status: "approved",
      });
      if (profErr) return setErr(safeMessage(profErr, "প্রোফাইল তৈরি করা যায়নি।"));

      onDone(`প্রতিষ্ঠান তৈরি হয়েছে। ইনভাইট কোড: ${code} — এটা সংরক্ষণ করে রাখুন।`);
    } catch (ex) {
      setErr(safeMessage(ex, "প্রতিষ্ঠান তৈরি করা যায়নি, নেটওয়ার্ক সমস্যা হতে পারে।"));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { data: inst, error: instErr } = await supabase
        .from("institutions")
        .select("id, name")
        .eq("invite_code", joinCode.trim().toUpperCase())
        .maybeSingle();
      if (instErr || !inst) return setErr("এই কোডে কোনো প্রতিষ্ঠান পাওয়া যায়নি। কোডটা আবার চেক করুন।");

      const { error: profErr } = await supabase.from("profiles").insert({
        id: session.user.id,
        full_name: fullName,
        institution_id: inst.id,
        role: "viewer",
        status: "pending",
      });
      if (profErr) return setErr(safeMessage(profErr, "যোগদানের অনুরোধ পাঠানো যায়নি।"));

      onDone(`"${inst.name}"-এ যোগদানের অনুরোধ পাঠানো হয়েছে। এডমিন অনুমোদন করলে প্রবেশ করতে পারবেন।`);
    } catch (ex) {
      setErr(safeMessage(ex, "যোগদানের অনুরোধ পাঠানো যায়নি, নেটওয়ার্ক সমস্যা হতে পারে।"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-hidden flex items-center justify-center px-4">
      <div className="blob w-96 h-96 bg-gold-500 -top-20 -left-20" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />

      <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 anim-in">
        <div className="text-center mb-6">
          <Logo size={44} className="mx-auto mb-2" />
          <div className="text-3xl font-display text-gold-400 mb-1">মানারাহ</div>
          <div className="text-cream/50 text-sm">
            {session.user.email} দিয়ে লগইন হয়েছে — এখন একটা ভূমিকা বেছে নিন
          </div>
        </div>

        {err && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm break-words">
            {err}
          </div>
        )}

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="w-full text-left bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl px-4 py-3 transition shadow-glow"
            >
              🕌 নতুন প্রতিষ্ঠান খুলুন
              <div className="text-xs font-normal text-ink-950/70 mt-0.5">আমি মসজিদ/মাদ্রাসার মালিক বা এডমিন</div>
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full text-left border border-gold-500/30 hover:bg-white/5 text-cream rounded-xl px-4 py-3 transition"
            >
              🔑 ইনভাইট কোড দিয়ে যোগ দিন
              <div className="text-xs font-normal text-cream/40 mt-0.5">আমি কোনো প্রতিষ্ঠানের স্টাফ/শিক্ষক</div>
            </button>
            <button
              onClick={onGuardianPortal}
              className="w-full text-left border border-gold-500/30 hover:bg-white/5 text-cream rounded-xl px-4 py-3 transition"
            >
              👨‍👩‍👧 অভিভাবক পোর্টাল
              <div className="text-xs font-normal text-cream/40 mt-0.5">আমি সন্তানের পোর্টাল কোড দিয়ে লিংক করতে চাই</div>
            </button>
            <button onClick={onLogout} className="w-full text-xs text-cream/50 hover:text-red-300 pt-2">
              ভুল অ্যাকাউন্টে লগইন হয়ে গেছে? লগআউট করুন
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreateInstitution} className="space-y-3">
            <input
              className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30"
              placeholder="আপনার নাম"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30"
              placeholder="মসজিদ/মাদ্রাসার নাম"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              required
            />
            <button disabled={busy} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5 transition shadow-glow disabled:opacity-50">
              {busy ? "..." : "প্রতিষ্ঠান তৈরি করুন"}
            </button>
            <button type="button" onClick={() => setMode("choose")} className="w-full text-xs text-cream/50 hover:text-gold-400 pt-1">
              ← ফিরে যান
            </button>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30"
              placeholder="আপনার নাম"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30 uppercase"
              placeholder="ইনভাইট কোড"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
            />
            <button disabled={busy} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5 transition shadow-glow disabled:opacity-50">
              {busy ? "..." : "যোগদানের অনুরোধ পাঠান"}
            </button>
            <button type="button" onClick={() => setMode("choose")} className="w-full text-xs text-cream/50 hover:text-gold-400 pt-1">
              ← ফিরে যান
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
