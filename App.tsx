
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  Plus, X, ChefHat, 
  Loader2, 
  BookOpen,
  ArrowRight,
  Search, Trash2,
  Sparkles,
  CalendarDays,
  Utensils,
  Clock,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Pencil
} from 'lucide-react';
import { generateRecipe } from './services/geminiService';
import { Recipe, WeeklyPlan, DayId, DAYS, MealItem } from './types';
import { RecipeModal } from './components/RecipeModal';

const INITIAL_DISHES = [
  "Linsgryta med kokosmjölk", 
  "Krämig svamppasta", 
  "Tofu Bowl med jordnötssås", 
  "Hemgjorda köttbullar", 
  "Lax med ugnsrostad potatis", 
  "Halloumiburgare", 
  "Carbonara", 
  "Ugnsbakad falukorv",
  "Pannkakor",
  "Chili sin carne"
];

const SearchInput = memo(({ onSearch }: { onSearch: (val: string) => void }) => {
  const [localVal, setLocalVal] = useState("");
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    onSearch(val);
  };
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input 
        value={localVal}
        onChange={handleChange}
        placeholder="Sök i matbanken..." 
        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-amber-100 outline-none focus:border-amber-400 transition-all shadow-sm placeholder:text-slate-400"
      />
    </div>
  );
});

const AddDishInput = memo(({ onAdd, placeholder }: { onAdd: (val: string) => void, placeholder?: string }) => {
  const [localVal, setLocalVal] = useState("");
  const handleAdd = () => {
    if (localVal.trim()) {
      onAdd(localVal.trim());
      setLocalVal("");
    }
  };
  return (
    <div className="flex gap-2">
      <input 
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder={placeholder || "Ny favorit..."} 
        className="flex-grow bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-amber-100 outline-none focus:border-amber-400 transition-all shadow-sm"
      />
      <button 
        type="button"
        onClick={handleAdd}
        className="bg-amber-500 text-white px-3.5 rounded-xl hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-amber-100"
        disabled={!localVal.trim()}
      >
        <Plus size={20} />
      </button>
    </div>
  );
});

