// Edge Function: transcribe a recorded voice note and parse it into a draft
// transaction. Runs on Supabase (Deno). The OpenAI key lives only here, as the
// `OPENAI_API_KEY` secret — never in the client or the repo.
//
// Deploy:  supabase functions deploy transcribe
// Secret:  supabase secrets set OPENAI_API_KEY=sk-...   (or set it in the dashboard)

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

/** Best-effort extract of the user id (sub) from the caller's JWT. */
function uidFromAuth(auth: string | null): string | null {
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = auth.slice(7).split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not set" }, 500);

  let path: string;
  let categories: string[] = [];
  try {
    const body = await req.json();
    path = body.path;
    categories = Array.isArray(body.categories) ? body.categories : [];
  } catch {
    return json({ error: "Expected JSON body with a `path`." }, 400);
  }
  if (!path) return json({ error: "Missing `path`." }, 400);

  // The upload path is `<uid>/<file>` — only let a user read their own notes.
  const uid = uidFromAuth(req.headers.get("Authorization"));
  if (!uid || !path.startsWith(`${uid}/`)) {
    return json({ error: "Not allowed to read that file." }, 403);
  }

  // 1. Fetch the audio from the private voice-notes bucket.
  const audioRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/voice-notes/${path}`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!audioRes.ok) return json({ error: "Could not read the audio." }, 404);
  const audioBlob = await audioRes.blob();

  // 2. Whisper transcription.
  const form = new FormData();
  form.append("file", audioBlob, "note.m4a");
  form.append("model", "whisper-1");
  const wRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  if (!wRes.ok) return json({ error: `Transcription failed: ${await wRes.text()}` }, 502);
  const transcript: string = (await wRes.json()).text ?? "";

  // 3. Parse the transcript into a draft transaction (strict JSON).
  const sys =
    "Extract a personal-finance transaction from the user's spoken note. " +
    "Currency is XAF (FCFA), whole numbers. Reply ONLY with minified JSON: " +
    `{"amountMajor": number|null, "categoryHint": string|null, "method": ` +
    `"cash"|"mobile_money"|"bank_card"|"bank_transfer"|null, "note": string|null}. ` +
    (categories.length
      ? `Pick categoryHint from this list when possible: ${categories.join(", ")}.`
      : "");
  const cRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: transcript || "(empty)" },
      ],
    }),
  });

  let parsed = { amountMajor: null, categoryHint: null, method: null, note: null };
  if (cRes.ok) {
    try {
      parsed = JSON.parse((await cRes.json()).choices[0].message.content);
    } catch {
      /* keep defaults on parse failure */
    }
  }

  return json({ transcript, ...parsed });
});
