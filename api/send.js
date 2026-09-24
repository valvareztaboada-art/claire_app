// Función de servidor (Vercel) que manda un mail vía Gmail.
// La clave NO está acá: vive en las variables de entorno del servidor de Vercel:
//   GMAIL_USER           = clairesalabelle3@gmail.com (o el que se use para probar)
//   GMAIL_APP_PASSWORD   = contraseña de aplicación de 16 letras (NO la contraseña normal)
// Estas variables NO llevan el prefijo VITE_, así que nunca llegan al navegador.

import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return res.status(500).json({ error: "Faltan GMAIL_USER / GMAIL_APP_PASSWORD en las variables del servidor (Vercel)." });
  }

  try {
    const { to, subject, text, html, attachments } = req.body || {};
    if (!to || (Array.isArray(to) && to.length === 0)) return res.status(400).json({ error: "Falta el destinatario (to)." });

    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });

    // attachments: [{ filename, content(base64), contentType }]
    const atts = (attachments || []).map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
      contentType: a.contentType || undefined,
    }));

    await transporter.sendMail({
      from: `Claire · Aula <${user}>`,
      to, // acepta string, "a@x.com, b@y.com" o array
      subject: subject || "(sin asunto)",
      text: text || "",
      html: html || undefined,
      attachments: atts,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Error al enviar el mail." });
  }
}