export default function App() {
  const [dishBank, setDishBank] = useState<string[]>(() => {
    const saved = localStorage.getItem('smakresa_dishbank');
    return saved ? JSON.parse(saved) : INITIAL_DISHES;
  });

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(() => {
    const saved = localStorage.getItem('smakresa_weeklyplan');
    return saved ? JSON.parse(saved) : { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileBank, setShowMobileBank] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [portions, setPortions] = useState(4);
  const [isMagicFilling, setIsMagicFilling] = useState(false);
  const [activeSelectionDish, setActiveSelectionDish] = useState<string | null>(null);
  const [customDishDay, setCustomDishDay] = useState<DayId | null>(null);
  const [editingDish, setEditingDish] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('smakresa_dishbank', JSON.stringify(dishBank));
  }, [dishBank]);

  useEffect(() => {
    localStorage.setItem('smakresa_weeklyplan', JSON.stringify(weeklyPlan));
  }, [weeklyPlan]);

  const handleAddToBank = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || dishBank.includes(trimmed)) return;
    setDishBank(prev => [trimmed, ...prev]);
  };

  const performRemoveFromBank = useCallback((name: string) => {
    if (window.confirm(`Vill du ta bort "${name}" från matbanken?`)) {
      setDishBank(prev => prev.filter(d => d !== name));
      if (activeSelectionDish === name) setActiveSelectionDish(null);
      // Close mobile drawer if we are in the "selection" view of the deleted dish
      setShowMobileBank(false);
    }
  }, [activeSelectionDish]);

  const handleEditDish = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingDish(null);
      return;
    }
    setDishBank(prev => prev.map(d => d === oldName ? trimmed : d));
    setWeeklyPlan(prev => {
      const next = { ...prev };
      (Object.keys(next) as DayId[]).forEach(day => {
        next[day] = next[day].map(item => item.name === oldName ? { ...item, name: trimmed } : item);
      });
      return next;
    });
    setEditingDish(null);
  };

  const handleAddDishToDay = (dayId: DayId, name: string) => {
    const newItem: MealItem = { id: Math.random().toString(36).substr(2, 9), name };
    setWeeklyPlan(prev => ({ ...prev, [dayId]: [...prev[dayId], newItem] }));
    setActiveSelectionDish(null);
    setShowMobileBank(false);
  };

  const handleRemoveDishFromDay = (dayId: DayId, itemId: string) => {
    setWeeklyPlan(prev => ({ ...prev, [dayId]: prev[dayId].filter(i => i.id !== itemId) }));
  };

  const handleResetWeek = () => {
    if (window.confirm("Vill du rensa hela veckans planering?")) {
      setWeeklyPlan({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    }
  };

  const handleMagicFill = useCallback(() => {
    if (dishBank.length === 0) return;
    setIsMagicFilling(true);
    
    setTimeout(() => {
      const availableDishes = [...dishBank];
      const shuffled = availableDishes.sort(() => 0.5 - Math.random());
      const newPlan: WeeklyPlan = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
      
      DAYS.forEach((day, index) => {
        const dishName = shuffled[index % shuffled.length];
        if (dishName) {
           newPlan[day.id] = [{ 
             id: Math.random().toString(36).substr(2, 9), 
             name: dishName 
           }];
        }
      });
      
      setWeeklyPlan(newPlan);
      setIsMagicFilling(false);
    }, 600);
  }, [dishBank]);

  const handleOpenRecipe = async (dishName: string) => {
    setIsRecipeLoading(true);
    setSelectedRecipe(null);
    try {
      const recipe = await generateRecipe(dishName, portions);
      setSelectedRecipe(recipe);
    } catch (e) { console.error(e); } finally { setIsRecipeLoading(false); }
  };

  const filteredBank = useMemo(() => {
    return dishBank
      .filter(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'sv'));
  }, [dishBank, searchTerm]);

  const currentDayInfo = useMemo(() => {
    const now = new Date();
    const dayIndex = now.getDay();
    return DAYS.find(d => d.dayIndex === dayIndex);
  }, []);

  const todayMeals = currentDayInfo ? weeklyPlan[currentDayInfo.id] : [];

  return (
    <div className="min-h-screen pb-24 bg-[#FFFEF9]">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-amber-50 py-3 sm:py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 p-2 rounded-xl text-white shadow-sm ring-4 ring-amber-50">
              <ChefHat size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 leading-none">Veckans mat</h1>
              <p className="hidden sm:block text-[9px] font-bold text-amber-500 tracking-widest mt-0.5 uppercase">Planera smart</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleResetWeek}
              className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
              title="Rensa veckan"
            >
              <RotateCcw size={18} />
            </button>
            <button 
              type="button"
              onClick={handleMagicFill}
              disabled={isMagicFilling || dishBank.length === 0}
              className="bg-slate-900 text-white p-2.5 sm:px-5 sm:py-2.5 rounded-xl hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-slate-100"
            >
              {isMagicFilling ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-amber-300" />}
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">Slumpa veckan</span>
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 mt-4">
        <div className="bg-amber-50 rounded-[1.5rem] p-5 sm:p-8 text-amber-900 border border-amber-100 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white rounded-full opacity-40 blur-3xl"></div>
          
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/70">Idag: {currentDayInfo?.label}</h2>
          </div>

          {todayMeals.length > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-black truncate leading-tight">
                  {todayMeals[0].name}
                </p>
                <div className="flex items-center gap-4 text-amber-700/60 text-[11px] font-bold uppercase tracking-wider mt-2">
                   <div className="flex items-center gap-1.5"><Clock size={14} /> Snabbt</div>
                   <div className="flex items-center gap-1.5"><Utensils size={14} /> {portions} pers</div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => handleOpenRecipe(todayMeals[0].name)}
                className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all hover:bg-amber-600 active:scale-95 shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Visa recept <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 relative z-10 py-1">
              <p className="text-sm font-bold text-amber-400 italic">Inget planerat ännu...</p>
              <button 
                type="button"
                onClick={() => setCustomDishDay(currentDayInfo?.id as DayId)}
                className="bg-white/50 hover:bg-white text-amber-600 border border-amber-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Planera nu
              </button>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center gap-2 px-1">
             <CalendarDays size={16} className="text-amber-400" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Veckans meny</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-2.5">
            {DAYS.map(day => {
              const today = currentDayInfo?.id === day.id;
              const meals = weeklyPlan[day.id] || [];

              return (
                <div 
                  key={day.id} 
                  className={`bg-white rounded-[1.25rem] p-4 sm:p-5 border transition-all shadow-sm group ${today ? 'border-amber-300 ring-4 ring-amber-50' : 'border-slate-100'}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-bold uppercase tracking-tight ${today ? 'text-amber-600' : 'text-slate-800'}`}>
                        {day.label}
                      </h3>
                      {today && (
                        <span className="bg-amber-100 text-amber-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">Idag</span>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => setCustomDishDay(day.id)}
                      className="text-slate-300 hover:text-amber-500 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {meals.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => handleOpenRecipe(item.name)}
                        className="bg-slate-50/50 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-amber-50/50 border border-transparent hover:border-amber-100 transition-all group/meal"
                      >
                        <span className="font-semibold text-sm sm:text-base text-slate-700 truncate pr-3">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDishFromDay(day.id, item.id);
                            }} 
                            className="text-slate-300 hover:text-red-400 opacity-0 group-hover/meal:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={16} className="text-slate-200" />
                        </div>
                      </div>
                    ))}

                    {meals.length === 0 && (
                      <button 
                        type="button"
                        className="w-full py-2.5 border border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-300 hover:border-amber-200 hover:text-amber-400 hover:bg-amber-50/20 transition-all font-bold text-[10px] uppercase tracking-wider"
                        onClick={() => {
                          setShowMobileBank(true);
                          setActiveSelectionDish(null);
                        }}
                      >
                        <Plus size={14} /> Lägg till
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:block lg:col-span-4">
          <div className="bg-white rounded-[1.5rem] p-6 border border-slate-100 sticky top-24 h-[calc(100vh-120px)] flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-amber-400" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Matbanken</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-300">{filteredBank.length} rätter</span>
            </div>
            
            <div className="space-y-3 mb-6">
              <SearchInput onSearch={setSearchTerm} />
              <AddDishInput onAdd={handleAddToBank} />
            </div>

            <div className="overflow-y-auto flex-grow space-y-1.5 pr-1 custom-scrollbar">
              {filteredBank.map(name => (
                <div key={name} className="relative group/bank">
                  <div 
                    onClick={() => setActiveSelectionDish(activeSelectionDish === name ? null : name)}
                    className={`bg-white border p-3 rounded-xl flex items-center justify-between hover:border-amber-200 cursor-pointer transition-all ${activeSelectionDish === name ? 'border-amber-400 bg-amber-50/10' : 'border-slate-50'}`}
                  >
                    <span className="font-semibold text-sm text-slate-600 group-hover/bank:text-slate-900 truncate pr-2">{name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 opacity-0 group-hover/bank:opacity-100 transition-opacity">
                         <button 
                           type="button"
                           onClick={(e) => { e.stopPropagation(); setEditingDish(name); }}
                           className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
                         >
                            <Pencil size={14} />
                         </button>
                         <button 
                           type="button"
                           onClick={(e) => { e.stopPropagation(); performRemoveFromBank(name); }}
                           className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                         >
                            <Trash2 size={14} />
                         </button>
                      </div>
                      <ArrowRight size={14} className={`text-slate-100 transition-all ${activeSelectionDish === name ? 'rotate-90 text-amber-400' : 'group-hover/bank:text-amber-400'}`} />
                    </div>
                  </div>
                  
                  {activeSelectionDish === name && (
                    <div className="mt-1.5 p-2 bg-slate-50 rounded-xl grid grid-cols-4 gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {DAYS.map(day => (
                        <button 
                          type="button"
                          key={day.id} 
                          onClick={() => handleAddDishToDay(day.id, name)}
                          className="p-1.5 text-[9px] font-black uppercase tracking-wider bg-white border border-slate-100 hover:bg-amber-500 hover:text-white rounded-lg transition-all"
                        >
                          {day.label.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <RecipeModal 
        recipe={selectedRecipe}
        loading={isRecipeLoading}
        portions={portions}
        onPortionsChange={setPortions}
        onClose={() => {
          setSelectedRecipe(null);
          setIsRecipeLoading(false);
          setPortions(4);
        }}
      />

      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40">
        <button 
          type="button"
          onClick={() => {
            setShowMobileBank(true);
            setActiveSelectionDish(null);
          }} 
          className="h-12 px-6 bg-slate-900 text-white rounded-xl shadow-xl flex items-center gap-3 active:scale-90 transition-transform ring-4 ring-white"
        >
          <BookOpen size={18} className="text-amber-400" />
          <span className="font-black uppercase tracking-widest text-[10px]">Matbanken</span>
        </button>
      </div>

      {showMobileBank && (
        <div className="fixed inset-0 z-[150] lg:hidden animate-in fade-in duration-300">
             <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowMobileBank(false)}></div>
             <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-[2rem] p-5 shadow-2xl flex flex-col border-t border-amber-50 overflow-hidden">
                
                {activeSelectionDish ? (
                  <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setActiveSelectionDish(null)} className="p-2 bg-slate-50 rounded-lg text-slate-500">
                          <ChevronLeft size={20} />
                        </button>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Välj dag: <span className="text-amber-500 block mt-1 lowercase truncate max-w-[150px]">{activeSelectionDish}</span></h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingDish(activeSelectionDish); }}
                          className="p-3 bg-slate-50 rounded-xl text-slate-400"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); performRemoveFromBank(activeSelectionDish); }}
                          className="p-3 bg-red-50 rounded-xl text-red-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2.5 overflow-y-auto pb-10">
                      {DAYS.map(day => (
                        <button 
                          type="button"
                          key={day.id} 
                          onClick={() => handleAddDishToDay(day.id, activeSelectionDish)}
                          className="p-5 bg-slate-50 hover:bg-amber-500 hover:text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all text-left flex justify-between items-center active:scale-95 shadow-sm"
                        >
                          {day.label}
                          <ArrowRight size={16} className="opacity-40" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full animate-in slide-in-from-left duration-300">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <BookOpen size={14} className="text-amber-400" /> Matbanken
                        </h3>
                        <button type="button" onClick={() => setShowMobileBank(false)} className="p-1.5 text-slate-300"><X size={22}/></button>
                    </div>
                    
                    <div className="space-y-3 mb-5">
                        <SearchInput onSearch={setSearchTerm} />
                        <AddDishInput onAdd={handleAddToBank} />
                    </div>

                    <div className="overflow-y-auto flex-grow space-y-2 pb-20 custom-scrollbar">
                        {filteredBank.map(name => (
                            <div 
                              key={name} 
                              onClick={() => setActiveSelectionDish(name)} 
                              className="bg-white border border-slate-100 p-4 rounded-xl flex items-center justify-between active:bg-amber-50 transition-all shadow-sm"
                            >
                                <span className="font-semibold text-sm text-slate-700">{name}</span>
                                <ArrowRight size={16} className="text-slate-200" />
                            </div>
                        ))}
                    </div>
                  </div>
                )}
             </div>
        </div>
      )}

      {customDishDay && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[200] flex items-center justify-center p-6" onClick={() => setCustomDishDay(null)}>
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 text-center shadow-xl border border-amber-50" onClick={e => e.stopPropagation()}>
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Planera {DAYS.find(d => d.id === customDishDay)?.label}</h3>
             <AddDishInput onAdd={(val) => { handleAddDishToDay(customDishDay, val); setCustomDishDay(null); }} />
             <button type="button" onClick={() => setCustomDishDay(null)} className="mt-4 text-[10px] font-bold text-slate-300 uppercase hover:text-slate-500">Avbryt</button>
          </div>
        </div>
      )}

      {editingDish && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[250] flex items-center justify-center p-6" onClick={() => setEditingDish(null)}>
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-xl border border-amber-50" onClick={e => e.stopPropagation()}>
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Ändra rätt i banken</h3>
             <div className="flex flex-col gap-4">
               <input 
                 autoFocus
                 defaultValue={editingDish}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditDish(editingDish, e.currentTarget.value);
                    if (e.key === 'Escape') setEditingDish(null);
                 }}
                 className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-amber-100 outline-none"
               />
               <div className="flex gap-2">
                 <button 
                  type="button"
                  onClick={() => setEditingDish(null)}
                  className="flex-1 py-3 text-xs font-black uppercase text-slate-300 hover:text-slate-400 transition-colors"
                 >
                   Avbryt
                 </button>
                 <button 
                  type="button"
                  onClick={(e) => {
                    const input = (e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement);
                    handleEditDish(editingDish, input.value);
                  }}
                  className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-xs font-black uppercase shadow-md shadow-amber-100"
                 >
                   Spara
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
