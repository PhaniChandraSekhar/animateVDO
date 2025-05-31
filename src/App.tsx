import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import AuthForm from './components/AuthForm';
import ProjectsPage from './pages/ProjectsPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import Features from './components/Features';
import Pricing from './components/Pricing';
import About from './components/About';
import DashboardPage from './pages/DashboardPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase } from './lib/supabase';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
          <div className="min-h-screen bg-white">
            <Header />
            <main className="pt-16">
              <Hero />
              <Features />
              <Pricing />
              <About />
            </main>
          </div>
        } />
        <Route path="/auth" element={<AuthForm />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <ProjectsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/team"
          element={
            <PrivateRoute>
              <TeamPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <PrivateRoute>
              <ProjectDetailPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
