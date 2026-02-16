import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  Zap, 
  Image as ImageIcon,
  Command,
  ArrowRight,
  Database,
  Users,
  FileText,
  SquareCheck,
  Type,
  ArrowRightLeft,
  Upload,
  Palette,
  Save,
  Shield,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Lenis from 'lenis'; // Import Lenis

// Typing Simulation Hook
const useTypingEffect = (text, delay = 0, speed = 80, pauseEnd = 2000, pauseStart = 500) => {
  const [displayedText, setDisplayedText] = React.useState('');
  
  useEffect(() => {
    let timeout;
    let currentIndex = 0;
    let isDeleting = false;
    let hasStarted = false;

    const startLoop = () => {
       const type = () => {
         if (!isDeleting && currentIndex <= text.length) {
            // Typing
            setDisplayedText(text.substring(0, currentIndex));
            currentIndex++;
            
            if (currentIndex > text.length) {
                // Done typing, pause before deleting
                isDeleting = true;
                timeout = setTimeout(type, pauseEnd);
            } else {
                timeout = setTimeout(type, speed + Math.random() * 30);
            }
         } else if (isDeleting && currentIndex >= 0) {
            // Deleting
            setDisplayedText(text.substring(0, currentIndex));
            currentIndex--;
            
            if (currentIndex < 0) {
                // Done deleting, pause before re-typing
                isDeleting = false;
                currentIndex = 0;
                timeout = setTimeout(type, pauseStart);
            } else {
                timeout = setTimeout(type, speed / 2); // Delete faster
            }
         }
       };
       type();
    };
    
    // Initial start delay
    timeout = setTimeout(() => {
        hasStarted = true;
        startLoop();
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, delay, speed, pauseEnd, pauseStart]);

  return displayedText;
};



const WarpButton = ({ children, className, onClick }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  const handleNav = (e) => {
    if (onClick) onClick(e);
    setIsNavigating(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <button 
      onClick={handleNav}
      disabled={isNavigating}
      className={`group relative overflow-hidden transition-all whitespace-nowrap ${className} ${isNavigating ? 'cursor-wait' : ''}`}
    >
      {isNavigating ? (
        <>
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/50">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                className="absolute w-[200%] h-full bg-gradient-to-r from-transparent via-[#FF4F00]/30 to-transparent"
              />
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 0.3, ease: "linear", delay: 0.1 }}
                className="absolute w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
              />
              <motion.div 
                className="relative z-10 flex gap-2 items-center"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
              >
                  {[...Array(6)].map((_, i) => (
                    <ArrowRight key={i} className="w-5 h-5 text-[#FF4F00]" />
                  ))}
                  <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#FF4F00] to-transparent"></div>
                  {[...Array(6)].map((_, i) => (
                    <ArrowRight key={`b-${i}`} className="w-5 h-5 text-white/80" />
                  ))}
              </motion.div>
          </div>
          <span className="relative flex items-center gap-2 opacity-0">{children}</span>
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer"></div>
          <span className="relative flex items-center gap-2">
            {children}
          </span>
        </>
      )}
    </button>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const lenisRef = useRef(null);

  // Initialize Smooth Scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4x87
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
    });
    
    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);
  const { scrollY } = useScroll();
  
  // Parallax & Tilt Effects
  // Reduced range for better performance on lower-end devices
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const rotateX = useTransform(scrollY, [0, 500], [15, 0]);
  const scale = useTransform(scrollY, [0, 500], [0.95, 1]);
  const opacity = useTransform(scrollY, [0, 300], [0.5, 1]);

  const smoothRotateX = useSpring(rotateX, { stiffness: 100, damping: 30 });
  const smoothScale = useSpring(scale, { stiffness: 100, damping: 30 });

  // Simulated Text
  const sarahText = useTypingEffect("living, breathing entity that adapts to your thoughts.", 1000, 80);
  const alexText = useTypingEffect("We are building together in real-time.", 2500, 100);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden selection:bg-[#FF4F00]/30 selection:text-[#FF4F00]">
      {/* Background Ambience - Hardware Accelerated */}
      <div className="fixed inset-0 pointer-events-none z-0 will-change-transform">
        <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-grid-white/[0.02] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        <div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-[#FF4F00]/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] animate-pulse-slow illustration"></div>
      </div>

      <main className="relative z-10">
        
        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-center border-b border-white/5 bg-black/50 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Your Space Logo" className="w-8 h-8 rounded-lg" />
              <span className="font-display font-bold text-xl tracking-tight">Your Space</span>
            </div>
            <div className="flex items-center gap-6">
              <a 
                href="#features" 
                onClick={(e) => {
                  e.preventDefault();
                  lenisRef.current?.scrollTo('#features');
                }}
                className="text-sm text-gray-400 hover:text-white transition-colors hidden md:block"
              >
                Features
              </a>
              <WarpButton className="px-6 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-sm font-medium">
                Get Started <ArrowRight size={14} />
              </WarpButton>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-40">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-[#FF4F00] animate-pulse"></span>
              <span className="text-xs font-mono text-gray-400">READY FOR COLLABORATION</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-[10rem] leading-[0.9] font-display font-bold tracking-tighter mb-4">
              FLUID <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-600">COLLABORATION</span>
            </h1>
            
            <div className="text-xl md:text-2xl font-mono text-gray-500 tracking-[0.5em] mb-12 uppercase">
              IN YOUR SPACE
            </div>

            <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 leading-relaxed mb-12 px-4">
              The real-time markdown editor designed for your stream of consciousness. <br className="hidden md:block"/>
              Drop images. Slash commands. <span className="text-[#FF4F00]">Zero friction.</span>
            </p>

            {/* Command Line Input */}
            <div className="max-w-md mx-auto relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF4F00] to-orange-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex items-center bg-[#0A0A0A] border border-white/10 rounded-lg p-1.5 shadow-2xl">
                <div className="flex-1 flex items-center gap-3 px-3">
                  <span className="text-[#FF4F00] font-mono text-lg">{'>'}</span>
                  <input 
                    type="text" 
                    placeholder="/create-new-note"
                    className="w-full bg-transparent border-none outline-none text-white font-mono text-sm placeholder-gray-600 h-10"
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
                  />
                </div>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white p-2 rounded-md border border-white/5 transition-colors"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* 3D Editor Window - Refined Visuals */}
          <motion.div 
            className="w-full max-w-6xl mt-20 perspective-1000 will-change-transform"
            style={{ 
              rotateX: smoothRotateX,
              scale: smoothScale,
              opacity,
              y: y1
            }}
          >
            <div className="dark relative bg-black rounded-xl border border-[#FF4F00]/30 shadow-[0_0_50px_rgba(255,79,0,0.15)] overflow-hidden aspect-video group flex flex-col">
              
              {/* Window Header */}
              <div className="glass-panel w-full px-4 py-3 flex items-center justify-between border-b border-white/5 z-20" style={{ backgroundColor: '#121212' }}>
                  <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  </div>
                  <div className="flex items-center space-x-2 opacity-60">
                       <span className="text-xs font-mono text-gray-400">Your Space / manifesto.md</span>
                  </div>
                  <div className="flex items-center space-x-3">
                       <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-500 ring-2 ring-black flex items-center justify-center text-[10px] text-white font-bold">S</div>
                            <div className="w-6 h-6 rounded-full bg-emerald-500 ring-2 ring-black flex items-center justify-center text-[10px] text-white font-bold">A</div>
                       </div>
                       <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"></div>
                  </div>
              </div>

              {/* Window Body */}
              <div className="relative flex-1 p-8 md:p-12 font-sans group text-left" style={{ backgroundColor: '#000000' }}>
                  {/* Background elements */}
                  <div className="absolute top-0 left-0 w-full h-full bg-noise opacity-[0.05] pointer-events-none"></div>
                  <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-[#FF4F00]/5 rounded-full blur-[100px] pointer-events-none"></div>

                  {/* Editor Content */}
                  <div className="relative z-10 max-w-3xl mx-auto">
                       <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-8 pb-4 border-b border-white/5">
                           The Future of Interface
                       </h1>
                       
                       <div className="prose prose-invert max-w-none text-lg leading-relaxed text-gray-300">
                           <p className="mb-6">
                               We are designing for a world that moves faster than light. The tools we use must not only keep up but anticipate our next thought. <span className="text-[#FF4F00]/70 font-mono text-sm">#manifesto</span>
                           </p>
                           
                           <p className="mb-6 relative">
                               The interface is no longer a static page; it is a 
                               <span className="relative inline-block ml-1">
                                   <span className="text-blue-500">{sarahText}</span>
                                   <span className="cursor-static text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] h-5 -mb-1 ml-0.5">
                                       <span className="cursor-label bg-blue-500">Sarah</span>
                                   </span>
                               </span>
                           </p>

                           <p className="mb-8">
                               Collaboration happens in the spaces between keystrokes.
                               <span className="relative inline-block ml-1">
                                   <span className="text-emerald-500">{alexText}</span>
                                   <span className="cursor-static text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] h-5 -mb-1 ml-0.5">
                                       <span className="cursor-label bg-emerald-500">Alex</span>
                                   </span>
                               </span>
                           </p>

                           {/* Slash Menu Simulation */}
                           <div className="relative mt-8 p-2 border border-white/10 rounded-xl bg-[#121212]/80 backdrop-blur-md w-64 shadow-2xl z-50">
                                <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Basic blocks</div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3 px-2 py-2 hover:bg-white/5 rounded-lg cursor-pointer group transition-colors">
                                         <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-sm text-gray-400 group-hover:text-white"><Type size={16} /></div>
                                         <div className="text-sm text-gray-300 font-medium">Text</div>
                                    </div>
                                    <div className="flex items-center gap-3 px-2 py-2 bg-[#FF4F00]/10 rounded-lg cursor-pointer border border-[#FF4F00]/20">
                                         <div className="w-8 h-8 rounded-md bg-[#FF4F00]/20 flex items-center justify-center text-xs text-[#FF4F00]"><ImageIcon size={16} /></div>
                                         <div className="text-sm text-white font-medium">Image</div>
                                    </div>
                                    <div className="flex items-center gap-3 px-2 py-2 hover:bg-white/5 rounded-lg cursor-pointer group transition-colors">
                                         <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-sm text-gray-400 group-hover:text-white"><SquareCheck size={16} /></div>
                                         <div className="text-sm text-gray-300 font-medium">To-do List</div>
                                    </div>
                                </div>
                           </div>
                       </div>
                  </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Feature Stacking Section */}


        {/* System Capabilities Section */}
        <section id="features" className="w-full mb-40 relative z-30 py-20 mt-20">
          <div className="mb-20 text-center px-4">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 font-display uppercase">SYSTEM <span className="text-gray-600">CAPABILITIES</span></h2>
            <div className="w-24 h-1 bg-[#FF4F00] mx-auto mb-8"></div>
            <p className="text-gray-400 max-w-xl mx-auto font-light text-sm md:text-base">Engineered for speed, built for permanence. The underlying architecture.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
            
            {/* Card 1: Real-time Sync */}
            <div className="group relative bg-[#0a0a0a] border border-white/5 hover:border-[#FF4F00]/50 transition-colors duration-500 rounded-2xl p-8 h-[400px] flex flex-col overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <ArrowRightLeft className="text-[#FF4F00] w-8 h-8" />
                  <span className="text-[10px] font-mono text-[#FF4F00] border border-[#FF4F00]/30 px-2 py-1 rounded bg-[#FF4F00]/10">SOCKET.IO</span>
                </div>
                <h3 className="text-2xl font-bold mb-2 font-display">Real-time Sync</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-8">Millisecond latency updates across all connected clients. Conflict-free replicated data types ensure consistency.</p>
                <div className="flex-1 w-full bg-black/50 border border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center">
                    <div className="absolute w-full h-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMSI+PHBhdGggZD0iTTAgMjBMMjAgME0xMCAyMEwzMCAwIi8+PC9zdmc+')]"></div>
                    <div className="flex space-x-4">
                        <div className="w-2 h-16 bg-white/20 rounded animate-pulse"></div>
                        <div className="w-2 h-16 bg-[#FF4F00] rounded animate-pulse delay-75"></div>
                        <div className="w-2 h-16 bg-white/20 rounded animate-pulse delay-150"></div>
                    </div>
                </div>
              </div>
            </div>

            {/* Card 2: Slash Commands */}
            <div className="group relative bg-[#0a0a0a] border border-white/5 hover:border-[#FF4F00]/50 transition-colors duration-500 rounded-2xl p-8 h-[400px] flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex-1 w-full bg-black/50 border border-white/10 rounded-lg relative overflow-hidden flex mb-6">
                         <div className="w-3/4 bg-[#111] border border-white/10 p-3 rounded shadow-xl transform group-hover:-translate-y-1 transition-transform m-auto">
                              <div className="w-full bg-transparent text-gray-400 font-mono text-xs mb-2 border-b border-white/5 pb-1">Type 'new page'...</div>
                              <div className="flex flex-col space-y-1 pointer-events-none opacity-50">
                                  <div className="h-6 bg-white/5 w-full rounded flex items-center px-2 text-xs text-gray-400"><span className="mr-2 text-[#FF4F00]">/</span> Commands</div>
                                  <div className="h-6 bg-white/5 w-full rounded flex items-center px-2 text-xs text-gray-400"><span className="mr-2 text-[#FF4F00]">img</span> Image</div>
                              </div>
                         </div>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-bold font-display">Slash Commands</h3>
                        <Zap className="text-gray-600 group-hover:text-[#FF4F00] transition-colors w-6 h-6" />
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">Keyboard-first navigation. Execute complex formatting, insert media, or trigger integrations without leaving the home row.</p>
                    <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest self-start">Context Aware</span>
                </div>
            </div>

            {/* Card 3: Drag & Drop */}
            <div className="group relative bg-[#0a0a0a] border border-white/5 hover:border-[#FF4F00]/50 transition-colors duration-500 rounded-2xl p-8 h-[400px] flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                        <ImageIcon className="text-[#FF4F00] w-8 h-8" />
                        <span className="text-[10px] font-mono text-[#FF4F00] border border-[#FF4F00]/30 px-2 py-1 rounded bg-[#FF4F00]/10">CDN EDGE</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 font-display">Drag & Drop</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-8">Seamless media integration. Automatic optimization and CDN distribution for instant loading worldwide.</p>
                    <div className="flex-1 w-full bg-black/50 border border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center">
                        <div className="w-32 h-20 border-2 border-dashed border-gray-600 rounded flex items-center justify-center group-hover:border-[#FF4F00] transition-colors">
                            <Upload className="text-gray-600 group-hover:text-[#FF4F00] animate-bounce w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 4: Adaptive Theming */}
            <div className="group relative bg-[#0a0a0a] border border-white/5 hover:border-[#FF4F00]/50 transition-colors duration-500 rounded-2xl p-8 h-[400px] flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex-1 w-full bg-black/50 border border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center mb-8">
                        <div className="grid grid-cols-2 gap-2 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                            <div className="w-12 h-16 bg-[#222] rounded border border-white/10"></div>
                            <div className="w-12 h-16 bg-white rounded border border-gray-300"></div>
                            <div className="w-12 h-16 bg-[#1a1a1a] rounded border border-[#FF4F00]/50"></div>
                            <div className="w-12 h-16 bg-[#FF4F00] rounded border border-white/20"></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-bold font-display">Adaptive Theming</h3>
                        <Palette className="text-gray-600 group-hover:text-[#FF4F00] transition-colors w-6 h-6" />
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">Tailor the environment to your retinal comfort. System-sync or custom overrides for deep work sessions.</p>
                    <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest self-start">CSS Variables</span>
                </div>
            </div>

            {/* Card 5: Smart Auto-Save */}
            <div className="group relative bg-[#0a0a0a] border border-white/5 hover:border-[#FF4F00]/50 transition-colors duration-500 rounded-2xl p-8 h-[400px] flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                        <Save className="text-[#FF4F00] w-8 h-8" />
                        <span className="text-[10px] font-mono text-[#FF4F00] border border-[#FF4F00]/30 px-2 py-1 rounded bg-[#FF4F00]/10">POSTGRESQL</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 font-display">Smart Auto-Save</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-8">Never lose a thought. Granular version history allows you to rewind time and fork ideas from any point.</p>
                    <div className="flex-1 w-full bg-black/50 border border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center">
                        <div className="relative w-full px-8">
                            <div className="h-1 bg-gray-800 rounded w-full overflow-hidden">
                                <div className="h-full bg-[#FF4F00] w-1/3 animate-[shimmer_2s_infinite]"></div>
                            </div>
                            <div className="mt-2 flex justify-between text-[10px] font-mono text-gray-600">
                                <span>v1.2</span>
                                <span>Now</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 6: Military Grade */}
            <div className="group relative bg-[#0a0a0a] border border-white/5 hover:border-[#FF4F00]/50 transition-colors duration-500 rounded-2xl p-8 h-[400px] flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex-1 w-full bg-black/50 border border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center mb-8">
                        <Shield className="w-16 h-16 text-white/5 group-hover:text-[#FF4F00]/20 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 border border-[#FF4F00]/30 rounded-full animate-ping opacity-20"></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-bold font-display">Military Grade</h3>
                        <Lock className="text-gray-600 group-hover:text-[#FF4F00] transition-colors w-6 h-6" />
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">End-to-end encryption for private rooms. Role-based access control ensuring your intellectual property stays yours.</p>
                    <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest self-start">AES-256</span>
                </div>
            </div>

          </div>

          {/* Footer Glow Effect - emanating from the bottom of System Capabilities */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[1200px] h-[100px] bg-[#FF4F00]/20 blur-[80px] rounded-full pointer-events-none"></div>
        </section>

        {/* Philosophy Section */}
        <section className="w-full max-w-4xl mx-auto mb-32 text-center px-4 relative z-10">
            <span className="inline-block py-1 px-3 rounded border border-[#FF4F00]/30 bg-[#FF4F00]/5 text-[#FF4F00] text-xs font-mono mb-6 uppercase tracking-widest">The Philosophy</span>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-8 font-display">
                We stripped away the <span className="text-gray-500 line-through decoration-[#FF4F00]">clutter</span> to reveal the <span className="text-white">essence</span>.
            </h2>
            <p className="text-xl text-gray-400 font-light leading-relaxed max-w-3xl mx-auto">
                Your Space isn't just a text editor. It's a sanctuary for your mind. In a world screaming for your attention, we offer the luxury of silence and the power of connection only when you choose it. 
                <span className="text-white font-normal block mt-4">Reclaim your cognitive sovereignty.</span>
            </p>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 text-center relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] max-w-5xl mx-auto mb-20 px-4">
            <div className="absolute inset-0 bg-gradient-to-t from-[#FF4F00]/10 to-transparent opacity-50 pointer-events-none"></div>
            <h3 className="relative text-3xl md:text-5xl font-bold mb-8 font-display">Ready to define <span className="text-white/50">the new standard?</span></h3>
            <WarpButton className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-full font-bold text-lg transform hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                Start Writing Now
            </WarpButton>
            <div className="mt-20 flex justify-center space-x-6 relative z-10">
                <a href="https://github.com/Subhankar-Patra1" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
                <a href="https://x.com/Subhankar7657" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
            </div>
        </section>

      </main>
    </div>
  );
};


export default LandingPage;
