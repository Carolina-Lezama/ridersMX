// El archivo central donde pones tus rutas

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Importas las "páginas" que construiste en tus carpetas
import Inicio from './pages/Inicio';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    // BrowserRouter envuelve toda la app para habilitar la navegación
    <BrowserRouter>
      
      {/* Opcional: Un menú de navegación que siempre se ve */}
      <nav>
        <Link to="/">Inicio</Link>
        <Link to="/login">Iniciar Sesión</Link>
      </nav>

      {/* Routes es el contenedor donde las páginas cambian */}
      <Routes>
        {/* Aquí defines explícitamente qué componente carga cada URL */}
        <Route path="/" element={<Inicio />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Ruta comodín para el error 404 */}
        <Route path="*" element={<h1>Página no encontrada</h1>} />
      </Routes>

    </BrowserRouter>
  );
}

export default App;