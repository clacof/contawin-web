# Marca de ContaWin

**La foto.** El paisaje del peñón rojizo sobre el lago, con montañas nevadas entre la bruma, acompaña a ContaWin desde la versión original en xHarbour/FiveWin.

- `contawin-paisaje-original.png`: la copia recuperada (398×243, con artefactos JPEG).
- `../../src/assets/contawin-paisaje.jpg`: la versión restaurada (1592×972, ×4 con Real‑ESRGAN, sin bloques JPEG). Es la que usa la app; `next/image` la sirve en WebP/AVIF al tamaño justo.
- `contawin-paisaje.webp`: la misma restaurada, en WebP, por si hace falta fuera de la app.

**El logo.** Es el peñón de la foto sobre el agua quieta y con su reflejo. Las vetas de la roca son también renglones de libro contable, y el reflejo es la idea de *cuadratura*: lo que sube por el Debe se refleja en el Haber.

- `../../public/marca/contawin-marca.svg`: el ícono (se usa en el login, en la barra lateral y en Acerca de).
- `../../src/app/icon.svg` y `../../src/app/apple-icon.png`: el favicon y el ícono de iOS.
- `contawin-logo-horizontal.svg`: el ícono junto al nombre, para documentos e impresos.
- `contawin-marca-512.png`: el ícono en PNG, para usarlo donde no se acepte SVG.

**Paleta** (sacada de la foto): cielo `#B8CCF6`, agua `#8D9AD8`, roca `#4E2F4C` → `#874956` → `#C47F6E`, tinta `#24204A`.
La interfaz usa esta misma paleta (`src/app/globals.css`). La acción principal es índigo `#433C8C` (en modo oscuro, lavanda `#ABA6F2`), los avisos son cobre `#A85A22`, y los fondos son neutros con un leve tinte lavanda. Los colores de positivo y negativo no cambiaron, para que el Debe/Haber y los errores se sigan leyendo igual. Todas las combinaciones de texto cumplen el contraste WCAG AA.
