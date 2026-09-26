import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import WorksExplorer from './pages/WorksExplorer';
import WorkDetail from './pages/WorkDetail';
import Detectors from './pages/Detectors';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/works" element={<WorksExplorer />} />
          <Route path="/works/:id" element={<WorkDetail />} />
          <Route path="/detectors" element={<Detectors />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
