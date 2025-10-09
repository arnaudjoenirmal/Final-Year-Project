import './App.css'
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login/Login';
import Home from './Home/Home';
import Analyzer from './Analyzer/Analyzer';
import Results from './Results/Results';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/analyzer" element={
          <ProtectedRoute>
            <Analyzer />
          </ProtectedRoute>
        } />
        <Route path="/results" element={
          <ProtectedRoute>
            <Results />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;