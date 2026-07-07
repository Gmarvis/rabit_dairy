// Edge Function: read a bank / mobile-money statement image and return the
// candidate transaction rows. The image is sent inline and NOT stored — we only
// extract the rows; the user confirms them before anything is imported.
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
    "You read a bank or mobile-money statement/screenshot and extract its " +
    "transactions. Currency is XAF (FCFA), whole numbers. `direction` is 'in' " +
    "for money received/credited, 'out' for money spent/debited/withdrawn. " +
    "Reply ONLY with minified JSON: " +
    `{"rows":[{"date":"YYYY-MM-DD"|null,"description":string,"amountMajor":number,` +
    `"direction":"in"|"out","categoryHint":string|null}]}. ` +
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
            { type: "text", text: "Extract every transaction you can read." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return json({ error: `Vision failed: ${await res.text()}` }, 502);

  let rows: unknown[] = [];
  try {
    rows = JSON.parse((await res.json()).choices[0].message.content).rows ?? [];
  } catch {
    rows = [];
  }
  return json({ rows });
});
