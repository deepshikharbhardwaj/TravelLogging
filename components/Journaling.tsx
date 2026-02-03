import React, { useState, useRef, useEffect } from 'react';
import { Trip, DayLog, Logistics, BlogSection, FoodLogistics, MealInfo, Language } from '../types';
import { transcribeAudio, processJournalEntry } from '../services/geminiService';

interface JournalingProps {
  trip: Trip;
  lang: Language;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onBack: () => void;
}

export const Journaling: React.FC<JournalingProps> = ({ trip, lang, onUpdateTrip, onBack }) => {
  const [activeDayIdx, setActiveDayIdx] = useState(Math.max(0, trip.days.length - 1));
  const activeDay = trip.days[activeDayIdx];

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);

  const t = (en: string, hi: string) => (lang === 'en' ? en : hi);

  // Helper to ensure Hindi words don't have spaces between characters
  const hiClass = lang === 'hi' ? 'hi-clean' : '';

  const [logistics, setLogistics] = useState<Logistics>(activeDay?.logistics || {
    hotelName: '', hotelCost: 0, transportMode: '', transportCost: 0
  });

  const [foodLog, setFoodLog] = useState<FoodLogistics>(activeDay?.foodLogistics || {
    breakfast: { name: '', cost: 0, restaurant: '' },
    lunch: { name: '', cost: 0, restaurant: '' },
    dinner: { name: '', cost: 0, restaurant: '' }
  });

  useEffect(() => {
    if (activeDay) {
      setLogistics(activeDay.logistics);
      setFoodLog(activeDay.foodLogistics);
    }
  }, [activeDayIdx, trip.days]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      clearInterval(interval);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleAudioProcessing(blob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording start error:", err);
      alert(t("Microphone access denied. Please check browser permissions.", "माइक्रोफोन एक्सेस की अनुमति नहीं है। कृपया ब्राउज़र सेटिंग्स चेक करें।"));
    }
  };

  const stopRecording = () => {
    // 1. Immediately update UI state for responsiveness
    setIsRecording(false);

    try {
      // 2. Stop the recorder if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // 3. Stop all media tracks to release the microphone (turn off red light)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping recording:", err);
    }
  };

  const handleAudioProcessing = async (audioBlob: Blob) => {
    if (!activeDay || audioBlob.size === 0) return;
    setIsProcessing(true);
    try {
      const transcript = await transcribeAudio(audioBlob);
      if (!transcript.trim()) {
        setIsProcessing(false);
        return;
      }

      const result = await processJournalEntry(transcript, activeDay.sections);

      const newSections: BlogSection[] = (result.sections || []).map((s, idx) => ({
        id: `section-${idx}-${Date.now()}`,
        paragraphEn: s.paragraph_en,
        paragraphHi: s.paragraph_hi,
        topic: s.topic,
        image: undefined
      }));

      let updatedTitle = trip.title;
      let updatedLocation = trip.location;
      if (trip.title === 'New Journey' && result.suggestedTitle) updatedTitle = result.suggestedTitle;
      if (trip.location === 'Unknown' && result.suggestedLocation) updatedLocation = result.suggestedLocation;

      const updatedDay: DayLog = {
        ...activeDay,
        rawTranscript: activeDay.rawTranscript + " " + transcript,
        sections: [...activeDay.sections, ...newSections],
        summary: result.summary || activeDay.summary,
        logistics: {
            hotelName: result.logistics?.hotelName || logistics.hotelName,
            hotelCost: result.logistics?.hotelCost || logistics.hotelCost,
            transportMode: result.logistics?.transportMode || logistics.transportMode,
            transportCost: result.logistics?.transportCost || logistics.transportCost,
        },
        foodLogistics: {
            breakfast: { ...foodLog.breakfast, ...result.foodLogistics?.breakfast },
            lunch: { ...foodLog.lunch, ...result.foodLogistics?.lunch },
            dinner: { ...foodLog.dinner, ...result.foodLogistics?.dinner },
        }
      };

      const newDays = [...trip.days];
      newDays[activeDayIdx] = updatedDay;
      onUpdateTrip({ ...trip, title: updatedTitle, location: updatedLocation, days: newDays });

    } catch (error) {
      console.error(error);
      alert(t("Failed to process journey. Please try again.", "यात्रा को प्रोसेस करने में विफल। कृपया पुन: प्रयास करें।"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogisticChange = (field: keyof Logistics, value: string | number) => {
    const newLogistics = { ...logistics, [field]: value };
    setLogistics(newLogistics);
    const newDays = [...trip.days];
    newDays[activeDayIdx] = { ...activeDay, logistics: newLogistics };
    onUpdateTrip({ ...trip, days: newDays });
  };

  const handleFoodChange = (meal: keyof FoodLogistics, field: keyof MealInfo, value: string | number) => {
    const newFoodLog = { ...foodLog, [meal]: { ...foodLog[meal], [field]: value } };
    setFoodLog(newFoodLog);
    const newDays = [...trip.days];
    newDays[activeDayIdx] = { ...activeDay, foodLogistics: newFoodLog };
    onUpdateTrip({ ...trip, days: newDays });
  };

  const handleImageUploadForSection = (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const newDays = [...trip.days];
            const currentDay = { ...newDays[activeDayIdx] };
            currentDay.sections = currentDay.sections.map(s => 
                s.id === sectionId ? { ...s, image: reader.result as string } : s
            );
            newDays[activeDayIdx] = currentDay;
            onUpdateTrip({...trip, days: newDays});
        };
        reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onloadend = () => {
            onUpdateTrip({ ...trip, coverImage: reader.result as string });
        };
        reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAddDay = () => {
    const newDayNum = trip.days.length + 1;
    const newDay: DayLog = {
      id: `day-${newDayNum}-${Date.now()}`,
      dayNumber: newDayNum,
      rawTranscript: "",
      sections: [],
      summary: t("Starting a new adventure...", "एक नया रोमांच शुरू हो रहा है..."),
      logistics: { hotelName: "", hotelCost: 0, transportMode: "", transportCost: 0 },
      foodLogistics: {
        breakfast: { name: '', cost: 0, restaurant: '' },
        lunch: { name: '', cost: 0, restaurant: '' },
        dinner: { name: '', cost: 0, restaurant: '' }
      },
      isCompleted: false,
      date: new Date().toISOString()
    };
    onUpdateTrip({ ...trip, days: [...trip.days, newDay] });
    setActiveDayIdx(trip.days.length);
  };

  if (!activeDay) return null;

  const totalDailyCost = (
    (logistics.hotelCost || 0) + 
    (logistics.transportCost || 0) + 
    (foodLog.breakfast.cost || 0) + 
    (foodLog.lunch.cost || 0) + 
    (foodLog.dinner.cost || 0)
  );

  return (
    <div className="bg-[#fcfcfd] min-h-screen text-slate-900 flex flex-col font-display transition-all duration-700">
      <header className="sticky top-0 z-50 glass-morphism border-b border-slate-100">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto w-full">
          <button onClick={onBack} className="flex size-11 items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600">
            <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
          </button>
          
          <div className="text-center flex-1 mx-4 overflow-hidden">
            <h2 className={`text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400 truncate mb-1 ${hiClass}`}>{trip.title}</h2>
            <div className="flex items-center justify-center gap-2">
                <span className={`text-[9px] font-extrabold text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 tracking-widest uppercase ${hiClass}`}>
                    {trip.isPublic ? t('Public', 'सार्वजनिक') : t('Private', 'निजी')}
                </span>
                <span className="size-1 bg-slate-200 rounded-full"></span>
                <span className={`text-[9px] font-extrabold text-slate-400 uppercase tracking-widest ${hiClass}`}>{trip.location}</span>
            </div>
          </div>

          <button onClick={() => setShowSettings(!showSettings)} className={`flex size-11 items-center justify-center rounded-full transition-all duration-300 ${showSettings ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowSettings(false)}>
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white rounded-[2rem] editorial-shadow p-8 animate-in slide-in-from-top-10 duration-500" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-8">
                    <h3 className={`text-sm font-bold uppercase tracking-[0.3em] text-slate-400 ${hiClass}`}>{t('Chronicle Settings', 'सेटिंग्स')}</h3>
                    <button onClick={() => setShowSettings(false)} className="size-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 ${hiClass}`}>{t('Vault Cover Art', 'कवर फोटो')}</label>
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 group shadow-inner">
                            <img src={trip.coverImage} className="w-full h-full object-cover" alt="cover" />
                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer text-white">
                                <span className="material-symbols-outlined text-2xl mb-2">upload_file</span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${hiClass}`}>{t('Update Art', 'बदलें')}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest block ${hiClass}`}>{t('Trip Title', 'नाम')}</label>
                            <input value={trip.title} onChange={(e) => onUpdateTrip({...trip, title: e.target.value})} className="w-full bg-slate-50 border-slate-100 rounded-xl text-xs font-bold p-3.5 focus:bg-white focus:ring-primary focus:border-primary transition-all outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest block ${hiClass}`}>{t('Base City', 'शहर')}</label>
                            <input value={trip.location} onChange={(e) => onUpdateTrip({...trip, location: e.target.value})} className="w-full bg-slate-50 border-slate-100 rounded-xl text-xs font-bold p-3.5 focus:bg-white focus:ring-primary focus:border-primary transition-all outline-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 gap-10 pb-44 animate-in fade-in duration-1000">
        
        <div className="mt-8 flex flex-col gap-6">
            <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2 items-center">
                {trip.days.map((day, idx) => (
                    <div key={day.id} onClick={() => setActiveDayIdx(idx)} className="shrink-0 transition-all duration-300">
                        <button className={`h-11 px-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-sm transition-all duration-500 ${idx === activeDayIdx ? 'bg-slate-900 text-white scale-105 shadow-xl shadow-slate-900/20' : 'bg-white border border-slate-100 text-slate-400 hover:text-slate-600'} ${lang === 'en' ? 'uppercase tracking-[0.2em]' : hiClass}`}>
                            {t(`Day ${day.dayNumber}`, `दिन ${day.dayNumber}`)}
                        </button>
                    </div>
                ))}
                <button onClick={handleAddDay} className="h-11 w-11 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0 hover:border-primary hover:text-primary transition-all duration-300 text-slate-300 bg-white/50">
                    <span className="material-symbols-outlined text-lg">add</span>
                </button>
            </div>
        </div>

        <section className="flex flex-col items-center py-4">
          <div className="relative flex items-center justify-center size-44">
            {isRecording && <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping"></div>}
            <button 
                onClick={isRecording ? stopRecording : startRecording} 
                disabled={isProcessing}
                className={`relative z-10 flex size-28 items-center justify-center rounded-full shadow-2xl transition-all duration-500 active:scale-90 ${isProcessing ? 'bg-slate-100' : isRecording ? 'bg-red-500 scale-110' : 'bg-white group hover:shadow-primary/20 border border-slate-50'}`}
            >
              {isProcessing ? (
                  <div className="flex gap-1 items-center">
                      <div className="size-1.5 bg-primary rounded-full animate-bounce"></div>
                      <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
              ) : (
                <span className={`material-symbols-outlined !text-4xl transition-all ${isRecording ? 'text-white' : 'text-primary group-hover:scale-110'}`}>
                    {isRecording ? 'stop_circle' : 'mic_none'}
                </span>
              )}
            </button>
          </div>
          
          <div className="text-center mt-8 px-6 space-y-2">
            <h3 className={`text-2xl font-serif italic font-bold text-slate-900 tracking-tight ${hiClass}`}>
                {isProcessing ? t("Transcribing Memoir...", "यादों को लिख रहे हैं...") : isRecording ? t("Recording Moment...", "पल रिकॉर्ड हो रहे हैं...") : t("Tell your story", "अपनी कहानी सुनाएं")}
            </h3>
            <p className={`text-slate-400 font-bold leading-relaxed transition-all duration-1000 ${lang === 'en' ? 'text-[10px] uppercase tracking-[0.3em]' : 'text-xs ' + hiClass}`}>
                {isRecording ? formatTime(recordingTime) : (activeDay.summary || t("Tap the mic to begin narrating today's journey", "आज का सफर सुनाने के लिए माइक दबाएं"))}
            </p>
          </div>
        </section>

        {activeDay.sections.map((section, idx) => (
          <section key={section.id} className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-white rounded-[2.5rem] p-10 editorial-shadow border border-slate-50 relative group overflow-hidden transition-all duration-500 hover:border-primary/10">
                <div className="flex items-center gap-3 mb-8">
                    <span className={`font-black text-slate-300 ${lang === 'en' ? 'text-[9px] uppercase tracking-[0.4em]' : 'text-[10px] ' + hiClass}`}>
                      {t(`Section 0${idx + 1}`, `भाग ०${idx + 1}`)}
                    </span>
                    <div className="h-px flex-1 bg-slate-50"></div>
                    <span className={`font-black text-primary/40 ${lang === 'en' ? 'text-[9px] uppercase tracking-[0.2em]' : 'text-[10px] ' + hiClass}`}>
                      {section.topic}
                    </span>
                </div>
                <article className={`text-slate-800 leading-[1.8] text-[20px] antialiased ${lang === 'en' ? 'font-serif italic' : 'font-hi-body not-italic'}`}>
                    {lang === 'en' ? section.paragraphEn : section.paragraphHi}
                </article>
            </div>

            <div className="px-2">
                {section.image ? (
                    <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-[8px] border-white group editorial-shadow">
                        <img src={section.image} className="w-full aspect-[4/3] object-cover transition-transform duration-[2s] ease-out group-hover:scale-110" alt={section.topic} />
                        <label className="absolute bottom-8 right-8 bg-white/95 backdrop-blur-md size-14 rounded-full flex items-center justify-center cursor-pointer shadow-2xl hover:bg-white transition-all hover:scale-110 active:scale-95 group/btn">
                            <span className="material-symbols-outlined text-slate-800 text-2xl group-hover/btn:rotate-180 transition-transform duration-500">sync</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUploadForSection(section.id, e)} />
                        </label>
                    </div>
                ) : (
                    <label className="w-full aspect-[4/3] rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white hover:border-primary hover:editorial-shadow transition-all group p-10 text-center shadow-inner">
                        <div className="size-24 rounded-full bg-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-primary/20 transition-all duration-500">
                            <span className="material-symbols-outlined !text-4xl text-slate-300 group-hover:text-primary">add_photo_alternate</span>
                        </div>
                        <div className="space-y-2">
                            <p className={`font-bold text-slate-500 ${lang === 'en' ? 'text-[11px] uppercase tracking-[0.2em]' : 'text-xs ' + hiClass}`}>
                              {t(`Capture ${section.topic}`, `${section.topic} का चित्र जोड़ें`)}
                            </p>
                            <p className={`text-slate-300 ${lang === 'en' ? 'text-[9px] uppercase tracking-widest' : 'text-[10px] ' + hiClass}`}>
                              {t('Tap to add visual memory', 'यादें जोड़ने के लिए छुएं')}
                            </p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUploadForSection(section.id, e)} />
                    </label>
                )}
            </div>
          </section>
        ))}

        <section className="bg-white rounded-[3rem] p-10 editorial-shadow border border-slate-50 space-y-12">
            <div>
                <div className="flex items-center gap-4 mb-10">
                    <div className="size-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
                        <span className="material-symbols-outlined text-white text-lg">local_shipping</span>
                    </div>
                    <div>
                        <h4 className={`font-black text-slate-900 ${lang === 'en' ? 'text-[11px] uppercase tracking-[0.3em]' : 'text-xs ' + hiClass}`}>
                          {t('Core Logistics', 'मुख्य यात्रा खर्च')}
                        </h4>
                        <p className={`text-slate-400 font-bold ${lang === 'en' ? 'text-[9px] uppercase tracking-widest' : 'text-[10px] ' + hiClass}`}>
                          {t('Hotel & Transit Details', 'होटल और आवागमन विवरण')}
                        </p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-sm">
                        <div className="flex flex-col gap-2">
                            <label className={`font-black text-slate-400 ${lang === 'en' ? 'text-[9px] uppercase tracking-widest' : 'text-[10px] ' + hiClass}`}>
                              {t('The Stay', 'ठहरना')}
                            </label>
                            <input 
                                type="text" 
                                placeholder={t("Hotel / Resort Name", "होटल का नाम")} 
                                value={logistics.hotelName} 
                                onChange={(e) => handleLogisticChange('hotelName', e.target.value)} 
                                className="w-full bg-transparent border-0 border-b border-slate-200 py-3 text-sm font-bold focus:ring-0 focus:border-primary transition-all" 
                            />
                            <div className="flex items-center text-primary mt-2">
                                <span className="text-sm font-black mr-2">₹</span>
                                <input 
                                    type="number" 
                                    placeholder={t("Cost", "खर्च")} 
                                    value={logistics.hotelCost || ''} 
                                    onChange={(e) => handleLogisticChange('hotelCost', parseFloat(e.target.value) || 0)} 
                                    className="w-full bg-transparent border-0 py-1 text-base font-black focus:ring-0" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-sm">
                        <div className="flex flex-col gap-2">
                            <label className={`font-black text-slate-400 ${lang === 'en' ? 'text-[9px] uppercase tracking-widest' : 'text-[10px] ' + hiClass}`}>
                              {t('The Transit', 'आवागमन')}
                            </label>
                            <input 
                                type="text" 
                                placeholder={t("Taxi / Train / Flight", "टैक्सी / ट्रेन / हवाई जहाज")} 
                                value={logistics.transportMode} 
                                onChange={(e) => handleLogisticChange('transportMode', e.target.value)} 
                                className="w-full bg-transparent border-0 border-b border-slate-200 py-3 text-sm font-bold focus:ring-0 focus:border-primary transition-all" 
                            />
                            <div className="flex items-center text-primary mt-2">
                                <span className="text-sm font-black mr-2">₹</span>
                                <input 
                                    type="number" 
                                    placeholder={t("Cost", "खर्च")} 
                                    value={logistics.transportCost || ''} 
                                    onChange={(e) => handleLogisticChange('transportCost', parseFloat(e.target.value) || 0)} 
                                    className="w-full bg-transparent border-0 py-1 text-base font-black focus:ring-0" 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
                <div className="flex items-center gap-4 mb-10">
                    <div className="size-10 rounded-2xl bg-accent-gold flex items-center justify-center shadow-lg shadow-accent-gold/20">
                        <span className="material-symbols-outlined text-white text-lg">restaurant</span>
                    </div>
                    <div>
                        <h4 className={`font-black text-slate-900 ${lang === 'en' ? 'text-[11px] uppercase tracking-[0.3em]' : 'text-xs ' + hiClass}`}>
                          {t('Culinary Logistics', 'खान-पान का खर्च')}
                        </h4>
                        <p className={`text-slate-400 font-bold ${lang === 'en' ? 'text-[9px] uppercase tracking-widest' : 'text-[10px] ' + hiClass}`}>
                          {t('Restaurants & Meal Items', 'भोजनालय और व्यंजन विवरण')}
                        </p>
                    </div>
                </div>
                
                <div className="space-y-6">
                    {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                        <div key={meal} className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100/50 group transition-all hover:bg-white hover:editorial-shadow">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-accent-gold opacity-60 group-hover:opacity-100 transition-opacity">
                                        {meal === 'breakfast' ? 'coffee' : meal === 'lunch' ? 'lunch_dining' : 'dinner_dining'}
                                    </span>
                                    <span className={`font-black text-slate-400 group-hover:text-slate-900 transition-colors ${lang === 'en' ? 'text-[11px] uppercase tracking-[0.2em]' : 'text-xs ' + hiClass}`}>
                                        {t(meal.charAt(0).toUpperCase() + meal.slice(1), 
                                           meal === 'breakfast' ? 'नाश्ता' : meal === 'lunch' ? 'दोपहर का भोजन' : 'रात का खाना')}
                                    </span>
                                </div>
                                <div className="flex items-center text-primary bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                                    <span className="text-xs font-black mr-2">₹</span>
                                    <input 
                                        type="number" 
                                        placeholder="0"
                                        value={foodLog[meal].cost || ''} 
                                        onChange={(e) => handleFoodChange(meal, 'cost', parseFloat(e.target.value) || 0)} 
                                        className="w-20 bg-transparent border-0 p-0 text-right focus:ring-0 font-black"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className={`font-black text-slate-300 ml-2 ${lang === 'en' ? 'text-[8px] uppercase tracking-[0.2em]' : 'text-[10px] ' + hiClass}`}>
                                      {t('Meal Item', 'व्यंजन')}
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder={t("What did you eat?", "क्या खाया?")} 
                                        value={foodLog[meal].name} 
                                        onChange={(e) => handleFoodChange(meal, 'name', e.target.value)} 
                                        className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 shadow-sm outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`font-black text-slate-300 ml-2 ${lang === 'en' ? 'text-[8px] uppercase tracking-[0.2em]' : 'text-[10px] ' + hiClass}`}>
                                      {t('Restaurant Name', 'भोजनालय का नाम')}
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-300">location_on</span>
                                        <input 
                                            type="text" 
                                            placeholder={t("Where was this?", "कहाँ खाया?")} 
                                            value={foodLog[meal].restaurant} 
                                            onChange={(e) => handleFoodChange(meal, 'restaurant', e.target.value)} 
                                            className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 shadow-sm outline-none text-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-10 border-t border-slate-200 flex justify-between items-center">
                <div className="flex flex-col gap-1">
                    <span className={`font-black text-slate-300 ${lang === 'en' ? 'text-[10px] uppercase tracking-[0.3em]' : 'text-[11px] ' + hiClass}`}>
                      {t(`Daily Ledger Total`, `आज का कुल खर्च`)}
                    </span>
                    <span className="text-4xl font-serif italic font-bold text-slate-900">
                        ₹{totalDailyCost.toLocaleString('en-IN')}
                    </span>
                </div>
                <div className={`px-5 py-2.5 rounded-full bg-green-50 text-green-600 font-black border border-green-100 ${lang === 'en' ? 'text-[9px] uppercase tracking-[0.2em]' : 'text-[10px] ' + hiClass}`}>
                    {t('Verified Balance', 'सत्यापित शेष')}
                </div>
            </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 glass-morphism p-6 pb-12 border-t border-slate-100 z-40">
        <div className="max-w-md mx-auto w-full">
          <button onClick={onBack} className={`w-full h-16 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-[0.97] ${lang === 'en' ? 'text-[11px] uppercase tracking-[0.4em]' : 'text-sm ' + hiClass}`}>
            <span>{t('Archive to Vault', 'संग्रह में सुरक्षित करें')}</span>
            <span className="material-symbols-outlined !text-xl">cloud_sync</span>
          </button>
        </div>
      </div>
    </div>
  );
};