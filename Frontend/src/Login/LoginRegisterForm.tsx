import { useState } from 'react'
import AnimatedContent from '../components/AnimatedContent'
import ShinyText from '../components/ShinyText'

function LoginRegisterForm() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const dark = "#060010"

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@gmail.com' && password === '1234') {
      sessionStorage.setItem('isAuthenticated', 'true');
      window.location.href = '/home';
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <AnimatedContent
      animateOpacity
      initialOpacity={0}
      distance={100}
      duration={0.8}
      ease="power3.out"
      direction="vertical"
      reverse={false}
      scale={1}
      threshold={0}
      delay={0.1}
    >
      <div className="bg-white/10 backdrop-blur-lg border border-white/30 shadow-xl rounded-2xl p-8 w-full max-w-[1100px] flex flex-col items-center">
        <div className="mb-6 w-full flex flex-col items-center">
          {/* ShinyText heading */}
          <ShinyText 
            text="A" 
            disabled={false} 
            speed={3} 
            className="text-7xl font-extrabold mb-4"
          />
          <div className="flex gap-2 mb-2">
            <button
              className={`px-6 py-2 rounded-tl-lg rounded-bl-lg font-semibold flex items-center justify-center ${tab === 'login' ? `bg-[${dark}]` : 'bg-white/20 border border-white/30'}`}
              onClick={() => setTab('login')}
              style={tab === 'login' ? { background: dark, color: 'white' } : { background: 'rgba(255,255,255,0.2)', color: dark, border: '1px solid rgba(255,255,255,0.3)' }}
            >
              <ShinyText text="LOGIN" speed={2} className="text-lg" disabled={tab !== 'login'} />
            </button>
            <button
              className={`px-6 py-2 rounded-tr-lg rounded-br-lg font-semibold flex items-center justify-center ${tab === 'register' ? `bg-[${dark}]` : 'bg-white/20 border border-white/30'}`}
              onClick={() => setTab('register')}
              style={tab === 'register' ? { background: dark, color: 'white' } : { background: 'rgba(255,255,255,0.2)', color: dark, border: '1px solid rgba(255,255,255,0.3)' }}
            >
              <ShinyText text="REGISTER" speed={2} className="text-lg" disabled={tab !== 'register'} />
            </button>
          </div>
        </div>
        {tab === 'login' ? (
          <>
            <form onSubmit={handleLogin} style={{ width: '100%' }}>
              <input
                className="w-full mb-3 px-4 py-2 rounded border border-[#060010] focus:outline-none bg-white/60 text-black"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <div className="relative w-full mb-3">
                <input
                  className="w-full px-4 py-2 rounded border border-[#060010] focus:outline-none bg-white/60 text-black"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <span
                  className="absolute right-3 top-3 text-black cursor-pointer"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </div>
              <div className="flex items-center justify-between w-full mb-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  <span style={{ color: dark }}>Remember Me</span>
                </label>
                <span style={{ color: dark }} className="cursor-pointer">Forgot Password?</span>
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded flex items-center justify-center"
                style={{ background: dark, color: 'white', fontWeight: 'bold', marginTop: '0.5rem', cursor: 'pointer' }}
                onMouseOver={e => (e.currentTarget.style.cursor = 'pointer')}
              >
                <ShinyText text="LOGIN" speed={2} className="text-lg" />
              </button>
              {error && <div style={{ color: 'red', marginTop: '0.5rem', textAlign: 'center' }}>{error}</div>}
            </form>
            <div className="mt-4 text-center text-sm" style={{ color: dark }}>
              Don't have an account? <span className="cursor-pointer" style={{ color: dark, textDecoration: 'underline' }} onClick={() => setTab('register')}>Register</span>
            </div>
            <div className="mt-2 text-xs flex justify-between w-full" style={{ color: dark }}>
              <span>Terms of Service</span>
              <span>Privacy Policy</span>
            </div>
          </>
        ) : (
          <>
            <input className="w-full mb-3 px-4 py-2 rounded border border-gray-300 focus:outline-none bg-white/60 text-black" type="text" placeholder="Name" />
            <input className="w-full mb-3 px-4 py-2 rounded border border-gray-300 focus:outline-none bg-white/60 text-black" type="email" placeholder="Email Address" />
            <div className="relative w-full mb-3">
              <input
                className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none bg-white/60 text-black"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
              />
              <span
                className="absolute right-3 top-3 text-black cursor-pointer"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
            <button className="w-full py-2 rounded flex items-center justify-center" style={{ background: dark, color: 'white', fontWeight: 'bold', marginTop: '0.5rem' }}>
              <ShinyText text="REGISTER" speed={2} className="text-lg" />
            </button>
            <div className="mt-4 text-center text-sm" style={{ color: dark }}>
              Already have an account? <span className="cursor-pointer" style={{ color: dark, textDecoration: 'underline' }} onClick={() => setTab('login')}>Login</span>
            </div>
            <div className="mt-2 text-xs flex justify-between w-full" style={{ color: dark }}>
              <span>Terms of Service</span>
              <span>Privacy Policy</span>
            </div>
          </>
        )}
      </div>
    </AnimatedContent>
  )
}

export default LoginRegisterForm