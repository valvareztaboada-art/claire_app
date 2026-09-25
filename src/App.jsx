import React, { useState, useEffect, useMemo } from "react";
import * as api from "./api";
import { LANGS, makeI18n, waCancelFR, waChangeFR } from "./i18n";

const CLAIRE_EMAIL = "clairesalabelle3@gmail.com";
const CLAIRE_WA = "5491161266205"; // 54 9 11 6126 6205
// Contraseña de la profesora: se define en Vercel (y en .env.local para dev) como
// VITE_TEACHER_PASSWORD. Si no está seteada, la profesora entra solo con el mail.
const TEACHER_PW = import.meta.env.VITE_TEACHER_PASSWORD || "";

const PALETA = ["#6FA292", "#94688A", "#C39331", "#BF7452", "#5F84A2", "#B87C90", "#3E9A90", "#8C86C0", "#8A9A46", "#C86B58", "#3F7C8C", "#A96FA0"];
const GRUPO_COLOR = "#5C7C77";
const H_INI = 8, H_FIN = 20;
const pad = (n) => String(n).padStart(2, "0");
const HORAS = (() => { const o = []; for (let h = H_INI; h <= H_FIN; h++) for (const m of [0, 30]) { if (h === H_FIN && m === 30) break; o.push(`${pad(h)}:${pad(m)}`); } return o; })();
const slotDe = (t) => { const [h, m] = t.split(":").map(Number); return (h - H_INI) * 2 + (m >= 30 ? 1 : 0); };
const hDe = (t) => parseInt(t.split(":")[0], 10);
const rangoSemana = (w, MESES) => { const d = new Date(); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off + 7 * w); const sat = new Date(d); sat.setDate(sat.getDate() + 5); return `${d.getDate()} ${MESES[d.getMonth()]} – ${sat.getDate()} ${MESES[sat.getMonth()]}`; };
const nextColor = (alumnos) => { const uso = Object.fromEntries(PALETA.map((c) => [c, 0])); alumnos.forEach((a) => { if (uso[a.color] !== undefined) uso[a.color]++; }); let best = PALETA[0], min = Infinity; for (const c of PALETA) if (uso[c] < min) { min = uso[c]; best = c; } return best; };
const waLink = (msg) => `https://wa.me/${CLAIRE_WA}?text=${encodeURIComponent(msg)}`;

function ocurrencias(w, reglas, excepciones) {
  const exW = excepciones.filter((e) => e.semana === w);
  const cancelOcc = new Set(exW.filter((e) => e.tipo === "cancelOcc").map((e) => e.reglaId));
  const movMap = {}; exW.filter((e) => e.tipo === "mover").forEach((m) => { movMap[m.reglaId] = m; });
  let occ = reglas.filter((r) => !cancelOcc.has(r.id)).map((r) => { const m = movMap[r.id]; return { key: `r${r.id}`, reglaId: r.id, alumnoIds: [...(m ? m.alumnoIds : r.alumnoIds)], dia: m ? m.dia : r.dia, ini: m ? m.ini : r.ini, fin: m ? m.fin : r.fin }; });
  exW.filter((e) => e.tipo === "cancel").forEach((e) => { const o = occ.find((o) => o.reglaId === e.reglaId); if (o) o.alumnoIds = o.alumnoIds.filter((id) => id !== e.alumnoId); });
  occ = occ.filter((o) => o.alumnoIds.length);
  exW.filter((e) => e.tipo === "extra").forEach((e) => occ.push({ key: `e${e.id}`, excId: e.id, alumnoIds: [...e.alumnoIds], dia: e.dia, ini: e.ini, fin: e.fin }));
  return occ;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing:border-box; } body { margin:0; }
.aula { --paper:#F5F4ED; --panel:#FFFFFF; --ink:#241F33; --ink-soft:#726B85; --teal:#8B6EC7; --teal-deep:#6B4EA8; --honey:#F6A93A; --corn:#5E84E2; --primrose:#F7EC8D; --line:#E7E3DA; --line-soft:#EFECE4; --danger:#B5524A;
  font-family:'Inter',system-ui,sans-serif; color:var(--ink); background:var(--paper); min-height:100vh; -webkit-font-smoothing:antialiased; }
