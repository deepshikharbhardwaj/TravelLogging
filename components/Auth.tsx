import React, { useState } from 'react';
import { User, Language } from '../types';

interface AuthProps {
  lang: Language;
  onAuthComplete: (user: User) => void;
  onBack: () => void;
}

// Internal interface for the simulated registry that includes the password
interface RegistryUser extends User {
  password?: string;
}

export const Auth: React.FC<AuthProps> = ({ lang, onAuthComplete, onBack }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (en: string, hi: string) => (lang === 'en' ? en : hi);

  const getRegistry = (): RegistryUser[] => {
    const data = localStorage.getItem('travellog_registry');
    return data ? JSON.parse(data) : [];
  };

  const saveToRegistry = (user: RegistryUser) => {
    const registry = getRegistry();
    registry.push(user);
    localStorage.setItem('travellog_registry', JSON.stringify(registry));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailClean = email.toLowerCase().trim();
    if (!emailClean.endsWith('@gmail.com')) {
      setError(t("Please use a valid @gmail.com address.", "कृपया एक मान्य @gmail.com पते का उपयोग करें।"));
      return;
    }

    if (password.length < 6) {
      setError(t("Password must be at least 6 characters.", "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।"));
      return;
    }

    const registry = getRegistry();
    const existingUser = registry.find(u => u.email === emailClean);

    setIsLoading(true);
    
    // Simulating production API lag
    setTimeout(() => {
      if (mode === 'LOGIN') {
        if (!existingUser) {
          setError(t("Account not found. Please sign up first.", "खाता नहीं मिला। कृपया पहले साइन अप करें।"));
          setIsLoading(false);
          return;
        }
        
        // CRITICAL BUG FIX: Verify the password matches the one in registry
        if (existingUser.password !== password) {
          setError(t("Incorrect password. Please try again.", "गलत पासवर्ड। कृपया पुनः प्रयास करें।"));
          setIsLoading(false);
          return;
        }

        // Return only the public user profile to the app state
        const { password: _, ...userProfile } = existingUser;
        onAuthComplete(userProfile);
      } else {
        if (existingUser) {
          setError(t("An account with this email already exists.", "इस ईमेल वाला खाता पहले से मौजूद है।"));
          setIsLoading(false);
          return;
        }
        
        const newUser: RegistryUser = {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          email: emailClean,
          name: name || emailClean.split('@')[0],
          password: password, // Securely stored in mock registry
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emailClean)}`
        };
        saveToRegistry(newUser);
        
        const { password: _, ...userProfile } = newUser;
        onAuthComplete(userProfile);
      }
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-10 duration-700">
        <button 
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group"
        >
          <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{t('Return to Home', 'वापस मुख्य पृष्ठ पर')}</span>
        </button>

        <div className="bg-white rounded-[3rem] p-10 editorial-shadow border border-slate-50 relative overflow-hidden">
          <div className="mb-10 text-center">
            <div className="size-16 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/10">
                <span className="material-symbols-outlined text-primary text-3xl">
                    {mode === 'LOGIN' ? 'lock_open' : 'person_add'}
                </span>
            </div>
            <h1 className="text-3xl font-serif italic font-bold text-slate-900 mb-2">
              {mode === 'LOGIN' ? t('Welcome Back', 'आपका स्वागत है') : t('Join the Beta', 'बीटा में शामिल हों')}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em] leading-relaxed">
              {mode === 'LOGIN' 
                ? t('Securely access your travel vault', 'अपनी यात्रा तिजोरी सुरक्षित रूप से खोलें')
                : t('Begin your journey as a master narrator', 'एक लेखक के रूप में अपनी यात्रा शुरू करें')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in shake duration-300">
              <span className="material-symbols-outlined text-red-500 text-lg">gpp_maybe</span>
              <p className="text-[11px] font-bold text-red-600 leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'SIGNUP' && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">{t('Full Name', 'पूरा नाम')}</label>
                <input 
                  required
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full bg-slate-50 border-slate-100 rounded-xl p-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">{t('Gmail Account', 'जीमेल खाता')}</label>
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full bg-slate-50 border-slate-100 rounded-xl p-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">{t('Password', 'पासवर्ड')}</label>
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-slate-100 rounded-xl p-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>

            <button 
              disabled={isLoading}
              type="submit"
              className="w-full h-16 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-[0.97] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex gap-1.5">
                  <div className="size-1.5 bg-white rounded-full animate-bounce"></div>
                  <div className="size-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="size-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              ) : (
                <span>{mode === 'LOGIN' ? t('Verify Identity', 'पहचान सत्यापित करें') : t('Create Account', 'खाता बनाएँ')}</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <button 
              type="button"
              onClick={() => { setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN'); setError(null); }}
              className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-primary transition-colors"
            >
              {mode === 'LOGIN' ? t("New customer? Join Beta", "नए ग्राहक? बीटा से जुड़ें") : t("Existing customer? Login", "पुराने ग्राहक? लॉगिन करें")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
