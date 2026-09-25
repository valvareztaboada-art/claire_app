import { supabase } from "./supabase";

const p2 = (n) => String(n).padStart(2, "0");
export function mondayISO(w) {
  const d = new Date();
  const off = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - off + 7 * w);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

// ─── ALUMNOS ──────────────────────────────────────────────────────────
export async function loadAlumnos() {
  const { data, error } = await supabase.from("alumnos").select("*").order("creado", { ascending: true });
  if (error) throw error;
  return data;
}
export async function crearAlumno(a) {
  const { error } = await supabase.from("alumnos").insert({ nombre: a.nombre, email: a.email, zoom: a.zoom, color: a.color, notas: a.notas });
  if (error) throw error;
}
export async function editarAlumno(id, a) {
  const { error } = await supabase.from("alumnos").update({ nombre: a.nombre, email: a.email, zoom: a.zoom, color: a.color, notas: a.notas }).eq("id", id);
  if (error) throw error;
}
export async function borrarAlumno(id) {
  const { error } = await supabase.from("alumnos").delete().eq("id", id);
  if (error) throw error;
}

// ─── REGLAS ───────────────────────────────────────────────────────────
export async function loadReglas() {
  const { data, error } = await supabase.from("reglas").select("id,dia,ini,fin,regla_alumnos(alumno_id)").order("dia", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.id, dia: r.dia, ini: r.ini, fin: r.fin, alumnoIds: (r.regla_alumnos || []).map((x) => x.alumno_id) }));
}
export async function crearRegla({ alumnoIds, dia, ini, fin }) {
  const { data, error } = await supabase.from("reglas").insert({ dia, ini, fin }).select("id").single();
  if (error) throw error;
  if (alumnoIds?.length) { const { error: e2 } = await supabase.from("regla_alumnos").insert(alumnoIds.map((aid) => ({ regla_id: data.id, alumno_id: aid }))); if (e2) throw e2; }
}
export async function editarRegla(id, { alumnoIds, dia, ini, fin }) {
  const { error } = await supabase.from("reglas").update({ dia, ini, fin }).eq("id", id);
  if (error) throw error;
  const { error: e2 } = await supabase.from("regla_alumnos").delete().eq("regla_id", id); if (e2) throw e2;
  if (alumnoIds?.length) { const { error: e3 } = await supabase.from("regla_alumnos").insert(alumnoIds.map((aid) => ({ regla_id: id, alumno_id: aid }))); if (e3) throw e3; }
}
export async function borrarRegla(id) {
  const { error } = await supabase.from("reglas").delete().eq("id", id);
  if (error) throw error;
}

// ─── EXCEPCIONES ──────────────────────────────────────────────────────
export async function loadExcepciones(mon0, mon1) {
  const { data, error } = await supabase.from("excepciones").select("*, excepcion_alumnos(alumno_id)").in("semana_inicio", [mon0, mon1]);
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id, semana: r.semana_inicio === mon0 ? 0 : 1, tipo: r.tipo, reglaId: r.regla_id, alumnoId: r.alumno_id,
    alumnoIds: (r.excepcion_alumnos || []).map((x) => x.alumno_id), dia: r.dia, ini: r.ini, fin: r.fin,
  }));
}
export async function crearExcepcion({ semanaISO, tipo, reglaId = null, alumnoId = null, alumnoIds = null, dia = null, ini = null, fin = null }) {
  const { data, error } = await supabase.from("excepciones").insert({ semana_inicio: semanaISO, tipo, regla_id: reglaId, alumno_id: alumnoId, dia, ini, fin }).select("id").single();
  if (error) throw error;
  if (alumnoIds?.length) { const { error: e2 } = await supabase.from("excepcion_alumnos").insert(alumnoIds.map((aid) => ({ excepcion_id: data.id, alumno_id: aid }))); if (e2) throw e2; }
}
export async function borrarExcepcion(id) {
  const { error } = await supabase.from("excepciones").delete().eq("id", id);
  if (error) throw error;
}
export async function borrarExcepcionMover(reglaId, semanaISO) {
  const { error } = await supabase.from("excepciones").delete().eq("tipo", "mover").eq("regla_id", reglaId).eq("semana_inicio", semanaISO);
  if (error) throw error;
}

