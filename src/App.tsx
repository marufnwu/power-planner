import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { WizardPage } from './pages/WizardPage';
import { PlannerPage } from './pages/PlannerPage';
import { AssumptionsPage } from './pages/AssumptionsPage';
import { LearnPage } from './pages/LearnPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/choose" element={<WizardPage />} />
          <Route path="/plan" element={<PlannerPage />} />
          <Route path="/assumptions" element={<AssumptionsPage />} />
          <Route path="/learn" element={<LearnPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
