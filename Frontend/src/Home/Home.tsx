import React from 'react';
import Aurora from '../components/Aurora';
import StaggeredMenu from '../components/StaggeredMenu';
import { useNavigate } from 'react-router-dom';

const menuItems = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  { label: 'About', ariaLabel: 'Learn about us', link: '/about' },
  { label: 'Services', ariaLabel: 'View our services', link: '/services' },
  { label: 'Contact', ariaLabel: 'Get in touch', link: '/contact' },
  { label: 'Log out', ariaLabel: 'Logout', link: '/login' }
];

const socialItems = [
  { label: 'Twitter', link: 'https://twitter.com' },
  { label: 'GitHub', link: 'https://github.com' },
  { label: 'LinkedIn', link: 'https://linkedin.com' }
];

const Home: React.FC<{ setIsAuthenticated?: (auth: boolean) => void }> = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();

  // Session check: redirect to login if not authenticated
  React.useEffect(() => {
    if (sessionStorage.getItem('isAuthenticated') !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  const handleMenuItemClick = (item: any) => {
    if (item.label === 'Log out') {
      sessionStorage.removeItem('isAuthenticated');
      setIsAuthenticated?.(false);
      navigate('/login');
    } else if (item.link) {
      navigate(item.link);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Aurora
        colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
        blend={0.5}
        amplitude={1.0}
        speed={0.5}
      />
      <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 100, width: 'auto', height: 'auto', pointerEvents: 'auto' }}>
        <StaggeredMenu
          position="right"
          items={menuItems}
          socialItems={socialItems}
          displaySocials={true}
          displayItemNumbering={true}
          menuButtonColor="#5227FF"
          openMenuButtonColor="#ff6b6b"
          changeMenuColorOnOpen={true}
          colors={["#B19EEF", "#5227FF"]}
          logoUrl="/path-to-your-logo.svg"
          accentColor="#ff6b6b"
          onMenuOpen={() => {}}
          onMenuClose={() => {}}
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
