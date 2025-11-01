import React, { useState, useEffect, useRef } from 'react';
import Icon from './lib/icons';
import "./Progress.css";

interface ProgressProps {
  icon: string;
  name: string;
  onComplete?: () => void;
}

const Progress: React.FC<ProgressProps> = ({ icon, name, onComplete }) => {
  const [complete, setComplete] = useState(false);
  const [width, setWidth] = useState(0);
  const [color, setColor] = useState("#ed665f");
  const calledRef = useRef(false);

  useEffect(() => {
    if (name) {
      let timeout = setInterval(() => {
        setWidth(prev => {
          if (prev < 100) return prev + 1;
          return prev;
        });
      }, 50);
      return () => clearInterval(timeout);
    }
  }, [name]);

  useEffect(() => {
    if (width >= 100 && !calledRef.current) {
      setComplete(true);
      setColor("#6cc08a");
      calledRef.current = true;
      if (onComplete) onComplete();
    }
  }, [width, onComplete]);

  return (
    <div className="progress">
      <div className="progress__icon">
        <Icon name={icon} width="50px" height="50px" opacity={complete ? 1 : 0.5} />
      </div>
      <div className="progress__content">
        <div className="progress__content__1">
          <p className="progress__content__1__filename">{name}</p>
          <Icon className={complete ? "check" : "close"} name={complete ? "CHECK" : "CLOSE"} width="20px" height="20px" />
        </div>
        <div className="progress__content__2">
          <div className="progress__content__2__bar" style={{ width: `${width}%`, background: color }} />
        </div>
      </div>
    </div>
  );
};

export default Progress;
