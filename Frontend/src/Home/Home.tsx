import React from 'react';
import PrismaticBurst from '../components/PrismaticBurst';
import { useNavigate } from 'react-router-dom';
import StaggeredMenu from '../components/StaggeredMenu';


const menuItems = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  { label: 'About', ariaLabel: 'Learn about us', link: '/about' },
  { label: 'Services', ariaLabel: 'View our services', link: '/services' },
  { label: 'LogOut', ariaLabel: 'Log out of your account', link: '/login' }
];

const socialItems = [
  { label: 'GitHub', link: 'https://github.com' },
];
const Home: React.FC = () => {
  const navigate = useNavigate();

  // Session check: redirect to login if not authenticated
  React.useEffect(() => {
    if (sessionStorage.getItem('isAuthenticated') !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  const handleMenuItemClick = (item: any) => {
    if (item.label === 'LogOut') {
      sessionStorage.removeItem('isAuthenticated');
      navigate('/login');
    } else if (item.link) {
      navigate(item.link);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
        <PrismaticBurst
          animationType="rotate3d"
          intensity={2}
          speed={0.5}
          distort={1.0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.25}
          rayCount={24}
          mixBlendMode="lighten"
        />
      </div>
          <div style={{ height: '100vh', background: '#1a1a1a' }}>
            <StaggeredMenu
              position="right"
              items={menuItems}
              socialItems={socialItems}
              displaySocials={true}
              displayItemNumbering={true}
              menuButtonColor="#fff"
              openMenuButtonColor="#0c0101ff"
              changeMenuColorOnOpen={true}
              colors={['#B19EEF', '#5227FF']}
              logoUrl="./Logo.png"
              accentColor="#ff6b6b"
              onMenuOpen={() => console.log('Menu opened')}
              onMenuClose={() => console.log('Menu closed')}
              onItemClick={handleMenuItemClick}
            />
          </div>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', pointerEvents: 'none' }}>
        <h1>Welcome to the Home Page!</h1>
        <p>You are successfully logged in.</p>
      </div>
    </div>
  );
};

export default Home;
