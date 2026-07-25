# Helix Atlas — reconstrucción del módulo Artefactos

Fecha: 2026-07-22  
Estado: Propuesta lista para implementación  
Alcance: Mission Control + API de Artifacts  

## 1. Resumen ejecutivo

Reconstruir el módulo **Artefactos** de Mission Control como **Helix Atlas**: una biblioteca operacional privada para encontrar, revisar y curar artefactos HTML con rapidez, sin sustituir el servidor de artefactos ni modificar el contenido fuente.

La propuesta combina cuatro referencias con nombre y fundamento:

- **Faceted Navigation**, documentado por Marti Hearst, como marco formal para exploración y descubrimiento mediante filtros combinables.
- **Eagle**, como referencia de producto para una biblioteca visual con previews, búsqueda, filtros y metadatos.
- **PARA**, de Tiago Forte, como estructura existente para distinguir proyectos, áreas, recursos y archivo.
- **Linear**, como referencia de interacción para filtros, vistas operativas y densidad de información.

El resultado debe respetar el lenguaje visual **Solar Throne** de Mission Control: oscuro, sobrio, denso, negro y dorado, con prioridad en información útil sobre decoración.

## 2. Problema actual

El módulo actual presenta los artefactos como una lista simple de enlaces. Esto limita tres trabajos igualmente importantes:

1. Encontrar un artefacto específico con rapidez.
2. Entender qué requiere revisión o seguimiento.
3. Clasificar, comentar y compartir artefactos sin salir del flujo.

Además:

- No existen búsqueda, filtros, categorías, preview ni metadatos visibles.
- Los artefactos mezclan dashboards, reportes, decisiones, decks, documentos de marca e incidentes sin una jerarquía operacional.
- La URL producida actualmente por Mission Control usa `/<name>`, pero el servidor canónico expone `/a/:name` y `/v/:name`.
- El servidor interpreta como `draft` los artefactos sin estado persistido; con el inventario actual, esto haría que casi todos parezcan borradores aunque en realidad nunca hayan sido revisados.
- Los metadatos persistentes todavía son escasos, así que la experiencia debe funcionar bien con inferencias y datos incompletos.

## 3. Objetivos y métricas

### Objetivos

- Convertir Artefactos en una superficie primaria de consulta y curación dentro de Mission Control.
- Mantener el servidor de Artifacts como fuente canónica y Mission Control como interfaz principal.
- Conservar los archivos HTML como fuente de contenido.
- Habilitar revisión y curación sin agregar borrado ni renombrado.

### Métricas de éxito

- Encontrar un artefacto conocido en menos de **10 segundos**.
- Clasificar o comentar un artefacto en máximo **3 acciones** desde su selección.
- Identificar inmediatamente qué elementos están sin revisar, en revisión, recientes o marcados como favoritos.

## 4. Principios de producto

1. **Una biblioteca, múltiples cortes.** No separar el inventario en módulos rígidos; usar facetas y vistas guardadas sobre una sola colección.
2. **Preview antes que navegación.** Seleccionar un artefacto debe mostrar su contenido y contexto sin perder la posición en la biblioteca.
3. **Estado explícito, ausencia honesta.** Un artefacto sin estado persistido aparece como `Sin revisar`, nunca como borrador implícito.
4. **Filename como dato secundario.** El título, propósito, negocio, proyecto, uso y estado deben dominar la jerarquía.
5. **Curación sin riesgo destructivo.** El módulo administra metadatos, estado, favoritos, comentarios y enlaces temporales; no borra ni renombra archivos.
6. **Degradación útil.** La biblioteca debe seguir siendo explorable aunque falten metadatos, previews o conexión con el servidor.

## 5. Arquitectura de información

La ruta se conserva como `/artifacts` y la navegación continúa mostrando **Artefactos** para no romper el modelo mental actual. El título de la experiencia será **Helix Atlas**.

### 5.1 Vistas principales

#### Mesa de control — vista predeterminada

Enfatiza trabajo operativo mediante cuatro cortes inmediatos:

- Sin revisar
- En revisión
- Recientes
- Favoritos

#### Biblioteca

Presenta el inventario completo y permite combinar búsqueda, orden, facetas y formato de visualización.

### 5.2 Facetas

- Negocio o empresa
- Proyecto
- Clasificación PARA
- Tipo de uso
- Estado
- Etiquetas
- Fecha de actualización