.aula h1,.aula h2,.aula h3{ font-family:'Bricolage Grotesque',sans-serif; font-weight:700; margin:0; letter-spacing:-.01em; }
.wrap{ max-width:1080px; margin:0 auto; padding:22px 20px 70px; }
.topbar{ display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:24px; }
.brand{ display:flex; align-items:baseline; gap:10px; }
.brand .mark{ font-family:'Bricolage Grotesque',sans-serif; font-size:29px; font-weight:800; color:var(--teal-deep); letter-spacing:-.02em; }
.brand .sub{ font-size:13px; color:var(--ink-soft); }
.seg{ display:inline-flex; background:var(--panel); border:1px solid var(--line); border-radius:11px; padding:4px; gap:2px; flex-wrap:wrap; }
.seg button{ border:0; background:transparent; font:inherit; font-size:14px; color:var(--ink-soft); padding:8px 15px; border-radius:8px; cursor:pointer; position:relative; }
.seg button.on{ background:var(--teal); color:#fff; }
.badge{ background:var(--honey); color:#3d2a06; font-size:11px; font-weight:600; border-radius:9px; padding:1px 6px; margin-left:6px; }
.langsel{ display:inline-flex; background:var(--panel); border:1px solid var(--line); border-radius:9px; padding:3px; gap:2px; }
.langsel button{ border:0; background:transparent; font:inherit; font-size:12.5px; font-weight:600; color:var(--ink-soft); padding:5px 10px; border-radius:6px; cursor:pointer; text-transform:uppercase; letter-spacing:.03em; }
.langsel button.on{ background:var(--teal); color:#fff; }
.sechead{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.sechead h2{ font-size:23px; } .sechead .meta{ font-size:13.5px; color:var(--ink-soft); max-width:560px; }
.btn{ border:0; font:inherit; font-size:14px; font-weight:500; padding:9px 16px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; gap:7px; text-decoration:none; }
.btn-primary{ background:var(--teal); color:#fff; } .btn-primary:hover{ background:var(--teal-deep); }
.btn-ghost{ background:var(--panel); color:var(--ink); border:1px solid var(--line); }
.btn-honey{ background:var(--honey); color:#3d2a06; }
.btn-danger{ background:#fff; color:var(--danger); border:1px solid #E7C9C6; }
.btn-wa{ background:#25955a; color:#fff; }
.btn.sm{ padding:6px 12px; font-size:13px; } .btn:disabled{ opacity:.5; cursor:not-allowed; }
.weekpill{ display:inline-flex; gap:2px; background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:3px; }
.weekpill button{ border:0; background:transparent; font:inherit; font-size:13px; padding:7px 13px; border-radius:7px; cursor:pointer; color:var(--ink-soft); }
.weekpill button.on{ background:var(--teal); color:#fff; }
.grid-al{ display:grid; grid-template-columns:repeat(auto-fill,minmax(252px,1fr)); gap:14px; }
.ficha{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px; border-top:4px solid var(--c); }
.ficha .top{ display:flex; align-items:center; gap:9px; } .ficha .nm{ font-size:16px; font-weight:600; }
.ficha .rowk{ font-size:13px; color:var(--ink-soft); margin-top:8px; word-break:break-all; } .ficha .rowk b{ color:var(--ink); font-weight:500; }
.ficha .zoom{ font-size:12.5px; color:var(--teal); margin-top:8px; word-break:break-all; } .ficha .nt{ font-size:13px; margin-top:10px; line-height:1.5; }
.linklike{ background:none; border:0; font:inherit; font-size:13px; color:var(--teal); cursor:pointer; padding:0; } .linklike:hover{ text-decoration:underline; }
.dot{ width:11px; height:11px; border-radius:50%; flex:none; }
.calscroll{ overflow-x:auto; border:1px solid var(--line); border-radius:14px; background:var(--panel); }
.cal{ display:grid; grid-template-columns:60px repeat(6,minmax(118px,1fr)); grid-auto-rows:26px; min-width:760px; }
.cal .colhead{ grid-row:1; height:44px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; color:var(--ink-soft); border-bottom:1px solid var(--line); }
.cal .corner{ grid-column:1; grid-row:1; border-bottom:1px solid var(--line); }
.cal .hourlab{ grid-column:1; font-size:11.5px; color:var(--ink-soft); padding:3px 8px 0 0; text-align:right; border-right:1px solid var(--line); }
.cal .cell{ border-bottom:1px solid var(--line-soft); border-right:1px solid var(--line-soft); }
.cal .cell.hour{ border-bottom:1px solid var(--line); }
.cal .cell.free{ cursor:pointer; } .cal .cell.free:hover{ background:#EAF5F2; }
.cal .cell.pick.free:hover{ background:#DCEFE9; }
.cal .cell.sel{ background:#CFE9E2 !important; box-shadow:inset 0 0 0 2px var(--teal); }
.clase{ margin:2px; border-radius:8px; padding:5px 8px; overflow:hidden; cursor:pointer; z-index:2; transition:.12s; border-left:3px solid var(--c); background:color-mix(in srgb,var(--c) 14%,#fff); }
.clase:hover{ box-shadow:0 3px 10px rgba(22,48,45,.14); transform:translateY(-1px); }
.clase.plain{ cursor:default; } .clase.plain:hover{ transform:none; box-shadow:none; }
.clase.mine{ outline:2px solid var(--teal); }
.clase .cn{ font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .clase .ch{ font-size:11px; color:var(--ink-soft); }
.clase .exc{ font-size:9.5px; color:var(--honey); font-weight:700; }
.clase.hold{ background:repeating-linear-gradient(45deg,#F4ECDA,#F4ECDA 6px,#EFE3C7 6px,#EFE3C7 12px); border-left-color:var(--honey); }
.legend{ display:flex; flex-wrap:wrap; gap:14px; margin-top:14px; } .legend span{ display:inline-flex; align-items:center; gap:6px; font-size:12.5px; color:var(--ink-soft); }
.overlay{ position:fixed; inset:0; background:rgba(22,48,45,.34); display:flex; align-items:center; justify-content:center; padding:20px; z-index:50; }
.modal{ background:var(--panel); border-radius:16px; padding:22px; width:100%; max-width:440px; max-height:90vh; overflow:auto; box-shadow:0 20px 50px rgba(22,48,45,.25); }
.modal h3{ font-size:20px; margin-bottom:6px; } .modal .msub{ font-size:12.5px; color:var(--ink-soft); margin-bottom:16px; }
.field{ margin-bottom:13px; } .field label{ display:block; font-size:12.5px; font-weight:500; color:var(--ink-soft); margin-bottom:5px; }
.field input,.field select,.field textarea{ width:100%; font:inherit; font-size:14px; border:1px solid var(--line); border-radius:9px; padding:9px 11px; color:var(--ink); background:#fff; }
.field input:focus,.field select:focus,.field textarea:focus{ outline:none; border-color:var(--teal); }
.row2{ display:grid; grid-template-columns:1fr 1fr; gap:11px; }
.picklist{ border:1px solid var(--line); border-radius:9px; overflow:hidden; max-height:200px; overflow-y:auto; }
.picklist label{ display:flex; align-items:center; gap:9px; padding:9px 11px; font-size:14px; cursor:pointer; border-bottom:1px solid var(--line-soft); margin:0; }
.picklist label:last-child{ border-bottom:0; } .picklist label:hover{ background:#F7FAF9; } .picklist input{ width:auto; } .picklist .pd{ width:11px; height:11px; border-radius:50%; }
.note-grupo{ font-size:12px; color:var(--teal-deep); margin-top:6px; }
.colorasg{ display:flex; align-items:center; gap:8px; font-size:13px; color:var(--ink-soft); }
.foreverbox{ background:#F7FAF9; border:1px solid var(--line); border-radius:10px; padding:11px 12px; margin-bottom:13px; }
.chk{ display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:500; } .chk input{ width:auto; } .foreverbox .exp{ font-size:12px; color:var(--ink-soft); margin-top:6px; line-height:1.5; }
.macts{ display:flex; justify-content:space-between; align-items:center; margin-top:20px; gap:8px; flex-wrap:wrap; }
.state{ padding:14px 16px; border-radius:12px; font-size:14px; margin-bottom:16px; } .state.load{ background:#EAF0ED; color:var(--ink-soft); } .state.err{ background:#FBEFEE; color:var(--danger); border:1px solid #E7C9C6; }
.empty{ background:var(--panel); border:1px dashed var(--line); border-radius:14px; padding:40px 20px; text-align:center; color:var(--ink-soft); } .empty h3{ font-size:18px; color:var(--ink); margin-bottom:6px; }
.toast{ position:fixed; bottom:22px; left:50%; transform:translateX(-50%); background:var(--ink); color:#fff; padding:11px 18px; border-radius:10px; font-size:14px; z-index:60; box-shadow:0 8px 24px rgba(0,0,0,.2); }
.solic{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:15px 16px; margin-bottom:12px; border-left:4px solid var(--honey); }
.solic.cancel{ border-left-color:var(--danger); }
.solic .t{ font-size:15px; font-weight:600; } .solic .d{ font-size:13px; color:var(--ink-soft); margin-top:5px; line-height:1.5; } .solic .acts{ display:flex; gap:8px; margin-top:12px; align-items:center; }
.miclase{ background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:22px; border-left:5px solid var(--c); margin-bottom:14px; }
.miclase .lbl{ font-size:12.5px; color:var(--ink-soft); } .miclase .big{ font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:26px; margin:2px 0 12px; text-transform:capitalize; }
.zoomlink{ margin-top:14px; } .zoomlink .zl{ display:block; font-size:12px; color:var(--ink-soft); margin-bottom:5px; }
.linkcopy{ display:flex; align-items:center; gap:8px; background:#F2F6F5; border:1px solid var(--line); border-radius:9px; padding:8px 10px; flex-wrap:wrap; }
.linkcopy code{ font-size:12.5px; color:var(--ink); word-break:break-all; font-family:ui-monospace,Menlo,monospace; }
.linkcopy button{ margin-left:auto; font:inherit; font-size:12px; border:1px solid var(--line); background:#fff; border-radius:7px; padding:5px 11px; cursor:pointer; color:var(--teal-deep); }
.hintbar{ background:#EAF0ED; border-radius:10px; padding:10px 14px; font-size:12.5px; color:var(--ink-soft); margin-bottom:16px; line-height:1.5; }
.cancelrow{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:15px 16px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.cancelrow .info .h{ font-weight:600; text-transform:capitalize; } .cancelrow .info .s{ font-size:12.5px; color:var(--ink-soft); margin-top:3px; }
.flowbox{ background:#EAF6EE; border:1px solid #BFE3CC; border-radius:14px; padding:16px; margin-bottom:16px; } .flowbox.pick{ background:#FBF6EA; border-color:#EBD9A9; }
.flowbox .wt{ font-weight:600; font-size:14.5px; margin-bottom:4px; text-transform:capitalize; } .flowbox .ws{ font-size:13px; color:var(--ink-soft); margin-bottom:10px; line-height:1.5; }
.flowbox .msg{ background:#fff; border:1px solid #CDE7D6; border-radius:10px; padding:11px 13px; font-size:13px; line-height:1.55; } .flowbox.pick .msg{ border-color:#EBD9A9; }
.flowbox .fa{ display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
.acceptbar{ display:flex; gap:8px; align-items:center; margin-top:12px; flex-wrap:wrap; font-size:13px; color:var(--ink-soft); }
.landing{ max-width:440px; margin:7vh auto 0; text-align:center; position:relative; z-index:1; }
.landing .mark{ font-family:'Bricolage Grotesque',sans-serif; font-size:58px; font-weight:800; letter-spacing:-.03em; line-height:1; background:linear-gradient(96deg,#6B4EA8,#5E84E2 45%,#F6A93A); -webkit-background-clip:text; background-clip:text; color:transparent; }
.landing-bg{ position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
.landing-bg .blob{ position:absolute; border-radius:50%; filter:blur(72px); opacity:.26; }
.landing-bg .lb1{ width:42vw; height:44vw; left:-8vw; top:-10vw; background:radial-gradient(circle at 45% 45%, var(--teal), transparent 70%); }
.landing-bg .lb2{ width:46vw; height:46vw; right:-10vw; top:0; background:radial-gradient(circle at 55% 45%, var(--corn), transparent 68%); }
.landing-bg .lb3{ width:48vw; height:46vw; right:0; bottom:-18vw; background:radial-gradient(circle at 50% 50%, var(--honey), transparent 70%); }
.landing-bg .lb4{ width:40vw; height:42vw; left:-6vw; bottom:-14vw; background:radial-gradient(circle at 50% 50%, var(--primrose), transparent 72%); }
.landing .sub{ color:var(--ink-soft); margin:6px 0 20px; }
.landing .langrow{ display:flex; justify-content:center; margin-bottom:26px; }
.langpick{ display:inline-flex; flex-direction:column; align-items:center; gap:8px; }
.langlabel{ font-size:13px; font-weight:600; color:var(--ink-soft); }
.langsel.big button{ text-transform:none; font-size:14px; padding:9px 16px; letter-spacing:0; }
.landing .choices{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.choice{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:22px; cursor:pointer; font:inherit; }
.choice:hover{ border-color:var(--teal); } .choice .ci{ font-size:26px; } .choice .cl{ font-weight:600; margin-top:8px; font-size:16px; }
.loginbox{ background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:22px; text-align:left; margin-top:8px; }
.loginbox h3{ font-size:20px; margin-bottom:4px; } .loginbox p{ font-size:13px; color:var(--ink-soft); margin:0 0 14px; }
.msgcard{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px; margin-bottom:12px; border-left:4px solid var(--teal); }
.msgcard .mt{ font-size:15px; font-weight:600; } .msgcard .mb{ font-size:13px; color:var(--ink-soft); margin-top:6px; line-height:1.5; white-space:pre-wrap; }
.msgcard .files{ display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
.msgcard .fchip{ font-size:11.5px; background:var(--line-soft); border-radius:7px; padding:3px 8px; }
.msgcard .foot{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:12px; }
.msgcard select{ font:inherit; font-size:13px; border:1px solid var(--line); border-radius:8px; padding:6px 9px; background:#fff; color:var(--ink); }
.filerow{ display:flex; gap:6px; align-items:center; margin-bottom:6px; } .filerow .x{ cursor:pointer; color:var(--ink-soft); font-weight:600; }
`;

function LangSelector({ i18n, setLang }) {
  return (
    <div className="langsel">
      {LANGS.map((l) => <button key={l.code} className={i18n.lang === l.code ? "on" : ""} onClick={() => setLang(l.code)}>{l.code}</button>)}
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem("aula_lang") || "en"; } catch (e) { return "en"; } });
  const i18n = useMemo(() => makeI18n(lang), [lang]);
  const changeLang = (l) => { setLang(l); try { localStorage.setItem("aula_lang", l); } catch (e) {} };

  const [sesion, setSesionRaw] = useState(() => { try { return JSON.parse(localStorage.getItem("aula_session") || "null"); } catch (e) { return null; } });
  const setSesion = (s) => { setSesionRaw(s); try { if (s) localStorage.setItem("aula_session", JSON.stringify(s)); else localStorage.removeItem("aula_session"); } catch (e) {} };
  const [alumnos, setAlumnos] = useState([]);
  const [reglas, setReglas] = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const alumnoDe = (id) => alumnos.find((a) => a.id === id);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  async function recargar() {
    try {
      setError(null);
      const [al, rg, ex, so, ms, av] = await Promise.all([api.loadAlumnos(), api.loadReglas(), api.loadExcepciones(api.mondayISO(0), api.mondayISO(1)), api.loadSolicitudes(api.mondayISO(0), api.mondayISO(1)), api.loadMensajes(), api.loadAvisos()]);
      setAlumnos(al); setReglas(rg); setExcepciones(ex); setSolicitudes(so); setMensajes(ms); setAvisos(av);
    } catch (e) { setError(e.message || "No se pudo conectar con la base"); }
    finally { setCargando(false); }
  }
  useEffect(() => { recargar(); }, []);

  async function run(fn, ok) { setBusy(true); try { await fn(); await recargar(); if (ok) flash(ok); } catch (e) { setError(e.message); } finally { setBusy(false); } }

  const handlers = {
    guardarAlumno: (a, done) => run(async () => { if (a.id) await api.editarAlumno(a.id, a); else await api.crearAlumno(a); done && done(); }),
    borrarAlumno: (id, done) => run(async () => { await api.borrarAlumno(id); done && done(); }),
    guardarOcc: (form, occ, semana, done) => run(async () => {
      const monISO = api.mondayISO(semana);
      if (occ && occ.reglaId) {
        if (form.recurrente) { await api.editarRegla(occ.reglaId, form); await api.borrarExcepcionMover(occ.reglaId, monISO); }
        else { await api.borrarExcepcionMover(occ.reglaId, monISO); await api.crearExcepcion({ semanaISO: monISO, tipo: "mover", reglaId: occ.reglaId, alumnoIds: form.alumnoIds, dia: form.dia, ini: form.ini, fin: form.fin }); }
      } else if (occ && occ.excId) {
        await api.borrarExcepcion(occ.excId);
        if (form.recurrente) await api.crearRegla(form); else await api.crearExcepcion({ semanaISO: monISO, tipo: "extra", alumnoIds: form.alumnoIds, dia: form.dia, ini: form.ini, fin: form.fin });
      } else {
        if (form.recurrente) await api.crearRegla(form); else await api.crearExcepcion({ semanaISO: monISO, tipo: "extra", alumnoIds: form.alumnoIds, dia: form.dia, ini: form.ini, fin: form.fin });
      }
      done && done();
    }),
    eliminarOcc: (occ, recurrente, semana, done) => run(async () => {
      const monISO = api.mondayISO(semana);
      if (occ.reglaId) { if (recurrente) await api.borrarRegla(occ.reglaId); else { await api.borrarExcepcionMover(occ.reglaId, monISO); await api.crearExcepcion({ semanaISO: monISO, tipo: "cancelOcc", reglaId: occ.reglaId }); } }
      else if (occ.excId) await api.borrarExcepcion(occ.excId);
      done && done();
    }),
    confirmarSolic: (s, ok) => run(async () => { await api.crearExcepcion({ semanaISO: api.mondayISO(s.semana), tipo: "extra", alumnoIds: [s.alumnoId], dia: s.slot.dia, ini: s.slot.ini, fin: s.slot.fin }); await api.borrarSolicitud(s.id); }, ok),
    rechazarSolic: (id, ok) => run(async () => { await api.borrarSolicitud(id); }, ok),
    borrarAviso: (id) => run(async () => { await api.borrarAviso(id); }),
    limpiarAvisos: (ids, ok) => run(async () => { await api.borrarAvisos(ids); }, ok),
    cancelarStudent: (occ, semana, alumnoId, done) => run(async () => {
      const monISO = api.mondayISO(semana);
      if (occ.reglaId) await api.crearExcepcion({ semanaISO: monISO, tipo: "cancel", reglaId: occ.reglaId, alumnoId }); else if (occ.excId) await api.borrarExcepcion(occ.excId);
      await api.crearAviso({ tipo: "cancel", alumnoId, dia: occ.dia, ini: occ.ini, semanaISO: monISO });
      done && done();
    }),
    reservarStudent: (payload, done) => run(async () => { await api.crearSolicitud({ ...payload, semanaISO: api.mondayISO(payload.semana) }); done && done(); }),
    guardarMensaje: (m, done) => run(async () => { if (m.id) await api.editarMensaje(m.id, m); else await api.crearMensaje(m); done && done(); }),
    borrarMensaje: (id, done) => run(async () => { await api.borrarMensaje(id); done && done(); }),
  };

  const data = { alumnos, reglas, excepciones, solicitudes, mensajes, avisos, alumnoDe };

  return (
    <div className="aula">
      <style>{CSS}</style>
      {!sesion ? (
        <Landing i18n={i18n} setLang={changeLang} cargando={cargando} error={error} alumnos={alumnos} onProfesor={() => setSesion({ rol: "profesor" })} onAlumno={(id) => setSesion({ rol: "alumno", alumnoId: id })} />
      ) : (
        <div className="wrap">
          {cargando && <div className="state load">{i18n.t("connSupabase")}</div>}
          {error && <div className="state err">{i18n.t("errorPrefix")}: {error}</div>}
          {sesion.rol === "profesor"
            ? <Profesor {...{ data, busy, handlers, i18n, setLang: changeLang, flash }} onSalir={() => setSesion(null)} />
            : <Alumno {...{ data, busy, handlers, flash, i18n, setLang: changeLang }} alumnoActivo={sesion.alumnoId} onSalir={() => setSesion(null)} />}
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ═══════════════ LANDING / LOGIN ═══════════════
function Landing({ i18n, setLang, cargando, error, alumnos, onProfesor, onAlumno }) {
  const { t } = i18n;
  const [modo, setModo] = useState(null);
  const [mail, setMail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(null);
  const pidePw = modo === "profesor" && !!TEACHER_PW;
  const entrar = () => {
    const m = mail.trim().toLowerCase();
    if (modo === "profesor") {
      if (m !== CLAIRE_EMAIL) { setErr(t("errNotTeacher")); return; }
      if (TEACHER_PW && pw !== TEACHER_PW) { setErr(t("errPassword")); return; }
      onProfesor();
    } else { const a = alumnos.find((x) => (x.email || "").trim().toLowerCase() === m); if (a) onAlumno(a.id); else setErr(t("errNotStudent")); }
  };
  return (
    <div className="wrap">
      <div className="landing-bg"><span className="blob lb1" /><span className="blob lb2" /><span className="blob lb3" /><span className="blob lb4" /></div>
      <div className="landing">
      <div className="mark">Aula</div>
      <div className="sub">{t("subtitle")}</div>
      <div className="langrow">
        <div className="langpick">
          <div className="langlabel">🌐 Language · Idioma · Langue</div>
          <div className="langsel big">
            {LANGS.map((l) => <button key={l.code} className={i18n.lang === l.code ? "on" : ""} onClick={() => setLang(l.code)}>{l.label}</button>)}
          </div>
        </div>
      </div>
      {cargando && <div className="state load">{t("connecting")}</div>}
      {error && <div className="state err">{t("errorPrefix")}: {error}</div>}
      {!modo ? (
        <div className="choices">
          <button className="choice" onClick={() => { setModo("alumno"); setErr(null); }}><div className="ci">🎓</div><div className="cl">{t("imStudent")}</div></button>
          <button className="choice" onClick={() => { setModo("profesor"); setErr(null); }}><div className="ci">🧑‍🏫</div><div className="cl">{t("imTeacher")}</div></button>
        </div>
      ) : (
        <div className="loginbox">
          <h3>{modo === "alumno" ? t("loginStudentTitle") : t("loginTeacherTitle")}</h3>
          <p>{modo === "alumno" ? t("loginStudentHint") : t("loginTeacherHint")}</p>
          <div className="field"><label>{t("email")}</label><input value={mail} autoFocus onChange={(e) => { setMail(e.target.value); setErr(null); }} onKeyDown={(e) => e.key === "Enter" && entrar()} placeholder="mail@mail.com" /></div>
          {pidePw && <div className="field"><label>{t("password")}</label><input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(null); }} onKeyDown={(e) => e.key === "Enter" && entrar()} placeholder="••••••••" /></div>}
          {err && <div className="state err" style={{ marginBottom: 12 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => { setModo(null); setMail(""); setPw(""); setErr(null); }}>{t("back")}</button>
            <button className="btn btn-primary" disabled={cargando || !mail.trim() || (pidePw && !pw.trim())} onClick={entrar}>{t("enter")}</button>
          </div>
        </div>
      )}
    </div></div>
  );
}

// ═══════════════ PROFESORA (Claire) ═══════════════
function Profesor({ data, busy, handlers, i18n, setLang, flash, onSalir }) {
  const { t, DIAS, DIAS_LARGO, MESES } = i18n;
  const { alumnos, reglas, excepciones, solicitudes, mensajes, avisos, alumnoDe } = data;
  const [tab, setTab] = useState("semana");
  const [semana, setSemana] = useState(0);
  const [modalAlumno, setModalAlumno] = useState(null);
  const [modalClase, setModalClase] = useState(null);
  const [modalMsg, setModalMsg] = useState(null);
  const occSemana = useMemo(() => ocurrencias(semana, reglas, excepciones), [semana, reglas, excepciones]);
  const pendientes = solicitudes.length + avisos.length;

  return (
    <>
      <div className="topbar">
        <div className="brand"><span className="mark">Aula</span><span className="sub">Claire</span></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="seg">
            {[["semana", t("tabWeek")], ["alumnos", t("tabStudents")], ["mensajes", t("tabMessages")], ["envios", t("tabSend")], ["modif", t("tabChanges")]].map(([k, l]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}{k === "modif" && pendientes > 0 && <span className="badge">{pendientes}</span>}</button>
            ))}
          </div>
          <LangSelector i18n={i18n} setLang={setLang} />
          <button className="btn btn-ghost sm" onClick={onSalir}>{t("logout")}</button>
        </div>
      </div>

      {tab === "semana" && (
        <>
          <div className="sechead">
            <div><h2>{t("yourWeek")}</h2><div className="meta">{rangoSemana(semana, MESES)} · {t("weekHint")}</div></div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div className="weekpill"><button className={semana === 0 ? "on" : ""} onClick={() => setSemana(0)}>{t("thisWeek")}</button><button className={semana === 1 ? "on" : ""} onClick={() => setSemana(1)}>{t("nextWeek")}</button></div>
              <button className="btn btn-primary" disabled={!alumnos.length} onClick={() => setModalClase({ nuevo: true, alumnoIds: alumnos[0] ? [alumnos[0].id] : [], dia: 0, ini: "09:00", fin: "10:00" })}>{t("newClass")}</button>
            </div>
          </div>
          <SemanaCal occ={occSemana} alumnos={alumnos} alumnoDe={alumnoDe} onEditar={setModalClase} i18n={i18n} />
        </>
      )}

      {tab === "alumnos" && (
        <>
          <div className="sechead"><div><h2>{t("students")}</h2><div className="meta">{t("studentsHint", { n: alumnos.length })}</div></div>
            <button className="btn btn-primary" onClick={() => setModalAlumno({ nombre: "", email: "", zoom: "", color: nextColor(alumnos), notas: "" })}>{t("newStudent")}</button></div>
          {alumnos.length === 0 ? <div className="empty">{t("noStudents")}</div> : (
            <div className="grid-al">
              {alumnos.map((a) => (
                <div key={a.id} className="ficha" style={{ "--c": a.color }}>
                  <div className="top"><span className="dot" style={{ background: a.color, width: 14, height: 14 }} /><span className="nm">{a.nombre}</span></div>
                  <div className="rowk"><b>{t("mailShort")}</b> {a.email}</div>{a.zoom && <div className="zoom">🔗 {a.zoom}</div>}{a.notas && <div className="nt">{a.notas}</div>}
                  <div style={{ marginTop: 13 }}><button className="linklike" onClick={() => setModalAlumno(a)}>{t("edit")}</button></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "mensajes" && (
        <MensajesTab mensajes={mensajes} alumnos={alumnos} busy={busy} i18n={i18n} flash={flash}
          onNuevo={() => setModalMsg({ titulo: "", cuerpo: "", archivos: [] })} onEditar={(m) => setModalMsg({ ...m, archivos: m.archivos || [] })}
          onBorrar={(id) => handlers.borrarMensaje(id)} />
      )}

      {tab === "envios" && (
        <>
          <div className="sechead"><div><h2>{t("sendScaffTitle")}</h2></div></div>
          <div className="empty"><h3>🎧 Zoom</h3><div style={{ maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>{t("sendScaffBody")}</div></div>
        </>
      )}

      {tab === "modif" && (
        <>
          <div className="sechead"><div><h2>{t("changesTitle")}</h2><div className="meta">{t("changesHint")}</div></div>
            {avisos.length > 0 && <button className="btn btn-ghost sm" disabled={busy} onClick={() => handlers.limpiarAvisos(avisos.map((a) => a.id))}>{t("clearAll")}</button>}</div>
          {pendientes === 0 ? <div className="empty"><h3>{t("noChanges")}</h3></div> : (
            <>
              {solicitudes.map((s) => { const a = alumnoDe(s.alumnoId);
                return (
                  <div key={s.id} className="solic">
                    <div className="t">{t("reqTurn", { name: a ? a.nombre : "—", when: s.semana === 0 ? t("whenThis") : t("whenNext") })}</div>
                    <div className="d">{t("reqBody", { day: DIAS_LARGO[s.claseDia], time: s.claseIni, nday: DIAS_LARGO[s.slot.dia], ntime: s.slot.ini })}</div>
                    <div className="acts"><button className="btn btn-primary sm" disabled={busy} onClick={() => handlers.confirmarSolic(s, t("confirmTurn"))}>{t("confirmTurn")}</button><button className="btn btn-danger sm" disabled={busy} onClick={() => handlers.rechazarSolic(s.id, t("reject"))}>{t("reject")}</button></div>
                  </div>
                );
              })}
              {avisos.map((v) => { const a = alumnoDe(v.alumnoId); const w = v.semanaInicio === api.mondayISO(0) ? t("whenThis") : (v.semanaInicio === api.mondayISO(1) ? t("whenNext") : "");
                return (
                  <div key={v.id} className="solic cancel">
                    <div className="t">🚫 {t("cancelNotice", { name: a ? a.nombre : "—", day: v.dia != null ? DIAS_LARGO[v.dia] : "", time: v.ini || "", when: w })}</div>
                    <div className="acts"><button className="btn btn-ghost sm" disabled={busy} onClick={() => handlers.borrarAviso(v.id)}>{t("dismiss")}</button></div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}

      {modalAlumno && <AlumnoModal alumno={modalAlumno} busy={busy} i18n={i18n} onGuardar={(a) => handlers.guardarAlumno(a, () => setModalAlumno(null))} onBorrar={(id) => handlers.borrarAlumno(id, () => setModalAlumno(null))} onCerrar={() => setModalAlumno(null)} />}
      {modalClase && <ClaseModal occ={modalClase} semana={semana} alumnos={alumnos} busy={busy} i18n={i18n} onGuardar={(f) => handlers.guardarOcc(f, modalClase.nuevo ? null : modalClase, semana, () => setModalClase(null))} onEliminar={(rec) => handlers.eliminarOcc(modalClase, rec, semana, () => setModalClase(null))} onCerrar={() => setModalClase(null)} />}
      {modalMsg && <MensajeModal msg={modalMsg} busy={busy} i18n={i18n} flash={flash} onGuardar={(m) => handlers.guardarMensaje(m, () => setModalMsg(null))} onCerrar={() => setModalMsg(null)} />}
    </>
  );
}

function SemanaCal({ occ, alumnos, alumnoDe, onEditar, i18n }) {
  const { t, DIAS } = i18n;
  const total = (H_FIN - H_INI) * 2;
  const cells = [];
  for (let d = 0; d < 6; d++) for (let s = 0; s < total; s++) cells.push(<div key={`c${d}-${s}`} className={`cell${s % 2 ? " hour" : ""}`} style={{ gridColumn: d + 2, gridRow: s + 2 }} />);
  const color = (o) => o.alumnoIds.length === 1 ? (alumnoDe(o.alumnoIds[0])?.color || GRUPO_COLOR) : GRUPO_COLOR;
  const label = (o) => o.alumnoIds.length === 1 ? (alumnoDe(o.alumnoIds[0])?.nombre.split(" ")[0] || "?") : t("groupN", { n: o.alumnoIds.length });
  return (
    <>
      <div className="calscroll"><div className="cal">
        <div className="corner" />
        {DIAS.map((d, i) => <div key={i} className="colhead" style={{ gridColumn: i + 2 }}>{d}</div>)}
        {Array.from({ length: H_FIN - H_INI }, (_, i) => <div key={i} className="hourlab" style={{ gridRow: i * 2 + 2, gridRowEnd: "span 2" }}>{pad(H_INI + i)}:00</div>)}
        {cells}
        {occ.map((o) => { const s = slotDe(o.ini), span = Math.max(1, slotDe(o.fin) - s);
          return <div key={o.key} className="clase" style={{ gridColumn: o.dia + 2, gridRow: `${s + 2} / span ${span}`, "--c": color(o) }} onClick={() => onEditar(o)}><div className="cn">{label(o)}</div><div className="ch">{o.ini}–{o.fin}</div>{o.excId && <div className="exc">{t("onlyThisWeek")}</div>}</div>;
        })}
      </div></div>
      <div className="legend">{alumnos.map((a) => <span key={a.id}><span className="dot" style={{ background: a.color }} />{a.nombre.split(" ")[0]}</span>)}<span><span className="dot" style={{ background: GRUPO_COLOR }} />{t("group")}</span></div>
    </>
  );
}

// ═══════════════ MENSAJES TÍPICOS ═══════════════
function MensajesTab({ mensajes, alumnos, busy, i18n, flash, onNuevo, onEditar, onBorrar }) {
  const { t } = i18n;
  const [sel, setSel] = useState({});
  const [enviando, setEnviando] = useState(null);

  const enviar = async (m) => {
    const a = alumnos.find((x) => x.id === sel[m.id]);
    if (!a) { flash(t("pickStudent")); return; }
    setEnviando(m.id);
    try {
      const nombre = a.nombre.split(" ")[0];
      const text = (m.cuerpo || "").replace(/\{nombre\}/g, nombre);
      // adjuntos guardados en el mensaje -> URL firmada (nodemailer los baja)
      const attachmentUrls = [];
      for (const ad of (m.archivos || [])) attachmentUrls.push({ filename: ad.name, url: await api.urlFirmada(ad.path), contentType: ad.type || undefined });
      const r = await fetch("/api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: a.email, subject: m.titulo, text, attachmentUrls }) });
      if (r.ok) flash(t("sentOk"));
      else { let msg = t("sendErr"); try { const j = await r.json(); if (j.error) msg = j.error; } catch (e) {} flash(msg); }
    } catch (e) { flash(t("localOnly")); }
    finally { setEnviando(null); }
  };

  return (
    <>
      <div className="sechead"><div><h2>{t("messagesTitle")}</h2><div className="meta">{t("messagesHint")}</div></div>
        <button className="btn btn-primary" onClick={onNuevo}>{t("newMessage")}</button></div>
      <div className="hintbar">{t("tipName")}</div>
      {mensajes.length === 0 ? <div className="empty">{t("noMessages")}</div> : mensajes.map((m) => {
        return (
          <div key={m.id} className="msgcard">
            <div className="mt">{m.titulo}</div>
            <div className="mb">{m.cuerpo}</div>
            {(m.archivos || []).length > 0 && <div className="files">{m.archivos.map((ad, i) => <span key={i} className="fchip">📎 {ad.name}</span>)}</div>}
            <div className="foot">
              <select value={sel[m.id] || ""} onChange={(e) => setSel({ ...sel, [m.id]: e.target.value })}>
                <option value="">{t("sendTo")}</option>
                {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
              <button className="btn btn-primary sm" disabled={enviando === m.id} onClick={() => enviar(m)}>{enviando === m.id ? t("sending") : t("send")}</button>
              <button className="linklike" onClick={() => onEditar(m)}>{t("edit")}</button>
              <button className="linklike" style={{ color: "#B5524A" }} disabled={busy} onClick={() => onBorrar(m.id)}>{t("delete")}</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function MensajeModal({ msg, busy, i18n, flash, onGuardar, onCerrar }) {
  const { t } = i18n;
  const [f, setF] = useState({ id: msg.id, titulo: msg.titulo || "", cuerpo: msg.cuerpo || "", archivos: msg.archivos || [] });
  const [subiendo, setSubiendo] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valido = f.titulo.trim() && f.cuerpo.trim();

  const onPick = async (list) => {
    const arr = Array.from(list); if (!arr.length) return;
    setSubiendo(true);
    try { const nuevos = []; for (const file of arr) nuevos.push(await api.subirAdjunto(file)); setF((p) => ({ ...p, archivos: [...p.archivos, ...nuevos] })); }
    catch (e) { flash && flash(e.message); }
    finally { setSubiendo(false); }
  };
  const rmAdj = async (i) => { const ad = f.archivos[i]; setF((p) => ({ ...p, archivos: p.archivos.filter((_, j) => j !== i) })); try { await api.borrarAdjunto(ad.path); } catch (e) {} };

  return (
    <div className="overlay" onClick={onCerrar}><div className="modal" onClick={(e) => e.stopPropagation()}>
      <h3>{msg.id ? t("edit") : t("newMessage")}</h3>
      <div className="msub">{t("tipName")}</div>
      <div className="field"><label>{t("msgTitle")}</label><input value={f.titulo} autoFocus onChange={(e) => set("titulo", e.target.value)} /></div>
      <div className="field"><label>{t("msgBody")}</label><textarea rows={5} value={f.cuerpo} onChange={(e) => set("cuerpo", e.target.value)} placeholder="Bonjour {nombre}, …" /></div>
      <div className="field"><label>{t("savedFiles")}</label>
        {f.archivos.map((ad, i) => <div key={i} className="filerow"><span className="fchip">📎 {ad.name}</span><span className="x" style={{ cursor: "pointer", color: "#B5524A", fontWeight: 700 }} onClick={() => rmAdj(i)}>✕</span></div>)}
        <label className="btn btn-ghost sm" style={{ cursor: "pointer", marginTop: 6, display: "inline-block" }}>{subiendo ? t("uploading") : t("attachFiles")}
          <input type="file" multiple style={{ display: "none" }} disabled={subiendo} onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      <div className="macts"><span />
        <div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost" onClick={onCerrar}>{t("cancel")}</button><button className="btn btn-primary" disabled={!valido || busy || subiendo} onClick={() => onGuardar({ id: f.id, titulo: f.titulo, cuerpo: f.cuerpo, archivos: f.archivos })}>{busy ? t("saving") : t("save")}</button></div>
      </div>
    </div></div>
  );
}

// ═══════════════ ALUMNO ═══════════════
function Alumno({ data, busy, handlers, flash, i18n, setLang, alumnoActivo, onSalir }) {
  const { t, DIAS, DIAS_LARGO, MESES } = i18n;
  const { reglas, excepciones, solicitudes, alumnoDe } = data;
  const [tab, setTab] = useState("miclase");
  const [semana, setSemana] = useState(0);
  const [sel, setSel] = useState(null);
  const [flujo, setFlujo] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const yo = alumnoDe(alumnoActivo);
  const hoyIdx = (() => { const d = new Date().getDay(); return d === 0 ? 0 : d - 1; })();

  const occ = useMemo(() => ocurrencias(semana, reglas, excepciones), [semana, reglas, excepciones]);
  const misOcc = occ.filter((o) => o.alumnoIds.includes(alumnoActivo)).sort((a, b) => a.dia - b.dia || slotDe(a.ini) - slotDe(b.ini));
  const misReglas = reglas.filter((r) => r.alumnoIds.includes(alumnoActivo)).sort((a, b) => a.dia - b.dia || slotDe(a.ini) - slotDe(b.ini));
  const ocupada = (d, h) => occ.some((o) => o.dia === d && hDe(o.ini) <= h && hDe(o.fin) > h);
  const enHold = (d, h) => solicitudes.some((s) => s.semana === semana && s.slot.dia === d && hDe(s.slot.ini) === h);
  const estadoCancel = (o) => { if (semana === 1) return "ok"; if (o.dia < hoyIdx) return "paso"; if (o.dia === hoyIdx) return "menos24"; return "ok"; };
  // Los mensajes a Claire van SIEMPRE en francés, sin importar el idioma elegido.
  const msgCancel = (c) => waCancelFR(c.dia, c.ini, semana === 1);
  const msgCambio = (c, slot, ss) => waChangeFR(c.dia, c.ini, slot.dia, slot.ini, ss === 1);
  const copiar = (x) => { try { navigator.clipboard?.writeText(x); flash(t("copied")); } catch (e) {} };

  const cancelar = (o) => { setConfirmando(null); handlers.cancelarStudent(o, semana, alumnoActivo, () => { setSel(null); setFlujo({ clase: { dia: o.dia, ini: o.ini }, etapa: "cancelado" }); }); };
  const aceptarNuevo = () => { if (!sel || !flujo) return; const slot = { dia: sel.dia, ini: `${pad(sel.h)}:00`, fin: `${pad(sel.h + 1)}:00` };
    handlers.reservarStudent({ alumnoId: alumnoActivo, semana: sel.semana, claseDia: flujo.clase.dia, claseIni: flujo.clase.ini, slot }, () => { setFlujo({ ...flujo, etapa: "pedido", slot, semanaSlot: sel.semana }); setSel(null); }); };
  const eligiendo = flujo?.etapa === "eligiendo";

  return (
    <>
      <div className="topbar">
        <div className="brand"><span className="mark">{t("tabMyClass")}</span><span className="sub">{yo ? yo.nombre : ""}</span></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="seg">{[["miclase", t("tabMyClass")], ["cambiar", t("tabCancel")]].map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
          <LangSelector i18n={i18n} setLang={setLang} />
          <button className="btn btn-ghost sm" onClick={onSalir}>{t("logout")}</button>
        </div>
      </div>

      {!yo ? <div className="empty">—</div> : tab === "miclase" ? (
        <>
          <div className="hintbar">{t("enteredWith", { email: yo.email })}</div>
          {misReglas.length === 0 ? <div className="empty"><h3>{t("noClassesLoaded")}</h3></div> : misReglas.map((c) => (
            <div key={c.id} className="miclase" style={{ "--c": yo.color }}>
              <div className="lbl">{c.alumnoIds.length > 1 ? t("yourClassGroup") : t("yourClass")}</div>
              <div className="big">{DIAS_LARGO[c.dia]} · {c.ini}–{c.fin}</div>
              {yo.zoom && <a className="btn btn-primary" href={yo.zoom} target="_blank" rel="noreferrer">{t("joinZoom")}</a>}
              {yo.zoom && <div className="zoomlink"><span className="zl">{t("orCopy")}</span><div className="linkcopy"><code>{yo.zoom}</code><button onClick={() => copiar(yo.zoom)}>{t("copy")}</button></div></div>}
            </div>
          ))}
        </>
      ) : (
        <>
          {flujo && flujo.etapa === "cancelado" && (
            <div className="flowbox">
              <div className="wt">{t("canceledTitle", { day: DIAS_LARGO[flujo.clase.dia], time: flujo.clase.ini })}</div>
              <div className="ws">{t("canceledBody")}</div>
              <div className="msg">{msgCancel(flujo.clase)}</div>
              <div className="fa"><a className="btn btn-wa sm" href={waLink(msgCancel(flujo.clase))} target="_blank" rel="noreferrer">{t("notifyClaire")}</a><button className="btn btn-honey sm" onClick={() => setFlujo({ ...flujo, etapa: "eligiendo" })}>{t("pickAnother")}</button><button className="btn btn-ghost sm" onClick={() => setFlujo(null)}>{t("done")}</button></div>
            </div>
          )}
          {flujo && flujo.etapa === "eligiendo" && (
            <div className="flowbox pick">
              <div className="wt">{t("pickNewTitle")}</div>
              <div className="ws">{t("pickNewBody")} {sel ? <b>{t("youPicked", { day: DIAS_LARGO[sel.dia], time: `${pad(sel.h)}:00`, when: sel.semana === 0 ? t("whenThis") : t("whenNext") })}</b> : ""}</div>
              <div className="fa"><button className="btn btn-primary sm" disabled={!sel || busy} onClick={aceptarNuevo}>{t("accept")}</button><a className="btn btn-wa sm" href={waLink(msgCancel(flujo.clase))} target="_blank" rel="noreferrer">{t("justNotify")}</a><button className="btn btn-ghost sm" onClick={() => setFlujo(null)}>{t("done")}</button></div>
            </div>
          )}
          {flujo && flujo.etapa === "pedido" && (
            <div className="flowbox pick">
              <div className="wt">{t("requestedTitle", { day: DIAS_LARGO[flujo.slot.dia], time: flujo.slot.ini })}</div>
              <div className="ws">{t("requestedBody")}</div>
              <div className="msg">{msgCambio(flujo.clase, flujo.slot, flujo.semanaSlot)}</div>
              <div className="fa"><a className="btn btn-wa sm" href={waLink(msgCambio(flujo.clase, flujo.slot, flujo.semanaSlot))} target="_blank" rel="noreferrer">{t("sendWa")}</a><button className="btn btn-ghost sm" onClick={() => setFlujo(null)}>{t("done")}</button></div>
            </div>
          )}

          <div className="sechead"><div><h2 style={{ fontSize: 20 }}>{t("yourClasses")}</h2><div className="meta">{rangoSemana(semana, MESES)} · {t("cancelHint")}</div></div><div className="weekpill"><button className={semana === 0 ? "on" : ""} onClick={() => setSemana(0)}>{t("thisWeek")}</button><button className={semana === 1 ? "on" : ""} onClick={() => setSemana(1)}>{t("nextWeek")}</button></div></div>

          {misOcc.length === 0 ? <div className="empty"><h3>{t("noClassesWeek")}</h3></div> : misOcc.map((o) => { const est = estadoCancel(o);
            return (
              <div key={o.key} className="cancelrow">
                <div className="info"><div className="h">{DIAS_LARGO[o.dia]} · {o.ini}–{o.fin}{o.alumnoIds.length > 1 ? ` (${t("group")})` : ""}</div><div className="s">{est === "ok" ? t("canCancel") : est === "menos24" ? t("cantCancel") : t("passed")}</div></div>
                {est === "ok" && (confirmando === o.key ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{t("sure")}</span><button className="btn btn-danger sm" disabled={busy} onClick={() => cancelar(o)}>{t("yesCancel")}</button><button className="btn btn-ghost sm" onClick={() => setConfirmando(null)}>{t("no")}</button></div>
                ) : <button className="btn btn-danger sm" onClick={() => setConfirmando(o.key)}>{t("cancelMyClass")}</button>)}
              </div>
            );
          })}

          <div style={{ marginTop: 18 }}>
            <div className="sechead"><div><h2 style={{ fontSize: 19 }}>{t("claireSchedule")}</h2><div className="meta">{rangoSemana(semana, MESES)} · {t("scheduleHint")}</div></div></div>
            <div className="calscroll"><div className="cal">
              <div className="corner" />
              {DIAS.map((d, i) => <div key={i} className="colhead" style={{ gridColumn: i + 2 }}>{d}</div>)}
              {Array.from({ length: H_FIN - H_INI }, (_, i) => <div key={i} className="hourlab" style={{ gridRow: i * 2 + 2, gridRowEnd: "span 2" }}>{pad(H_INI + i)}:00</div>)}
              {Array.from({ length: 6 }).map((_, d) => Array.from({ length: H_FIN - H_INI }).map((_, hi) => { const h = H_INI + hi, s = hi * 2, isOcc = ocupada(d, h), isHold = enHold(d, h); const isSel = sel && sel.dia === d && sel.h === h && sel.semana === semana; const free = !isOcc && !isHold;
                return <div key={`s${d}-${h}`} className={`cell hour${free ? " free" : ""}${eligiendo ? " pick" : ""}${isSel ? " sel" : ""}`} style={{ gridColumn: d + 2, gridRow: `${s + 2} / span 2` }} onClick={free ? () => { if (eligiendo) setSel({ dia: d, h, semana }); else flash(t("cancelFirst")); } : undefined} />;
              }))}
              {occ.map((o) => { const s = slotDe(o.ini), span = Math.max(1, slotDe(o.fin) - s); const mia = o.alumnoIds.includes(alumnoActivo);
                return <div key={o.key} className={`clase plain${mia ? " mine" : ""}`} style={{ gridColumn: o.dia + 2, gridRow: `${s + 2} / span ${span}`, "--c": mia ? yo.color : "#9AAAA6" }}><div className="cn">{mia ? t("myClass") : t("occupied")}</div><div className="ch">{o.ini}</div></div>;
              })}
              {solicitudes.filter((s) => s.semana === semana).map((s) => { const st = slotDe(s.slot.ini);
                return <div key={s.id} className="clase plain hold" style={{ gridColumn: s.slot.dia + 2, gridRow: `${st + 2} / span 2` }}><div className="cn">{t("reserved")}</div><div className="ch">·</div></div>;
              })}
            </div></div>
            {eligiendo && <div className="acceptbar">{sel ? <><span><b>{t("youPicked", { day: DIAS_LARGO[sel.dia], time: `${pad(sel.h)}:00`, when: sel.semana === 0 ? t("whenThis") : t("whenNext") })}</b></span><button className="btn btn-primary sm" disabled={busy} onClick={aceptarNuevo}>{t("accept")}</button></> : <span>{t("tapFree")}</span>}</div>}
            <div className="legend"><span><span className="dot" style={{ background: yo.color }} />{t("myClass")}</span><span><span className="dot" style={{ background: "#9AAAA6" }} />{t("occupied")}</span><span><span className="dot" style={{ background: "#EFE3C7" }} />{t("reserved")}</span><span><span className="dot" style={{ background: "#EAF5F2", border: "1px solid #cbdbd6" }} />{t("free")}</span></div>
          </div>
        </>
      )}
    </>
  );
}

function ClaseModal({ occ, semana, alumnos, busy, i18n, onGuardar, onEliminar, onCerrar }) {
  const { t, DIAS, MESES } = i18n;
  const esNuevo = !!occ.nuevo;
  const [f, setF] = useState({ alumnoIds: occ.alumnoIds || [], dia: occ.dia ?? 0, ini: occ.ini || "09:00", fin: occ.fin || "10:00", recurrente: esNuevo ? true : !!occ.reglaId });
  const set = (k, v) => setF({ ...f, [k]: v });
  const toggle = (id) => set("alumnoIds", f.alumnoIds.includes(id) ? f.alumnoIds.filter((x) => x !== id) : [...f.alumnoIds, id]);
  return (
    <div className="overlay" onClick={onCerrar}><div className="modal" onClick={(e) => e.stopPropagation()}>
      <h3>{esNuevo ? t("newClassT") : t("editClassT")}</h3>
      <div className="msub">{t("youAreIn", { range: rangoSemana(semana, MESES) })}</div>
      <div className="field"><label>{t("studentsLabel")}</label><div className="picklist">{alumnos.map((a) => <label key={a.id}><input type="checkbox" checked={f.alumnoIds.includes(a.id)} onChange={() => toggle(a.id)} /><span className="pd" style={{ background: a.color }} />{a.nombre}</label>)}</div>
        {f.alumnoIds.length > 1 && <div className="note-grupo">{t("groupNote", { n: f.alumnoIds.length })}</div>}</div>
      <div className="field"><label>{t("day")}</label><select value={f.dia} onChange={(e) => set("dia", Number(e.target.value))}>{DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div>
      <div className="row2"><div className="field"><label>{t("starts")}</label><select value={f.ini} onChange={(e) => set("ini", e.target.value)}>{HORAS.map((h) => <option key={h}>{h}</option>)}</select></div><div className="field"><label>{t("ends")}</label><select value={f.fin} onChange={(e) => set("fin", e.target.value)}>{HORAS.map((h) => <option key={h}>{h}</option>)}</select></div></div>
      <div className="foreverbox"><label className="chk"><input type="checkbox" checked={f.recurrente} onChange={(e) => set("recurrente", e.target.checked)} />{t("repeats")}</label><div className="exp">{f.recurrente ? t("repeatsOn") : t("repeatsOff")}</div></div>
      <div className="macts">{!esNuevo ? <button className="linklike" style={{ color: "#B5524A" }} disabled={busy} onClick={() => onEliminar(f.recurrente)}>{f.recurrente ? t("deleteAll") : t("deleteWeek")}</button> : <span />}<div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost" onClick={onCerrar}>{t("cancel")}</button><button className="btn btn-primary" disabled={!f.alumnoIds.length || busy} onClick={() => onGuardar(f)}>{busy ? t("saving") : t("save")}</button></div></div>
    </div></div>
  );
}

function AlumnoModal({ alumno, busy, i18n, onGuardar, onBorrar, onCerrar }) {
  const { t } = i18n;
  const [f, setF] = useState(alumno); const set = (k, v) => setF({ ...f, [k]: v }); const valido = f.nombre.trim() && f.email.trim();
  return (
    <div className="overlay" onClick={onCerrar}><div className="modal" onClick={(e) => e.stopPropagation()}>
      <h3>{alumno.id ? t("editStudentT") : t("newStudentT")}</h3>
      <div className="msub"><span className="colorasg">{t("colorAssigned")} <span className="dot" style={{ background: f.color, width: 14, height: 14 }} /></span></div>
      <div className="field"><label>{t("nameLabel")}</label><input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Juana Pérez" /></div>
      <div className="field"><label>{t("emailLoginLabel")}</label><input value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="juana@mail.com" /></div>
      <div className="field"><label>{t("zoomLabel")}</label><input value={f.zoom || ""} onChange={(e) => set("zoom", e.target.value)} placeholder="https://zoom.us/j/..." /></div>
      <div className="field"><label>{t("notesLabel")}</label><textarea rows={3} value={f.notas || ""} onChange={(e) => set("notas", e.target.value)} /></div>
      <div className="macts">{alumno.id ? <button className="linklike" style={{ color: "#B5524A" }} disabled={busy} onClick={() => onBorrar(alumno.id)}>{t("delete")}</button> : <span />}<div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost" onClick={onCerrar}>{t("cancel")}</button><button className="btn btn-primary" disabled={!valido || busy} onClick={() => onGuardar(f)}>{busy ? t("saving") : t("save")}</button></div></div>
    </div></div>
  );
}
