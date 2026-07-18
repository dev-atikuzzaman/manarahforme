import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Settings({ profile, institution, canEdit, onInstitutionUpdate, onToast, onLogout }) {
  const [tab, setTab] = useState("institution");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("institution")} className={`px-4 py-2 rounded-xl text-sm ${tab === "institution" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>প্রতিষ্ঠান</button>
        <button onClick={() => setTab("profile")} className={`px-4 py-2 rounded-xl text-sm ${tab === "profile" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>আমার প্রোফাইল</button>
        {profile.role === "super_admin" && (
          <button onClick={() => setTab("danger")} className={`px-4 py-2 rounded-xl text-sm ${tab === "danger" ? "bg-red-500/15 text-red-300 border border-red-500/30" : "text-cream/50 border border-white/10"}`}>বিপজ্জনক এলাকা</button>
        )}
      </div>

      {tab === "institution" && (
        <InstitutionTab institution={institution} canEdit={canEdit} onInstitutionUpdate={onInstitutionUpdate} onToast={onToast} />
      )}
      {tab === "profile" && <ProfileTab profile={profile} onToast={onToast} />}
      {tab === "danger" && profile.role === "super_admin" && (
        <DangerTab institution={institution} onToast={onToast} onLogout={onLogout} />
      )}
    </div>
  );
}

