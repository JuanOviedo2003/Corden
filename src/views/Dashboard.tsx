import React, { useRef, useState } from 'react';
import { GridCoord, GridSize, Furniture, Region, DraggedItem } from '../models/types';
import { FurnitureEditModal } from './Dashboard/FurnitureEditModal';
import { Carousel } from './Dashboard/Carousel';
import { FloatingPanel } from './Dashboard/FloatingPanel';
import { GridComponent } from './Dashboard/GridComponent';
import { rectanglePoints, canPlaceFurniture, furnitureBoundingBox } from '../controllers/geometry';

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;


export const Dashboard = () => {
  const [isDelimiting, setIsDelimiting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [editingFurniture, setEditingFurniture] = useState<{ regionId: string; furniture: Furniture } | null>(null);
  const [pan, setPan] = useState(() => ({
    x: -window.innerWidth / 4,
    y: -window.innerHeight / 4
  }));
  const isPanning = useRef(false);

  const [isVertexEditMode, setIsVertexEditMode] = useState(false);

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.buttons === 1 && !isVertexEditMode && !isDelimiting && !isDeleting) {
      isPanning.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current && e.buttons === 1) {
      setPan(v => ({ x: v.x + e.movementX, y: v.y + e.movementY }));
    }
  };

  const handlePanEnd = () => {
    isPanning.current = false;
    setIsVertexEditMode(false);
  };

  const handleUpdateRegion = (regionId: string, points: GridCoord[]) => {
    setRegions(previous => previous.map(region => (
      region.id === regionId ? { ...region, points } : region
    )));
  };

  const handleUpdateFurniture = (regionId: string, furnitureId: string, points: GridCoord[]) => {
    const box = furnitureBoundingBox(points);
    setRegions(previous => previous.map(region =>
      region.id === regionId
        ? {
            ...region,
            items: region.items.map(item =>
              item.id === furnitureId ? { ...item, points, gridPos: { x: box.x, y: box.y }, gridSize: { w: box.w, h: box.h } } : item
            )
          }
        : region
    ));
  };

  const handleResizeItem = (
    regionId: string,
    furnitureId: string,
    gridPos: GridCoord,
    gridSize: GridSize,
    points: GridCoord[],
  ) => {
    setRegions(previous => previous.map(region =>
      region.id === regionId
        ? {
            ...region,
            items: region.items.map(item => item.id === furnitureId ? { ...item, gridPos, gridSize, points } : item),
          }
        : region
    ));
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
      <div
        className="flex-grow w-full bg-white relative overflow-hidden cursor-move"
        onMouseDown={handlePanStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          width: '200vw',
          height: '200vh'
        }}>
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
        onVertexEditStart={() => setIsVertexEditMode(true)}
        onVertexEditEnd={() => setIsVertexEditMode(false)}
        pan={pan}
      />
        </div>
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