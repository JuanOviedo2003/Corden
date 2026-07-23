import React, { useEffect, useRef, useState, useCallback } from 'react';

const GRID_SIZE = 20;
const DEFAULT_FURNITURE_SIZE_GRID = 5;
const MIN_FURNITURE_SIZE_GRID = 1;
const MAX_EDGE_HIT_DISTANCE_GRID = 1.5;

interface FurnitureDefinition {
  name: string;
  color: string;
}

const FURNITURE_CATALOG: Record<number, FurnitureDefinition> = {
  1: { name: 'Cama', color: '#6475B8' },
  2: { name: 'Asiento', color: '#6D8E72' },
  3: { name: 'Sofá', color: '#A56C57' },
  4: { name: 'Mesa', color: '#B89C64' },
  5: { name: 'Escritorio', color: '#64B8B4' },
  6: { name: 'Estantería', color: '#B86464' },
  7: { name: 'Lámpara', color: '#B8B464' },
  8: { name: 'Armario', color: '#7E64B8' },
  9: { name: 'Alfombra', color: '#64B86D' },
  10: { name: 'Espejo', color: '#B864A4' },
};

const getFurnitureDefinition = (itemId: number): FurnitureDefinition =>
  FURNITURE_CATALOG[itemId] ?? { name: `Mueble ${itemId}`, color: '#4F759B' };

const rectanglePoints = (gridPos: GridCoord, gridSize: GridSize) => [
  { x: gridPos.x, y: gridPos.y },
  { x: gridPos.x + gridSize.w, y: gridPos.y },
  { x: gridPos.x + gridSize.w, y: gridPos.y + gridSize.h },
  { x: gridPos.x, y: gridPos.y + gridSize.h },
];

type GridCoord = { x: number; y: number };
type GridSize = { w: number; h: number };

interface Furniture {
  id: string;
  itemId: number;
  points: GridCoord[];
  gridPos?: GridCoord;
  gridSize?: GridSize;
}

interface Region {
  id: string;
  points: GridCoord[];
  items: Furniture[];
}

interface DraggedItem {
  itemId: number;
  sourceRegionId?: string;
  sourceItemId?: string;
  gridSize?: GridSize;
}

interface DragPreview extends DraggedItem {
  targetRegionId: string;
  gridPos: GridCoord;
  gridSize: GridSize;
  valid: boolean;
}

type Selection =
  | { type: 'region'; regionId: string }
  | { type: 'furniture'; regionId: string; furnitureId: string }
  | null;

interface VertexEditState {
  regionId: string;
  pointIndex: number;
}

interface NearestEdge {
  region: Region;
  edgeIndex: number;
  point: GridCoord;
  distance: number;
}

const pxToGrid = (value: number) => Math.round(value / GRID_SIZE);
const gridToPx = (value: number) => value * GRID_SIZE;
const snapGrid = (value: number) => Math.round(value);
const DRAG_DATA_TYPE = 'application/x-corden-item';
let activeDraggedItem: DraggedItem | null = null;

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const writeDraggedItem = (e: React.DragEvent, item: DraggedItem) => {
  activeDraggedItem = item;
  const data = JSON.stringify(item);
  e.dataTransfer.setData(DRAG_DATA_TYPE, data);
  e.dataTransfer.setData('text/plain', data);
  e.dataTransfer.effectAllowed = item.sourceRegionId ? 'move' : 'copy';
};

const readDraggedItem = (e: React.DragEvent): DraggedItem | null => {
  if (activeDraggedItem) return activeDraggedItem;
  const raw = e.dataTransfer.getData(DRAG_DATA_TYPE) || e.dataTransfer.getData('text/plain');
  if (!raw) return null;

  try {
    const item = JSON.parse(raw) as DraggedItem;
    return Number.isFinite(item.itemId) ? item : null;
  } catch {
    return null;
  }
};

