# Mis gastos

App web para controlar gastos personales. Anotas lo que gastaste en dos toques y ves en qué se te
va la plata, con presupuesto por período y gráficos.

Funciona en el teléfono como una app: se instala desde el navegador ("Agregar a pantalla de inicio")
y abre sin conexión. **Todos los datos se guardan solo en tu dispositivo** — no hay cuenta, servidor
ni sincronización.

## Qué hace

- **Registro rápido**: monto, categoría, detalle, fecha y medio de pago. Gastos e ingresos.
- **Importar los movimientos del banco** desde Excel, CSV o el PDF del estado de cuenta: los lee,
  los categoriza solo, entiende las compras en cuotas y no duplica lo que ya estaba.
- **Períodos con día de corte**: mes calendario, o desde el día que te pagan (ej: del 25 al 24).
- **Presupuesto** por período y topes por categoría, con **alertas** al llegar al 80% del tope y al
  pasarse, tanto en el resumen como en el momento de anotar el gasto.
- **Análisis**: gasto por período (últimos 6), desglose por categoría, promedio diario, proyección
  al cierre y reparto por medio de pago.
- **Buscador y filtros** por texto, tipo y categoría, sobre el período o todo el historial.
- **Categorías propias**: agregar, archivar y restaurar, con emoji y color.
- **Respaldos**: exportar a JSON (para restaurar) o a CSV (para abrir en Excel), e importar de vuelta.
- **Tema claro/oscuro** automático o fijo, y moneda configurable (CLP por defecto).

## Cómo correrla

```bash
npm install
npm run dev      # desarrollo, en http://localhost:5173
npm run build    # compila a dist/
npm run preview  # sirve el build compilado
npm test         # tests unitarios
npm run lint     # linter
```

Además, `npm run build:single` genera **un solo archivo `.html`** con todo adentro (app, estilos y el
lector de PDF), que se abre haciendo doble clic sin necesidad de servidor. Útil para pasarle la app a
alguien por correo o guardarla en el escritorio.

Requiere Node 20 o superior.

## Publicarla en internet

El repo trae un workflow de GitHub Actions (`.github/workflows/deploy.yml`) que compila y publica en
GitHub Pages en cada push a `main`. Para activarlo, una sola vez: **Settings → Pages → Source →
GitHub Actions**. Después queda en `https://<usuario>.github.io/<repo>/`, lista para abrir en el
teléfono e instalar.

El build usa rutas relativas (`base: './'`), así que también sirve desde cualquier hosting estático
(Netlify, Vercel, Cloudflare Pages) subiendo la carpeta `dist/`.

### Vercel

