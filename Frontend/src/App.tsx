import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Login/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App