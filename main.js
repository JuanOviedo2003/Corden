import './style.css'

const app = document.querySelector('#app');

function renderLogin() {
  app.innerHTML = `
    <div class="flex items-center justify-center h-screen">
      <div class="p-8 bg-secondary rounded shadow-md w-80">
        <h2 class="text-xl mb-4">Login</h2>
        <input type="text" id="user" placeholder="Usuario" class="w-full p-2 mb-2 border">
        <input type="password" id="pass" placeholder="Contraseña" class="w-full p-2 mb-4 border">
        <button id="loginBtn" class="w-full p-2 bg-accent text-white">Iniciar sesión</button>
      </div>
    </div>
  `;
  document.querySelector('#loginBtn').onclick = renderDashboard;
}

function renderDashboard() {
  app.innerHTML = `
    <div class="flex flex-col h-screen">
      <div class="h-4/5 bg-secondary p-4">Componente Superior (80%)</div>
      <div class="h-1/5 bg-accent p-4">Componente Inferior (20%)</div>
    </div>
  `;
}

renderLogin();
