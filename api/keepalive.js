// Mantiene despierta la base de Supabase: Vercel Cron llama a este endpoint
// una vez por día y hace una consulta mínima para que cuente como actividad,
// así el proyecto nunca llega a 7 días de inactividad. Usa las variables que
// ya están en Vercel (no hace falta agregar nada).
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY" });
  try {
    const r = await fetch(`${url}/rest/v1/alumnos?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return res.status(200).json({ ok: true, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
