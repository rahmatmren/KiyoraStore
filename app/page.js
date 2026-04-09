"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, ChevronDown, CheckCircle2, Star, MessageCircle, Play, Shield, Zap, Volume2, VolumeX, ArrowRight } from 'lucide-react';

// --- UTILITIES & AUDIO ---

// Procedural UI Sounds using Web Audio API (No external files needed)
let audioCtx = null;

const initAudio = () => {
  if (typeof window !== 'undefined' && !audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playSound = (type = 'click', enabled = true) => {
  if (!enabled) return;
  
  initAudio();
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'hover') {
    // Soft high-pitched tick
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    oscillator.start(now);
    oscillator.stop(now + 0.05);
  } else if (type === 'click') {
    // Premium soft pop
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }
};

// Scroll Reveal Hook
const useScrollReveal = (threshold = 0.1) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
};

// --- COMPONENTS ---

// 1. Custom Glow Cursor
const CustomCursor = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const move = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };
    const checkPointer = () => {
      const target = document.elementFromPoint(pos.x, pos.y);
      setIsPointer(target && window.getComputedStyle(target).cursor === 'pointer');
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', checkPointer);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', checkPointer);
    };
  }, [pos.x, pos.y]);

  if (!isVisible) return null;

  return (
    <>
      <div 
        className="fixed top-0 left-0 w-4 h-4 bg-red-500 rounded-full pointer-events-none z-[9999] mix-blend-screen transition-transform duration-75 ease-out"
        style={{ transform: `translate(${pos.x - 8}px, ${pos.y - 8}px) scale(${isPointer ? 1.5 : 1})` }}
      />
      <div 
        className="fixed top-0 left-0 w-32 h-32 bg-purple-600/20 rounded-full pointer-events-none z-[9998] blur-2xl transition-all duration-300 ease-out"
        style={{ transform: `translate(${pos.x - 64}px, ${pos.y - 64}px) scale(${isPointer ? 1.2 : 1})` }}
      />
    </>
  );
};

// 2. Sakura / Dust Particle Background
const ParticleCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = Math.random() * 0.5 + 0.1;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.opacity = Math.random() * 0.5 + 0.1;
        // Pinkish/Reddish tone for Sakura vibe
        this.color = `rgba(225, 29, 72, ${this.opacity})`; 
      }
      update() {
        this.y -= this.speedY; // Float upwards slightly
        this.x += this.speedX;
        if (this.y < 0) {
          this.y = canvas.height;
          this.x = Math.random() * canvas.width;
        }
      }
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < 50; i++) particles.push(new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    init();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0" />;
};

// 3. Interactive 3D Tilt Card
const TiltCard = ({ children, soundEnabled, className = "" }) => {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Max tilt is 8 degrees
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    playSound('hover', soundEnabled);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-2xl transition-all duration-200 ease-out z-10 ${className}`}
      style={{ transform, transformStyle: "preserve-3d" }}
    >
      {/* Glow behind card */}
      <div className={`absolute -inset-0.5 bg-gradient-to-br from-red-600/30 to-purple-600/30 rounded-2xl blur-md transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Card Content - Glassmorphism */}
      <div className="relative h-full w-full bg-[#111113]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 overflow-hidden">
        {/* Shimmer effect on hover */}
        <div className={`absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 transition-transform duration-700 ease-in-out ${isHovered ? 'translate-x-full' : '-translate-x-full'} skew-x-12`} />
        {children}
      </div>
    </div>
  );
};

