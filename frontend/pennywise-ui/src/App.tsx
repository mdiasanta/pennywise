import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import { AuthProvider } from './hooks/use-auth';
import CategoriesPage from './pages/CategoriesPage';
import CreditCardImportPage from './pages/CreditCardImportPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import HomePage from './pages/HomePage';
import NetWorthPage from './pages/NetWorthPage';
import SplitwiseImportPage from './pages/SplitwiseImportPage';
import TagsPage from './pages/TagsPage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/networth" element={<NetWorthPage />} />
              <Route path="/splitwise" element={<SplitwiseImportPage />} />
              <Route path="/credit-card-import" element={<CreditCardImportPage />} />
            </Routes>
            <Toaster />
            <OfflineIndicator />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
