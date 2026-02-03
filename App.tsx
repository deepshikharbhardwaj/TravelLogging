import React, { useState, useEffect } from 'react';
import { Landing } from './components/Landing';
import { Vault } from './components/Vault';
import { Journaling } from './components/Journaling';
import { Auth } from './components/Auth';
import { ViewState, Trip, DayLog, User, Language } from './types';

const createDefaultDay = (dayNum: number): DayLog => ({
  id: `day-${dayNum}-${Date.now()}`,
  dayNumber: dayNum,
  rawTranscript: '',
  sections: [],
  summary: 'Awaiting your first story...',
  logistics: { hotelName: '', hotelCost: 0, transportMode: '', transportCost: 0 },
  foodLogistics: {
    breakfast: { name: '', cost: 0, restaurant: '' },
    lunch: { name: '', cost: 0, restaurant: '' },
    dinner: { name: '', cost: 0, restaurant: '' }
  },
  isCompleted: false,
  date: new Date().toISOString()
});

export default function App() {
  const [view, setView] = useState<ViewState>('LANDING');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [pendingAction, setPendingAction] = useState<'NEW_TRIP' | 'VIEW_VAULT' | null>(null);

  useEffect(() => {
    // Session Validation Logic
    const savedUser = localStorage.getItem('travellog_user');
    const savedLang = localStorage.getItem('travellog_lang') as Language;
    const registryData = localStorage.getItem('travellog_registry');
    const registry: User[] = registryData ? JSON.parse(registryData) : [];

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Verify user still exists in our simulated registry
      const isValid = registry.find(u => u.email === parsedUser.email);
      if (isValid) {
        setUser(parsedUser);
      } else {
        localStorage.removeItem('travellog_user');
      }
    }
    
    if (savedLang) {
      setLang(savedLang);
      document.documentElement.lang = savedLang;
    }

    // Load User's Trips
    const savedTrips = localStorage.getItem('travellog_trips');
    if (savedTrips) {
      setTrips(JSON.parse(savedTrips));
    }
  }, []);

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    localStorage.setItem('travellog_lang', nextLang);
    document.documentElement.lang = nextLang;
  };

  const handleAction = (action: 'NEW_TRIP' | 'VIEW_VAULT') => {
    if (!user) {
      setPendingAction(action);
      setView('AUTH');
    } else {
      executeAction(action);
    }
  };

  const executeAction = (action: 'NEW_TRIP' | 'VIEW_VAULT') => {
    if (action === 'NEW_TRIP') {
      createNewTrip();
    } else if (action === 'VIEW_VAULT') {
      setView('VAULT');
    }
  };

  const createNewTrip = () => {
    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      title: lang === 'en' ? 'New Journey' : 'नई यात्रा',
      location: lang === 'en' ? 'Unknown' : 'अनजान जगह',
      coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop',
      days: [createDefaultDay(1)],
      isPublic: true,
      startDate: new Date().toISOString(),
      status: 'active'
    };
    
    const updatedTrips = [newTrip, ...trips];
    setTrips(updatedTrips);
    localStorage.setItem('travellog_trips', JSON.stringify(updatedTrips));
    setSelectedTrip(newTrip);
    setView('JOURNALING');
  };

  const handleAuthComplete = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('travellog_user', JSON.stringify(newUser));
    if (pendingAction) {
      executeAction(pendingAction);
      setPendingAction(null);
    } else {
      setView('VAULT');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('travellog_user');
    setView('LANDING');
  };

  const handleUpdateTrip = (updatedTrip: Trip) => {
    const updatedTrips = trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
    setTrips(updatedTrips);
    localStorage.setItem('travellog_trips', JSON.stringify(updatedTrips));
    setSelectedTrip(updatedTrip);
  };

  return (
    <div className={lang === 'hi' ? 'font-hi-body' : 'font-display'}>
      <div className="fixed bottom-32 right-6 z-[60]">
        <button 
          onClick={toggleLang}
          className="size-14 bg-white rounded-full shadow-2xl border border-slate-100 flex flex-col items-center justify-center transition-all active:scale-90 hover:border-primary group"
        >
          <span className="material-symbols-outlined text-primary text-xl">language</span>
          <span className="text-[9px] font-black text-slate-400 group-hover:text-primary uppercase tracking-tighter">
            {lang === 'en' ? 'HINDI' : 'ENGLISH'}
          </span>
        </button>
      </div>

      {view === 'LANDING' && (
        <Landing 
          user={user}
          lang={lang}
          onStart={() => handleAction('NEW_TRIP')}
          onExplore={() => handleAction('VIEW_VAULT')}
        />
      )}

      {view === 'AUTH' && (
        <Auth 
          lang={lang}
          onAuthComplete={handleAuthComplete}
          onBack={() => setView('LANDING')}
        />
      )}

      {view === 'VAULT' && (
        <Vault 
          trips={trips}
          user={user}
          lang={lang}
          onLogout={handleLogout}
          onBack={() => setView('LANDING')}
          onSelectTrip={(trip) => {
            setSelectedTrip(trip);
            setView('JOURNALING');
          }}
        />
      )}

      {view === 'JOURNALING' && selectedTrip && (
        <Journaling 
          trip={selectedTrip}
          lang={lang}
          onUpdateTrip={handleUpdateTrip}
          onBack={() => setView('VAULT')}
        />
      )}
    </div>
  );
}
