// Edge Function: read a photo or screenshot related to money and extract what
// it holds. The image is sent inline and NOT stored — we only return the data;
// the user confirms it before anything is saved.
//
// It first CLASSIFIES the image, then extracts accordingly:
//   • a receipt, or a statement / transaction history  → kind "transactions"
//   • a banking / mobile-money balance screen           → kind "balance"
//
// Reply shape { kind, rows, balances }:
//   { "kind": "transactions",
//     "rows": [{date, description, amountMajor, direction, categoryHint}] }
//   { "kind": "balance",
//     "balances": [{label, amountMajor}] }
//
// Deploy:  supabase functions deploy parse-statement
// Secret:  shares the same OPENAI_API_KEY as `transcribe`.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not set" }, 500);

  let imageBase64: string, mimeType: string, categories: string[] = [];
  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType ?? "image/jpeg";
    categories = Array.isArray(body.categories) ? body.categories : [];
  } catch {
    return json({ error: "Expected JSON with `imageBase64`." }, 400);
  }
  if (!imageBase64) return json({ error: "Missing `imageBase64`." }, 400);

  const sys =
    "You read a photo or screenshot related to personal finance and extract " +
    "its data. Currency is XAF (FCFA), whole numbers (strip separators). " +
    "First decide what the image is:\n" +
    "• If it shows one or more ACCOUNT BALANCES (a banking app home screen, a " +
    "mobile-money balance, a wallet total), reply with kind 'balance' and the " +
    "balance figure(s). `label` is the account/wallet name if visible, else null.\n" +
    "• Otherwise it is a receipt or a list of transactions: reply with kind " +
    "'transactions'. A single receipt is ONE row. `direction` is 'in' for money " +
    "received/credited, 'out' for money spent/debited/withdrawn (a purchase " +
    "receipt is 'out').\n" +
    "Reply ONLY with minified JSON of this exact shape: " +
    `{"kind":"transactions"|"balance",` +
    `"rows":[{"date":"YYYY-MM-DD"|null,"description":string,"amountMajor":number,"direction":"in"|"out","categoryHint":string|null}],` +
    `"balances":[{"label":string|null,"amountMajor":number}]}. ` +
    "Include only the array that matches `kind`; the other may be empty. " +
    (categories.length ? `Prefer categoryHint from: ${categories.join(", ")}.` : "");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        {
          role: "user",
          content: [
            { type: "text", text: "Classify this image and extract what it holds." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return json({ error: `Vision failed: ${await res.text()}` }, 502);

  let out: { kind: string; rows: unknown[]; balances: unknown[] } = {
    kind: "transactions",
    rows: [],
    balances: [],
  };
  try {
    const parsed = JSON.parse((await res.json()).choices[0].message.content);
    out = {
      kind: parsed.kind === "balance" ? "balance" : "transactions",
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],
      balances: Array.isArray(parsed.balances) ? parsed.balances : [],
    };
  } catch {
    /* keep defaults */
  }
  return json(out);
});
