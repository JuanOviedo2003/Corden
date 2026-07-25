// Pure geometry helpers.
import type { GridCoord, GridSize, Region, NearestEdge } from '../models/types';
import { GRID_SIZE } from '../models/types';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const pxToGrid = (value: number) => Math.round(value / GRID_SIZE);
export const gridToPx = (value: number) => value * GRID_SIZE;
export const snapGrid = (value: number) => Math.round(value);

export const rectanglePoints = (gridPos: GridCoord, gridSize: GridSize) => [
  { x: gridPos.x, y: gridPos.y },
  { x: gridPos.x + gridSize.w, y: gridPos.y },
  { x: gridPos.x + gridSize.w, y: gridPos.y + gridSize.h },
  { x: gridPos.x, y: gridPos.y + gridSize.h },
];

export const pointsToSvg = (points: GridCoord[]) =>
  points.map(point => `${gridToPx(point.x)},${gridToPx(point.y)}`).join(' ');

export const isPointOnSegment = (point: GridCoord, start: GridCoord, end: GridCoord) => {
  const cross = (point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);
  if (Math.abs(cross) > 0.001) return false;
  return (
    point.x >= Math.min(start.x, end.x) - 0.001 &&
    point.x <= Math.max(start.x, end.x) + 0.001 &&
    point.y >= Math.min(start.y, end.y) - 0.001 &&
    point.y <= Math.max(start.y, end.y) + 0.001
  );
};

export const pointInPolygon = (point: GridCoord, polygon: GridCoord[]) => {
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

export const canPlaceFurniture = (region: Region, points: GridCoord[]) =>
  points.every(point => pointInPolygon(point, region.points));

export const closestPointOnSegment = (point: GridCoord, start: GridCoord, end: GridCoord) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return start;

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return { x: start.x + t * dx, y: start.y + t * dy };
};

export const findNearestPolygonEdge = (points: GridCoord[], point: GridCoord) => {
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

export const findNearestEdge = (regions: Region[], point: GridCoord) => {
  const candidates: NearestEdge[] = [];

  regions.forEach(region => {
    const nearest = findNearestPolygonEdge(region.points, point);
    if (nearest) candidates.push({ ...nearest, region });
  });

  return candidates.sort((left, right) => left.distance - right.distance)[0] ?? null;
};

export const furnitureBoundingBox = (points: GridCoord[]) => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};
