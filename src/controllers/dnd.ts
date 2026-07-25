// HTML5 Drag and drop glue for furniture items.
// Extracted from Dashboard.tsx so views can share the same channel.
import { DRAG_DATA_TYPE } from '../models/types';
import type { DraggedItem } from '../models/types';

let activeDraggedItem: DraggedItem | null = null;

export const writeDraggedItem = (e: React.DragEvent, item: DraggedItem) => {
  activeDraggedItem = item;
  const data = JSON.stringify(item);
  e.dataTransfer.setData(DRAG_DATA_TYPE, data);
  e.dataTransfer.setData('text/plain', data);
  e.dataTransfer.effectAllowed = item.sourceRegionId ? 'move' : 'copy';
};

export const readDraggedItem = (e: React.DragEvent): DraggedItem | null => {
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

export const clearDraggedItem = () => {
  activeDraggedItem = null;
};
