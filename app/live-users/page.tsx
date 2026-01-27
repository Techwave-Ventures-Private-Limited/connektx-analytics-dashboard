"use client";

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Sparkles, Volume2, VolumeX, Radio } from 'lucide-react';

// --- CONFIGURATION ---
const API_URL = `${process.env.NEXT_PUBLIC_API_BASE}/analytics/users/live`;
const POLLING_INTERVAL = 5000;

// --- TYPES ---
interface LiveData {
  total: number;
  latest_user: {
    name: string;
    id: string;
    createdAt: string;
  } | null;
  ticker_list: string[];
}

// --- HELPER: Confetti ---
const triggerCelebration = () => {
  const duration = 3000;
  const end = Date.now() + duration;
  const interval: any = setInterval(() => {
    if (Date.now() > end) return clearInterval(interval);
    confetti({ startVelocity: 30, spread: 360, particleCount: 50, origin: { x: Math.random(), y: Math.random() - 0.2 } });
  }, 250);
};

export default function LiveUsersPage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  
  // Audio Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoad = useRef(true);

  // --- 1. LOAD MP3 SOUND ---
  useEffect(() => {
    audioRef.current = new Audio('/sounds/celebration.mp3');
    audioRef.current.volume = 0.6; // 60% volume
  }, []);

  // --- 2. PLAY MP3 HELPER ---
  const playSoundEffect = () => {
    if (!isMuted && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio blocked:", e));
    }
  };

  // --- 3. TEXT TO SPEECH HELPER ---
  const speakName = (name: string) => {
    if (isMuted) return;
    
    // Cancel previous speech to prevent queue buildup
    window.speechSynthesis.cancel();
    
    // Create utterance
    const text = `${name} joined connects`;
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Optional: wait slightly for the "ding" sound to start before speaking
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 500); 
  };

  // --- POLLING ENGINE ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const json: LiveData = await res.json();

        // CHECK FOR NEW USER
        if (json.latest_user) {
          if (json.latest_user.id !== lastAnnouncedId) {
            
            // Only celebrate if it's NOT the very first load
            if (!isFirstLoad.current) {
              triggerCelebration();     // Visual
              playSoundEffect();        // Sound FX
              speakName(json.latest_user.name); // Voice
            }
            
            setLastAnnouncedId(json.latest_user.id);
          }
        }

        setData(json);
        isFirstLoad.current = false;

      } catch (err) {
        console.error("Live poll failed", err);
      }
    };

    fetchData(); 
    const interval = setInterval(fetchData, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [lastAnnouncedId, isMuted]); // Re-run when mute changes to ensure audio context is fresh

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden font-sans text-slate-100">
      
      {/* Background FX */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* --- SOUND CONTROL --- */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-6 right-6 z-50 bg-slate-800/80 hover:bg-slate-700 p-3 rounded-full border border-slate-600 transition-all cursor-pointer"
        title={isMuted ? "Unmute to hear announcements" : "Mute Sound"}
      >
        {isMuted ? <VolumeX size={24} className="text-slate-400" /> : <Volume2 size={24} className="text-emerald-400" />}
      </button>

      {/* --- LEFT: MAIN STATS --- */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        
        {/* Counter */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Radio className="text-red-500 animate-pulse" size={20} />
            <h2 className="text-slate-400 text-sm uppercase tracking-widest font-semibold">Live User Count</h2>
          </div>
          <div className="text-[10rem] md:text-[12rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-700 drop-shadow-2xl">
            {data?.total.toLocaleString() ?? "..."}
          </div>
        </div>

        {/* New User Popup Card */}
        <div className="h-24 w-full flex justify-center">
          <AnimatePresence mode="wait">
            {data?.latest_user && !isFirstLoad.current && (
              <motion.div
                key={data.latest_user.id}
                initial={{ y: 50, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="bg-slate-900/80 backdrop-blur border border-indigo-500/30 p-6 rounded-2xl flex items-center gap-4 shadow-2xl shadow-indigo-500/20"
              >
                <div className="bg-indigo-500/20 p-3 rounded-full text-indigo-400">
                  <Sparkles size={24} />
                </div>
                <div>
                  <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Just Joined</div>
                  <div className="text-xl font-bold text-white">{data.latest_user.name}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- RIGHT: SCROLLING TICKER --- */}
      <div className="w-80 h-screen border-l border-slate-800 bg-slate-900/30 backdrop-blur-sm relative hidden md:block">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <h3 className="font-bold text-slate-300 flex items-center gap-2">
            <Users size={16} /> Recent Members
          </h3>
        </div>

        {/* Marquee Container */}
        <div className="relative h-full overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-slate-950 to-transparent z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent z-10"></div>

            {data?.ticker_list && (
               <div className="animate-marquee py-4">
                  {[...data.ticker_list, ...data.ticker_list].map((name, i) => (
                    <div key={i} className="px-6 py-3 text-slate-400 font-medium text-lg border-b border-slate-800/50 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                        {name}
                    </div>
                  ))}
               </div>
            )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes scroll-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-marquee {
          animation: scroll-up 40s linear infinite;
        }
      `}</style>

    </div>
  );
}