import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LandingPage.css';
import {
  BRAND,
  CATEGORIES,
  POPULAR_SEARCHES,
  FREELANCERS,
  HOW_IT_WORKS,
  WHY_US,
  STATS_DATA,
  TESTIMONIALS,
  FAQS,
  TRUSTED_BY
} from './landingData';

// --- SVG ICON COMPONENTS ---
const IconSun = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="m4.93 4.93 1.41 1.41"></path>
    <path d="m17.66 17.66 1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="m6.34 17.66-1.41 1.41"></path>
    <path d="m19.07 4.93-1.41 1.41"></path>
  </svg>
);

const IconMoon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
  </svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconMenu = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="12" x2="20" y2="12"></line>
    <line x1="4" y1="6" x2="20" y2="6"></line>
    <line x1="4" y1="18" x2="20" y2="18"></line>
  </svg>
);

const IconChevronUp = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const IconChevronDown = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const IconArrowRight = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconStar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{color: '#fbbf24'}}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const CategoryIcons = {
  code: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>,
  palette: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>,
  brush: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"></path></svg>,
  edit: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  "trending-up": <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
  film: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>,
  smartphone: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>,
  cpu: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
};

// Social Icons
const IconTwitter = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>;
const IconLinkedIn = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;
const IconGitHub = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>;
const IconYouTube = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>;

