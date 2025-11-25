import React, { useEffect, useState, useRef, useMemo } from 'react';
import { get, locate, search } from './services/api';
import { msg, nerdMsg } from './data';
import { Weather, Place } from './types';
import { Search as SearchIcon, X, MapPin, Plus, Thermometer, Droplets, Wind, Gauge, Umbrella, Cloud, Zap, Activity } from 'lucide-react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

interface StatProps {
  label: string;
  val: string;
  icon: React.ReactNode;
  dim: string;
  line: string;
}

const Stat: React.FC<StatProps> = ({ label, val, icon, dim, line }) => (
  <div className={`p-5 rounded-3xl border ${line} flex flex-col justify-between aspect-square sm:aspect-auto sm:h-32`}>
    <div className={`flex items-center justify-between ${dim} mb-2`}>
       <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
       {icon}
    </div>
    <span className="text-2xl sm:text-3xl font-bold tracking-tighter leading-none">{val}</span>
  </div>
);

const Home: React.FC = () => {
    const [data, setData] = useState<Weather | null>(null);
    const [place, setPlace] = useState<Place | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [err, setErr] = useState<string | null>(null);
    const [time, setTime] = useState<string>('');
    const [systemDark, setSystemDark] = useState<boolean>(false);

    // toggle between views
    const [view, setView] = useState<'weather' | 'search' | 'stats'>('weather');

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Place[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchTimeout = useRef<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // stats state
    const [nerdChat, setNerdChat] = useState(() => nerdMsg());
    const [scrolled, setScrolled] = useState(false);

    // keyboard state
    const [kb, setKb] = useState(0);

    // initialize saved places
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
    const touchStartX = useRef<number | null>(null);

    // detect system theme & update native status bar
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        setSystemDark(mq.matches);

        // helper to update native status bar
        const updateNative = async (isDark: boolean) => {
            try {
                await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
                // ensure content flows under status bar
                await StatusBar.setOverlaysWebView({ overlay: true }); 
            } catch {
                // ignore on web
            }
        };

        updateNative(mq.matches);

        const handler = (e: MediaQueryListEvent) => {
            setSystemDark(e.matches);
            updateNative(e.matches);
        };
        
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // handle keyboard events
    useEffect(() => {
        Keyboard.addListener('keyboardWillShow', info => {
            setKb(info.keyboardHeight);
        });
        Keyboard.addListener('keyboardWillHide', () => {
            setKb(0);
        });
        return () => {
            Keyboard.removeAllListeners();
        };
    }, []);

    // persist saved places
    useEffect(() => {
        localStorage.setItem('WTHR-saved', JSON.stringify(savedPlaces));
    }, [savedPlaces]);

    // update nerd chat
    useEffect(() => {
        if (view === 'stats') setNerdChat(nerdMsg());
    }, [view]);

    // keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (view === 'weather') {
                if (e.key === 'ArrowUp') setView('search');
                if (e.key === 'ArrowLeft') setView('stats');
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
            if (view === 'stats') {
                if (e.key === 'Escape' || e.key === 'ArrowRight') setView('weather');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, query, menuOpen]);

    // initial app load
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

    // select place
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

    // debounce search
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

    // setup clock
    useEffect(() => {
        init();
        const t = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
        }, 1000);
        return () => clearInterval(t);
    }, []);

    // track touch start
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        touchStartX.current = e.touches[0].clientX;
    };

    // handle swipe
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartY.current === null || touchStartX.current === null) return;

        const dX = touchStartX.current - e.changedTouches[0].clientX;
        const dY = touchStartY.current - e.changedTouches[0].clientY;

        // determine direction
        if (Math.abs(dX) > Math.abs(dY)) {
            // horizontal
            if (Math.abs(dX) > 50) {
                if (dX > 0 && view === 'weather') setView('stats');
                if (dX < 0 && view === 'stats') setView('weather');
            }
        } else {
            // vertical
            if (Math.abs(dY) > 50) {
                if (dY > 0 && view === 'weather') setView('search');
                if (dY < 0 && view === 'search' && !isSearchFocused && !menuOpen) setView('weather');
            }
        }

        touchStartY.current = null;
        touchStartX.current = null;
    };

    // long press logic
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
        setTimeout(() => setMenuItem(null), 300);
    };

    // confirm action
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
        if (!data) return { head: "...", sub: "..." };
        const { current } = data;
        return msg(current.code, current.day, current.temp);
    }, [data]);

    // theme classes
    const bg = systemDark ? 'bg-black' : 'bg-white';
    const fg = systemDark ? 'text-white' : 'text-black';
    const subColor = systemDark ? 'text-neutral-500' : 'text-neutral-400';
    const line = systemDark ? 'border-neutral-800' : 'border-neutral-200';

    const searchBg = systemDark ? 'bg-zinc-900' : 'bg-zinc-100';
    const searchFg = systemDark ? 'text-white' : 'text-black';
    const searchSub = systemDark ? 'text-neutral-400' : 'text-neutral-500';
    const inputBg = systemDark ? 'bg-black' : 'bg-white';
    const inputFg = systemDark ? 'text-white' : 'text-black';

    if (err) {
        return (
            <div className={`h-[100dvh] w-full flex flex-col items-center justify-center p-6 ${bg} ${fg}`}>
                <h1 className="text-6xl font-bold tracking-tighter mb-4">Seriously?</h1>
                <p className="text-sm font-medium mb-8 opacity-60">{err}</p>
                <button onClick={() => init()} className="px-6 py-3 bg-neutral-900 text-white rounded-full text-sm font-bold tracking-wide active:scale-95 transition-transform">Try again</button>
            </div>
        );
    }

    const { current } = data || {};
    const showSaved = query.length === 0;
    const listToDisplay = showSaved ? savedPlaces : results;

    return (
        <div
            className={`h-[100dvh] w-full overflow-hidden relative theme-transition ${bg} ${fg}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >

            <div
                className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-8 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] 
                ${view === 'search' ? '-translate-y-[20%] opacity-50 scale-95' : 
                  view === 'stats' ? '-translate-x-[20%] opacity-50 scale-95' : 
                  'translate-y-0 opacity-100 scale-100'}`}
            >
                <header className="relative z-10 flex justify-between items-start h-12 select-none">
                    <button
                        onClick={() => init()}
                        className="flex items-center gap-2 group transition-opacity"
                    >
                        <img
                            src="/favicon.svg"
                            alt=""
                            className="w-5 h-5 opacity-100 group-hover:opacity-100 transition-opacity center"
                        />
                        <span className="text-xl font-bold tracking-tight truncate max-w-[200px] leading-none">
                            {place?.name || "..."}
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
                            {current ? Math.round(current.temp) : '--'}°
                        </span>
                    </div>

                    <div className="flex flex-col items-end text-right">
                        <span className={`text-[10px] uppercase tracking-widest ${subColor} mb-1 font-bold`}>Time</span>
                        <span className="text-3xl font-bold tracking-tighter">
                            {time}
                        </span>
                        <span className={`text-xs mt-1 font-medium ${subColor}`}>
                            {current ? (current.day ? 'Day' : 'Night') : '...'}
                        </span>
                    </div>
                </footer>
            </div>

            <div
                className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500 ${view !== 'weather' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setView('weather')}
            />

            {/* stats drawer */}
            <div 
                className={`fixed top-0 right-0 bottom-0 z-40 w-[92vw] sm:w-[35rem] flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${searchBg} ${searchFg} overflow-hidden rounded-l-[2.5rem] shadow-2xl ${view === 'stats' ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`shrink-0 px-6 sm:px-8 pt-[max(2.5rem,env(safe-area-inset-top))] pb-6 z-20`}>
                    <div className="animate-blur">
                        <h2 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-3 leading-none">
                        {nerdChat.head}
                        </h2>
                        <p className={`text-lg font-medium ${searchSub} leading-tight`}>
                        {nerdChat.sub}
                        </p>
                    </div>
                </div>

                <div className="flex-1 relative min-h-0 w-full">
                    <div 
                        className={`absolute top-0 left-0 right-0 h-8 bg-gradient-to-b ${systemDark ? 'from-zinc-900' : 'from-zinc-100'} to-transparent z-10 pointer-events-none transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`} 
                    />
                    
                    <div 
                        className="h-full overflow-y-auto px-6 sm:px-8 pb-[max(2rem,env(safe-area-inset-bottom))] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 5)}
                    >
                        <div className="pt-2 pb-12 grid grid-cols-2 gap-3">
                        <Stat label="Feels Like" val={current ? `${Math.round(current.feels_like)}°` : '--'} icon={<Thermometer className="w-5 h-5 opacity-60" />} dim={searchSub} line={line} />
                        <Stat label="Humidity" val={current ? `${current.humidity}%` : '--'} icon={<Droplets className="w-5 h-5 opacity-60" />} dim={searchSub} line={line} />
                        <Stat label="Wind" val={current ? `${current.wind} km/h` : '--'} icon={<Wind className="w-5 h-5 opacity-60" style={{transform: `rotate(${current?.wind_dir || 0}deg)`}} />} dim={searchSub} line={line} />
                        <Stat label="Pressure" val={current ? `${current.pressure} hPa` : '--'} icon={<Gauge className="w-5 h-5 opacity-60" />} dim={searchSub} line={line} />
                        <Stat label="Precipitation" val={current ? `${current.precip} mm` : '--'} icon={<Umbrella className="w-5 h-5 opacity-60" />} dim={searchSub} line={line} />
                        <Stat label="Cloud Cover" val={current ? `${current.cloud}%` : '--'} icon={<Cloud className="w-5 h-5 opacity-60" />} dim={searchSub} line={line} />
                        <Stat label="PM2.5" val={current ? `${current.pm25} µg` : '--'} icon={<Zap className="w-5 h-5 opacity-60" />} dim={searchSub} line={line} />
                        <Stat label="AQI" val={current ? `${current.aqi}` : '--'} icon={<Activity className="w-5 h-5 opacity-60" />} dim={searchSub} line={line} />
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={`fixed bottom-0 left-0 w-full sm:w-[30rem] sm:left-1/2 sm:-translate-x-1/2 h-[93dvh] flex flex-col z-40 ${searchBg} ${searchFg} rounded-t-[2.5rem] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${view === 'search' ? 'translate-y-0' : 'translate-y-[100%]'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-1.5 bg-neutral-500/20 rounded-full mx-auto mt-4 mb-2 shrink-0" />

                <div 
                    className="flex-1 overflow-y-auto px-6 mt-4 pb-32 transition-all duration-300"
                    style={{ paddingBottom: `${128 + kb}px` }}
                >
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

                <div className="absolute bottom-0 left-0 w-full p-6 pb-[max(2rem,env(safe-area-inset-bottom))] flex justify-center items-center z-50 pointer-events-none transition-all duration-300" style={{ bottom: `${kb}px` }}>
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