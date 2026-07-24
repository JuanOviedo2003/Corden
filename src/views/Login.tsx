import React from 'react';
import { useAuth } from '../models/AuthContext';

export const Login = () => {
  const { login } = useAuth();
  return (
    <div className="flex items-center justify-center h-screen bg-gray-500 bg-center bg-cover" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1590682680695-43b96a8362fab?q=80&w=2070&auto=format&fit=crop')" }}>
      <div className="p-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-96">
        <h2 className="text-3xl font-black mb-6 tracking-tighter uppercase">Hola de nuevo</h2>
        <input placeholder="Correo Electrónico" className="w-full p-3 mb-4 border-2 border-black focus:outline-none" />
        <input type="password" placeholder="Contraseña" className="w-full p-3 mb-4 border-2 border-black focus:outline-none" />
        <div className="flex items-center gap-2 mb-6 text-sm font-bold">
           <input type="checkbox" className="w-4 h-4 accent-black" /> Recordarme
           <span className="ml-auto underline cursor-pointer">¿Olvidaste tu contraseña?</span>
        </div>
        <button onClick={login} className="w-full p-3 bg-[#4F759B] text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all active:translate-x-1 active:translate-y-1">Entrar</button>
      </div>
    </div>
  );
};