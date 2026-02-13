import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Editor from './pages/Editor';
import Dashboard from './pages/Dashboard';
import NamePrompt from './components/NamePrompt';

export default function App() {
  const [hasName, setHasName] = useState(() => {
    return !!localStorage.getItem('yourspace-username');
  });

  if (!hasName) {
    return <NamePrompt onNameSet={() => setHasName(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/note/:shortId" element={<Editor />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