// ─── SOLICITUDES (pedidos de turno del alumno) ────────────────────────
export async function loadSolicitudes(mon0, mon1) {
  const { data, error } = await supabase.from("solicitudes").select("*").in("semana_inicio", [mon0, mon1]).eq("estado", "pendiente");
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id, alumnoId: r.alumno_id, semana: r.semana_inicio === mon0 ? 0 : 1,
    claseDia: r.clase_dia, claseIni: r.clase_ini, slot: { dia: r.slot_dia, ini: r.slot_ini, fin: r.slot_fin },
  }));
}
export async function crearSolicitud({ alumnoId, semanaISO, claseDia, claseIni, slot }) {
  const { error } = await supabase.from("solicitudes").insert({
    alumno_id: alumnoId, semana_inicio: semanaISO, clase_dia: claseDia, clase_ini: claseIni,
    slot_dia: slot.dia, slot_ini: slot.ini, slot_fin: slot.fin, estado: "pendiente",
  });
  if (error) throw error;
}
export async function borrarSolicitud(id) {
  const { error } = await supabase.from("solicitudes").delete().eq("id", id);
  if (error) throw error;
}

// ─── MENSAJES TÍPICOS ─────────────────────────────────────────────────
export async function loadMensajes() {
  const { data, error } = await supabase.from("mensajes").select("*").order("creado", { ascending: false });
  if (error) throw error;
  return (data || []).map((m) => ({ ...m, archivos: m.archivos || [] }));
}
export async function crearMensaje({ titulo, cuerpo, archivos }) {
  const { error } = await supabase.from("mensajes").insert({ titulo, cuerpo, archivos: archivos || [] });
  if (error) throw error;
}
export async function editarMensaje(id, { titulo, cuerpo, archivos }) {
  const { error } = await supabase.from("mensajes").update({ titulo, cuerpo, archivos: archivos || [] }).eq("id", id);
  if (error) throw error;
}
export async function borrarMensaje(id) {
  const { error } = await supabase.from("mensajes").delete().eq("id", id);
  if (error) throw error;
}

// ─── ADJUNTOS (Supabase Storage, bucket "adjuntos") ───────────────────
export async function subirAdjunto(file) {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `mensajes/${crypto.randomUUID()}_${safe}`;
  const { error } = await supabase.storage.from("adjuntos").upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return { path, name: file.name, type: file.type || "" };
}
export async function urlFirmada(path) {
  const { data, error } = await supabase.storage.from("adjuntos").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
export async function borrarAdjunto(path) {
  const { error } = await supabase.storage.from("adjuntos").remove([path]);
  if (error) throw error;
}

// ─── AVISOS (para Claire: cancelaciones, etc.) ────────────────────────
export async function loadAvisos() {
  const { data, error } = await supabase.from("avisos").select("*").order("creado", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.id, tipo: r.tipo, alumnoId: r.alumno_id, dia: r.dia, ini: r.ini, semanaInicio: r.semana_inicio, creado: r.creado }));
}
export async function crearAviso({ tipo, alumnoId, dia = null, ini = null, semanaISO = null }) {
  const { error } = await supabase.from("avisos").insert({ tipo, alumno_id: alumnoId, dia, ini, semana_inicio: semanaISO });
  if (error) throw error;
}
export async function borrarAviso(id) {
  const { error } = await supabase.from("avisos").delete().eq("id", id);
  if (error) throw error;
}
export async function borrarAvisos(ids) {
  if (!ids?.length) return;
  const { error } = await supabase.from("avisos").delete().in("id", ids);
  if (error) throw error;
}
