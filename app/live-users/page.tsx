"use client";

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Sparkles, Volume2, VolumeX, Radio, Smartphone } from 'lucide-react';
import QRCode from 'react-qr-code';

// --- CONFIGURATION ---
const API_URL = `${process.env.NEXT_PUBLIC_API_BASE}/analytics/users/live`;
const PLAYSTORE_URL = "https://play.google.com/store/apps/details?id=app.rork.connektx";
const POLLING_INTERVAL = 5000;
const NOTIFICATION_DURATION = 7000; // Card disappears after 7 seconds

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
    confetti({
      startVelocity: 35,
      spread: 360,
      particleCount: 60,
      origin: { x: Math.random(), y: Math.random() - 0.2 },
      colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#eab308']
    });
  }, 200);
};

export default function LiveUsersPage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);

  // NEW: Local state to control the visibility of the popup
  const [showSidebar, setShowSidebar] = useState(false);
  const [notificationUser, setNotificationUser] = useState<LiveData['latest_user']>(null);
  const [priorityQueue, setPriorityQueue] = useState<NonNullable<LiveData['latest_user']>[]>([]);
  const [loopIndex, setLoopIndex] = useState(0);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoad = useRef(true);

  // --- 1. LOAD MP3 SOUND ---
  useEffect(() => {
    audioRef.current = new Audio('/sounds/celebration.mp3');
    audioRef.current.volume = 0.7;
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
    window.speechSynthesis.cancel();
    const text = `${name} has joined Connects. Welcome!`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 600);
  };

  // --- ANNOUNCEMENT CONTROLLER ---
  const triggerNextAnnouncement = () => {
    if (isAnnouncing) return;

    let nextUser: LiveData['latest_user'] = null;

    if (priorityQueue.length > 0) {
      // Priority 1: New live joins
      const [first, ...rest] = priorityQueue;
      nextUser = first;
      setPriorityQueue(rest);
      triggerCelebration(); // Celebrate for real-time joins
    } else if (data?.ticker_list && data.ticker_list.length > 0) {
      // Priority 2: Database users loop
      const name = data.ticker_list[loopIndex];
      nextUser = {
        name,
        id: `loop-${loopIndex}-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      setLoopIndex((prev) => (prev + 1) % data.ticker_list.length);
      triggerCelebration(); // Also celebrate for loop users to keep it lively
    }

    if (nextUser) {
      setIsAnnouncing(true);
      setNotificationUser(nextUser);
      playSoundEffect();
      speakName(nextUser.name);

      // Clear any existing timer
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

      // Set timer to hide and allow next announcement
      hideTimeoutRef.current = setTimeout(() => {
        setNotificationUser(null);
        setIsAnnouncing(false);
      }, NOTIFICATION_DURATION);
    }
  };

  // Drive the loop: when notificationUser becomes null, trigger next after a small gap
  useEffect(() => {
    if (!notificationUser && !isFirstLoad.current) {
      const timer = setTimeout(() => {
        triggerNextAnnouncement();
      }, 1500); // 1.5s gap between announcements
      return () => clearTimeout(timer);
    }
  }, [notificationUser, priorityQueue, data]);

  // --- POLLING ENGINE ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const json: LiveData = await res.json();

        // CHECK FOR NEW USER
        if (json.latest_user) {
          if (json.latest_user.id !== lastAnnouncedId) {
            // Only add to priority queue if it's NOT the very first load
            if (!isFirstLoad.current) {
              setPriorityQueue(prev => [...prev, json.latest_user!]);
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
  }, [lastAnnouncedId, isMuted]);

  return (
    <div className="min-h-screen bg-black flex relative overflow-hidden font-sans text-white selection:bg-purple-500/30">

      {/* Lively Background FX */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_var(--tw-gradient-stops))] from-purple-900/30 via-black to-black pointer-events-none" />

      {/* --- TOP LEFT: BRANDING --- */}
      <header className="absolute top-4 left-4 md:top-8 md:left-8 z-50">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-pulse-slow">
          Connektx
        </h1>
        <p className="text-[10px] md:text-sm text-zinc-400 font-medium tracking-wider uppercase mt-1 md:mt-2 pl-1 border-l-2 border-purple-500">
          India's First Professional Networking App
        </p>
      </header>

      {/* --- SIDEBAR TOGGLE --- */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="absolute top-4 right-16 md:top-8 md:right-24 z-50 bg-zinc-900/80 hover:bg-zinc-800 p-2 md:p-3 rounded-full border border-zinc-700 transition-all cursor-pointer backdrop-blur-md group"
        title={showSidebar ? "Hide Recent Joins" : "Show Recent Joins"}
      >
        <Users size={20} className={showSidebar ? "text-purple-400" : "text-zinc-500 group-hover:text-white"} />
      </button>

      {/* --- SOUND CONTROL --- */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-4 md:top-8 md:right-8 z-50 bg-zinc-900/80 hover:bg-zinc-800 p-2 md:p-3 rounded-full border border-zinc-700 transition-all cursor-pointer backdrop-blur-md group"
        title={isMuted ? "Unmute to hear announcements" : "Mute Sound"}
      >
        {isMuted ? <VolumeX size={20} className="text-zinc-500 group-hover:text-white" /> : <Volume2 size={20} className="text-green-400" />}
      </button>

      {/* --- LEFT MAIN AREA: STATS & QR --- */}
      <div className="flex-1 flex flex-col relative z-10 pl-4 md:pl-8 pt-24 md:pt-32 pr-4 md:pr-0">

        {/* Launch Heading */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-2 md:mb-8 px-4"
        >
          <h2 className="text-xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            India's First Professional Social Media App Has Launched— Download Now.
          </h2>
        </motion.div>

        {/* 2. New User Popup Card (Controlled by notificationUser state) */}
        <div className="h-20 md:h-24 w-full flex justify-center px-4 mb-2 md:mb-20 pointer-events-none">
          <AnimatePresence mode="wait">
            {notificationUser && (
              <motion.div
                key={notificationUser.id}
                initial={{ y: 50, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.9 }}
                className="bg-gradient-to-r from-purple-900/90 to-blue-900/90 backdrop-blur-xl border border-purple-500/30 pl-3 md:pl-4 pr-6 md:pr-8 py-3 md:py-4 rounded-full flex items-center gap-3 md:gap-4 shadow-2xl shadow-purple-500/20"
              >
                <div className="bg-white/10 p-1.5 md:p-2 rounded-full text-purple-200">
                  <Sparkles size={16} className="md:w-5 md:h-5" />
                </div>
                <div>
                  <div className="text-[9px] md:text-[10px] text-purple-300 font-bold uppercase tracking-wider">Just Joined</div>
                  <div className="text-base md:text-lg font-bold text-white whitespace-nowrap">{notificationUser.name}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 1. The Lively Counter Section */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-55 md:-mt-10">
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-6 md:mb-8">
            <span className="relative flex h-3 w-3 md:h-4 md:w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-full w-full bg-red-600"></span>
            </span>
            <h2 className="text-zinc-300 text-xs md:text-lg uppercase tracking-[0.2em] font-bold">Live Community Size</h2>
          </div>

          <div className="relative group cursor-default">
            <div className="absolute -inset-4 md:-inset-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-2xl md:blur-3xl opacity-40 group-hover:opacity-60 transition-opacity animate-spin-very-slow"></div>
            <div className="absolute -inset-[4px] md:-inset-[6px] rounded-full bg-[conic-gradient(from_0deg,transparent_0_deg,#3b82f6_90deg,#ec4899_180deg,#3b82f6_270deg,transparent_360deg)] animate-spin-slow opacity-80"></div>

            <div className="relative bg-black rounded-full p-1 md:p-2">
              <div className="bg-zinc-950/80 rounded-full p-8 md:p-16 backdrop-blur-sm border border-zinc-800/50">
                <div className="text-5xl md:text-[10rem] font-black leading-none text-white tracking-tighter text-center px-4 md:px-6">
                  {data?.total.toLocaleString() ?? "..."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom Left QR Code / Download CTA */}
        <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-auto bg-zinc-900/80 backdrop-blur-lg p-4 md:p-5 rounded-3xl border border-zinc-800/60 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-xl max-w-md mx-auto md:mx-0">
          <div className="hidden md:block bg-white p-3 rounded-2xl shadow-inner">
            <div style={{ height: "auto", margin: "0 auto", maxWidth: 80, width: "100%" }}>
              <QRCode
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={PLAYSTORE_URL}
                viewBox={`0 0 256 256`}
              />
            </div>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-white font-bold text-lg md:text-xl mb-1 flex items-center justify-center md:justify-start gap-2">
              <Smartphone size={20} className="text-green-400" /> We are Live!
            </h3>
            <p className="text-zinc-400 text-xs md:text-sm leading-snug mb-3">
              <span className="md:hidden">Click below to download Connektx from the Play Store.</span>
              <span className="hidden md:inline">Scan the QR code to download Connektx from the Play Store.</span>
            </p>

            {/* Mobile Download Button */}
            <a
              href={PLAYSTORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="md:hidden w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2 px-6 rounded-full text-sm flex items-center justify-center gap-2 mb-2"
            >
              Download Now
            </a>

            <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full uppercase tracking-wider">
              Get Connected Now
            </span>
          </div>
        </div>
      </div>

      {/* --- RIGHT: SCROLLING TICKER --- */}
      <div className={`${showSidebar ? 'w-[400px] border-l' : 'w-0 border-none'} h-screen border-zinc-800 bg-zinc-950/80 backdrop-blur-xl relative transition-all duration-500 overflow-hidden hidden xl:block`}>
        <div className="p-8 border-b border-zinc-800 bg-black/60">
          <h3 className="font-bold text-xl text-white flex items-center gap-3 font-mono tracking-tight">
            <Users size={20} className="text-purple-400" /> Recent joins
          </h3>
        </div>

        <div className="relative h-full overflow-hidden font-mono">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black to-transparent z-10"></div>
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent z-10"></div>

          {data?.ticker_list && (
            <div className="animate-marquee pt-8 pb-32">
              {[...data.ticker_list, ...data.ticker_list].map((name, i) => (
                <div key={i} className="px-8 py-5 text-zinc-300 font-semibold text-2xl border-b border-zinc-900/80 flex items-center gap-4 truncate">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 shadow-lg shadow-purple-500/50"></div>
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
          animation: scroll-up 45s linear infinite;
        }

        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
        }
        
        @keyframes spin-very-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-very-slow {
            animation: spin-very-slow 20s linear infinite;
        }
        
        .animate-pulse-slow {
            animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}