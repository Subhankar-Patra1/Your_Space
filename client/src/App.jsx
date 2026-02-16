import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LandingPage from './pages/LandingPage';import Editor from './pages/Editor';
import Dashboard from './pages/Dashboard';
import NamePrompt from './components/NamePrompt';

function ProtectedRoute() {
  const [hasName, setHasName] = useState(() => {
    return !!localStorage.getItem('yourspace-username');
  });

  if (!hasName) {
    return <NamePrompt onNameSet={() => setHasName(true)} />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/note/:shortId" element={<Editor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