El repo trae `vercel.json` con la configuración lista: framework Vite, `npm run build` y salida en
`dist/`. Para publicar, en [vercel.com](https://vercel.com) → **Add New → Project** → importar este
repositorio → **Deploy**. No hay que tocar ninguna opción, y cada push a la rama elegida vuelve a
publicar solo.

Los encabezados de `vercel.json` evitan un problema clásico de las apps instalables: si el navegador
cachea `sw.js`, se queda pegado en una versión antigua **para siempre**, porque el service worker
viejo sigue sirviendo los archivos viejos. Por eso ese archivo se marca como no cacheable.

## Importar movimientos

En **Ajustes → Importar cartola** se sube lo que el banco entregue. Todo se lee **dentro del
navegador**: ningún archivo se sube a un servidor.

| Formato | Cómo se lee |
|---|---|
| `.xlsx` | ZIP con XML: se descomprime con `fflate` y se leen los textos compartidos y la primera hoja |
| `.xls` que en realidad es HTML | varios bancos exportan una tabla HTML con extensión `.xls`; se lee la tabla más grande |
| `.csv` / `.txt` | separador detectado solo (`;` `,` tab `\|`), con comillas y BOM |
| `.pdf` | estado de cuenta de tarjeta de Banco de Chile, vía pdf.js |

El tipo se detecta **por el contenido, no por la extensión**, porque la extensión miente seguido. El
texto se decodifica como UTF-8 y, si el archivo no lo cumple, se relee como Latin-1 — así los
acentos no se rompen.

**Conviene el Excel antes que el PDF**, y sobre todo **no hay que convertir el Excel a PDF**: al
convertirlo se pierde la estructura de columnas y queda ilegible para el importador.

En planillas, las columnas se detectan solas por encabezado (`Fecha`, `Detalle`, `Cargo`, `Abono`…)
y, si no hay encabezados, por contenido: la columna con más fechas es la fecha, la que tiene más
montos es el monto, la de texto más largo es la descripción. Si la detección falla, la app pide
elegir las columnas a mano. Como el signo de los montos no significa lo mismo en todos los bancos,
hay un interruptor para decir si los negativos son abonos o gastos.

### El PDF del estado de cuenta

Si el archivo pide clave, la app la solicita y la usa solo para abrirlo en memoria; nunca se guarda.

Qué hace con lo que encuentra:

- **Reconstruye las filas por posición** en la página y las mapea a las columnas del estado de cuenta
  (lugar, fecha, descripción, monto operación, monto total, n° de cuota, cargo del mes).
- **Limpia el comercio**: saca el código de referencia y los prefijos de pasarela, de modo que
  `MERCADOPAGO*ALMACEN` quede como `Almacén` y `PAYU *UBER TRIP` como `Uber Trip`.
- **Categoriza** con una tabla de comercios chilenos, y **aprende de tus correcciones**: lo que
  cambies a mano queda guardado y se aplica en las siguientes importaciones.
- **Compras en cuotas**: usa la cuota del mes (no el total de la compra) y la fecha del estado de
  cuenta, así el gasto cae en el período en que efectivamente se cobró y no se repite cada mes.
- **Pagos a la tarjeta**: los muestra pero llegan desmarcados, porque no son un gasto nuevo — la
  compra original ya está contada.
- **Duplicados**: lo que ya tenías registrado se marca y llega desmarcado, así puedes importar la
  misma cartola dos veces sin ensuciar los datos.

Nada se importa sin que lo confirmes: la app muestra la lista completa para revisar y corregir
categorías antes de guardar.

Solo está implementado el formato de Banco de Chile. Otro banco necesita su propio mapeo de
columnas en `src/lib/import/`.

## Alertas de presupuesto

Los topes por categoría se definen en **Ajustes → Topes por categoría**. A partir de ahí:

| Estado | Cuándo |
|---|---|
| Al día | vas dentro de lo esperado |
| Vas rápido | gastas más rápido de lo que avanza el período (más de 15 puntos por delante) |
| Te queda poco | llegaste al 80% del tope |
| Pasaste el tope | te pasaste del 100% |

Aparecen en el resumen ordenadas por urgencia, y salta un aviso en el momento justo en que un gasto
cruza un umbral — al anotarlo a mano o al importar una cartola. El aviso se evalúa contra el período
al que pertenece el gasto, no contra el que estés mirando en pantalla, y no se repite mientras la
categoría siga en el mismo estado.

## Cómo está armada

Sin backend ni dependencias de UI: React + TypeScript sobre Vite, y CSS propio.

```
src/
  lib/        date.ts (períodos y día de corte), stats.ts (agregaciones),
              alerts.ts (estado de los topes), format.ts (moneda y montos),
              storage.ts (localStorage), csv.ts, draft.ts
  lib/import/ sheet.ts (xlsx/xls-HTML/csv), tabular.ts (detección de columnas),
              pdf.ts (lectura con pdf.js), bancochile.ts (mapeo del estado de cuenta),
              text.ts (fechas, montos y limpieza de comercios),
              rules.ts (categorización), dedupe.ts
  hooks/      useStore.ts (estado + persistencia), useTheme.ts
  components/ formulario, lista, medidor y alertas de presupuesto, gráficos,
              hoja modal, importador
  views/      Resumen, Movimientos, Análisis, Ajustes
public/       manifest, service worker e íconos
scripts/      make-icons.mjs — genera los PNG del ícono (npm run icons)
```

pdf.js se carga solo cuando abres el importador (`import()` dinámico), así el arranque de la app no
carga el megabyte del lector para quien nunca importa una cartola.

El estado vive en `localStorage` bajo `app-gastos:state`, versionado y normalizado al leerlo, así un
archivo corrupto o antiguo no rompe la app. Las pestañas abiertas del mismo navegador se mantienen
sincronizadas.

Los tests cubren la parte con reglas de verdad: aritmética de períodos con día de corte, parseo de
montos escritos a mano (`12.500`, `1.234,56`, `$ 9.990`), las agregaciones, el mapeo de columnas de
la cartola, la limpieza de nombres de comercio, la categorización, la detección de duplicados y los
umbrales de las alertas. Los casos del importador usan cartolas sintéticas: reproducen las
posiciones de columna del formato, no datos de nadie.

### Colores de los gráficos

La paleta sigue una referencia validada para daltonismo y contraste: ocho tonos categóricos en orden
fijo (`src/data/categories.ts`), un solo tono azul para magnitud, y colores de estado reservados para
el medidor de presupuesto. Cada barra va etiquetada con nombre y monto, así el color nunca es el
único canal de identidad. Los valores oscuros son pasos elegidos para la superficie oscura, no una
inversión automática de los claros.

## Límites conocidos

- Los datos viven en el navegador del dispositivo. Si borras los datos del sitio o cambias de
  teléfono, se pierden: usa **Ajustes → Respaldo**.
- No hay conexión en vivo con el banco. La cartola se importa a mano, mes a mes. (Chile aún no tiene
  open banking: el Sistema de Finanzas Abiertas de la Ley Fintec entra en vigencia recién en julio
  de 2027.)
- Las planillas (Excel/CSV) funcionan con cualquier banco, eligiendo las columnas a mano si hace
  falta. El lector de **PDF** en cambio solo entiende el estado de cuenta de tarjeta de crédito de
  Banco de Chile y depende del diseño actual del archivo: si el banco lo cambia, hay que ajustar el
  mapeo de columnas en `src/lib/import/bancochile.ts`.
- Una cartola de tarjeta no trae tus ingresos. El sueldo se anota a mano.
- No hay gastos recurrentes automáticos.
- Un solo perfil por dispositivo, sin gastos compartidos entre personas.
