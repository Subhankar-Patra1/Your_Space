import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function getGuestId() {
  let id = localStorage.getItem('yourspace-guest-id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('yourspace-guest-id', id);
  }
  return id;
}

export default function Landing() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleStartWriting = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: getGuestId() })
      });
      const data = await res.json();
      navigate(`/note/${data.shortId}`);
    } catch (error) {
      console.error('Failed to create note:', error);
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
           }} 
      />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <span>Your Space</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="https://github.com/Subhankar-Patra1/Your_Space" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
          <button 
            onClick={handleStartWriting}
            disabled={isCreating}
            className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all backdrop-blur-sm"
          >
            {isCreating ? 'Creating...' : 'Log in'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 py-20 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8 animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Your Space 2.0 is live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 animate-fade-in-down">
          Write Together, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Distraction-Free.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-100">
          The minimalist collaborative editor for focused teams. Real-time sync, markdown support, and a clutter-free interface designed to let your thoughts flow.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
          <button 
            onClick={handleStartWriting}
            disabled={isCreating}
            className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg shadow-lg shadow-blue-500/25 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
          >
            {isCreating ? (
               <span className="flex items-center gap-2">
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Creating Space...
               </span>
            ) : "Start Writing Now"}
          </button>
          <a href="https://github.com/Subhankar-Patra1/Your_Space" target="_blank" rel="noreferrer" className="px-8 py-4 rounded-full bg-[#1A1A1A] hover:bg-[#252525] text-white font-medium border border-white/10 transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Star on GitHub
          </a>
        </div>

        {/* Mockup / Visual */}
        <div className="mt-20 relative animate-fade-in-up delay-300">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-teal-600 rounded-xl blur opacity-25"></div>
          <div className="relative rounded-xl bg-[#111] border border-white/10 shadow-2xl overflow-hidden">
             <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#161616]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="ml-4 px-3 py-1 bg-white/5 rounded text-xs text-gray-500 font-mono">
                  project-alpha-draft.md
                </div>
             </div>
             <div className="p-8 text-left font-mono text-sm text-gray-400 leading-relaxed h-[300px] md:h-[400px]">
                <span className="text-blue-400"># The Future of Collaboration</span>
                <br /><br />
                We believe that writing should be fluid. It shouldn't be interrupted by cluttered toolbars or complex formatting options that you rarely use. It should just flow.
                <br /><br />
                In <span className="text-white bg-blue-500/20 px-1 rounded">Your Space</span>, every keystroke is synced instantly. Whether you are in Tokyo or Toronto, your team is right there with you.
                <br /><br />
                <span className="italic text-gray-500">"Simplicity is the ultimate sophistication." — Leonardo da Vinci</span>
                <br /><br />
                ## Features we love <br />
                - Minimalist by default <br />
                - Markdown native <br />
                - Fast as light
             </div>
             
             {/* Fake Cursors */}
             <div className="absolute top-[160px] left-[340px] flex items-center gap-2">
                <div className="relative">
                   <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M5.658 3.516l12.824 5.923-7.536 2.052-2.316 7.46-2.972-15.435z" /></svg>
                   <div className="absolute top-4 left-3 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">Alice</div>
                </div>
             </div>
             <div className="absolute top-[280px] left-[180px] flex items-center gap-2">
                <div className="relative">
                   <svg className="w-5 h-5 text-pink-500 fill-current" viewBox="0 0 24 24"><path d="M5.658 3.516l12.824 5.923-7.536 2.052-2.316 7.46-2.972-15.435z" /></svg>
                   <div className="absolute top-4 left-3 bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Bob</div>
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 mb-4">
             Everything you need, nothing you don't.
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Designed to keep you in flow. Powerful features tucked away until you need them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            title="Real-Time Sync"
            description="Edit simultaneously with zero latency. See your team's cursors move as they type, making remote collaboration feel like you're in the same room."
          />
          <FeatureCard 
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
            title="Markdown Native"
            description="Format as you type without lifting your hands from the keyboard. Headings, lists, and quotes render instantly while keeping the source clean."
          />
          <FeatureCard 
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            title="Adaptive Dark Mode"
            description="Easy on the eyes, day or night. Our interface automatically adapts to your system preferences, or toggle it manually for late-night sessions."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/5 bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="text-gray-500 text-sm">
             © {new Date().getFullYear()} Your Space Inc. Open Source.
           </div>
           <div className="flex gap-6">
             <a href="#" className="text-gray-500 hover:text-white transition-colors">Privacy</a>
             <a href="#" className="text-gray-500 hover:text-white transition-colors">Terms</a>
             <a href="#" className="text-gray-500 hover:text-white transition-colors">Twitter</a>
           </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-8 rounded-2xl bg-[#111] border border-white/5 hover:border-white/10 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:bg-blue-500/20 transition-all mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}
