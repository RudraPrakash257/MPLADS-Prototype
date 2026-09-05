import { Routes, Route } from 'react-router-dom';
import { ActionStatusProvider } from './context/ActionStatusContext';
import Layout from './components/Layout';
import OverviewPage from './pages/OverviewPage';
import WorksPage from './pages/WorksPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AgenciesPage from './pages/AgenciesPage';
import PriorityPage from './pages/PriorityPage';
import WorkDetailsPage from './pages/WorkDetailsPage';

export default function App() {
  return (
    <ActionStatusProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/works" element={<WorksPage />} />
          <Route path="/works/:workId" element={<WorkDetailsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/agencies" element={<AgenciesPage />} />
          <Route path="/priority" element={<PriorityPage />} />
        </Route>
      </Routes>
    </ActionStatusProvider>
  );
}
