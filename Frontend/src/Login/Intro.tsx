import { useState, useEffect } from 'react'
import SplitText from '../components/SplitText'
import AnimatedContent from '../components/AnimatedContent'

const handleAnimationComplete = () => {
  console.log('All letters have animated!');
};

function Intro({ onFadeOut }: { onFadeOut: () => void }) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const welcomeTimer = setTimeout(() => setShowWelcome(true), 1500);
    const fadeTimer = setTimeout(() => setFadeOut(true), 4000); // fade after 3.5s
    const removeTimer = setTimeout(() => onFadeOut(), 4500); // remove after 4s
    return () => {
      clearTimeout(welcomeTimer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onFadeOut]);

  return (
    <div
      style={{
        pointerEvents: fadeOut ? 'none' : 'auto',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s',
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: 0,
        left: 0,
        background: 'transparent', // transparent so Prism is visible
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '2vw',
      }}
    >
      <AnimatedContent
        distance={150}
        direction="horizontal"
        reverse={false}
        duration={1.2}
        ease="bounce.out"
        initialOpacity={0.2}
        animateOpacity
        scale={1.1}
        threshold={0.2}
        delay={0.3}
      >
        <SplitText
          text="Hello, you!"
          className="text-[6vw] font-extrabold text-center text-[#e3e3e3] font-inter"
          delay={100}
          duration={0.6}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
          onLetterAnimationComplete={handleAnimationComplete}
        />
      </AnimatedContent>
      {showWelcome && (
        <AnimatedContent
          distance={150}
          direction="horizontal"
          reverse={false}
          duration={1.2}
          ease="bounce.out"
          initialOpacity={0.2}
          animateOpacity
          scale={1.1}
          threshold={0.2}
          delay={0.3}
        >
          <SplitText
            text="Welcome to our analyser"
            className="text-[2vw] font-medium text-center text-[#bdbdbd] font-inter"
            delay={100}
            duration={0.7}
            ease="power3.out"
            splitType="words"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
          />
        </AnimatedContent>
      )}
    </div>
  )
}

export default Intro