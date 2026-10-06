# ADR-002: Flujos sin modales apilados y rediseño visual (sin cambiar funcionalidad)

**Estado:** Aceptado · **Fecha:** 2026-10-06 · **Alcance:** solo interfaz (`src/app`, `src/components`, `globals.css`).
`src/lib/` (reglas, informes, datos) **no se toca**: las pruebas y la comparación de paridad con ContaWinPy deben seguir dando 0 diferencias.

## 1. Diagnóstico

La primera versión web copió los diálogos de escritorio (PySide6) uno a uno. En el navegador eso produce cascadas:

| Flujo | Capas apiladas (peor caso) |
|---|---|
| Comprobante → **Nueva línea** → **Documento de compra** → **Nuevo proveedor** → **Error** («dígito verificador…») | **4 modales** sobre la página (5 con «¿Cerrar sin guardar?») |
| Seleccionar empresa → **Año de trabajo** → **Crear nuevo año** → **Error** («El año ya existe…») | 3 |
| Mantenedor → **Formulario** → **Error** de validación | 2 |
| Borrar empresa → **¿Borrar?** → **Escribe el RUT** → **Eliminación cancelada** | 3 seguidos |
| Importar DBF → **¿Reemplazar? Sí/No/Cancelar** | 1 (evitable) |

Impacto:

- **Carga cognitiva.** En el 4.º nivel el usuario ya no ve el comprobante, los totales ni el descuadre: decide sin contexto. Cada capa oscurece la anterior y el «¿dónde estoy?» se pierde.
- **Teclado y Escape.** `Esc` cierra solo la capa superior; con 4 capas hay que pulsarlo 4 veces y es fácil perder lo escrito en la capa intermedia. El foco vuelve a elementos que el usuario no ve.
- **Accesibilidad.** Los lectores de pantalla anuncian cada diálogo como un contexto nuevo; los mensajes de error en modal interrumpen y obligan a cerrar para corregir, en vez de mostrarse junto al campo.
- **Móvil.** Modales centrados de 640 px dentro de modales: en 390 px de ancho se recortan, el teclado virtual tapa los botones y el botón «Atrás» del sistema no tiene un significado claro.
- **Estado y código.** Cada modal guardaba su propio estado y devolvía resultados por callbacks anidados (Editor → LineaDialog → DocumentoCompraDialog → FormProveedor). Difícil de seguir, de probar y de reiniciar correctamente (p. ej. el documento debe recalcularse si cambia el monto de la línea).

## 2. Decisión

Alternativas evaluadas:

| Opción | Contexto visible | Teclado / Atrás | Móvil | Complejidad | Encaja con la regla |
|---|---|---|---|---|---|
| A. Stepper dentro de **un modal centrado** | No (tapa la página) | Bien | Regular | Baja | Sí |
| B. **Rutas** por paso (`/comprobantes/nuevo/linea/documento`) | No | Muy bien | Bien | Alta: obliga a persistir un borrador del comprobante entre rutas | **No**: el comprobante solo existe en memoria hasta guardar (regla de cuadratura al grabar) |
| C. **Panel lateral (sheet) único con pasos** + edición en línea en las páginas | **Sí**: el comprobante, sus líneas y totales siguen a la vista | Bien: `Esc` = cerrar panel, «Atrás» = paso anterior | Muy bien: el panel pasa a pantalla completa | Media | Sí |

**Se elige C.** Reglas de diseño que quedan fijas:

1. **Una sola capa de trabajo a la vez**: un panel lateral (`Panel`). Encima de él solo puede aparecer una **confirmación** (acción destructiva o salida con cambios). Máximo absoluto: 2 capas.
2. **Pasos dentro del panel** cuando un dato depende de otro: *Línea → Documento de compra* es un `Stepper` de 2 pasos; el paso 2 solo existe si la cuenta «pide documento», exactamente como antes.
3. **Sub-formularios en línea, no modales**: «Nuevo proveedor…» se despliega dentro del paso 2; «Crear nuevo año…» dentro del panel de años.
4. **Errores junto al formulario** (`role="alert"`, mismos textos), no en un modal encima. Los avisos de éxito («Año 2020 creado…») van como **notificación** no bloqueante (`aria-live`).
5. **Maestro-detalle en vez de diálogo encadenado**: seleccionar empresa y año ocurre en una sola página (empresas a la izquierda, años a la derecha).
6. **Preguntas previas como opciones del formulario**: «¿Reemplazar empresas existentes?» pasa a ser una opción visible antes de «Importar».

Qué **no** cambia (verificado): validaciones, orden en que se validan, textos de error, cálculos (sugerencia del monto que cuadra, IVA, neto), atajos (F2, F3, F4, Ctrl+N, Ctrl+S, Insert, Supr, Enter), confirmaciones (borrar, salir sin guardar, fecha fuera del año, cuenta de activo para el resultado, RUT para borrar empresa), permisos y rutas.

## 3. Plan de migración

| Paso | Componente / ruta | Cambio |
|---|---|---|
| 1 | `components/Panel.tsx` | Nuevo: `<dialog>` lateral (derecha en escritorio, pantalla completa en móvil), título, cuerpo con scroll, pie fijo de acciones, foco inicial y retorno de foco. |
| 2 | `components/Stepper.tsx` | Nuevo: indicador de pasos accesible (`aria-current="step"`). |
| 3 | `components/Mensajes.tsx` | Se mantiene `confirmar` (única capa extra permitida); `info` pasa a notificación; se agrega `confirmar` con campo de texto (RUT) en un solo diálogo. |
| 4 | `comprobantes/Editor.tsx` | `LineaDialog` + `DocumentoCompraDialog` + `FormProveedor` → `PanelLinea` con `Stepper` y `NuevoProveedorEnLinea`; barra de totales fija al pie de la página. |
| 5 | `components/Formularios.tsx` | Todos los formularios de mantenedores se abren en `Panel` y muestran el error en línea. Los campos de proveedor se extraen a `CamposProveedor` para reutilizarlos en el paso 2. |
| 6 | `seleccionar/Seleccion.tsx` | Diálogo de años → columna de detalle; «Crear nuevo año» en línea; aviso de apertura como notificación. |
| 7 | `empresas/Cliente.tsx`, `Catalogo.tsx` | Borrar empresa: una sola confirmación con el campo RUT. |
| 8 | `utilidades/importar/Importar.tsx` | Pregunta Sí/No/Cancelar → opción «Empresas que ya existen: importar solo nuevas / reemplazar». |
| 9 | `globals.css`, `Barra.tsx`, layout | Rediseño visual: tokens del sistema ContaWin, barra lateral que en móvil es un menú deslizable, cabecera con contexto de trabajo, tablas con fila seleccionada marcada, objetivos táctiles de 44 px en pantallas táctiles. |
| 10 | Verificación | `npm test`, `npm run paridad` (0 diferencias), recorrido e2e completo, capturas en escritorio, móvil y modo oscuro. |
