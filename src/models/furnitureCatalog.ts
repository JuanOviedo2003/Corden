// Furniture catalog.
import type { FurnitureDefinition } from './types';

export const FURNITURE_CATALOG: Record<number, FurnitureDefinition> = {
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

export const getFurnitureDefinition = (itemId: number): FurnitureDefinition =>
  FURNITURE_CATALOG[itemId] ?? { name: `Mueble ${itemId}`, color: '#4F759B' };