Los filtros activos, el orden y el elemento seleccionado deben reflejarse en la URL para permitir volver, compartir vistas internas y conservar contexto al navegar.

## 6. Experiencia de escritorio

La pantalla usa tres zonas persistentes:

1. **Barra lateral izquierda:** Mesa de control, Biblioteca, facetas y conteos.
2. **Área central:** cuadrícula visual de artefactos, con alternativa de lista compacta.
3. **Inspector derecho:** preview, metadatos y acciones del elemento seleccionado.

### 6.1 Encabezado

- Título `Helix Atlas` y conteo total.
- Buscador global con acceso por `/`.
- Selector Cuadrícula/Lista.
- Orden por relevancia, actualización, creación o título.
- Acción para limpiar filtros cuando haya una consulta activa.

### 6.2 Tarjetas

Cada tarjeta muestra, en este orden:

1. Thumbnail o estado visual del preview.
2. Título.
3. Descripción breve.
4. Negocio y proyecto.
5. Tipo de uso y estado.
6. Última actualización.
7. Filename, solo como dato secundario.

Las tarjetas deben comunicar selección, foco, favorito, estado y disponibilidad sin depender únicamente del color.

### 6.3 Inspector lateral

Al seleccionar un artefacto, el inspector muestra:

- Preview HTML sandboxed.
- Título, descripción y filename.
- Negocio, proyecto, PARA, uso, estado y etiquetas editables.
- Favorito.
- Historial o lista de comentarios.
- Creación y revocación de enlaces temporales.
- Acción `Abrir interactivo` para cargar la vista completa del servidor de artefactos.

Los cambios de estado y metadatos deben poder completarse en el propio inspector, con actualización optimista y recuperación clara ante errores.

### 6.4 Teclado

- `/`: enfocar búsqueda.
- Flechas: mover selección.
- `Enter`: abrir inspector o acción primaria.
- `F`: alternar favorito.
- `Esc`: cerrar inspector o limpiar el nivel activo de interacción.

## 7. Experiencia móvil

La interfaz se adapta progresivamente:

1. Lista compacta como vista inicial.
2. Filtros en una hoja modal.
3. Inspector a pantalla completa.
4. Acciones primarias fijas y alcanzables con el pulgar.

La búsqueda, el estado y el acceso a filtros permanecen visibles; la densidad se reduce sin eliminar información crítica.

## 8. Dirección visual

Aplicar el sistema existente **Solar Throne**:

- Fondo oscuro y superficies negras con separación tonal precisa.
- Dorado reservado para selección, foco y acciones de alta intención.
- Inter y JetBrains Mono según la función semántica.
- Retícula de 8 px y densidad de consola operacional.
- Líneas, contraste y tipografía para construir jerarquía; evitar gradientes decorativos.
- Movimiento breve y funcional, con duración máxima aproximada de 150 ms.
- Respeto completo a `prefers-reduced-motion`.

Estados que deben diseñarse explícitamente:

- Cargando.
- Biblioteca vacía.
- Sin resultados.
- Servidor de artefactos desconectado.
- Preview no disponible o bloqueado.
- Metadatos corruptos o incompletos.
- Guardado en curso, guardado exitoso y conflicto de edición.
- Permisos insuficientes.

## 9. Modelo de datos

El servidor de Artifacts permanece como fuente canónica. Los sidecars `<name>.html.meta.json` continúan siendo el mecanismo de persistencia.

### 9.1 Resumen normalizado

El endpoint de colección debe entregar un modelo equivalente a:

```ts
type ArtifactStatus =
  | 'unreviewed'
  | 'draft'
  | 'revisión'
  | 'aprobado'
  | 'obsoleto'

type ArtifactSummary = {
  name: string
  title: string
  description: string | null
  company: string | null
  project: string | null
  use: string | null
  para: 'project' | 'area' | 'resource' | 'archive' | null
  status: ArtifactStatus
  tags: string[]
  favorite: boolean
  createdAt: string | null
  updatedAt: string
  commentCount: number
  previewUrl: string
  reviewUrl: string
  version: string
}
```

### 9.2 Semántica de estado

- `unreviewed` se calcula cuando no existe un estado persistido.
- El valor calculado no se escribe automáticamente al sidecar.
- `draft`, `revisión`, `aprobado` y `obsoleto` solo se muestran cuando existe una decisión persistida.
- La etiqueta visible en español para `unreviewed` es `Sin revisar`.

