// ─────────────────────────────────────────────────────────────────────
// Lógica de emparejado de archivos de Zoom con las clases del día.
// Pensado para Zoom gratis: cada clase de 1h deja 2 chats (.txt) por el
// corte de los 40 min, más screenshots (imágenes) en la misma carpeta.
// ─────────────────────────────────────────────────────────────────────

export const OFFSET_INI = 20;  // la ventana arranca 20 min después del inicio
export const OFFSET_FIN = 80;  // y termina 80 min después del inicio (= +20 de la clase siguiente)

const mins = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

// Ventanas de captura para las clases de un día (occ = [{key, ini, fin, alumnoIds}]).
// Ventana de la clase i: [ini+20, min(ini+80, inicio_siguiente+20)).
export function ventanas(occ) {
  const sorted = [...occ].sort((a, b) => mins(a.ini) - mins(b.ini));
  return sorted.map((c, i) => {
    const S = mins(c.ini);
    const next = i < sorted.length - 1 ? mins(sorted[i + 1].ini) : null;
    const fin = next != null ? Math.min(S + OFFSET_FIN, next + OFFSET_INI) : S + OFFSET_FIN;
    return { key: c.key, ini: S + OFFSET_INI, fin };
  });
}

// Empareja archivos con clases. files = [{id, mod:Date, ...}].
// Devuelve { porClase: {claseKey:[fileId]}, sinAsignar:[fileId] }.
export function emparejar(files, occ) {
  const w = ventanas(occ);
  const porClase = {}; const sinAsignar = [];
  for (const f of files) {
    const t = f.mod.getHours() * 60 + f.mod.getMinutes();
    const match = w.find((x) => t >= x.ini && t < x.fin);
    if (match) (porClase[match.key] = porClase[match.key] || []).push(f.id);
    else sinAsignar.push(f.id);
  }
  return { porClase, sinAsignar };
}

// Limpia el texto del chat de Zoom: saca los encabezados (fecha/hora + "From X to Y:")
// y deja solo los mensajes. Formato real de Zoom:
//   2026-06-10 17:11:50 From claire salabelle to Everyone:
//        Pas trop de pluie
export function limpiarChat(txt) {
  const out = [];
  for (let raw of (txt || "").split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    // Línea de encabezado "… From Nombre to Everyone:" -> descartar entera
    if (/\bFrom\b.+\bto\b.+:\s*$/i.test(line) && /\d{1,2}:\d{2}/.test(line)) continue;
    // Si quedó un prefijo de fecha+hora u hora al inicio del mensaje, sacarlo
    line = line.replace(/^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}(:\d{2})?\s*/, "");
    line = line.replace(/^\d{1,2}:\d{2}(:\d{2})?\s*/, "");
    line = line.replace(/^From\s+.+?\s+to\s+.+?:\s*/i, "");
    if (line) out.push(line);
  }
  return out;
}
