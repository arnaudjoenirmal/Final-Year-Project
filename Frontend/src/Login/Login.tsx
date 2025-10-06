import '../App.css'
import { useState } from 'react'
import Prism from '../components/Prism'
import Intro from './Intro'
import LoginRegisterForm from './LoginRegisterForm'

function Login() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#060010', overflow: 'hidden' }}>
      {/* Prism background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0.5}
          glow={1}
        />
      </div>
      {/* Content overlays */}
      <div style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!showForm && <Intro onFadeOut={() => setShowForm(true)} />}
        {showForm && <LoginRegisterForm />}
      </div>
    </div>
  )
}

export default Login