### 9.3 Evolución de sidecars

Agregar compatibilidad con:

- `tags: string[]`
- `favorite: boolean`
- `version` o un identificador equivalente de concurrencia.

No realizar una migración masiva inicial de los artefactos existentes. Los metadatos se enriquecen conforme se revisan y el sistema conserva las heurísticas actuales como fallback.

## 10. Contratos API

### 10.1 Servidor de Artifacts

Agregar un endpoint aditivo:

- `GET /api/artifacts`: devuelve la colección normalizada, conteos y valores disponibles para facetas.

Conservar compatibilidad con las rutas existentes:

- `/a/:name`: contenido para preview.
- `/v/:name`: vista de revisión completa.
- `/s/:token`: enlace temporal compartido.
- Endpoints existentes de metadata, comentarios y shares.

### 10.2 BFF de Mission Control

Mission Control actúa como BFF autenticado y no permite escrituras directas desde el navegador al servidor de artefactos.

- `GET /api/artifacts` — rol mínimo `viewer`.
- `PATCH /api/artifacts/:name` — rol mínimo `operator`.
- `GET /api/artifacts/:name/comments` — rol mínimo `viewer`.
- `POST /api/artifacts/:name/comments` — rol mínimo `operator`.
- `POST /api/artifacts/:name/shares` — rol mínimo `operator`.
- `DELETE /api/artifacts/shares/:token` — rol mínimo `operator`.

Las escrituras deben validar nombres, payloads y permisos en el servidor.

### 10.3 Concurrencia

- Usar `ETag`, `If-Match` o un campo `version` equivalente.
- Responder `409 Conflict` cuando el sidecar cambie desde la última lectura.
- El cliente conserva los cambios locales y permite recargar o reintentar después de mostrar la diferencia relevante.

## 11. Seguridad

- Mantener el sistema accesible únicamente dentro del tailnet.
- Corregir la construcción de URLs para usar `/a/` en preview y `/v/` en revisión.
- Agregar al CSP de Mission Control exclusivamente el origen configurado del servidor de artefactos en `frame-src`.
- Cargar el preview en un `iframe` sandboxed.
- Permitir scripts aislados solo cuando el artefacto los requiera.
- No conceder `allow-same-origin`, popups ni navegación del contexto superior.
- Mantener comentarios, metadata y shares detrás del BFF y de los roles de Mission Control.
- No agregar borrado, renombrado ni publicación externa en este alcance.

## 12. Plan de implementación

### Fase 1 — Contrato canónico

1. Formalizar `ArtifactSummary` y la semántica `unreviewed`.
2. Extender sidecars con etiquetas, favorito y versión.
3. Agregar el endpoint de colección al servidor de Artifacts.
4. Corregir y probar las URLs `/a/` y `/v/`.
5. Mantener compatibilidad con sidecars antiguos y artefactos sin metadata.

### Fase 2 — BFF y seguridad

1. Reemplazar el escaneo directo de Mission Control por consumo del endpoint canónico.
2. Implementar endpoints BFF para colección, edición, comentarios y enlaces temporales.
3. Aplicar roles `viewer` y `operator`.
4. Implementar concurrencia optimista y respuesta `409`.
5. Configurar el origen exacto en CSP y el sandbox del preview.

### Fase 3 — Shell de Helix Atlas

1. Reemplazar el panel actual por la arquitectura Mesa/Biblioteca.
2. Implementar búsqueda, orden, facetas y estado en URL.
3. Implementar cuadrícula visual y lista compacta.
4. Agregar estados vacíos, degradados y de error.
5. Aplicar responsive y accesibilidad estructural.

### Fase 4 — Inspector y curación

1. Integrar preview sandboxed.
2. Agregar edición de metadatos y estado.
3. Agregar favorito, comentarios y enlaces temporales.
4. Implementar actualización optimista, rollback y conflictos.
5. Agregar navegación por teclado y foco restaurable.

### Fase 5 — Validación y transición

1. Validar métricas de búsqueda y número de acciones con tareas reales.
2. Activar Helix Atlas como experiencia principal de `/artifacts`.
3. Conservar la galería externa actual como fallback operativo durante la validación.
4. Retirar el panel viejo después de confirmar paridad y estabilidad.

## 13. Estrategia de pruebas

### Servidor de Artifacts

