import React from 'react';
import { User, Language } from '../types';

interface LandingProps {
  user: User | null;
  lang: Language;
  onStart: () => void;
  onExplore: () => void;
}

export const Landing: React.FC<LandingProps> = ({ user, lang, onStart, onExplore }) => {
  const t = (en: string, hi: string) => (lang === 'en' ? en : hi);

  return (
    <section className="relative h-screen w-full flex flex-col justify-end overflow-hidden selection:bg-white selection:text-primary">
      <div className="absolute inset-0 z-0">
        <img 
          alt="Travel Background" 
          className="h-full w-full object-cover animate-float opacity-80" 
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20"></div>
      </div>

      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="flex items-center p-8 justify-between max-w-lg mx-auto w-full">
          <div className="text-white flex size-11 shrink-0 items-center justify-center backdrop-blur-2xl bg-white/10 rounded-full border border-white/20 shadow-2xl transition-all">
            <span className="material-symbols-outlined text-[24px]">travel_explore</span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-white text-sm font-extrabold tracking-[0.4em] uppercase font-display drop-shadow-lg">TravelLog</h2>
            <span className="text-[10px] bg-primary px-2 py-0.5 rounded-md font-black text-white">PRO</span>
          </div>
          <div className="flex w-11 items-center justify-end">
            {user ? (
                <button onClick={onExplore} className="size-11 rounded-full border-2 border-white/20 shadow-2xl overflow-hidden transition-transform active:scale-90">
                    <img src={user.avatar} className="w-full h-full object-cover" alt="User" />
                </button>
            ) : (
                <button onClick={onExplore} className="flex items-center justify-center overflow-hidden rounded-full h-11 w-11 backdrop-blur-2xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
                    <span className="material-symbols-outlined text-[24px]">person</span>
                </button>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-5 px-10 pb-[300px] max-w-lg mx-auto w-full flex flex-col gap-6 animate-in slide-in-from-bottom duration-1000">
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
             <span className="h-px w-8 bg-accent-gold/50"></span>
             <span className="text-sand/90 text-[10px] font-black uppercase tracking-[0.35em]">
                {user 
                  ? t(`Welcome back, ${user.name.split(' ')[0]}`, `स्वागत है, ${user.name.split(' ')[0]}`)
                  : t('Volume 01 — Heritage Collection', 'अध्याय ०१ — विरासत संग्रह')
                }
             </span>
          </div>
          <h1 className="text-white text-6xl font-serif italic font-bold tracking-tight leading-[1.1] drop-shadow-2xl">
            {t('Narrate Your', 'अपनी यात्राओं को')} <br /> <span className="text-primary italic">{t('Journeys', 'शब्द दें')}</span>.
          </h1>
          <p className="text-slate-300/80 text-base font-medium leading-relaxed max-w-[340px] mt-4 font-display">
            {t(
              'The premium voice-first journal that converts your moments into bilingual editorial masterpieces.',
              'एक खास आवाज़-आधारित डायरी जो आपके यादगार पलों को बेहतरीन लेखों में बदल देती है।'
            )}
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 w-full px-10 py-12 max-w-lg mx-auto flex flex-col gap-5 bg-gradient-to-t from-black via-black/80 to-transparent">
        <button 
            onClick={onStart} 
            className="group shadow-2xl shadow-primary/40 flex items-center justify-between px-8 w-full h-16 bg-primary rounded-[1.5rem] transition-all active:scale-[0.97] hover:bg-blue-600 border border-white/10"
        >
          <div className="flex items-center gap-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 group-hover:bg-white transition-all">
                <span className="material-symbols-outlined text-[20px] text-white group-hover:text-primary transition-colors">mic_none</span>
              </div>
              <span className="text-white text-base font-black tracking-tight font-display uppercase text-sm">
                {t('New Chronicle', 'नई यादें जोड़ें')}
              </span>
          </div>
          <span className="material-symbols-outlined text-white/40 text-2xl group-hover:translate-x-1 transition-transform group-hover:text-white">arrow_forward_ios</span>
        </button>

        <button 
            onClick={onExplore} 
            className="flex items-center justify-center gap-3 w-full h-14 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all active:scale-[0.97]"
        >
          <span className="material-symbols-outlined text-[20px] opacity-60">auto_stories</span>
          <span>
            {user 
              ? t('My Private Vault', 'मेरी निजी तिजोरी') 
              : t('Access Private Vault', 'अपनी निजी तिजोरी खोलें')
            }
          </span>
        </button>
      </div>
    </section>
  );
};
