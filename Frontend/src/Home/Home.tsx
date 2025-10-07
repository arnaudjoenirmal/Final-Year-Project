import React from 'react';
import Aurora from '../components/Aurora';
import BubbleMenu from '../components/BubbleMenu';
import { useNavigate } from 'react-router-dom';

const items = [
  { label: 'Home', href: '#', ariaLabel: 'Home', rotation: -8, hoverStyles: { bgColor: '#3b82f6', textColor: '#ffffff' } },
  { label: 'About', href: '#', ariaLabel: 'About', rotation: 8, hoverStyles: { bgColor: '#10b981', textColor: '#ffffff' } },
  { label: 'Results', href: '#', ariaLabel: 'Projects', rotation: 8, hoverStyles: { bgColor: '#f59e0b', textColor: '#ffffff' } },
  { label: 'Profile', href: '#', ariaLabel: 'Blog', rotation: 8, hoverStyles: { bgColor: '#ef4444', textColor: '#ffffff' } },
  { label: 'Log out', href: '#', ariaLabel: 'Contact', rotation: -8, hoverStyles: { bgColor: '#8b5cf6', textColor: '#ffffff' } }
];

const Home: React.FC<{ setIsAuthenticated?: (auth: boolean) => void }> = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Aurora
        colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
        blend={0.5}
        amplitude={1.0}
        speed={0.5}
      />
      <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 10, display: 'flex', alignItems: 'flex-start', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', width: 'fit-content' }}>
          <BubbleMenu
            logo={<span style={{ fontWeight: 700 }}>Analyzer</span>}
            items={items}
            menuAriaLabel="Toggle navigation"
            menuBg="#ffffff"
            menuContentColor="#111111"
            useFixedPosition={true}
            animationEase="back.out(1.5)"
            animationDuration={0.5}
            staggerDelay={0.12}
            onItemClick={(item) => {
              if (item.label === 'Log out') {
                localStorage.removeItem('isAuthenticated');
                setIsAuthenticated?.(false);
                navigate('/login');
              }
            }}
          />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', pointerEvents: 'none' }}>
        <h1>Welcome to the Home Page!</h1>
        <p>You are successfully logged in.</p>
      </div>
    </div>
  );
};

export default Home;
