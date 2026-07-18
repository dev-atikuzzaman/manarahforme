// POST { numbers: string[], message: string }
// এনভায়রনমেন্ট ভ্যারিয়েবল প্রয়োজন (Vercel Project Settings → Environment Variables):
//   SMS_API_KEY     — তোমার SMS গেটওয়ে থেকে পাওয়া API key
//   SMS_SENDER_ID   — অনুমোদিত সেন্ডার আইডি
//
// ডিফল্টভাবে এটা bulksmsbd.net-এর API ফরম্যাট অনুসরণ করে (বাংলাদেশে জনপ্রিয় একটা গেটওয়ে)।
// অন্য কোনো গেটওয়ে (Alpha SMS, Elit BuzZ, etc.) ব্যবহার করলে শুধু SMS_ENDPOINT বদলে দিলেই হবে —
// প্রতিটা গেটওয়ের রিকোয়েস্ট ফরম্যাট প্রায় একই রকম (api_key + sender + number + message)।

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "শুধু POST রিকোয়েস্ট গ্রহণযোগ্য" });
  }

  const { numbers, message } = req.body || {};
  if (!Array.isArray(numbers) || numbers.length === 0 || !message) {
    return res.status(400).json({ error: "numbers (array) এবং message আবশ্যক" });
  }

  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID;
  if (!apiKey || !senderId) {
    return res.status(500).json({ error: "SMS_API_KEY / SMS_SENDER_ID কনফিগার করা নেই — Vercel এনভায়রনমেন্ট ভ্যারিয়েবলে যোগ করুন।" });
  }

  const cleanNumbers = numbers.map((n) => String(n).replace(/[^0-9]/g, "")).filter(Boolean);
  const endpoint = process.env.SMS_ENDPOINT || "https://bulksmsbd.net/api/smsapi";

  try {
    const url = `${endpoint}?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(cleanNumbers.join(","))}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;
    const response = await fetch(url);
    const text = await response.text();
    return res.status(200).json({ ok: true, sent_to: cleanNumbers.length, gateway_response: text });
  } catch (err) {
    return res.status(500).json({ error: "SMS পাঠাতে সমস্যা হয়েছে: " + err.message });
  }
}
