import './App.css'
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login/Login'
import Home from './Home/Home'
import Analyzer from './Analyzer/Analyzer' // <-- Import the Analyzer page

function App() {
  // Protected route wrapper
  const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

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
        {/* Add other protected routes here as needed */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App