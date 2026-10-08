// Mantiene vivo Supabase: escribe un "latido" en la tabla heartbeat.
// Una escritura cuenta como actividad real de base (un GET a veces no).
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY" });
  }
  try {
    const r = await fetch(`${url}/rest/v1/heartbeat?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ id: 1, last_ping: new Date().toISOString() }),
    });
    // Ahora SÍ devuelve ok:false si Supabase no respondió bien.
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message, at: new Date().toISOString() });
  }
}