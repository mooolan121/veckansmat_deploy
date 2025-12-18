
import React, { useEffect, useRef } from 'react';
import { X, Users, Clock, Flame, Loader2, UtensilsCrossed, ChefHat, Eye } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeModalProps {
  recipe: Recipe | null;
  loading: boolean;
  portions: number;
  onPortionsChange: (p: number) => void;
  onClose: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ 
  recipe, 
  loading, 
  portions, 
  onPortionsChange, 
  onClose 
}) => {
  const wakeLockRef = useRef<any>(null);

  // Screen Wake Lock implementation to prevent screen from sleeping while recipe is open
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && (recipe || loading)) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.debug('Wake Lock is active');
        } catch (err: any) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };

    requestWakeLock();

    // Re-request wake lock when visibility changes (e.g., user comes back to tab)
    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          wakeLockRef.current = null;
          console.debug('Wake Lock was released');
        });
      }
    };
  }, [recipe, loading]);

  if (!recipe && !loading) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[500] flex flex-col justify-end overflow-hidden" onClick={onClose}>
      {/* Drawer Container - Now with internal scroll for the WHOLE container */}
      <div 
        className="bg-[#FFFEF9] w-full max-w-4xl mx-auto h-[90vh] sm:h-[85vh] rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom-full duration-500 border-t-8 border-amber-400 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed Top Bar for the Drawer Handle */}
        <div className="w-full flex justify-center pt-3 pb-1 shrink-0 bg-inherit z-10">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* Scrollable Wrapper for the entire content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {/* Header Section */}
          <div className="bg-amber-50/50 px-6 sm:px-10 pb-8 pt-2 text-amber-900 relative">
            <button 
              onClick={onClose}
              className="absolute top-2 right-6 p-2 bg-white rounded-xl shadow-sm hover:bg-amber-100 text-amber-400 transition-colors z-20"
            >
              <X size={24} />
            </button>

            {loading ? (
               <div className="h-28 flex flex-col justify-center gap-4 mt-6">
                  <div className="h-10 w-2/3 bg-amber-100/50 rounded-xl animate-pulse"></div>
                  <div className="h-4 w-1/3 bg-amber-100/30 rounded-lg animate-pulse"></div>
               </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      <Eye size={12} />
                      <span className="text-[9px] font-black uppercase tracking-wider">Skärmen hålls vaken</span>
                   </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-6 pr-12">
                  {recipe?.dishName}
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-amber-100">
                    <Users size={18} className="text-amber-400" />
                    <div className="flex gap-1.5">
                      {[2, 4, 6].map(p => (
                        <button 
                          key={p} 
                          onClick={() => onPortionsChange(p)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${portions === p ? 'bg-amber-500 text-white shadow-md' : 'text-amber-300 hover:bg-amber-50'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  {recipe?.cookingTime && (
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-amber-100">
                      <Clock size={16} className="text-amber-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{recipe.cookingTime}</span>
                    </div>
                  )}
                  {recipe?.difficulty && (
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-amber-100">
                      <Flame size={16} className="text-amber-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{recipe.difficulty}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-6 sm:p-10 bg-white min-h-[50vh] pb-32">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4 text-center">
                <Loader2 className="animate-spin text-amber-400" size={48} />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Skapar ditt recept...</p>
              </div>
            ) : recipe ? (
              <div className="space-y-12 max-w-3xl mx-auto">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <UtensilsCrossed size={18} className="text-amber-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ingredienser</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex justify-between items-center text-sm shadow-sm hover:border-amber-100 transition-colors">
                        <span className="text-slate-700 font-semibold">{ing.name}</span>
                        <span className="text-amber-600 font-bold bg-white px-3 py-1 rounded-lg border border-amber-50 min-w-[70px] text-center">
                          {ing.amount} {ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-6">
                     <ChefHat size={18} className="text-amber-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Gör så här</h4>
                  </div>
                  <div className="space-y-6">
                    {recipe.steps.map((step, i) => (
                      <div key={i} className="flex gap-5 group/step">
                        <div className="shrink-0 flex flex-col items-center">
                          <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 group-hover/step:bg-amber-500 group-hover/step:text-white flex items-center justify-center text-xs font-black transition-all shadow-sm">
                            {i + 1}
                          </span>
                          {i < recipe.steps.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-100 mt-2"></div>
                          )}
                        </div>
                        <p className="text-base leading-relaxed text-slate-600 pb-6">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
