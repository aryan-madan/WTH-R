import React, { useEffect, useState, useRef, useMemo } from 'react';
import { get, locate, search } from './services/api';
import { msg } from './data';
import { Weather, Place } from './types';
import { Search as SearchIcon, X, MapPin, Plus } from 'lucide-react';

const Home: React.FC = () => {
  const [data, setData] = useState<Weather | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [time, setTime] = useState<string>('');
  const [systemDark, setSystemDark] = useState<boolean>(false);
  
  // toggle between the main weather view and the search/saved view
  const [view, setView] = useState<'weather' | 'search'>('weather');
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchTimeout = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // initialize saved places from local storage
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => {
    try {
      const saved = localStorage.getItem('WTHR-saved');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItem, setMenuItem] = useState<{ place: Place, type: 'save' | 'delete' } | null>(null);
  const longPressTimer = useRef<any>(null);
  const isLongPress = useRef(false);

  const touchStartY = useRef<number | null>(null);

  // detect system theme preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // persist saved places to local storage
  useEffect(() => {
    localStorage.setItem('WTHR-saved', JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  // handle keyboard navigation for desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view === 'weather' && e.key === 'ArrowUp') {
        setView('search');  
      }
      if (view === 'search') {
          if (e.key === 'Escape' || e.key === 'ArrowDown') {
            if (menuOpen) {
                closeMenu();
            } else if (query && e.key === 'Escape') {
                setQuery('');
                setResults([]);
            } else {
                setView('weather');
                setIsSearchFocused(false);
            }
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, query, menuOpen]);

  // initial app load: get location and weather
  const init = async () => {
    try {
      setLoading(true);
      const loc = place || await locate();
      setPlace(loc);
      const res = await get(loc.lat, loc.lon);
      setData(res);
      setErr(null);
    } catch (e) {
      setErr('You broke it.');
    } finally {
      setLoading(false);
    }
  };

  // handle selecting a city from search or saved list
  const selectPlace = async (p: Place) => {
    try {
        setLoading(true);
        setView('weather');
        setQuery('');
        setResults([]);
        setIsSearchFocused(false);
        setPlace(p);
        const res = await get(p.lat, p.lon);
        setData(res);
    } catch (e) {
        setErr('You broke it.');
    } finally {
        setLoading(false);
    }
  };

  // debounce search input to prevent excessive api calls
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (!val.trim()) {
      setResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      const res = await search(val);
      setResults(res);
    }, 300);
  };

  // setup clock and initial fetch
  useEffect(() => {
    init();
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // track touch start for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  // handle swipe gestures for navigation
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    // swipe up to open search
    if (diff > 50 && view === 'weather') {
        setView('search');
    }

    // swipe down to close search
    if (diff < -50 && view === 'search' && !isSearchFocused && !menuOpen) {
        setView('weather');
    }

    touchStartY.current = null;
  };

  // logic to detect long press vs click
  const startLongPress = (p: Place, type: 'save' | 'delete') => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setMenuItem({ place: p, type });
      setMenuOpen(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (p: Place) => {
    if (isLongPress.current) return;
    selectPlace(p);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setTimeout(() => setMenuItem(null), 300); // clear after animation
  };

  // add or remove from saved places
  const confirmAction = () => {
    if (!menuItem) return;
    
    if (menuItem.type === 'save') {
      if (!savedPlaces.some(sp => sp.lat === menuItem.place.lat && sp.lon === menuItem.place.lon)) {
        setSavedPlaces([...savedPlaces, menuItem.place]);
      }
    } else {
      setSavedPlaces(savedPlaces.filter(sp => sp.lat !== menuItem.place.lat || sp.lon !== menuItem.place.lon));
    }
    closeMenu();
  };

  const txt = useMemo(() => {
    if (!data) return { head: "", sub: "" };
    const { current } = data;
    return msg(current.code, current.day, current.temp);
  }, [data]);

  // theme classes
  const bg = systemDark ? 'bg-black' : 'bg-white';
  const fg = systemDark ? 'text-white' : 'text-black';
  const subColor = systemDark ? 'text-neutral-500' : 'text-neutral-400';
  
  const searchBg = systemDark ? 'bg-zinc-900' : 'bg-zinc-100';
  const searchFg = systemDark ? 'text-white' : 'text-black';
  const searchSub = systemDark ? 'text-neutral-400' : 'text-neutral-500';
  const inputBg = systemDark ? 'bg-black' : 'bg-white';
  const inputFg = systemDark ? 'text-white' : 'text-black';

  if (loading || !data || !place) {
    return (
      <div className={`h-[100dvh] w-full flex items-center justify-center font-medium text-sm tracking-tight animate-pulse ${bg} ${fg}`}>
        Loading...
      </div>
    );
  }

  if (err) {
    return (
      <div className={`h-[100dvh] w-full flex flex-col items-center justify-center p-6 ${bg} ${fg}`}>
        <h1 className="text-6xl font-bold tracking-tighter mb-4">Seriously?</h1>
        <p className="text-sm font-medium mb-8 opacity-60">{err}</p>
        <button onClick={() => init()} className="px-6 py-3 bg-neutral-900 text-white rounded-full text-sm font-bold tracking-wide active:scale-95 transition-transform">Try again</button>
      </div>
    );
  }

  const { current } = data;
  
  const showSaved = query.length === 0;
  const listToDisplay = showSaved ? savedPlaces : results;

  return (
    <div 
        className={`h-[100dvh] w-full overflow-hidden relative theme-transition ${bg} ${fg}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
    >
      
      <div 
        className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-8 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${view === 'search' ? '-translate-y-[20%] opacity-50 scale-95' : 'translate-y-0 opacity-100 scale-100'}`}
      >
          <header className="relative z-10 flex justify-between items-start h-12 select-none">
            <button 
                onClick={() => init()} 
                className="flex items-center gap-2 group active:opacity-60 transition-opacity"
            >
                <MapPin className={`w-5 h-5 ${fg} opacity-50 group-hover:opacity-100 transition-opacity`} />
                <span className="text-xl font-bold tracking-tight truncate max-w-[200px] leading-none pt-1">
                    {place.name}
                </span>
            </button>
          </header>

          <main className="flex-1 flex flex-col justify-center items-start sm:items-center w-full z-0">
            <div key={txt.head} className="max-w-5xl w-full animate-blur">
                <h1 className="text-[13vw] sm:text-[9vw] font-bold tracking-tighter leading-[0.85] text-left sm:text-center break-words -ml-[0.05em] sm:ml-0 selection:bg-red-500 selection:text-white">
                {txt.head}
                </h1>
                <p className={`mt-6 text-xl sm:text-3xl font-medium tracking-tight text-left sm:text-center ${subColor} max-w-2xl sm:mx-auto leading-tight`}>
                {txt.sub}
                </p>
            </div>
          </main>

          <footer className="w-full flex items-end justify-between relative z-10 select-none">
            <div className="flex flex-col">
                <span className={`text-[10px] uppercase tracking-widest ${subColor} mb-1 font-bold`}>Temp</span>
                <span className="text-7xl sm:text-9xl font-bold tracking-tighter leading-[0.8] -ml-2">
                {Math.round(current.temp)}°
                </span>
            </div>

            <div className="flex flex-col items-end text-right">
                <span className={`text-[10px] uppercase tracking-widest ${subColor} mb-1 font-bold`}>Time</span>
                <span className="text-3xl font-bold tracking-tighter">
                {time}
                </span>
                <span className={`text-xs mt-1 font-medium ${subColor}`}>
                    {current.day ? 'Day' : 'Night'}
                </span>
            </div>
          </footer>
      </div>

      <div 
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500 ${view === 'search' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setView('weather')}
      />

      <div 
        className={`fixed bottom-0 left-0 right-0 h-[93dvh] flex flex-col z-40 ${searchBg} ${searchFg} rounded-t-[2.5rem] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${view === 'search' ? 'translate-y-0' : 'translate-y-[100%]'}`}
        onClick={(e) => e.stopPropagation()}
      >
          <div className="w-12 h-1.5 bg-neutral-500/20 rounded-full mx-auto mt-4 mb-2 shrink-0" />

          <div className="flex-1 overflow-y-auto px-6 mt-4 pb-32">
             <div className="flex flex-col gap-2">
                {query.length > 0 && results.length === 0 && (
                     <div className={`text-lg font-medium ${searchSub} p-2`}>No results found.</div>
                )}

                {query.length === 0 && savedPlaces.length === 0 && (
                     <div className={`text-lg font-medium ${searchSub} p-2 opacity-60`}>
                        Search for a city and long-press to save it to your list.
                     </div>
                )}
                
                {listToDisplay.map((r, i) => (
                    <button 
                        key={`${r.lat}-${r.lon}-${i}`}
                        onMouseDown={() => startLongPress(r, showSaved ? 'delete' : 'save')}
                        onMouseUp={clearLongPress}
                        onMouseLeave={clearLongPress}
                        onTouchStart={() => startLongPress(r, showSaved ? 'delete' : 'save')}
                        onTouchEnd={clearLongPress}
                        onClick={() => handleItemClick(r)}
                        className={`w-full group py-4 border-b ${systemDark ? 'border-neutral-800' : 'border-neutral-200'} last:border-0 active:scale-[0.98] transition-all duration-200 select-none`}
                    >
                        <div className="flex justify-between items-center">
                             <span className={`text-3xl sm:text-4xl font-bold tracking-tight text-left ${searchFg} opacity-90 group-hover:opacity-100 transition-opacity`}>{r.name}</span>
                        </div>
                        <div className={`text-left text-sm font-medium ${searchSub} mt-1`}>
                            {r.admin ? `${r.admin}, ` : ''}{r.country}
                        </div>
                    </button>
                ))}
             </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 pb-[max(2rem,env(safe-area-inset-bottom))] flex justify-center items-center z-50 pointer-events-none">
             <div 
                className={`pointer-events-auto relative flex items-center transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isSearchFocused || query.length > 0 ? `w-full ${inputBg}` : `w-14 ${inputBg} hover:scale-110 active:scale-90`} h-14 rounded-full overflow-hidden shadow-xl`}
                onClick={() => {
                    if (!isSearchFocused) {
                        setIsSearchFocused(true);
                        inputRef.current?.focus();
                    }
                }}
             >
                <div className={`absolute left-0 top-0 h-full flex items-center justify-center transition-all duration-500 ${isSearchFocused || query.length > 0 ? 'w-12 translate-x-0' : 'w-14 translate-x-0'}`}>
                    <SearchIcon className={`w-5 h-5 ${inputFg} pointer-events-none opacity-60`} />
                </div>
                
                <input 
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleSearch}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                        if (query.length === 0) setIsSearchFocused(false);
                    }}
                    placeholder={isSearchFocused ? "Search city..." : ""}
                    className={`w-full h-full bg-transparent text-lg font-medium ${inputFg} placeholder-neutral-400 outline-none pl-12 pr-12 transition-opacity duration-300 ${isSearchFocused || query.length > 0 ? 'opacity-100' : 'opacity-0 cursor-pointer'}`}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                />

                {(isSearchFocused || query.length > 0) && (
                    <button 
                        className={`absolute right-0 top-0 h-full w-12 flex items-center justify-center text-neutral-400 hover:${inputFg} transition-colors`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setQuery('');
                            setResults([]);
                            inputRef.current?.focus();
                        }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
             </div>
          </div>

          {menuOpen && menuItem && (
            <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm animate-blur rounded-t-[2.5rem] overflow-hidden">
                <div className="w-full max-w-sm m-4 mb-8 sm:m-0 bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 animate-[blurIn_0.3s_ease-out]">
                    <div className="p-6 text-center">
                        <h3 className="text-lg font-bold text-white mb-1">{menuItem.place.name}</h3>
                        <p className="text-sm text-neutral-500">{menuItem.place.country}</p>
                    </div>
                    <div className="flex flex-col p-2 gap-1">
                        <button 
                            onClick={confirmAction}
                            className="w-full py-4 bg-white text-black font-bold rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                        >
                            {menuItem.type === 'save' ? (
                                <><Plus className="w-5 h-5" /> Save Location</>
                            ) : (
                                <><X className="w-5 h-5" /> Delete Location</>
                            )}
                        </button>
                        <button 
                            onClick={closeMenu}
                            className="w-full py-4 text-neutral-400 font-bold active:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
          )}
      </div>

    </div>
  );
};

export default Home;