import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import TVStation from './pages/TVStation';
import Calligraphy from './pages/Calligraphy';
import Arithmetic from './pages/Arithmetic';

export default function App() {
  useEffect(() => {
    const el = document.getElementById('splash');
    if (el) {
      el.classList.add('hidden');
      setTimeout(() => el.remove(), 500);
    }
  }, []);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/tv" element={<TVStation />} />
        <Route path="/calligraphy" element={<Calligraphy />} />
        <Route path="/arithmetic" element={<Arithmetic />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
