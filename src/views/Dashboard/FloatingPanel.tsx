import React, { useState } from 'react';

interface FloatingPanelProps {
  isDelimiting: boolean;
  isDeleting: boolean;
  onToggleDelimit: () => void;
  onToggleDelete: () => void;
}

export const FloatingPanel = ({
  isDelimiting,
  isDeleting,
  onToggleDelimit,
  onToggleDelete,
}: FloatingPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 font-bold border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all active:translate-x-1 active:translate-y-1"
      >
        {isOpen ? 'Ocultar Herramientas' : 'Mostrar Herramientas'}
     </button>
      {isOpen && (
        <div role="group" aria-label="Herramientas de edición" className="w-[90vw] max-w-[320px] bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
          <div className="flex justify-center gap-4">
            <button
              type="button"
              aria-label="Herramienta Habitación"
              aria-pressed={isDelimiting}
              onClick={onToggleDelimit}
              className={`flex h-20 w-20 flex-col items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-1 text-[10px] font-bold transition-all ${
                isDelimiting ? 'bg-[#4F759B] text-white border-4' : 'bg-white hover:bg-gray-100'
              }`}
            >
              <div className="mb-1 h-8 w-8 rounded-sm border-2 border-current border-dashed" />
              {isDelimiting ? 'Dibujando...' : 'Habitación'}
           </button>
            <button
              type="button"
              aria-label="Herramienta Borrar"
              aria-pressed={isDeleting}
              onClick={onToggleDelete}
              className={`flex h-20 w-20 flex-col items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-1 text-[10px] font-bold transition-all ${
                isDeleting ? 'bg-red-500 text-white border-4' : 'bg-white hover:bg-gray-100'
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
