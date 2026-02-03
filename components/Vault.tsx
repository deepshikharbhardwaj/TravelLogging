import React, { useState, useMemo } from 'react';
import { Trip, User, Language } from '../types';

interface VaultProps {
  trips: Trip[];
  user: User | null;
  lang: Language;
  onLogout: () => void;
  onBack: () => void;
  onSelectTrip: (trip: Trip) => void;
}

export const Vault: React.FC<VaultProps> = ({ trips, user, lang, onLogout, onBack, onSelectTrip }) => {
  const [filter, setFilter] = useState<'all' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const t = (en: string, hi: string) => (lang === 'en' ? en : hi);

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchesFilter = filter === 'public' ? t.isPublic : true;
      const matchesSearch = 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [trips, filter, searchQuery]);

  return (
    <div className="bg-[#fcfcfd] min-h-screen text-slate-900 font-display">
      <header className="sticky top-0 z-50 glass-morphism border-b border-slate-100">
        <div className="px-6 py-5 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={onBack}>
                 <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                    <span className="material-symbols-outlined text-slate-700 text-xl">arrow_back</span>
                 </div>
                 <h1 className="text-3xl font-serif italic font-bold tracking-tight text-slate-900">
                   {t('Your Vault', 'आपका संग्रह')}
                 </h1>
            </div>
            
            <div className="relative">
                <button 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="size-10 rounded-full border-2 border-white shadow-lg overflow-hidden transition-transform active:scale-95"
                >
                    <img src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'} className="w-full h-full object-cover" alt="User" />
                </button>

                {showProfileMenu && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                        <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 animate-in fade-in zoom-in duration-200">
                            <div className="px-4 py-3 border-b border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('Signed in as', 'प्रवेश नाम')}</p>
                                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Explorer'}</p>
                            </div>
                            <button 
                                onClick={onLogout}
                                className="w-full text-left px-4 py-3 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                            >
                                <span className="material-symbols-outlined text-lg">logout</span>
                                {t('Sign Out', 'लॉग आउट')}
                            </button>
                        </div>
                    </>
                )}
            </div>
          </div>
          
          <div className="relative mb-6">
            <input 
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-12 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-slate-400 outline-none" 
              placeholder={t("Search by city or title...", "शहर या नाम से खोजें...")}
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 hide-scrollbar">
            <button 
              onClick={() => setFilter('all')}
              className={`shrink-0 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
              {t('All Chapters', 'सभी अध्याय')}
            </button>
            <button 
               onClick={() => setFilter('public')}
               className={`shrink-0 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${filter === 'public' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
              {t('Public Only', 'केवल सार्वजनिक')}
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 pb-32 max-w-md mx-auto">
        {filteredTrips.length > 0 ? (
            <div className="grid grid-cols-2 gap-5">
            {filteredTrips.map((trip) => (
                <div 
                    key={trip.id} 
                    onClick={() => onSelectTrip(trip)} 
                    className="group relative overflow-hidden rounded-[1.75rem] bg-white border border-slate-100 editorial-shadow cursor-pointer transition-all duration-500 hover:-translate-y-1 active:scale-[0.98]"
                >
                <div className="relative aspect-[4/5] overflow-hidden">
                    <img 
                    alt={trip.title} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110" 
                    src={trip.coverImage} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                    <div className="absolute bottom-5 left-5 right-5">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-sand font-bold mb-1.5 opacity-90">{trip.location}</p>
                    <h2 className="text-sm font-serif italic text-white leading-tight mb-2">{trip.title}</h2>
                    <div className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${trip.isPublic ? 'bg-green-400' : 'bg-slate-400'}`}></span>
                        <span className="text-[8px] font-bold text-white/70 uppercase tracking-widest">{trip.isPublic ? t('Public', 'सार्वजनिक') : t('Private', 'निजी')}</span>
                    </div>
                    </div>
                </div>
                </div>
            ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-200 mb-4">auto_stories</span>
                <h3 className="text-lg font-bold text-slate-800">{t('No memories found', 'कोई यादें नहीं मिलीं')}</h3>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">{t('Try a different search', 'कुछ और खोजें')}</p>
            </div>
        )}
      </main>
    </div>
  );
};
