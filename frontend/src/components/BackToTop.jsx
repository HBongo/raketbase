import { useState, useEffect, useRef } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const hideTimeout = useRef(null);

  useEffect(() => {
    const getScrollY = () => {
      const wrapper = document.querySelector('.main-wrapper');
      return wrapper ? wrapper.scrollTop || window.scrollY : window.scrollY;
    };

    let lastScrollY = getScrollY();
    let lastTime = Date.now();

    const handleScroll = () => {
      const currentScrollY = getScrollY();
      const currentTime = Date.now();
      const timeDiff = currentTime - lastTime;
      
      if (timeDiff > 0) {
        // Calculate scroll velocity (pixels per ms, positive means scrolling UP)
        const velocity = (lastScrollY - currentScrollY) / timeDiff;
        
        // If scrolling UP fast (e.g., > 1.5 px/ms) and we are far from top
        if (velocity > 1.5 && currentScrollY > 500) {
          setVisible(true);
          
          if (hideTimeout.current) clearTimeout(hideTimeout.current);
          
          // Automatically hide after 3 seconds of inactivity
          hideTimeout.current = setTimeout(() => {
            setVisible(false);
          }, 3000);
          
        } else if (currentScrollY > lastScrollY + 5) {
          // If scrolling DOWN, hide the button immediately
          setVisible(false);
          if (hideTimeout.current) clearTimeout(hideTimeout.current);
        } else if (currentScrollY < 100) {
          // If we reached the top, hide it
          setVisible(false);
          if (hideTimeout.current) clearTimeout(hideTimeout.current);
        }
      }
      
      lastScrollY = currentScrollY;
      lastTime = currentTime;
    };
    
    const wrapper = document.querySelector('.main-wrapper');
    if (wrapper) wrapper.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      if (wrapper) wrapper.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const wrapper = document.querySelector('.main-wrapper');
    if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <button 
      onClick={scrollToTop}
      className="btn btn-dark shadow-lg rounded-pill px-4 py-2 d-flex align-items-center gap-2"
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 1050,
        fontWeight: '600',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <i className="bi bi-arrow-up"></i> Back to Top
    </button>
  );
}