// 4. Live Activity Toast
const LiveActivity = () => {
  const [activeToast, setActiveToast] = useState(null);
  const activities = [
    "Someone just purchased CapCut Pro (1 Month)",
    "Someone just bought Alight Motion (1 Year)",
    "New user registered from Kyoto",
    "Someone just purchased Canva Pro Invite"
  ];

  useEffect(() => {
    const triggerToast = () => {
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      setActiveToast(randomActivity);
      
      setTimeout(() => {
        setActiveToast(null);
      }, 4000); // Hide after 4s
    };

    // Initial delay then loop
    const initialDelay = setTimeout(triggerToast, 3000);
    const interval = setInterval(() => {
      if (Math.random() > 0.4) triggerToast(); // 60% chance to show every interval to feel organic
    }, 12000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`fixed bottom-6 left-6 z-50 transition-all duration-700 ease-out ${activeToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="bg-[#1a1a1f] border border-white/10 rounded-full px-4 py-3 flex items-center shadow-lg shadow-black/50 backdrop-blur-md">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-3" />
        <p className="text-sm text-gray-300 font-medium">{activeToast}</p>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function KiyoraStore() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // State untuk mengontrol Modal Logo Zoom
  const [isLogoZoomed, setIsLogoZoomed] = useState(false);

  // State untuk Premium Loading Screen
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Logika Animasi Loading Screen
  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      // Memperlambat progress: Update setiap 250ms, naik 5-12% (Memakan waktu ~1.5 sampai 2 detik)
      currentProgress += Math.floor(Math.random() * 8) + 5; 
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        // Tahan sebentar di 100% lalu hilangkan layarnya
        setTimeout(() => {
          setIsLoading(false);
        }, 800);
      }
      setLoadingProgress(currentProgress);
    }, 250); 

    return () => clearInterval(interval);
  }, []);

  // Dynamic Favicon Injector
  useEffect(() => {
    if (typeof document !== 'undefined') {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = "/Favicon.png";
    }
  }, []);

  // Global Audio Unlocker for Browser Autoplay Policies
  useEffect(() => {
    const unlockAudio = () => {
      initAudio();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Scroll Reveal Refs
  const [heroRef, heroVisible] = useScrollReveal();
  const [productsRef, productsVisible] = useScrollReveal();
  const [testimonialsRef, testimonialsVisible] = useScrollReveal();
  const [faqRef, faqVisible] = useScrollReveal();

  const products = [
    { name: "Alight Motion", duration: "1 Year", price: "15.000", tag: "Popular", color: "from-blue-500 to-cyan-400" },
    { name: "CapCut Pro", duration: "1 Week", price: "10.000", tag: null, color: "from-gray-700 to-black" },
    { name: "CapCut Pro", duration: "1 Month", price: "~20.000", tag: "Best Deal", color: "from-zinc-800 to-black" },
    { name: "Canva Pro Invite", duration: "1 Month", price: "10.000", tag: "Fast", color: "from-blue-600 to-purple-600" },
    { name: "Spotify Premium", duration: "1 Month", price: "", tag: "Coming Soon", color: "from-green-500 to-emerald-600", disabled: true },
    { name: "Wink", duration: "1 Month", price: "", tag: "Coming Soon", color: "from-pink-500 to-rose-500", disabled: true },
  ];

  const faqs = [
    { q: "How long is the process?", a: "The process is lightning fast, typically taking between 5 to 30 minutes depending on queue." },
    { q: "Is it safe?", a: "100% secure. We are trusted by thousands of users with a track record of reliable service." },
    { q: "How does the system work?", a: "Depending on the product, it operates via an invite link or a secure login system provided post-purchase." },
    { q: "What about warranty?", a: "We provide a 3-day warranty for all purchases, subject to our terms and conditions." }
  ];

  const [activeFaq, setActiveFaq] = useState(null);

  // Subtle Mouse Parallax for Hero
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleGlobalMove = (e) => {
      setMousePos({ 
        x: (e.clientX / window.innerWidth - 0.5) * 20, 
        y: (e.clientY / window.innerHeight - 0.5) * 20 
      });
    };
    window.addEventListener('mousemove', handleGlobalMove);
    return () => window.removeEventListener('mousemove', handleGlobalMove);
  }, []);

  return (
    <div className={`bg-[#050505] min-h-screen text-white font-sans overflow-x-hidden selection:bg-red-500/30 ${isLoading ? 'h-screen overflow-hidden' : ''}`}>
      
      {/* Global Styles for specific animations */}
      <style dangerouslySetInnerHTML={{__html: `
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #e11d48; }
        
        .bg-grid {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
        
        .marquee-container {
          display: flex;
          width: 200%;
          animation: marquee 20s linear infinite;
        }
        .marquee-container:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.4); }
          50% { box-shadow: 0 0 20px 10px rgba(225, 29, 72, 0); }
        }
        .btn-pulse { animation: pulse-glow 2s infinite; }

        /* Typing effect classes */
        @keyframes typing {
          0%, 10% { width: 0; }
          40%, 60% { width: 24ch; }
          90%, 100% { width: 0; }
        }
        @keyframes blink {
          0%, 100% { border-color: #e11d48; }
          50% { border-color: transparent; }
        }
        .typewriter {
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid #e11d48;
          animation: typing 6s steps(24, end) infinite, blink 0.75s step-end infinite;
          display: inline-block;
          vertical-align: bottom;
        }
      `}} />

      {/* --- PREMIUM LOADING SCREEN --- */}
      <div 
        className={`fixed inset-0 z-[999999] bg-[#050505] flex flex-col items-center justify-center transition-all duration-1000 ease-[cubic-bezier(0.76,0,0.24,1)] ${isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none -translate-y-full'}`}
      >
        <div className="flex flex-col items-center relative z-10 w-full px-6">
          {/* Logo Glow */}
          <div className="relative mb-10 flex justify-center items-center">
            <div className="absolute w-40 h-40 bg-red-600/20 blur-[50px] rounded-full animate-pulse" />
            <div className="absolute w-20 h-20 bg-purple-600/30 blur-[30px] rounded-full animate-ping" />
            <img 
              src="/Logo.png" 
              alt="Kiyora Loader" 
              className="w-16 h-16 object-contain relative z-10 filter drop-shadow-[0_0_15px_rgba(225,29,72,0.8)]"
            />
          </div>

          {/* Progress Bar Container */}
          <div className="w-64 md:w-80 h-[2px] bg-white/10 rounded-full overflow-hidden relative mb-6">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>

          {/* Centered System Text */}
          <div className="flex flex-col items-center gap-3 text-xs font-mono uppercase tracking-widest text-center">
            <span className="text-gray-400 animate-pulse">Sedang menyiapkan yang terbaik untuk anda 😇</span>
            <span className="text-white font-bold text-sm bg-white/5 px-3 py-1 rounded-full border border-white/10">{loadingProgress}%</span>
          </div>
        </div>

        {/* Decor Lines */}
        <div className="absolute bottom-10 left-10 w-[1px] h-32 bg-gradient-to-t from-red-500/50 to-transparent opacity-50 hidden md:block" />
        <div className="absolute top-10 right-10 w-32 h-[1px] bg-gradient-to-l from-purple-500/50 to-transparent opacity-50 hidden md:block" />
      </div>

      <CustomCursor />
      <LiveActivity />

      {/* --- LOGO ZOOM MODAL --- */}
      <div 
        className={`fixed inset-0 z-[99999] flex items-center justify-center transition-all duration-500 ease-in-out cursor-pointer ${isLogoZoomed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => {
          setIsLogoZoomed(false);
          playSound('click', soundEnabled);
        }}
      >
        {/* Background Overlay with Blur */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
        
        {/* Enlarged Logo Image */}
        <img 
          src="/Logo.png" 
          alt="Logo Kiyora Enlarged" 
          className={`relative z-10 w-64 h-64 md:w-96 md:h-96 object-contain rounded-2xl shadow-[0_0_50px_rgba(225,29,72,0.4)] transition-all duration-500 ease-out ${isLogoZoomed ? 'scale-100 translate-y-0' : 'scale-75 translate-y-10'}`}
        />
        
        {/* Helper Text */}
        <p className={`absolute bottom-10 text-gray-400 text-sm tracking-widest uppercase transition-opacity duration-700 delay-300 ${isLogoZoomed ? 'opacity-100' : 'opacity-0'}`}>
          Click anywhere to close
        </p>
      </div>

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/50 backdrop-blur-lg border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            {/* Custom Image Logo Placeholder - NOW CLICKABLE */}
            <div 
              className="relative flex items-center justify-center w-10 h-10 group-hover:scale-105 transition-transform duration-300 ease-out"
              onClick={(e) => {
                e.stopPropagation(); // Mencegah ter-trigger fungsi scroll to top milik parent div
                setIsLogoZoomed(true);
                playSound('click', soundEnabled);
              }}
            >
              <img 
                src="/Logo.png" 
                alt="Logo Kiyora" 
                className="w-full h-full object-contain rounded-md"
              />
            </div>
            
            <div className="flex flex-col justify-center">
              <span className="font-bold text-xl tracking-wider text-white/90 leading-none">Kiyora<span className="text-red-500">Store</span></span>
              <div className="text-[10px] text-gray-400 font-mono mt-1 leading-none">
                <span className="typewriter">Powered by mattwithmiku</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if(!soundEnabled) playSound('click', true);
              }}
              className="text-gray-400 hover:text-white transition-colors"
              title={soundEnabled ? "Mute UI Sounds" : "Enable UI Sounds"}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <a href="#products" className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block" onMouseEnter={() => playSound('hover', soundEnabled)}>STORE</a>
            <a href="#faq" className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block" onMouseEnter={() => playSound('hover', soundEnabled)}>FAQ</a>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-grid mask-image:linear-gradient(to_bottom,white,transparent)" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }} />
        
        {/* Radial Glows */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] -translate-y-1/2" />
        
        <ParticleCanvas />

        <div 
          className={`relative z-10 text-center max-w-4xl mx-auto px-4 transition-all duration-1000 ease-out transform ${heroVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}
          style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }} // Subtle parallax
        >
          <a 
            href="https://www.tiktok.com/@mattwithmiku" 
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound('click', soundEnabled)}
            onMouseEnter={() => playSound('hover', soundEnabled)}
            className="inline-block mb-4 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="text-xs font-medium tracking-widest text-gray-300 uppercase flex items-center gap-2">
              <Zap size={12} className="text-red-500" /> Powered By mattwithmiku
            </span>
          </a>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500">
            Kiyora <br />
            <span className="relative">
              <span className="absolute -inset-2 bg-gradient-to-r from-red-500/20 to-purple-500/20 blur-xl rounded-lg" />
              <span className="relative text-white">Digital Access</span>
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Access premium tools instantly. Built for creators who value precision, speed, and perfection.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="#products" 
              onClick={() => playSound('click', soundEnabled)}
              onMouseEnter={() => playSound('hover', soundEnabled)}
              className="group relative px-8 py-4 bg-white text-black font-semibold rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 btn-pulse w-full sm:w-auto"
            >
              <span className="relative z-10 flex items-center gap-2 justify-center">
                Explore Store <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a 
              href="#faq"
              onClick={() => playSound('click', soundEnabled)}
              onMouseEnter={() => playSound('hover', soundEnabled)}
              className="px-8 py-4 bg-white/5 text-white border border-white/10 font-semibold rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm w-full sm:w-auto text-center"
            >
              How it works
            </a>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center gap-2 opacity-50">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-[1px] h-8 bg-gradient-to-b from-white to-transparent" />
        </div>
      </section>

      {/* --- PRODUCTS SECTION --- */}
      <section id="products" className="py-32 relative z-10" ref={productsRef}>
        <div className="max-w-7xl mx-auto px-6">
          <div className={`mb-16 text-center transition-all duration-700 delay-100 ${productsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Premium <span className="text-red-500">Selection</span></h2>
            <p className="text-gray-400">Curated tools to accelerate your workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, idx) => (
              <div 
                key={idx} 
                className={`transition-all duration-700 transform`} 
                style={{ 
                  transitionDelay: `${idx * 100}ms`,
                  opacity: productsVisible ? 1 : 0,
                  transform: productsVisible ? 'translateY(0)' : 'translateY(40px)'
                }}
              >
                <TiltCard soundEnabled={soundEnabled} className="h-full flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} p-[1px]`}>
                         <div className="w-full h-full bg-[#111] rounded-xl flex items-center justify-center">
                            <Play size={20} className="text-white ml-1" />
                         </div>
                      </div>
                      {product.tag && (
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${product.tag === 'Coming Soon' ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                          {product.tag}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold mb-1 text-gray-100 group-hover:text-white transition-colors">{product.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                       <ShoppingCart size={14} /> <span>{product.duration}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold mb-4 flex items-baseline gap-1">
                      {product.price ? (
                        <>
                          <span className="text-sm text-gray-500 font-normal">Rp</span>
                          {product.price}
                        </>
                      ) : (
                        <span className="text-lg text-gray-500 font-normal italic">-</span>
                      )}
                    </div>
                    
                    <button 
                      disabled={product.disabled}
                      onClick={() => {
                        playSound('click', soundEnabled);
                        if (!product.disabled) {
                          const message = `Min aku mau ${product.name} nya masih ada gak?`;
                          window.open(`https://wa.me/6288218472840?text=${encodeURIComponent(message)}`, '_blank');
                        }
                      }}
                      onMouseEnter={() => playSound('hover', soundEnabled)}
                      className={`w-full py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                        product.disabled 
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5' 
                        : 'bg-white text-black hover:bg-gray-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                      }`}
                    >
                      {product.disabled ? 'Unavailable' : 'Purchase Now'}
                    </button>
                  </div>
                </TiltCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS SECTION --- */}
      <section className="py-24 bg-[#0a0a0c] border-y border-white/5 overflow-hidden relative" ref={testimonialsRef}>
        {/* Edge Gradients for smooth fade */}
        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#0a0a0c] to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#0a0a0c] to-transparent z-10 pointer-events-none" />
        
        <div className={`text-center mb-16 transition-all duration-700 ${testimonialsVisible ? 'opacity-100' : 'opacity-0'}`}>
          <h2 className="text-2xl md:text-4xl font-bold">Client <span className="text-purple-500">Testimonials</span></h2>
        </div>

        <div className={`transition-all duration-1000 delay-200 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="marquee-container gap-6 px-6">
            {/* Double the list for infinite scroll effect */}
            {[...Array(2)].map((_, groupIdx) => (
              <React.Fragment key={groupIdx}>
                {[
                  { name: "Robby", text: "Fastest transaction ever. Got my CapCut Pro in 2 minutes!", image: "/testi1.jpeg?w=400&h=500&fit=crop" },
                  { name: "Oota nca", text: "Very safe and reliable. The admin is also very responsive.", image: "/testi2.jpeg?w=400&h=500&fit=crop" },
                  { name: "Robby", text: "This is my second purchase of CapCut Pro and it's very fast. 10/10.", image: "/testi3.jpeg?w=400&h=500&fit=crop" },
                  { name: "Constantine graill", text: "The admin responds quickly and the price is also cheap.", image: "/testi4.jpeg?w=400&h=500&fit=crop" },
                  { name: "CoomingSoon", text: "Cooming Soon", image: "/coomingsoon.jpeg?w=400&h=500&fit=crop" },
                  
                ].map((review, idx) => (
                  <div key={idx} className="w-80 flex-shrink-0 bg-[#111113] border border-white/5 rounded-2xl p-6 hover:bg-[#16161a] transition-colors cursor-default group">
                    
                    {/* Portrait Image Placeholder */}
                    <div className="w-full h-[320px] rounded-xl overflow-hidden mb-5 relative border border-white/5">
                      <img 
                        src={review.image} 
                        alt="Customer showcase" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out opacity-80 group-hover:opacity-100"
                        loading="lazy"
                      />
                      {/* Gradient overlay to blend the image with the dark card smoothly */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-transparent to-transparent opacity-80" />
                    </div>

                    <div className="flex text-yellow-500 mb-4 gap-1 relative z-10">
                      {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4 relative z-10">"{review.text}"</p>
                    <div className="flex items-center gap-2 relative z-10">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold shadow-md">
                        {review.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-400">{review.name}</span>
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="py-32 max-w-4xl mx-auto px-6 relative" ref={faqRef}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className={`text-center mb-16 transition-all duration-700 ${faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">System <span className="text-red-500">& Info</span></h2>
          <p className="text-gray-400">Everything you need to know.</p>
        </div>

        <div className="space-y-4 relative z-10">
          {faqs.map((faq, index) => {
            const isActive = activeFaq === index;
            return (
              <div 
                key={index} 
                className={`transition-all duration-500 border rounded-xl overflow-hidden ${isActive ? 'bg-white/5 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                style={{
                  transitionDelay: faqVisible ? `${index * 100}ms` : '0ms',
                  opacity: faqVisible ? 1 : 0,
                  transform: faqVisible ? 'translateY(0)' : 'translateY(20px)'
                }}
              >
                <button
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  onClick={() => {
                    setActiveFaq(isActive ? null : index);
                    playSound('click', soundEnabled);
                  }}
                  onMouseEnter={() => playSound('hover', soundEnabled)}
                >
                  <span className="font-medium text-lg pr-4">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isActive ? 'bg-white text-black rotate-180' : 'bg-white/5 text-gray-400'}`}>
                    <ChevronDown size={18} />
                  </div>
                </button>
                <div 
                  className="grid transition-all duration-300 ease-in-out"
                  style={{ gridTemplateRows: isActive ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-gray-400 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- CONTACT / CTA SECTION --- */}
      <section className="py-20 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#e11d48]/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Shield size={48} className="mx-auto mb-6 text-red-500 opacity-80" />
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-500">Upgrade?</span></h2>
          <p className="text-gray-400 mb-10 max-w-lg mx-auto">
            Contact our admin directly via WhatsApp to complete your purchase safely and securely.
          </p>
          
          <a
            href="#"
            onClick={(e) => { 
              e.preventDefault(); 
              playSound('click', soundEnabled); 
              window.open('https://wa.me/6288218472840?text=Halo%20min,%20aku%20mau%20tanya-tanya%20seputar%20Kiyora%20Store', '_blank'); 
            }}
            onMouseEnter={() => playSound('hover', soundEnabled)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white font-bold rounded-full hover:bg-[#20b858] transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,211,102,0.4)] btn-pulse"
          >
            <MessageCircle size={24} />
            Contact Admin
          </a>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-8 border-t border-white/5 text-center text-sm text-gray-600">
        <p>© {new Date().getFullYear()} Kiyora Store. All rights reserved.</p>
        <p className="mt-1 text-xs">A premium digital experience.</p>
      </footer>

    </div>
  );
}
