// Scene domain types and constants.

export const GRID_SIZE = 20;
export const DEFAULT_FURNITURE_SIZE_GRID = 5;
export const MIN_FURNITURE_SIZE_GRID = 1;
export const MAX_EDGE_HIT_DISTANCE_GRID = 1.5;
export const DRAG_DATA_TYPE = 'application/x-corden-item';

export interface FurnitureDefinition {
  name: string;
  color: string;
}

export type GridCoord = { x: number; y: number };
export type GridSize = { w: number; h: number };

export interface Furniture {
  id: string;
  itemId: number;
  points: GridCoord[];
  gridPos?: GridCoord;
  gridSize?: GridSize;
}

export interface Region {
  id: string;
  points: GridCoord[];
  items: Furniture[];
}

export interface DraggedItem {
  itemId: number;
  sourceRegionId?: string;
  sourceItemId?: string;
  gridSize?: GridSize;
}

export interface DragPreview extends DraggedItem {
  targetRegionId: string;
  gridPos: GridCoord;
  gridSize: GridSize;
  valid: boolean;
}

export type Selection =
  | { type: 'region'; regionId: string }
  | { type: 'furniture'; regionId: string; furnitureId: string }
  | null;

export interface VertexEditState {
  regionId: string;
  pointIndex: number;
}

export interface NearestEdge {
  region: Region;
  edgeIndex: number;
  point: GridCoord;
  distance: number;
}