const clearDraggedItem = () => {
  activeDraggedItem = null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface FurnitureEditModalProps {
  furniture: Furniture;
  onSave: (points: GridCoord[]) => void;
  onClose: () => void;
}

const FurnitureEditModal = ({ furniture, onSave, onClose }: FurnitureEditModalProps) => {
  const box = furnitureBoundingBox(furniture.points);
  const [points, setPoints] = useState(
    furniture.points.map(p => ({ x: p.x - box.x, y: p.y - box.y }))
  );
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedPointIndex === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / GRID_SIZE);
    const y = Math.round((e.clientY - rect.top) / GRID_SIZE);
    const nextPoints = [...points];
    nextPoints[draggedPointIndex] = { x, y };
    setPoints(nextPoints);
  };

  const handleAddPoint = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / GRID_SIZE;
    const clickY = (e.clientY - rect.top) / GRID_SIZE;
    const point = { x: Math.round(clickX), y: Math.round(clickY) };

    let minDistance = Infinity;
    let insertIndex = -1;

    points.forEach((start, i) => {
      const end = points[(i + 1) % points.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
      const closest = { x: start.x + t * dx, y: start.y + t * dy };

      const dist = Math.hypot(point.x - closest.x, point.y - closest.y);
      if (dist < 1.5 && dist < minDistance) {
        minDistance = dist;
        insertIndex = i + 1;
      }
    });

    if (insertIndex !== -1) {
      const nextPoints = [...points];
      nextPoints.splice(insertIndex, 0, point);
      setPoints(nextPoints);
    }
  };

  const handleSave = () => {
    onSave(points.map(p => ({ x: p.x + box.x, y: p.y + box.y })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4">Editar Forma del Mueble</h2>
        <div
          className="relative border border-gray-300 bg-white"
          style={{
            width: '100%',
            height: '400px',
            backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDraggedPointIndex(null)}
          onMouseLeave={() => setDraggedPointIndex(null)}
          onDoubleClick={handleAddPoint}
        >
          <svg className="absolute inset-0 w-full h-full">
            <polygon
              points={points.map(p => `${p.x * GRID_SIZE},${p.y * GRID_SIZE}`).join(' ')}
              className="fill-[#4F759B]/20 stroke-[#4F759B] stroke-2"
            />
          </svg>
          {points.map((p, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-[#4F759B] rounded-full cursor-move -ml-2 -mt-2"
              style={{ left: p.x * GRID_SIZE, top: p.y * GRID_SIZE }}
              onMouseDown={() => setDraggedPointIndex(i)}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 bg-accent text-white rounded">Guardar</button>
        </div>
      </div>
    </div>
  );
};

const isPointOnSegment = (point: GridCoord, start: GridCoord, end: GridCoord) => {
  const cross = (point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);
  if (Math.abs(cross) > 0.001) return false;
  return (
    point.x >= Math.min(start.x, end.x) - 0.001 &&
    point.x <= Math.max(start.x, end.x) + 0.001 &&
    point.y >= Math.min(start.y, end.y) - 0.001 &&
    point.y <= Math.max(start.y, end.y) + 0.001
  );
};

const pointInPolygon = (point: GridCoord, polygon: GridCoord[]) => {
  if (polygon.length < 3) return false;
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (isPointOnSegment(point, prior, current)) return true;

    const intersects = (
      current.y > point.y !== prior.y > point.y &&
      point.x < ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x
    );
    if (intersects) inside = !inside;
  }

  return inside;
};

const furnitureBoundingBox = (points: GridCoord[]) => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

const canPlaceFurniture = (region: Region, points: GridCoord[]) =>
  points.every(point => pointInPolygon(point, region.points));

const closestPointOnSegment = (point: GridCoord, start: GridCoord, end: GridCoord) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return start;

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return { x: start.x + t * dx, y: start.y + t * dy };
};

const findNearestPolygonEdge = (points: GridCoord[], point: GridCoord) => {
  const candidates: Omit<NearestEdge, 'region'>[] = [];
  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length];
    const closest = closestPointOnSegment(point, start, end);
    candidates.push({
      edgeIndex: index,
      point: closest,
      distance: Math.hypot(point.x - closest.x, point.y - closest.y),
    });
  });
  return candidates.sort((left, right) => left.distance - right.distance)[0] ?? null;
};

const findNearestEdge = (regions: Region[], point: GridCoord) => {
  const candidates: NearestEdge[] = [];

  regions.forEach(region => {
    const nearest = findNearestPolygonEdge(region.points, point);
    if (nearest) candidates.push({ ...nearest, region });
  });

  return candidates.sort((left, right) => left.distance - right.distance)[0] ?? null;
};

const pointsToSvg = (points: GridCoord[]) =>
  points.map(point => `${gridToPx(point.x)},${gridToPx(point.y)}`).join(' ');

const GridComponent = ({
  drawingMode,
  deletingMode,
  regions,
  onAddRegion,
  onUpdateRegion,
  onDropItem,
  onUpdateFurniture,
  onResizeItem,
  onDeleteRegion,
  onDeleteItem,
  onEditFurniture,
}: {
  drawingMode: boolean;
  deletingMode: boolean;
  regions: Region[];
  onAddRegion: (region: Region) => void;
  onUpdateRegion: (regionId: string, points: GridCoord[]) => void;
  onDropItem: (regionId: string, item: DraggedItem, gridPos: GridCoord, gridSize: GridSize) => void;
  onUpdateFurniture: (regionId: string, furnitureId: string, points: GridCoord[]) => void;
  onResizeItem: (regionId: string, furnitureId: string, gridPos: GridCoord, gridSize: GridSize, points: GridCoord[]) => void;
  onDeleteRegion: (id: string) => void;
  onDeleteItem: (regionId: string, furnitureId: string) => void;
  onEditFurniture: (regionId: string, furniture: Furniture) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const drawStart = useRef<GridCoord | null>(null);
  const vertexEdit = useRef<VertexEditState | null>(null);
  const [preview, setPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [selection, setSelection] = useState<Selection>(null);

  useEffect(() => {
    if (!drawingMode) {
      drawStart.current = null;
      setPreview(null);
    }
    vertexEdit.current = null;
    setDragPreview(null);
    if (drawingMode || deletingMode) setSelection(null);
  }, [drawingMode, deletingMode]);

  const canvasGridSize = () => ({
    w: Math.floor((ref.current?.clientWidth ?? 0) / GRID_SIZE),
    h: Math.floor((ref.current?.clientHeight ?? 0) / GRID_SIZE),
  });

  const clientToGrid = (e: React.MouseEvent | React.DragEvent): GridCoord => {
    const bounds = ref.current!.getBoundingClientRect();
    const size = canvasGridSize();
    return {
      x: clamp(snapGrid((e.clientX - bounds.left) / GRID_SIZE), 0, size.w),
      y: clamp(snapGrid((e.clientY - bounds.top) / GRID_SIZE), 0, size.h),
    };
  };

  const getRoomAtPoint = (point: GridCoord) =>
    [...regions].reverse().find(region => pointInPolygon(point, region.points));

  const getDraggedGridSize = (draggedItem: DraggedItem): GridSize =>
    draggedItem.gridSize ?? { w: DEFAULT_FURNITURE_SIZE_GRID, h: DEFAULT_FURNITURE_SIZE_GRID };

  const getFurniturePosition = (point: GridCoord, gridSize: GridSize): GridCoord => {
    const size = canvasGridSize();
    return {
      x: clamp(point.x - Math.floor(gridSize.w / 2), 0, Math.max(0, size.w - gridSize.w)),
      y: clamp(point.y - Math.floor(gridSize.h / 2), 0, Math.max(0, size.h - gridSize.h)),
    };
  };

  const updateDragPreview = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedItem = readDraggedItem(e);
    if (!draggedItem) return;

    const pointer = clientToGrid(e);
    const region = getRoomAtPoint(pointer);
    if (!region) {
      setDragPreview(null);
      return;
    }

    const gridSize = getDraggedGridSize(draggedItem);
    const gridPos = getFurniturePosition(pointer, gridSize);
    const furniturePoints = rectanglePoints(gridPos, gridSize);
    const valid = canPlaceFurniture(region, furniturePoints);
    e.dataTransfer.dropEffect = valid ? (draggedItem.sourceRegionId ? 'move' : 'copy') : 'none';
    setDragPreview({
      ...draggedItem,
      targetRegionId: region.id,
      gridPos,
      gridSize,
      valid,
    });
  };

  const beginVertexEdit = (e: React.MouseEvent, region: Region, pointIndex: number) => {
    if (drawingMode || deletingMode) return;
    e.preventDefault();
    e.stopPropagation();
    setSelection({ type: 'region', regionId: region.id });
    vertexEdit.current = { regionId: region.id, pointIndex };
  };

  const updateVertex = (e: React.MouseEvent) => {
    const activeVertex = vertexEdit.current;
    if (!activeVertex) return false;
    const region = regions.find(item => item.id === activeVertex.regionId);
    if (!region) return false;

    const nextPoints = region.points.map((point, index) =>
      index === activeVertex.pointIndex ? clientToGrid(e) : point,
    );
    onUpdateRegion(region.id, nextPoints);
    return true;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!drawingMode || deletingMode || e.button !== 0) return;
    drawStart.current = clientToGrid(e);
    setPreview({ x: drawStart.current.x, y: drawStart.current.y, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (updateVertex(e)) return;
    if (!drawingMode || !drawStart.current) return;

    const end = clientToGrid(e);
    setPreview({
      x: Math.min(drawStart.current.x, end.x),
      y: Math.min(drawStart.current.y, end.y),
      w: Math.abs(end.x - drawStart.current.x),
      h: Math.abs(end.y - drawStart.current.y),
    });
  };

  const onMouseUp = () => {
    drawStart.current = null;
    vertexEdit.current = null;
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    const region = getRoomAtPoint(clientToGrid(e));
    if (deletingMode) {
      if (region) onDeleteRegion(region.id);
      return;
    }
    setSelection(region ? { type: 'region', regionId: region.id } : null);
  };

  const onCanvasDoubleClick = (e: React.MouseEvent) => {
    if (drawingMode || deletingMode) return;
    const target = e.target as Element;
    if (target.getAttribute('data-room-vertex') !== null) return;

    const nearest = findNearestEdge(regions, clientToGrid(e));
    if (!nearest || nearest.distance > MAX_EDGE_HIT_DISTANCE_GRID) return;
    setSelection({ type: 'region', regionId: nearest.region.id });

    const point = {
      x: snapGrid(nearest.point.x),
      y: snapGrid(nearest.point.y),
    };
    if (nearest.region.points.some(existing => existing.x === point.x && existing.y === point.y)) return;

    const nextPoints = [
      ...nearest.region.points.slice(0, nearest.edgeIndex + 1),
      point,
      ...nearest.region.points.slice(nearest.edgeIndex + 1),
    ];
    onUpdateRegion(nearest.region.id, nextPoints);
  };

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={onCanvasClick}
      onDoubleClick={onCanvasDoubleClick}
      onDragOver={updateDragPreview}
      onDrop={(e) => {
        e.preventDefault();
        const draggedItem = readDraggedItem(e);
        const currentPreview = dragPreview;
        if (!draggedItem || !currentPreview?.valid) {
          setDragPreview(null);
          return;
        }

        onDropItem(
          currentPreview.targetRegionId,
          draggedItem,
          currentPreview.gridPos,
          currentPreview.gridSize,
        );
        setDragPreview(null);
      }}
      className={`w-full h-full bg-white relative ${drawingMode ? 'cursor-crosshair' : ''} ${deletingMode ? 'cursor-not-allowed' : ''}`}
      style={{
        backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    >
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
        {regions.map(region => (
          <polygon
            key={region.id}
            points={pointsToSvg(region.points)}
            className={`fill-[#4F759B]/10 stroke-[#4F759B] ${selection?.type === 'region' && selection.regionId === region.id ? 'stroke-4' : 'stroke-2'} ${deletingMode ? 'fill-red-100 stroke-red-500' : ''}`}
          />
        ))}

        {!drawingMode && !deletingMode && regions.filter(region => selection?.type === 'region' && selection.regionId === region.id).map(region => (
          <React.Fragment key={`${region.id}-vertices`}>
            {region.points.map((point, index) => (
              <circle
                key={`${region.id}-point-${index}`}
                cx={gridToPx(point.x)}
                cy={gridToPx(point.y)}
                r={8}
                data-room-vertex="true"
                onMouseDown={(e) => beginVertexEdit(e, region, index)}
                className="fill-white stroke-[#4F759B] stroke-2 cursor-move pointer-events-auto"
              />
            ))}
          </React.Fragment>
        ))}

        {preview && preview.w > 0 && preview.h > 0 && (
          <polygon
            points={pointsToSvg([
              { x: preview.x, y: preview.y },
              { x: preview.x + preview.w, y: preview.y },
              { x: preview.x + preview.w, y: preview.y + preview.h },
              { x: preview.x, y: preview.y + preview.h },
            ])}
            className="fill-[#4F759B]/10 stroke-[#4F759B] stroke-2 stroke-dashed"
          />
        )}
      </svg>

      {regions.flatMap(region => region.items.map(furniture => {
        const definition = getFurnitureDefinition(furniture.itemId);
        return (
          <>
            <div
              key={furniture.id}
              draggable={!drawingMode && !deletingMode}
              onDragStart={(e) => {
                if (drawingMode || deletingMode) return;
                writeDraggedItem(e, {
                  itemId: furniture.itemId,
                  sourceRegionId: region.id,
                  sourceItemId: furniture.id,
                  gridSize: furniture.gridSize,
                });
              }}
              onDragEnd={() => {
                clearDraggedItem();
                setDragPreview(null);
              }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (drawingMode || deletingMode) return;
            onEditFurniture(region.id, furniture);
          }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setSelection({ type: 'furniture', regionId: region.id, furnitureId: furniture.id });
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (deletingMode) {
                  onDeleteItem(region.id, furniture.id);
                }
              }}
              title={definition.name}
              aria-label={definition.name}
              className={`absolute z-10 flex items-center justify-center rounded-xl text-white font-bold select-none ${selection?.type === 'furniture' && selection.furnitureId === furniture.id ? 'ring-4 ring-white ring-offset-2' : ''} ${deletingMode ? 'hover:bg-red-600 cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
              style={{
                left: gridToPx(furniture.gridPos?.x ?? furnitureBoundingBox(furniture.points).x),
                top: gridToPx(furniture.gridPos?.y ?? furnitureBoundingBox(furniture.points).y),
                width: gridToPx(furniture.gridSize?.w ?? furnitureBoundingBox(furniture.points).w),
                height: gridToPx(furniture.gridSize?.h ?? furnitureBoundingBox(furniture.points).h),
                backgroundColor: definition.color,
                clipPath: `polygon(${furniture.points.map(point => `${((point.x - (furniture.gridPos?.x ?? furnitureBoundingBox(furniture.points).x)) / (furniture.gridSize?.w ?? furnitureBoundingBox(furniture.points).w)) * 100}% ${((point.y - (furniture.gridPos?.y ?? furnitureBoundingBox(furniture.points).y)) / (furniture.gridSize?.h ?? furnitureBoundingBox(furniture.points).h)) * 100}%`).join(', ')})`,
              }}
            >
              <span className="flex flex-col items-center justify-center gap-1 px-1 text-center leading-tight">
                <span className="text-[11px] font-bold">{definition.name}</span>
              </span>
            </div>

            {selection?.type === 'furniture' && selection.furnitureId === furniture.id && (
              <div
                key={`${furniture.id}-selection-indicator`}
                className="absolute z-30 pointer-events-none border-2 border-white ring-2 ring-accent"
                style={{
                  left: gridToPx(furniture.gridPos?.x ?? furnitureBoundingBox(furniture.points).x),
                  top: gridToPx(furniture.gridPos?.y ?? furnitureBoundingBox(furniture.points).y),
                  width: gridToPx(furniture.gridSize?.w ?? furnitureBoundingBox(furniture.points).w),
                  height: gridToPx(furniture.gridSize?.h ?? furnitureBoundingBox(furniture.points).h),
                }}
              />
            )}
          </>);
      }))}

      {dragPreview && (
        <div
          className={`absolute z-20 flex items-center justify-center rounded-xl border-2 border-dashed font-bold pointer-events-none ${dragPreview.valid ? 'border-[#4F759B] bg-[#4F759B]/20 text-[#4F759B]' : 'border-red-500 bg-red-100/70 text-red-600'}`}
          style={{
            left: gridToPx(dragPreview.gridPos.x),
            top: gridToPx(dragPreview.gridPos.y),
            width: gridToPx(dragPreview.gridSize.w),
            height: gridToPx(dragPreview.gridSize.h),
          }}
        >
          <span className="flex flex-col items-center justify-center gap-1 px-1 text-center leading-tight">
            <span className="text-[11px]">{getFurnitureDefinition(dragPreview.itemId).name}</span>
          </span>
        </div>
      )}

      {preview && preview.w > 0 && preview.h > 0 && (
        <div
          className="absolute z-30 border-2 border-dashed border-[#4F759B] bg-[#4F759B]/10 pointer-events-none"
          style={{
            left: gridToPx(preview.x),
            top: gridToPx(preview.y),
            width: gridToPx(preview.w),
            height: gridToPx(preview.h),
          }}
        >
          <button
            type="button"
            aria-label="Confirmar habitación"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onAddRegion({
                id: createId(),
                points: [
                  { x: preview.x, y: preview.y },
                  { x: preview.x + preview.w, y: preview.y },
                  { x: preview.x + preview.w, y: preview.y + preview.h },
                  { x: preview.x, y: preview.y + preview.h },
                ],
                items: [],
              });
              drawStart.current = null;
              setPreview(null);
            }}
            className="pointer-events-auto absolute -top-5 -right-5 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-lg ring-2 ring-white transition-transform hover:scale-110"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth={3} fill="none" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

const Carousel = () => {
  const [items] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 112; 
    scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const center = scrollRef.current.scrollLeft + scrollRef.current.clientWidth / 2;
    const index = Math.round((center - scrollRef.current.clientWidth / 2) / 112);
    setActiveIndex(Math.max(0, Math.min(items.length - 1, index)));
  }, [items.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="h-40 bg-secondary flex items-center gap-2 px-2 shrink-0">
      <button
        type="button"
        onClick={() => scroll('left')}
        className="shrink-0 min-w-[40px] min-h-[40px] rounded-full bg-accent text-white shadow-2xl ring-2 ring-white flex items-center justify-center transition-transform hover:scale-110"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeWidth={3} fill="none" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto h-full flex items-center gap-4 scroll-smooth hide-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        <div className="flex items-center gap-4 px-[50%]">
          {items.map((itemId, i) => {
            const definition = getFurnitureDefinition(itemId);
            const isActive = i === activeIndex;
            return (
              <div
                key={itemId}
                title={definition.name}
                aria-label={definition.name}
                draggable
                onDragStart={(e) => writeDraggedItem(e, {
                  itemId,
                  gridSize: { w: DEFAULT_FURNITURE_SIZE_GRID, h: DEFAULT_FURNITURE_SIZE_GRID },
                })}
                onDragEnd={clearDraggedItem}
                className={`flex h-20 w-24 min-w-[96px] items-center justify-center rounded-xl text-white cursor-grab shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.1)] transition-all duration-300 ${isActive ? 'scale-105 opacity-100 ring-2 ring-white' : 'scale-90 opacity-50 blur-[1px]'}`}
                style={{ backgroundColor: definition.color, scrollSnapAlign: 'center' }}
              >
                <span className="flex flex-col items-center justify-center gap-1 px-1 text-center leading-tight">
                  <span className="font-bold text-xs">{definition.name}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => scroll('right')}
        className="shrink-0 min-w-[40px] min-h-[40px] rounded-full bg-accent text-white shadow-2xl ring-2 ring-white flex items-center justify-center transition-transform hover:scale-110"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeWidth={3} fill="none" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

const FloatingPanel = ({
  isDelimiting,
  isDeleting,
  onToggleDelimit,
  onToggleDelete,
}: {
  isDelimiting: boolean;
  isDeleting: boolean;
  onToggleDelimit: () => void;
  onToggleDelete: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full bg-accent px-6 py-3 font-bold text-white shadow-lg ring-2 ring-white transition-all hover:bg-accent/90"
      >
        {isOpen ? 'Ocultar Herramientas' : 'Mostrar Herramientas'}
      </button>
      {isOpen && (
        <div className="w-[90vw] max-w-[320px] rounded-lg border border-gray-100 bg-white p-4 shadow-2xl">
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={onToggleDelimit}
              className={`flex h-20 w-20 flex-col items-center justify-center rounded p-1 text-[10px] font-bold shadow-md transition-all ${
                isDelimiting ? 'bg-accent text-white ring-4 ring-accent/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="mb-1 h-8 w-8 rounded-sm border-2 border-current border-dashed" />
              {isDelimiting ? 'Dibujando...' : 'Habitación'}
            </button>
            <button
              type="button"
              onClick={onToggleDelete}
              className={`flex h-20 w-20 flex-col items-center justify-center rounded p-1 text-[10px] font-bold shadow-md transition-all ${
                isDeleting ? 'bg-red-500 text-white ring-4 ring-red-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Borrar
            </button>
          </div>
          {!isDelimiting && !isDeleting && (
            <p className="mt-3 text-center text-xs text-gray-500">
              Arrastra los puntos de una habitación o mueble. Haz doble clic en sus bordes para añadir nuevos puntos.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const Dashboard = () => {
  const [isDelimiting, setIsDelimiting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [editingFurniture, setEditingFurniture] = useState<{ regionId: string; furniture: Furniture } | null>(null);

  const handleUpdateRegion = (regionId: string, points: GridCoord[]) => {
    setRegions(previous => previous.map(region => (
      region.id === regionId ? { ...region, points } : region
    )));
  };

  const handleUpdateFurniture = (regionId: string, furnitureId: string, points: GridCoord[]) => {
    const box = furnitureBoundingBox(points);
    setRegions(previous => previous.map(region => (
      region.id === regionId
        ? { 
            ...region, 
            items: region.items.map(item => 
              item.id === furnitureId ? { ...item, points, gridPos: { x: box.x, y: box.y }, gridSize: { w: box.w, h: box.h } } : item
            ) 
          }
        : region
    )));
  };

  const handleResizeItem = (
    regionId: string,
    furnitureId: string,
    gridPos: GridCoord,
    gridSize: GridSize,
    points: GridCoord[],
  ) => {
    setRegions(previous => previous.map(region => (
      region.id === regionId
        ? {
            ...region,
            items: region.items.map(item => item.id === furnitureId ? { ...item, gridPos, gridSize, points } : item),
          }
        : region
    )));
  };

const handleDrop = (
    regionId: string,
    draggedItem: DraggedItem,
    gridPos: GridCoord,
    gridSize: GridSize,
  ) => {
    const furniturePoints = rectanglePoints(gridPos, gridSize);
    setRegions(previous => {
      const targetRegion = previous.find(region => region.id === regionId);
      if (!targetRegion || !canPlaceFurniture(targetRegion, furniturePoints)) return previous;

      const sourceRegion = draggedItem.sourceRegionId
        ? previous.find(region => region.id === draggedItem.sourceRegionId)
        : undefined;
      const sourceFurniture = sourceRegion?.items.find(item => item.id === draggedItem.sourceItemId);
      if (draggedItem.sourceRegionId && !sourceFurniture) return previous;

      const furniture: Furniture = sourceFurniture
        ? { 
            ...sourceFurniture, 
            points: sourceFurniture.points.map(p => ({ 
              x: p.x + (gridPos.x - (sourceFurniture.gridPos?.x ?? furnitureBoundingBox(sourceFurniture.points).x)), 
              y: p.y + (gridPos.y - (sourceFurniture.gridPos?.y ?? furnitureBoundingBox(furniture.points).y)) 
            })), 
            gridPos, 
            gridSize 
          }
        : { id: createId(), itemId: draggedItem.itemId, points: furniturePoints, gridPos, gridSize };

      return previous.map(region => {
        if (region.id === draggedItem.sourceRegionId && region.id !== regionId) {
          return {
            ...region,
            items: region.items.filter(item => item.id !== draggedItem.sourceItemId),
          };
        }
        if (region.id !== regionId) return region;

        if (sourceFurniture && draggedItem.sourceRegionId === regionId) {
          return {
            ...region,
            items: region.items.map(item => item.id === furniture.id ? furniture : item),
          };
        }
        return { ...region, items: [...region.items, furniture] };
      });
    });
  };

  return (
    <div className="h-screen flex flex-col">
      {editingFurniture && (
        <FurnitureEditModal
          furniture={editingFurniture.furniture}
          onSave={(points) => {
            handleUpdateFurniture(editingFurniture.regionId, editingFurniture.furniture.id, points);
            setEditingFurniture(null);
          }}
          onClose={() => setEditingFurniture(null)}
        />
      )}
      <div className="flex-grow w-full bg-white relative overflow-hidden">
        <GridComponent
        drawingMode={isDelimiting}
        deletingMode={isDeleting}
        regions={regions}
        onAddRegion={(region) => {
          setIsDelimiting(false);
          setRegions(previous => [...previous, region]);
        }}
        onUpdateRegion={handleUpdateRegion}
        onDropItem={handleDrop}
        onUpdateFurniture={handleUpdateFurniture}
        onResizeItem={handleResizeItem}
        onDeleteRegion={(id) => setRegions(previous => previous.filter(region => region.id !== id))}
        onDeleteItem={(regionId, furnitureId) => setRegions(previous => previous.map(region => (
          region.id === regionId
            ? { ...region, items: region.items.filter(item => item.id !== furnitureId) }
            : region
        )))}
        onEditFurniture={(regionId, furniture) => setEditingFurniture({ regionId, furniture })}
      />
      </div>
      <div className="h-40 shrink-0">
        <Carousel />
      </div>
      <FloatingPanel
        isDelimiting={isDelimiting}
        isDeleting={isDeleting}
        onToggleDelimit={() => {
          setIsDelimiting(value => !value);
          setIsDeleting(false);
        }}
        onToggleDelete={() => {
          setIsDeleting(value => !value);
          setIsDelimiting(false);
        }}
      />
    </div>
  );
};