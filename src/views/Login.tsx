import React from 'react';
import { useAuth } from '../models/AuthContext';

export const Login = () => {
  const { login } = useAuth();
  return (
    <div className="flex items-center justify-center h-screen bg-primary">
      <div className="p-8 bg-secondary rounded shadow-md w-80">
        <h2 className="text-xl mb-4">Login</h2>
        <input placeholder="Usuario" className="w-full p-2 mb-2 border" />
        <input type="password" placeholder="Contraseña" className="w-full p-2 mb-4 border" />
        <button onClick={login} className="w-full p-2 bg-accent text-white">Entrar</button>
      </div>
    </div>
  );
};