function InstitutionTab({ institution, canEdit, onInstitutionUpdate, onToast }) {
  const [name, setName] = useState(institution?.name || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function saveName(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("institutions").update({ name }).eq("id", institution.id);
    setSaving(false);
    if (error) return onToast({ type: "error", message: error.message });
    onInstitutionUpdate({ ...institution, name });
    onToast({ message: "প্রতিষ্ঠানের নাম হালনাগাদ হয়েছে" });
  }

  async function regenerateCode() {
    if (!window.confirm("নতুন কোড তৈরি করলে পুরনো কোড আর কাজ করবে না। এগিয়ে যাবেন?")) return;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from("institutions").update({ invite_code: code }).eq("id", institution.id);
    if (error) return onToast({ type: "error", message: error.message });
    onInstitutionUpdate({ ...institution, invite_code: code });
    onToast({ message: "নতুন ইনভাইট কোড তৈরি হয়েছে" });
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${institution.id}/logo.png`;
    const { error: upErr } = await supabase.storage.from("institution-logos").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploading(false); return onToast({ type: "error", message: upErr.message }); }
    const { data } = supabase.storage.from("institution-logos").getPublicUrl(path);
    const logo_url = `${data.publicUrl}?t=${Date.now()}`;
    const { error } = await supabase.from("institutions").update({ logo_url }).eq("id", institution.id);
    setUploading(false);
    if (error) return onToast({ type: "error", message: error.message });
    onInstitutionUpdate({ ...institution, logo_url });
    onToast({ message: "লোগো আপলোড হয়েছে" });
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="text-sm text-cream/60">লোগো</div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-ink-900/60 border border-gold-500/20 flex items-center justify-center overflow-hidden">
            {institution?.logo_url ? <img src={institution.logo_url} alt="লোগো" className="w-full h-full object-cover" /> : <span className="text-gold-400/40 text-2xl">✦</span>}
          </div>
          {canEdit && (
            <label className="text-xs text-gold-400 hover:text-gold-300 cursor-pointer border border-gold-500/30 rounded-xl px-3 py-2">
              {uploading ? "আপলোড হচ্ছে..." : "লোগো পরিবর্তন করুন"}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      <form onSubmit={saveName} className="glass-card rounded-2xl p-6 space-y-3">
        <div className="text-sm text-cream/60">প্রতিষ্ঠানের নাম</div>
        <input disabled={!canEdit} className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm disabled:opacity-60" value={name} onChange={(e) => setName(e.target.value)} />
        {canEdit && (
          <button disabled={saving} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-50">
            {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </button>
        )}
      </form>

      <div className="glass-card rounded-2xl p-6 space-y-3">
        <div className="text-sm text-cream/60">ইনভাইট কোড</div>
        <div className="flex items-center gap-3">
          <code className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-3 py-1.5 text-gold-300 tracking-widest">{institution?.invite_code}</code>
          <button onClick={() => navigator.clipboard.writeText(institution?.invite_code || "")} className="text-xs text-cream/50 hover:text-gold-400">কপি করুন</button>
          {canEdit && <button onClick={regenerateCode} className="text-xs text-red-400 hover:text-red-300 ml-auto">নতুন কোড তৈরি করুন</button>}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ profile, onToast }) {
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [password, setPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  async function saveName(e) {
    e.preventDefault();
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile.id);
    setSavingName(false);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "নাম হালনাগাদ হয়েছে" });
  }

  async function savePassword(e) {
    e.preventDefault();
    if (password.length < 6) return onToast({ type: "error", message: "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে" });
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPass(false);
    if (error) return onToast({ type: "error", message: error.message });
    setPassword("");
    onToast({ message: "পাসওয়ার্ড পরিবর্তন হয়েছে" });
  }

  return (
    <div className="space-y-5 max-w-xl">
      <form onSubmit={saveName} className="glass-card rounded-2xl p-6 space-y-3">
        <div className="text-sm text-cream/60">আপনার নাম</div>
        <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <button disabled={savingName} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-50">
          {savingName ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </button>
      </form>

      <form onSubmit={savePassword} className="glass-card rounded-2xl p-6 space-y-3">
        <div className="text-sm text-cream/60">পাসওয়ার্ড পরিবর্তন</div>
        <input type="password" placeholder="নতুন পাসওয়ার্ড (৬+ ক্যারেক্টার)" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={savingPass} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-50">
          {savingPass ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
        </button>
      </form>

      <div className="glass-card rounded-2xl p-6 text-xs text-cream/40">
        ভূমিকা: <span className="text-gold-400">{profile.role}</span> · অবস্থা: <span className="text-gold-400">{profile.status}</span>
      </div>
    </div>
  );
}

function DangerTab({ institution, onToast, onLogout }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== institution.name) {
      return onToast({ type: "error", message: "প্রতিষ্ঠানের নাম হুবহু লিখুন নিশ্চিত করতে" });
    }
    if (!window.confirm("এই প্রতিষ্ঠানের সব ডাটা (শিক্ষার্থী, উপস্থিতি, দান, হিসাব — সবকিছু) স্থায়ীভাবে মুছে যাবে। এটা আর ফেরত আনা যাবে না। নিশ্চিত?")) return;
    setDeleting(true);
    const { error } = await supabase.from("institutions").delete().eq("id", institution.id);
    setDeleting(false);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "প্রতিষ্ঠান মুছে ফেলা হয়েছে" });
    onLogout();
  }

  return (
    <div className="glass-card rounded-2xl p-6 max-w-xl space-y-4 border-red-500/20">
      <div className="text-red-300 font-semibold">প্রতিষ্ঠান মুছে ফেলুন</div>
      <p className="text-xs text-cream/50 leading-relaxed">
        এটা সম্পূর্ণ প্রতিষ্ঠান — সব শিক্ষার্থী, উপস্থিতি, দান, একাউন্টিং, কুরবানি হিসাব, সদস্য — সবকিছু স্থায়ীভাবে মুছে দেবে। এই কাজটি ফেরত নেওয়া যায় না।
      </p>
      <p className="text-xs text-cream/40">নিশ্চিত করতে নিচে প্রতিষ্ঠানের পুরো নাম "<span className="text-cream/70">{institution.name}</span>" লিখুন:</p>
      <input className="w-full bg-ink-900/60 border border-red-500/30 rounded-xl px-3 py-2 text-sm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      <button disabled={deleting} onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-50">
        {deleting ? "মুছে ফেলা হচ্ছে..." : "স্থায়ীভাবে মুছে ফেলুন"}
      </button>
    </div>
  );
}
