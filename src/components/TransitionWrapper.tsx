
import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';

interface TransitionWrapperProps {
  onEnter?: () => void;
}

const TransitionWrapper: React.FC<TransitionWrapperProps> = ({ onEnter }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  useEffect(() => {
    if (transitionStage === 'fadeOut') {
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('fadeIn');
        // Trigger onEnter when the new content is swapped in
        onEnter?.();
      }, 200); // Corresponds to duration-200
      return () => clearTimeout(timer);
    }
  }, [transitionStage, location, onEnter]);

  return (
    <div
      className={`transition-opacity duration-200 min-h-[50vh] ${transitionStage === 'fadeIn' ? 'opacity-100' : 'opacity-0'}`}>
      <div key={displayLocation.pathname}>
        <Outlet />
      </div>
    </div>
  );
};

export default TransitionWrapper;
