# Cambios — Corden

Registro cronológico de cambios al proyecto. Formato: fecha ISO, nombre del cambio, descripción breve.

---

## 2026-07-24

- **Plan refactor Dashboard**: dividir `src/views/Dashboard.tsx` (1002 líneas, god component) en módulos respetando el patrón MVC actual (`models/`, `views/`, `controllers/`). Sin cambio de comportamiento, solo reorganización. Steps subsiguientes registran cada movimiento.
- **Extract types + furniture catalog**: crea `src/models/types.ts` (constantes de grilla y contratos `GridCoord`, `GridSize`, `Furniture`, `Region`, `DraggedItem`, `DragPreview`, `Selection`, `VertexEditState`, `NearestEdge`) y `src/models/furnitureCatalog.ts` (`FURNITURE_CATALOG` + `getFurnitureDefinition`). `Dashboard.tsx` ahora los importa.
- **Extract geometry helpers**: crea `src/controllers/geometry.ts` con `clamp`, `gridToPx`, `snapGrid`, `rectanglePoints`, `pointsToSvg`, `isPointOnSegment`, `pointInPolygon`, `canPlaceFurniture`, `closestPointOnSegment`, `findNearestPolygonEdge`, `findNearestEdge`, `furnitureBoundingBox`. `Dashboard.tsx` los importa y elimina sus copias inline.
- **Extract dnd glue**: crea `src/controllers/dnd.ts` con `writeDraggedItem`, `readDraggedItem`, `clearDraggedItem`, centralizando el canal HTML5 drag compartido entre `Carousel` y `GridComponent`.
- **Extract FurnitureEditModal**: mueve el modal de edición de forma a `src/views/Dashboard/FurnitureEditModal.tsx`. `Dashboard.tsx` reduce ~100 líneas.
- **Extract Carousel**: mueve la tira horizontal de muebles a `src/views/Dashboard/Carousel.tsx`.
- **Extract FloatingPanel**: mueve el panel de herramientas flotante a `src/views/Dashboard/FloatingPanel.tsx`. `props: any` reemplazado por `FloatingPanelProps` tipado.
- **Extract GridComponent**: mueve el canvas de grilla a `src/views/Dashboard/GridComponent.tsx`. `Dashboard.tsx` queda como composition root (189 líneas).
- **Cleanup Dashboard imports + dead code**: elimina referencias huérfanas (`beginVertexEdit`/`onMouseUp` que referenciaban variables no definidas tras la separación), `useEffect`/`useCallback` no usados, helpers muertos (`pxToGrid`) e imports no utilizados. `isVertexEditMode` se conserva en el padre para coordinar paneo vs edición de vértices.
- **Fix JSX nest en Dashboard**: remueve `</div>` extra en línea 176 que rompía el árbol del componente (`Adjacent JSX elements must be wrapped...` apuntaba a FloatingPanel adjacent a CarouselContainer). Tras refactor, la `</div>` sobrante del wrapper translate quedó huérfana.
- **Hierarchical events + isVertexEditMode flag (pan vs edit)**: implementa el patrón sugerido por el modelo auxiliar para desambiguar paneo del lienzo vs interacción con vértices/muebles.
  - GridComponent ahora llama `e.stopPropagation()` en: `onMouseDown` (inicio de dibujo de habitación), `onCanvasClick`, `onCanvasDoubleClick`, y dentro de `beginVertexEdit`. Esto evita que el div padre del Dashboard registre el mousedown y active el pan mientras el usuario interactúa con vértices o dibuja.
  - Nuevos callbacks `onVertexEditStart`/`onVertexEditEnd` en `GridComponent`. `beginVertexEdit` los emite; `onMouseUp` local emite `onVertexEditEnd` solo si hubo edición de vértices.
  - En `Dashboard.tsx`, `handlePanStart` ahora bloquea paneo cuando `isVertexEditMode || isDelimiting || isDeleting`. Se pasan los dos callbacks a `GridComponent` para que toggleen `isVertexEditMode` desde el padre.
  - Resultado: arrastrar un vértice ya no desplaza la cámara; dibujar una habitación ya no desplaza la cámara; el doble clic sigue abriendo `FurnitureEditModal` exclusivamente para edición de forma.
- **Fix z-index FloatingPanel vs FurnitureEditModal**: el modal de edición abría por encima pero el `FloatingPanel` mantenía `z-50` igual, y al estar después en el DOM opacaba el modal. Cambio `z-50` → `z-40` en el contenedor de `FloatingPanel.tsx:19` para que el modal (`z-50`) quede visible por encima.

