import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DEFAULT_FURNITURE_SIZE_GRID } from '../../models/types';
import { getFurnitureDefinition } from '../../models/furnitureCatalog';
import { writeDraggedItem, clearDraggedItem } from '../../controllers/dnd';

export const Carousel = () => {
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
        className="shrink-0 min-w-[40px] min-h-[40px] border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px]"
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
                className={`flex h-20 w-24 min-w-[96px] items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white cursor-grab shrink-0 transition-all duration-300 ${isActive ? 'scale-105 opacity-100' : 'scale-90 opacity-50 blur-[1px]'}`}
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
        className="shrink-0 min-w-[40px] min-h-[40px] border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px]"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeWidth={3} fill="none" d="M9 5l7 7-7 7" />
       </svg>
     </button>
   </div>
  );
};
