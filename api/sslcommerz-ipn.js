// SSLCommerz IPN (Instant Payment Notification) — গেটওয়ে সফল পেমেন্টের পর এই URL-এ কল করে।
// নিরাপত্তার জন্য কখনোই ক্লায়েন্ট থেকে আসা success_url-কে সরাসরি বিশ্বাস করা হয় না —
// এখানে SSLCommerz-এর ভ্যালিডেশন API দিয়ে দ্বিতীয়বার যাচাই করা হয়, তারপর ডাটাবেজ আপডেট হয়।
//
// প্রয়োজনীয় এনভায়রনমেন্ট ভ্যারিয়েবল: SSLCOMMERZ_STORE_ID, SSLCOMMERZ_STORE_PASSWORD,
// SUPABASE_SERVICE_ROLE_KEY (আগের fee-reminder ফিচারেও ব্যবহৃত হয়েছিল)

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;

  if (!storeId || !storePassword || !serviceKey || !supabaseUrl) {
    return res.status(501).send("Gateway not configured yet.");
  }

  const valId = req.body?.val_id || req.query?.val_id;
  if (!valId) {
    return res.redirect(302, "/?payment=failed");
  }

  const isSandbox = process.env.SSLCOMMERZ_SANDBOX !== "false";
  const validationUrl = isSandbox
    ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&format=json`
    : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&format=json`;

  try {
    const verifyRes = await fetch(validationUrl);
    const verify = await verifyRes.json();

    if (verify.status !== "VALID" && verify.status !== "VALIDATED") {
      return res.redirect(302, "/?payment=failed");
    }

    const purpose = verify.value_a; // 'fee' | 'donation' | 'subscription'
    const institutionId = verify.value_b;
    const referenceId = verify.value_c; // student_id / donor context / institution_id
    const amount = verify.amount;

    const supabase = createClient(supabaseUrl, serviceKey);

    if (purpose === "subscription") {
      await supabase.from("platform_payments").insert({
        institution_id: institutionId,
        method: "other",
        transaction_id: verify.tran_id,
        amount,
        months_covered: 1,
        status: "verified", // গেটওয়ে দিয়ে যাচাই হওয়া পেমেন্ট — ম্যানুয়াল রিভিউ লাগে না
        verified_at: new Date().toISOString(),
      });
      const inst = await supabase.from("institutions").select("trial_ends_at").eq("id", institutionId).maybeSingle();
      const base = inst.data?.trial_ends_at && new Date(inst.data.trial_ends_at) > new Date() ? new Date(inst.data.trial_ends_at) : new Date();
      base.setDate(base.getDate() + 30);
      await supabase.from("institutions").update({ plan_status: "active", trial_ends_at: base.toISOString() }).eq("id", institutionId);
    } else if (purpose === "fee") {
      const now = new Date();
      await supabase.from("fee_payments").upsert(
        {
          institution_id: institutionId,
          student_id: referenceId,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          amount,
          transaction_id: verify.tran_id,
          verification_status: "verified",
        },
        { onConflict: "student_id,year,month" }
      );
    } else if (purpose === "donation") {
      await supabase.from("donations").insert({
        institution_id: institutionId,
        donor_name: verify.cus_name || "অনলাইন দাতা",
        amount,
        purpose: "সাধারণ দান",
        transaction_id: verify.tran_id,
        payment_method: "other",
      });
    }

    return res.redirect(302, "/?payment=success");
  } catch (err) {
    return res.redirect(302, "/?payment=error");
  }
}
