import { useState, useEffect } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // If the window is scrolled, we might use window.scrollY
    // But since Layout.jsx has a fixed height `.main-wrapper` on Messages, and regular scrolling on other pages,
    // we need to listen to window scroll.
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    
    // Also listen to .main-wrapper or body if they handle scroll
    const wrapper = document.querySelector('.main-wrapper') || window;
    
    wrapper.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      wrapper.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // In case the wrapper is the one scrolling
    const wrapper = document.querySelector('.main-wrapper');
    if (wrapper) {
      wrapper.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
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
        fontWeight: '600'
      }}
    >
      <i className="bi bi-arrow-up"></i> Back to Top
    </button>
  );
}
