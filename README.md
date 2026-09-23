# Aula — gestor de clases (Claire)

App web conectada a Supabase. Este primer proyecto tiene:
- **Alumnos**: crear / editar / borrar, y **queda guardado en la base** de verdad.
- **Semana**: muestra el horario leído desde la base (por ahora solo lectura).

El resto (editar el horario, excepciones por semana, la vista del alumno) lo vamos
sumando una vez que confirmes que esto guarda bien.

## Para correrlo en tu compu

1. Instalá **Node.js** (versión 18 o más nueva) desde https://nodejs.org si no lo tenés.
2. Abrí una terminal dentro de esta carpeta (`aula-app`).
3. Instalá las dependencias:
   ```
   npm install
   ```
4. Levantá el servidor de desarrollo:
   ```
   npm run dev
   ```
5. Abrí en el navegador la dirección que te muestra (normalmente http://localhost:5173).

Deberías ver los 5 alumnos de ejemplo que cargamos en Supabase. Probá:
- Agregar un alumno → recargá la página → sigue estando.
- Miralo también en Supabase → Table Editor → tabla `alumnos`.

## Las claves

Están en el archivo **.env.local**. Es la URL de tu proyecto y la clave pública (anon).
No borres ese archivo. No lo subas a un repo público (ya está en .gitignore).

## Para publicarlo en Netlify (más adelante)

1. Subí esta carpeta a un repo de GitHub.
2. En Netlify: "Add new site" → "Import from GitHub" → elegí el repo.
3. Build command: `npm run build` — Publish directory: `dist`.
4. En Netlify → Site settings → Environment variables, cargá las dos:
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los mismos valores del .env.local).
5. Deploy. Te queda el link para compartir.
