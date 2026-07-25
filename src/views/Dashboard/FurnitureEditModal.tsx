import React, { useState } from 'react';
import { GRID_SIZE } from '../../models/types';
import { furnitureBoundingBox } from '../../controllers/geometry';
import type { Furniture, GridCoord } from '../../models/types';

interface FurnitureEditModalProps {
  furniture: Furniture;
  onSave: (points: GridCoord[]) => void;
  onClose: () => void;
}

export const FurnitureEditModal = ({ furniture, onSave, onClose }: FurnitureEditModalProps) => {
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