- Estado `unreviewed` cuando no existe valor explícito.
- Persistencia y lectura de estado, etiquetas y favorito.
- Compatibilidad con sidecars anteriores.
- Escrituras atómicas.
- Conflictos de versión.
- Sidecars corruptos.
- Nombres de archivo inválidos y traversal.
- Conteo y escritura de comentarios.
- Creación y revocación de shares.

### Mission Control

- Autorización por rol para cada endpoint.
- Manejo de servidor desconectado y respuestas parciales.
- Búsqueda, facetas, conteos, orden y sincronización con URL.
- Selección e inspector sin perder contexto.
- Actualización optimista y rollback.
- Foco visible, orden de tabulación, etiquetas accesibles y anuncios de estado.
- Contraste y `prefers-reduced-motion`.

### E2E y aceptación

Probar como mínimo en:

- Escritorio: 1440 × 900.
- Móvil: 390 px de ancho.

Flujos críticos:

1. Encontrar un artefacto conocido usando búsqueda.
2. Encontrarlo navegando por facetas.
3. Abrir preview y regresar sin perder contexto.
4. Marcar favorito.
5. Cambiar estado a revisión.
6. Agregar comentario.
7. Crear y revocar un enlace temporal.
8. Resolver un conflicto de edición.
9. Continuar trabajando cuando el preview no está disponible.

La aceptación manual debe confirmar:

- Hallazgo en menos de 10 segundos.
- Clasificación o comentario en máximo 3 acciones desde la selección.

## 14. Fuera de alcance

- Reescribir o convertir los archivos HTML.
- Integración con Linear.
- Publicación en internet abierto.
- Borrado o renombrado de artefactos.
- Migración masiva obligatoria de metadatos.
- Sustituir el servidor de Artifacts por Mission Control.

## 15. Riesgos y mitigaciones

### Metadatos escasos

**Riesgo:** la biblioteca puede verse incompleta al inicio.  
**Mitigación:** usar heurísticas existentes, mostrar `Sin revisar` y facilitar enriquecimiento progresivo desde el inspector.

### Preview de HTML no confiable

**Riesgo:** scripts o contenido heredado pueden intentar capacidades no deseadas.  
**Mitigación:** origen separado, CSP exacto, sandbox restrictivo y acción explícita para abrir la experiencia interactiva completa.

### Ediciones simultáneas

**Riesgo:** una actualización puede sobrescribir cambios recientes.  
**Mitigación:** versionado, escritura atómica y conflictos `409` recuperables.

### Duplicación entre servidor y Mission Control

**Riesgo:** dos implementaciones podrían divergir.  
**Mitigación:** el servidor conserva modelo y persistencia canónicos; Mission Control solo agrega autenticación, autorización y experiencia de operador.

## 16. Referencias

- Marti Hearst, **Faceted Navigation**: <https://people.ischool.berkeley.edu/~hearst/papers/hcir08.pdf>
- Eagle, **Why Eagle**: <https://en.eagle.cool/blog/post/why-eagle>
- Eagle, **How to search for files in Eagle**: <https://en.eagle.cool/blog/post/how-to-search-for-files-in-eagle>
- Tiago Forte, **The PARA Method**: <https://fortelabs.com/blog/para/>
- Linear, **Filters**: <https://linear.app/docs/filters>
- Linear, **Custom views**: <https://linear.app/docs/custom-views>
- Linear, **Display options**: <https://linear.app/docs/display-options>

## 17. Decisiones cerradas

- Nombre del concepto: **Helix Atlas**.
- Vista inicial: **Mesa de control**.
- Modelo de información: una biblioteca con navegación facetada.
- Preview: inspector lateral persistente en escritorio.
- Persistencia: sidecars del servidor de Artifacts.
- Fuente canónica: servidor de Artifacts.
- Interfaz principal: Mission Control.
- Artefactos sin estado: `Sin revisar`.
- Acciones de gestión: metadata, estado, etiquetas, favorito, comentarios y enlaces temporales.
- Sin borrado ni renombrado.
- HTML permanece como fuente de contenido.

## 18. Supuestos

- La experiencia es privada y principalmente operada por Musa dentro del tailnet.
- El inventario observado de aproximadamente 102 artefactos seguirá creciendo y cambiando.
- Mission Control conserva su sistema de roles actual: `viewer < operator < admin`.
- Los cambios ajenos actualmente presentes en el worktree no forman parte de esta iniciativa y deben preservarse.
