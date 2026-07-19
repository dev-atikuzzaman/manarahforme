// এটা Vercel Cron দিয়ে প্রতিদিন স্বয়ংক্রিয়ভাবে চলবে (vercel.json দেখুন)।
// শুধু মাসের ৫ থেকে ১৫ তারিখের মধ্যে কাজ করে (বারবার একই রিমাইন্ডার দিয়ে বিরক্ত না করার জন্য)।
//
// প্রয়োজনীয় এনভায়রনমেন্ট ভ্যারিয়েবল (Vercel Project Settings → Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase Project Settings → API → service_role key
//                                 (⚠️ এটা REACT_APP_ প্রিফিক্স দিয়ে না — এটা কখনো ব্রাউজারে যাবে না,
//                                  শুধু এই সার্ভার ফাংশনেই ব্যবহৃত হয়। ব্রাউজারে exposed হলে পুরো
//                                  ডাটাবেজ RLS বাইপাস করে যে কেউ অ্যাক্সেস করতে পারবে।)
//   CRON_SECRET                — একটা যেকোনো র‍্যান্ডম স্ট্রিং, Vercel Cron রিকোয়েস্টে যাচাই করতে ব্যবহৃত
//   SMS_API_KEY / SMS_SENDER_ID — (ঐচ্ছিক) থাকলে অভিভাবকদের সরাসরি SMS-ও পাঠাবে, না থাকলে শুধু
//                                 প্রতিষ্ঠানের অ্যাডমিনদের জন্য অ্যাপ-নোটিফিকেশন তৈরি করবে।

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const secret = req.headers["authorization"]?.replace("Bearer ", "") || req.query.secret;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const day = new Date().getDate();
  if (day < 5 || day > 15) {
    return res.status(200).json({ ok: true, skipped: "রিমাইন্ডার উইন্ডোর বাইরে (৫-১৫ তারিখ)" });
  }

  const url = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY কনফিগার করা নেই।" });
  }
  const supabase = createClient(url, serviceKey);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: institutions, error: instErr } = await supabase
    .from("institutions")
    .select("id, name, plan_status")
    .neq("plan_status", "suspended");
  if (instErr) return res.status(500).json({ error: instErr.message });

  const summary = [];

  for (const inst of institutions || []) {
    const { data: students } = await supabase
      .from("students")
      .select("id, name, phone, monthly_fee")
      .eq("institution_id", inst.id)
      .not("monthly_fee", "is", null)
      .not("phone", "is", null);
    if (!students || students.length === 0) continue;

    const { data: paidRows } = await supabase
      .from("fee_payments")
      .select("student_id")
      .eq("institution_id", inst.id)
      .eq("year", year)
      .eq("month", month);
    const paidIds = new Set((paidRows || []).map((p) => p.student_id));
    const unpaid = students.filter((s) => !paidIds.has(s.id));
    if (unpaid.length === 0) continue;

    const totalDue = unpaid.reduce((s, u) => s + Number(u.monthly_fee || 0), 0);

    await supabase.from("notifications").insert({
      institution_id: inst.id,
      title: "ফি বকেয়া রিমাইন্ডার",
      message: `এই মাসে ${unpaid.length} জন শিক্ষার্থীর মোট ৳${totalDue} ফি এখনো বাকি।`,
    });

    if (process.env.SMS_API_KEY && process.env.SMS_SENDER_ID) {
      const numbers = unpaid.map((u) => String(u.phone).replace(/[^0-9]/g, "")).filter(Boolean);
      if (numbers.length > 0) {
        const endpoint = process.env.SMS_ENDPOINT || "https://bulksmsbd.net/api/smsapi";
        const message = `${inst.name}: আসসালামু আলাইকুম, এই মাসের মাদ্রাসা ফি এখনো জমা হয়নি। দ্রুত পরিশোধ করার অনুরোধ রইলো।`;
        const smsUrl = `${endpoint}?api_key=${encodeURIComponent(process.env.SMS_API_KEY)}&type=text&number=${encodeURIComponent(numbers.join(","))}&senderid=${encodeURIComponent(process.env.SMS_SENDER_ID)}&message=${encodeURIComponent(message)}`;
        try {
          await fetch(smsUrl);
        } catch (_) {
          // SMS ব্যর্থ হলেও অ্যাপ-নোটিফিকেশনটা থেকে যাবে, পুরো cron ব্যর্থ করে দেওয়া হবে না
        }
      }
    }

    summary.push({ institution: inst.name, unpaid: unpaid.length, totalDue });
  }

  return res.status(200).json({ ok: true, day, checked: institutions?.length || 0, summary });
}
