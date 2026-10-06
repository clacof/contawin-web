# ContaWin Web (Next.js)

> **ContaWin es obra de Claudio A. Cofré V.** (versión DOS, luego xHarbour + FiveWin). Esta versión web, como
> ContaWinPy, es solo un traspaso de tecnología que conserva su lógica, sus reglas contables y su autoría.

Traspaso de **ContaWinPy** (Python + PySide6 + SQLite) a una aplicación web con **Next.js 16 (App Router) + TypeScript**,
**sin cambiar ninguna regla de negocio**: misma base SQLite, mismo esquema, mismas validaciones y mensajes, mismos
informes y el mismo formato de claves, así que **los usuarios y los datos actuales funcionan tal cual** y se puede
usar en paralelo con la versión de escritorio.

## Instalación y uso

Requiere Node.js 20.9 o superior.

```bash
cd contawin-web
npm install
npm run dev          # desarrollo:  http://localhost:3000
# o, para uso diario:
npm run build && npm start
```

Por defecto usa `../datos/contawin.db` (la base de ContaWinPy). Para cambiarla y otros ajustes, copie
`.env.example` como `.env.local` (equivale a `contawin.ini`).

Usuarios: los mismos de la base. En una base nueva se crean ADMIN/ADMIN, CAC/CAC (administradores) y CONTA/CONTA.

Atajos: **F2** empresa y año · **F3** comprobantes · **F4** plan de cuentas · **Ctrl+N** nuevo comprobante ·
en las grillas **Insert** nuevo, **Supr** borrar, **Enter**/doble clic modificar · en el comprobante **Ctrl+S** guardar.

Importar los DBF del ContaWin antiguo: *Utilidades > Importar desde DBF*, o
`npm run importar -- "D:\ruta\CONTAWIN" [base.db] [--reemplazar] [--cp850]`.

## Ingreso y sesión

- Login contra la tabla `usuario` (PBKDF2-SHA256, 60.000 iteraciones, misma sal y formato que Python).
- Confirma el nombre del usuario al salir del campo y da **3 intentos**; al tercero muestra
  «Acceso no autorizado. Se superó el número de intentos.» y bloquea el ingreso desde ese navegador por 5 minutos
  (en escritorio se cerraba el programa).
- La sesión (usuario + empresa + año de trabajo) va en una cookie httpOnly firmada (JWT HS256 con `jose`, 10 horas).
  En cada página y acción se vuelve a validar contra la base (`lib/sesion.ts`); `proxy.ts` solo redirige a `/login`.
- Mantención de usuarios solo para administradores; no se puede borrar el usuario en uso ni el último administrador.

## Estructura

```
src/lib/util.ts            RUT, códigos 99.99.99, montos, fechas, tipos de documento/asiento   (util.py)
src/lib/db/                Database = repositorios por agregado, mismo esquema SQLite            (db/)
src/lib/reports/           Informe como datos + PDF (pdfkit) + Excel/CSV (exceljs)              (reports/, ui/impresion.py)
src/lib/dbf/               lector DBF propio (cp1252/cp850) e importador                         (dbf_reader.py, importer.py)
src/lib/sesion.ts          sesión de trabajo y control de acceso                                 (sesion.py)
src/app/login/             ingreso                                                               (ui/inicio.py)
src/app/(app)/             tablero, seleccionar, comprobantes, apertura, mantenedores, informes, utilidades
tests/nucleo.test.ts       traducción de tests/test_nucleo.py   ->  npm test
scripts/paridad/           compara informes y reglas Python vs web sobre una copia de la base -> npm run paridad
```

## Fidelidad verificada

- `npm test`: las mismas pruebas de `test_nucleo.py` (cuadratura, numeración, balance de 8 columnas, mayor con arrastre,
  apertura y regeneración, usuarios) más exportación PDF/Excel/CSV.
- `npm run paridad`: genera con Python y con TypeScript todos los informes de todas las empresas y años de la base real
  (diario, por tipo, mayor, balances, compras por centro de costo, comprobantes, listados, saldos de cierre y apertura)
  y los compara celda por celda: 0 diferencias.
- Además se compararon 63 operaciones de escritura (altas, errores de validación, apertura, borrados) y el importador DBF
  (cp1252 y cp850, con y sin reemplazo): mismas filas y mismos mensajes.
- Redondeo idéntico a `round()` de Python (mitad al par), p. ej. en el cálculo de neto/IVA.

## Interfaz (docs/ADR-002)

- Una sola capa de trabajo: los formularios y la línea del comprobante se abren en un **panel lateral**
  (pantalla completa en el celular); encima solo puede aparecer una confirmación.
- La línea del comprobante tiene dos pasos en el mismo panel: *Cuenta y monto* → *Documento de compra*
  (solo si la cuenta pide documento). «Nuevo proveedor» se completa ahí mismo.
- Empresa y año se eligen en una sola pantalla (empresas a la izquierda, años a la derecha).
- Los errores de validación aparecen dentro del formulario, con los mismos textos; los avisos de éxito, como notificación.
- Tema claro / oscuro, diseño adaptable a celular y tablet, navegación completa con teclado.

## Diferencias propias de la web (no de negocio)

- Imprimir / vista previa / PDF: se genera el PDF en el servidor con el mismo diseño (carta, membrete, página,
  totales por página del libro diario, Art. 100 y firmas) y el navegador lo muestra o descarga.
- Respaldar: descarga una copia consistente de la base (`contawin_respaldo_aaaammdd_hhmmss.db`).
- Importar DBF: la carpeta se indica como ruta del equipo donde corre el servidor.
- Apariencia: claro / oscuro / según el sistema, y se aplica al instante.
- Errores inesperados del servidor quedan en `error.log` (como el original).