// --- HELPER COMPONENTS ---
const AnimatedNumber = ({ target, duration = 2000, prefix = "", suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [isVisible, target, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// --- MAIN COMPONENT ---
export default function LandingPage() {
  const navigate = useNavigate();

  // State
  const [isDark, setIsDark] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Hero Search State
  const [searchCategory, setSearchCategory] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' or 'freelancers'

  // Featured Filter
  
  // Pricing Toggle
  const [isYearly, setIsYearly] = useState(false);

  // Testimonials Carousel
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isHoveringTestimonial, setIsHoveringTestimonial] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(3);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setItemsPerView(1);
      else if (window.innerWidth < 1024) setItemsPerView(2);
      else setItemsPerView(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const maxTestimonials = Math.max(0, TESTIMONIALS.length - itemsPerView);

  // FAQ State
  const [openFaq, setOpenFaq] = useState(null);

  // Modal State
  // Auth Forms
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  // Final CTA Email
  const [finalEmail, setFinalEmail] = useState('');
  const [finalEmailSuccess, setFinalEmailSuccess] = useState(false);

  // Info Modal State
  const [infoModal, setInfoModal] = useState(null);
  const openInfoModal = (e, title, htmlContent) => {
    e.preventDefault();
    setInfoModal({ title, content: htmlContent });
  };

  // Cookie Consent
  const [showCookies, setShowCookies] = useState(false);

  // Back to Top
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Effects
  useEffect(() => {
    // Theme
    try {
      const savedTheme = localStorage.getItem('lp-theme');
      if (savedTheme === 'dark') setIsDark(true);
      else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDark(true);
      }
    } catch (e) {
      console.error(e);
    }

    // Cookies
    try {
      const consent = localStorage.getItem('lp-cookies');
      if (!consent) setShowCookies(true);
    } catch (e) {
      console.error(e);
    }

    // Scroll listeners
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 10);
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll Reveal Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('lp-reveal--visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.lp-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [activeTab]); // Re-run when DOM changes significantly

  // Testimonial Autoplay
  useEffect(() => {
    if (isHoveringTestimonial) return;
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev >= maxTestimonials ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [isHoveringTestimonial]);

  // Handlers
  const toggleTheme = () => {
    setIsDark(prev => {
      const newTheme = !prev;
      try { localStorage.setItem('lp-theme', newTheme ? 'dark' : 'light'); } catch (e) {}
      return newTheme;
    });
  };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate('/explore');
  };

  const handlePopularSearch = (term) => {
    setSearchKeyword(term);
    navigate('/explore');
  };


  const handleFinalSubmit = (e) => {
    e.preventDefault();
    if (finalEmail.includes('@')) {
      setFinalEmailSuccess(true);
      setFinalEmail('');
      setTimeout(() => setFinalEmailSuccess(false), 3000);
    }
  };

  const handleCookie = (choice) => {
    try { localStorage.setItem('lp-cookies', choice); } catch (e) {}
    setShowCookies(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };
  const getHashColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };
  const getFlag = (country) => {
    // simplified flag logic for mock data
    const map = { 'USA': '🇺🇸', 'UK': '🇬🇧', 'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Germany': '🇩🇪', 'India': '🇮🇳', 'Japan': '🇯🇵' };
    return map[country] || '🌍';
  };

  return (
    <div className={`lp ${isDark ? 'lp-dark' : ''}`}>
      
      {/* 1. Skip Link */}
      <a href="#lp-main" className="lp-skip-link">Skip to main content</a>

      {/* 2. Announcement Bar */}
      {showAnnouncement && (
        <div className="lp-announcement" role="alert">
          <p>Join 50,000+ freelancers earning on RaketBase. Zero signup fees this month <span aria-hidden="true">→</span></p>
          <button onClick={() => setShowAnnouncement(false)} aria-label="Dismiss announcement"><IconClose /></button>
        </div>
      )}

      {/* 3. Sticky Navbar */}
      <nav className={`lp-nav ${isNavScrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-container lp-nav__inner">
          <div className="lp-nav__brand">
            <a href="/" aria-label="RaketBase Home">
              <img src="/raketbase-icon.svg" alt="" aria-hidden="true" className="lp-nav__logo" onError={(e) => e.target.style.display='none'} />
              <span className="lp-nav__brand-text"><strong>RAKET</strong>BASE</span>
            </a>
          </div>

          <div className="lp-nav__links">
            <a href="#featured" onClick={(e) => scrollToSection(e, 'featured')}>Find Talent</a>
            <a href="#categories" onClick={(e) => scrollToSection(e, 'categories')}>Find Work</a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>How It Works</a>
                        <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>FAQ</a>
          </div>

          <div className="lp-nav__actions">
            <button onClick={toggleTheme} className="lp-btn-icon" aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
            <div className="lp-nav__auth">
              <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Log In</button>
              <button className="lp-btn-primary" onClick={() => navigate('/register')}>Sign Up</button>
            </div>
            <button className="lp-nav__mobile-toggle lp-btn-icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu" aria-expanded={isMobileMenuOpen}>
              <IconMenu />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lp-nav__mobile-menu">
            <a href="#featured" onClick={(e) => scrollToSection(e, 'featured')}>Find Talent</a>
            <a href="#categories" onClick={(e) => scrollToSection(e, 'categories')}>Find Work</a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>How It Works</a>
                        <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>FAQ</a>
            <hr />
            <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Log In</button>
            <button className="lp-btn-primary" onClick={() => navigate('/register')}>Sign Up</button>
          </div>
        )}      </nav>

      <main id="lp-main">
        {/* 4. Hero */}
        <section className="lp-hero" id="hero">
          <div className="lp-container lp-hero__inner">
            <div className="lp-hero__content lp-reveal">
              <h1 className="lp-hero__title">
                Launch your raket.<br />
                Build your base.
              </h1>
              <p className="lp-hero__sub">
                <strong>Welcome to RaketBase!</strong><br /><br />
              
                Whether you are an entrepreneur searching for reliable creatives, technical, or business solutions, or a freelancer looking to showcase your skills and turn your passion into rewarding opportunities, RaketBase makes finding the right match seamless, secure, and accessible. Discover verified local services, collaborate with total confidence, and power your next big idea forward, all within one unified platform.
              </p>

              <div className="lp-hero__ctas">
                <button className="lp-btn-outline lp-btn-large" onClick={() => navigate('/register')}>Hire a Freelancer</button>
                <button className="lp-btn-outline lp-btn-large" onClick={() => navigate('/register')}>Become a Freelancer</button>
              </div>

              <div className="lp-hero__trust">
                <span>⭐ {BRAND.stats.rating}</span>
                <span>•</span>
                <span>💼 {BRAND.stats.projects}</span>
                <span>•</span>
                <span>🌍 {BRAND.stats.countries}</span>
              </div>
            </div>

            <div className="lp-hero__visual lp-reveal">
              {FREELANCERS.slice(0,3).map((f, i) => (
                <div key={f.id} className={`lp-hero__float-card lp-float-${i+1}`}>
                  <div className="lp-hero__float-avatar" style={{backgroundColor: getHashColor(f.name)}}>{getInitials(f.name)}</div>
                  <div className="lp-hero__float-info">
                    <strong>{f.name}</strong>
                    <span>{f.title}</span>
                    <span className="lp-hero__float-rate">${f.rate}/hr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Categories */}
        <section className="lp-categories lp-section" id="categories">
          <div className="lp-container">
            <h2 className="lp-section-title lp-reveal">Browse by Category</h2>
            <div className="lp-grid-4 lp-reveal">
              {CATEGORIES.map(cat => (
                <div key={cat.id} className="lp-category-card" onClick={(e) => {
                  setSearchCategory(cat.name);
                  scrollToSection(e, 'featured');
                }}>
                  <div className="lp-category-card__icon">
                    {CategoryIcons[cat.icon] || <IconCheck />}
                  </div>
                  <h3>{cat.name}</h3>
                  <p>{cat.count} freelancers</p>
                </div>
              ))}
            </div>
            <div className="lp-center-link lp-reveal">
              <a href="/explore" onClick={(e) => { e.preventDefault(); navigate('/explore'); }}>View all categories <IconArrowRight /></a>
            </div>
          </div>
        </section>

        {/* 7. How It Works */}
        <section className="lp-how lp-section lp-bg-alt" id="how-it-works">
          <div className="lp-container">
            <h2 className="lp-section-title lp-reveal">How It Works</h2>
            
            <div className="lp-tabs lp-reveal" role="tablist">
              <button 
                role="tab" 
                aria-selected={activeTab === 'clients'}
                aria-controls="panel-clients"
                id="tab-clients"
                className={`lp-tab ${activeTab === 'clients' ? 'lp-tab--active' : ''}`}
                onClick={() => setActiveTab('clients')}
                onKeyDown={(e) => e.key === 'ArrowRight' && setActiveTab('freelancers')}
              >
                For Clients
              </button>
              <button 
                role="tab" 
                aria-selected={activeTab === 'freelancers'}
                aria-controls="panel-freelancers"
                id="tab-freelancers"
                className={`lp-tab ${activeTab === 'freelancers' ? 'lp-tab--active' : ''}`}
                onClick={() => setActiveTab('freelancers')}
                onKeyDown={(e) => e.key === 'ArrowLeft' && setActiveTab('clients')}
              >
                For Freelancers
              </button>
            </div>

            <div 
              id={`panel-${activeTab}`} 
              role="tabpanel" 
              aria-labelledby={`tab-${activeTab}`}
              className="lp-how__steps lp-grid-3 lp-reveal"
            >
              {HOW_IT_WORKS[activeTab].map((step, i) => (
                <div key={i} className="lp-step-card">
                  <div className="lp-step-number">{i + 1}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Featured Freelancers */}
        <section className="lp-featured lp-section" id="featured">
          <div className="lp-container">
            <h2 className="lp-section-title lp-reveal">Featured Talent</h2>
            
            <div className="lp-grid-4 lp-reveal">
              {FREELANCERS.map(f => (
                <article key={f.id} className="lp-freelancer-card">
                  <div className="lp-freelancer-card__header">
                    <div className="lp-freelancer-avatar" style={{backgroundColor: getHashColor(f.name)}}>{getInitials(f.name)}</div>
                    <div className="lp-freelancer-info">
                      <h3>{f.name} {getFlag(f.country)}</h3>
                      <p>{f.title}</p>
                    </div>
                  </div>
                  <div className="lp-freelancer-meta">
                    <span className="lp-rating"><IconStar /> {f.rating} ({f.reviews})</span>
                    <span className="lp-rate">${f.rate}/hr</span>
                  </div>
                  <div className="lp-freelancer-skills">
                    {f.skills.slice(0,3).map((skill, i) => (
                      <span key={i} className="lp-skill-tag">{skill}</span>
                    ))}
                  </div>
                  <div className="lp-freelancer-footer">
                    {f.badge && <span className={`lp-badge lp-badge--${f.badge.toLowerCase().replace(' ','-')}`}>{f.badge}</span>}
                    <button className="lp-btn-outline lp-btn-sm" style={{marginLeft: 'auto'}} onClick={() => navigate('/explore')}>View Profile</button>
                  </div>
                </article>
              ))}            </div>
          </div>
        </section>

        {/* 9. Why Choose Us */}
        <section className="lp-why lp-section lp-bg-alt" id="why-us">
          <div className="lp-container">
            <h2 className="lp-section-title lp-reveal">Why Choose RaketBase</h2>
            <div className="lp-grid-3 lp-reveal">
              {WHY_US.map((item, i) => (
                <div key={i} className="lp-why-card">
                  <div className="lp-why-icon">{CategoryIcons[item.icon] || <IconCheck />}</div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10. Stats Band */}
        <section className="lp-stats">
          <div className="lp-container lp-stats__inner lp-grid-4">
            {STATS_DATA.map((stat, i) => (
              <div key={i} className="lp-stat-item">
                <div className="lp-stat-value">
                  <AnimatedNumber target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <div className="lp-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        

        {/* 12. Testimonials */}
        <section className="lp-testimonials lp-section lp-bg-alt" id="testimonials">
          <div className="lp-container">
            <h2 className="lp-section-title lp-reveal">What Our Users Say</h2>
            
            <div 
              className="lp-testimonial-carousel lp-reveal"
              onMouseEnter={() => setIsHoveringTestimonial(true)}
              onMouseLeave={() => setIsHoveringTestimonial(false)}
            >
              <div className="lp-testimonial-viewport" aria-live="polite">
                <div 
                  className="lp-testimonial-track" 
                  style={{ transform: `translateX(-${currentTestimonial * (100 / itemsPerView)}%)` }}
                >
                  {TESTIMONIALS.map((t, i) => (
                    <div key={i} className="lp-testimonial-slide">
                      <div className="lp-testimonial-card">
                        <div className="lp-testimonial-quote">"{t.quote}"</div>
                        <div className="lp-testimonial-author">
                          <div className="lp-testimonial-avatar" style={{backgroundColor: getHashColor(t.name)}}>{getInitials(t.name)}</div>
                          <div style={{ display: "flex", flexDirection: "column" }}><strong>{t.name}</strong><span>{t.role}</span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lp-testimonial-controls">
                <button 
                  className="lp-btn-icon" 
                  onClick={() => setCurrentTestimonial(p => p === 0 ? maxTestimonials : p - 1)}
                  aria-label="Previous testimonial"
                >
                  <IconArrowRight style={{transform: 'rotate(180deg)'}} />
                </button>
                <div className="lp-testimonial-dots">
                  {Array.from({ length: maxTestimonials + 1 }).map((_, i) => (
                    <button 
                      key={i} 
                      className={`lp-dot ${i === currentTestimonial ? 'lp-dot--active' : ''}`}
                      onClick={() => setCurrentTestimonial(i)}
                      aria-label={`Go to testimonial ${i+1}`}
                    />
                  ))}
                </div>
                <button 
                  className="lp-btn-icon" 
                  onClick={() => setCurrentTestimonial(p => (p >= maxTestimonials ? 0 : p + 1))}
                  aria-label="Next testimonial"
                >
                  <IconArrowRight />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 13. CTA Split */}
        <section className="lp-split-cta"><div className="lp-split-cta__inner lp-container"><div className="lp-split-pane lp-split-left lp-reveal">
            <h2>Looking to hire?</h2>
            <p>Connect with top talent from around the world and build your dream team.</p>
            <button className="lp-btn-outline lp-btn-large" onClick={() => navigate('/register')}>Post a Job</button>
          </div>
          <div className="lp-split-pane lp-split-right lp-reveal">
            <h2>Ready to earn?</h2>
            <p>Find freelance opportunities that match your skills and grow your career.</p>
            <button className="lp-btn-outline lp-btn-large" onClick={() => navigate('/register')}>Join as Freelancer</button></div></div></section>

        {/* 14. FAQ Accordion */}
        <section className="lp-faq lp-section" id="faq">
          <div className="lp-container">
            <h2 className="lp-section-title lp-reveal">Frequently Asked Questions</h2>
            <div className="lp-faq-list lp-reveal">
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className={`lp-faq-item ${isOpen ? 'lp-faq-item--open' : ''}`}>
                    <button 
                      className="lp-faq-question"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${i}`}
                      id={`faq-question-${i}`}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      {faq.q}
                      <IconChevronDown className="lp-faq-icon" />
                    </button>
                    <div 
                      id={`faq-answer-${i}`} 
                      className="lp-faq-answer"
                      role="region"
                      aria-labelledby={`faq-question-${i}`}
                      style={{ maxHeight: isOpen ? '200px' : '0' }}
                    >
                      <div className="lp-faq-answer-inner">{faq.a}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 15. Final CTA Banner */}
        <section className="lp-final-cta">
          <div className="lp-container lp-reveal">
            <h2>Your next great project starts here.</h2>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button 
                className="lp-btn-white lp-btn-large" 
                onClick={() => navigate('/register')}
              >
                Create an Account
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 16. Footer */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-top lp-grid-5">
            <div className="lp-footer-brand">
              <a href="/" aria-label="RaketBase Home">
                <img src="/raketbase-icon.svg" alt="" aria-hidden="true" className="lp-footer-logo" onError={(e) => e.target.style.display='none'} />
                <span className="lp-footer-brand-text"><strong>RAKET</strong>BASE</span>
              </a>
              <p>The premier freelance marketplace for top talent and top clients.</p>
              <div className="lp-social-links">
                <a href="#" aria-label="Twitter"><IconTwitter /></a>
                <a href="#" aria-label="LinkedIn"><IconLinkedIn /></a>
                <a href="#" aria-label="GitHub"><IconGitHub /></a>
                <a href="#" aria-label="YouTube"><IconYouTube /></a>
              </div>
            </div>
            
            <div className="lp-footer-col">
              <h4>For Clients</h4>
              <Link to="/explore">Find Talent</Link>
              <a href="#how-it-works" onClick={(e) => { scrollToSection(e, 'how-it-works'); setActiveTab('clients'); }}>How to Hire</a>
              <a href="#" onClick={(e) => openInfoModal(e, 'Payment Protection', 'Total peace of mind from start to finish. With our secure escrow system, your funds are safely held and only released when the agreed-upon milestones are met and you are 100% satisfied with the results.')}>Payment Protection</a>
            </div>
            
            <div className="lp-footer-col">
              <h4>For Freelancers</h4>
              <Link to="/explore">Find Work</Link>
              <Link to="/register">Create Profile</Link>
              <a href="#how-it-works" onClick={(e) => { scrollToSection(e, 'how-it-works'); setActiveTab('freelancers'); }}>How It Works</a>
            </div>
            
            <div className="lp-footer-col">
              <h4>Company</h4>
              <a href="#" onClick={(e) => openInfoModal(e, 'About Us', '<strong>Launch your raket. Build your base.</strong><br/><br/>We are a dedicated team of Computer Science students from Mapúa University with a shared vision: to empower local talent and solve real-world freelance challenges. We built RaketBase because we believe finding great work and hiring great people should be seamless, transparent, and completely free of premium barriers. Our mission is to bridge the gap between skilled professionals and visionary clients, fostering a trusted community where every project can take flight.')}>About Us</a>
              <a href="#" onClick={(e) => openInfoModal(e, 'Careers', 'We are currently a small team of student founders and are not actively hiring. Check back later!')}>Careers</a>
              <a href="#" onClick={(e) => openInfoModal(e, 'Press', 'For press inquiries, please contact our team directly via email.<br/><br/><strong>Email:</strong> <a href=\'mailto:rjsdelagua@mymail.mapua.edu.ph\' style=\'color: var(--lp-primary);\'>rjsdelagua@mymail.mapua.edu.ph</a>')}>Press</a>
            </div>
            
            <div className="lp-footer-col">
              <h4>Support</h4>
              <Link to="/help">Help Center</Link>
              <a href="#" onClick={(e) => openInfoModal(e, 'Contact Us', 'Have a question, feedback, or a partnership idea? We’d love to hear from you. Drop us a line and help us make RaketBase the best homebase for freelancers everywhere.<br/><br/><strong>Email:</strong> <a href=\'mailto:rjsdelagua@mymail.mapua.edu.ph\' style=\'color: var(--lp-primary);\'>rjsdelagua@mymail.mapua.edu.ph</a>')}>Contact Us</a>
              <a href="#" onClick={(e) => openInfoModal(e, 'Trust & Safety', 'Your safety is our top priority. We employ strict verification processes and a fair, transparent dispute resolution system to ensure every collaboration goes smoothly. If you experience any issues or have immediate concerns, we are here to help.<br/><br/><strong>Contact us directly at:</strong> <a href=\'mailto:rjsdelagua@mymail.mapua.edu.ph\' style=\'color: var(--lp-primary);\'>rjsdelagua@mymail.mapua.edu.ph</a>')}>Trust & Safety</a>
              <a href="#" onClick={(e) => openInfoModal(e, 'Accessibility', 'We are committed to making RaketBase accessible to everyone. If you encounter any accessibility barriers, please let us know.')}>Accessibility</a>
            </div>
          </div>
          
          <div className="lp-footer-bottom">
            <p>&copy; 2026 RaketBase. All rights reserved.</p>
            <div className="lp-footer-legal">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* 17. Modals */}
      {infoModal && (
        <div className="lp-modal-overlay" onClick={() => setInfoModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="lp-modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--lp-surface)', borderRadius: 'var(--lp-radius)', padding: '2.5rem', width: '100%', maxWidth: '600px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <button className="lp-modal-close" onClick={() => setInfoModal(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--lp-muted)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h3 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--lp-text)' }}>{infoModal.title}</h3>
            <div style={{ color: 'var(--lp-muted)', lineHeight: '1.7', fontSize: '1.05rem' }} dangerouslySetInnerHTML={{ __html: infoModal.content }}></div>
            <div style={{ marginTop: '2.5rem', textAlign: 'right' }}>
              <button className="lp-btn-primary" onClick={() => setInfoModal(null)}>Got it</button>
            </div>
          </div>
        </div>
      )}
      

      

      {/* 18. Cookie Consent */}
      {showCookies && (
        <div className="lp-cookie-banner">
          <div className="lp-cookie-content">
            <p>We use cookies to improve your experience and for analytics. By continuing, you agree to our cookie policy.</p>
            <div className="lp-cookie-actions">
              <button className="lp-btn-outline lp-btn-sm" onClick={() => handleCookie('declined')}>Decline</button>
              <button className="lp-btn-primary lp-btn-sm" onClick={() => handleCookie('accepted')}>Accept</button>
            </div>
          </div>
        </div>
      )}

      {/* 19. Back to Top */}
      {showBackToTop && (
        <button 
          className="lp-back-to-top" 
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <IconChevronUp className="lp-back-top-icon" />
        </button>
      )}
    </div>
  );
}


























