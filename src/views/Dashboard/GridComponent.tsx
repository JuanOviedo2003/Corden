import React, { useRef, useState, useEffect } from 'react';
import {
  GRID_SIZE,
  DEFAULT_FURNITURE_SIZE_GRID,
  MAX_EDGE_HIT_DISTANCE_GRID,
  GridCoord,
  GridSize,
  Furniture,
  Region,
  DraggedItem,
  DragPreview,
  Selection,
  VertexEditState,
} from '../../models/types';
import { getFurnitureDefinition } from '../../models/furnitureCatalog';
import {
  rectanglePoints,
  gridToPx,
  snapGrid,
  pointInPolygon,
  canPlaceFurniture,
  findNearestEdge,
  pointsToSvg,
  furnitureBoundingBox,
  clamp,
} from '../../controllers/geometry';
import { writeDraggedItem, readDraggedItem, clearDraggedItem } from '../../controllers/dnd';

interface GridComponentProps {
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
  onVertexEditStart?: () => void;
  onVertexEditEnd?: () => void;
  pan: { x: number; y: number };
}

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const GridComponent = ({
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
  onVertexEditStart,
  onVertexEditEnd,
  pan,
}: GridComponentProps) => {
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
    w: 200,
    h: 200,
  });

  const clientToGrid = (e: React.MouseEvent | React.DragEvent): GridCoord => {
    const bounds = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - bounds.left)) / GRID_SIZE;
    const y = ((e.clientY - bounds.top)) / GRID_SIZE;
    return {
      x: clamp(snapGrid(x), 0, 200),
      y: clamp(snapGrid(y), 0, 200),
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
    onVertexEditStart?.();
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
    e.stopPropagation();
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
    const wasEditing = vertexEdit.current !== null;
    drawStart.current = null;
    vertexEdit.current = null;
    if (wasEditing) onVertexEditEnd?.();
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const region = getRoomAtPoint(clientToGrid(e));
    if (deletingMode) {
      if (region) onDeleteRegion(region.id);
      return;
    }
    setSelection(region ? { type: 'region', regionId: region.id } : null);
  };

  const onCanvasDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      className={`w-[4000px] h-[4000px] bg-white relative ${drawingMode ? 'cursor-crosshair' : ''} ${deletingMode ? 'cursor-not-allowed' : ''}`}
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
              className={`absolute z-10 flex items-center justify-center rounded-xl text-white font-bold select-none focus:outline-none ${selection?.type === 'furniture' && selection.furnitureId === furniture.id ? 'ring-2 ring-[#4F759B] ring-offset-2' : ''} ${deletingMode ? 'hover:bg-red-600 cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
              style={{
                left: gridToPx(furniture.gridPos?.x ?? furnitureBoundingBox(furniture.points).x),
                top: gridToPx(furniture.gridPos?.y ?? furnitureBoundingBox(furniture.points).y),
                width: gridToPx(furniture.gridSize?.w ?? furnitureBoundingBox(furniture.points).w),
                height: gridToPx(furniture.gridSize?.h ?? furnitureBoundingBox(furniture.points).h),
                backgroundColor: definition.color,
                clipPath: `polygon(${furniture.points.map(point => `${((point.x - (furniture.gridPos?.x ?? furnitureBoundingBox(furniture.points).x)) / (furniture.gridSize?.w ?? furnitureBoundingBox(furniture.points).w)) * 100}% ${((point.y - (furniture.gridPos?.y ?? furnitureBoundingBox(furniture.points).y)) / (furniture.gridSize?.h ?? furnitureBoundingBox(furniture.points).h)) * 100}%`).join(', ')})`,
                outline: 'none',
              }}
            >
              <span className="flex flex-col items-center justify-center gap-1 px-1 text-center leading-tight">
                <span className="text-[11px] font-bold">{definition.name}</span>
            </span>
          </div>

            {selection?.type === 'furniture' && selection.furnitureId === furniture.id && (
              <div
                key={`${furniture.id}-selection-indicator`}
                className="absolute z-30 pointer-events-none rounded-xl"
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
