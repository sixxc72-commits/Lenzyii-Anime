'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search, Play, Pause, SkipForward, Volume2, VolumeX, Maximize, Minimize,
  Heart, Star, Clock, TrendingUp, ChevronLeft, ChevronRight, Menu, X,
  Film, Tv, BookmarkPlus, BookmarkCheck, ArrowLeft, Settings, Subtitles,
  FastForward, RefreshCw, MessageCircle, Sparkles, Eye, Calendar, HomeIcon,
  List, CheckCircle, Filter, Loader2
} from 'lucide-react'

/* ===== TYPES ===== */
interface Episode {
  episode: string
  title: string
  video: string
}

interface Anime {
  id: string
  title: string
  titleJp: string
  thumbnail: string
  banner: string
  genre: string[]
  rating: number
  status: 'Ongoing' | 'Completed'
  synopsis: string
  year: number
  studio: string
  episodes: Episode[]
}

interface ContinueWatching {
  animeId: string
  animeTitle: string
  animeThumbnail: string
  episode: string
  progress: number
  timestamp: number
}

interface ViewProps {
  view: string
  animeId?: string
  episodeNum?: string
}

/* ===== ANIME QUOTES ===== */
const ANIME_QUOTES = [
  { text: "People's lives don't end when they die. It ends when they lose faith.", anime: "Naruto", char: "Itachi Uchiha" },
  { text: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", anime: "Frieren", char: "Frieren" },
  { text: "The world isn't perfect. But it's there for us, doing the best it can.", anime: "Fullmetal Alchemist", char: "Roy Mustang" },
  { text: "Hard work is worthless for those that don't believe in themselves.", anime: "Naruto", char: "Naruto Uzumaki" },
  { text: "If you don't take risks, you can't create a future.", anime: "One Piece", char: "Monkey D. Luffy" },
  { text: "Power comes in response to a need, not a desire.", anime: "Dragon Ball Z", char: "Goku" },
  { text: "The smile is the shortest distance between two people.", anime: "Violet Evergarden", char: "Violet Evergarden" },
  { text: "If you don't like your destiny, don't accept it.", anime: "Naruto", char: "Naruto Uzumaki" },
  { text: "I'll take a potato chip... and eat it!", anime: "Death Note", char: "Light Yagami" },
  { text: "We are all different. That's what makes us beautiful.", anime: "My Hero Academia", char: "All Might" },
  { text: "The only thing we're allowed to do is to believe that we won't regret the choice we made.", anime: "Sword Art Online", char: "Kirito" },
  { text: "If you don't like how things are, change it! You're not a tree.", anime: "One Punch Man", char: "Saitama" },
]

/* ===== SCHEDULE DATA ===== */
const SCHEDULE_DATA: Record<string, { time: string; title: string }[]> = {
  Senin: [
    { time: '18:00', title: 'Solo Leveling S2' },
    { time: '20:30', title: 'Dandadan' },
  ],
  Selasa: [
    { time: '19:00', title: 'Blue Lock S2' },
    { time: '21:00', title: 'Wind Breaker' },
  ],
  Rabu: [
    { time: '18:30', title: 'Kaiju No. 8' },
    { time: '20:00', title: 'Shangri-La Frontier S2' },
  ],
  Kamis: [
    { time: '19:00', title: 'Demon Slayer: Infinity Castle' },
  ],
  Jumat: [
    { time: '18:00', title: 'One Piece' },
    { time: '21:00', title: 'Solo Leveling S2' },
  ],
  Sabtu: [
    { time: '17:00', title: 'Dandadan' },
    { time: '19:30', title: 'Blue Lock S2' },
    { time: '22:00', title: 'Kaiju No. 8' },
  ],
  Minggu: [
    { time: '18:00', title: 'Demon Slayer: Infinity Castle' },
    { time: '20:00', title: 'Wind Breaker' },
  ],
}

/* ===== ALL GENRES ===== */
const ALL_GENRES = ['All', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Game', 'School', 'Shounen', 'Superhero', 'Historical', 'Music']

/* ===== HELPER: localStorage ===== */
function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : fallback
  } catch {
    return fallback
  }
}

function setToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore */ }
}

/* ===== MAIN APP ===== */
export default function Home() {
  const [loading, setLoading] = useState(true)
  const [animeList, setAnimeList] = useState<Anime[]>([])
  const [view, setView] = useState<ViewProps>({ view: 'home' })
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [favorites, setFavorites] = useState<string[]>(() => getFromStorage('lenzyii_favorites', []))
  const [continueWatching, setContinueWatching] = useState<ContinueWatching[]>(() => getFromStorage('lenzyii_continue', []))
  const [imageLoadState, setImageLoadState] = useState<Record<string, boolean>>({})
  const [bannerIndex, setBannerIndex] = useState(0)

  // Player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [autoplayNext, setAutoplayNext] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load anime data
  useEffect(() => {
    fetch('/anime.json')
      .then(res => res.json())
      .then((data: Anime[]) => {
        setAnimeList(data)
        setTimeout(() => setLoading(false), 2200)
      })
      .catch(() => {
        setTimeout(() => setLoading(false), 2200)
      })
  }, [])

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Player controls auto-hide
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (controlsTimeout) clearTimeout(controlsTimeout)
    if (isPlaying) {
      const t = setTimeout(() => setShowControls(false), 3000)
      setControlsTimeout(t)
    }
  }, [isPlaying, controlsTimeout])

  /* ===== COMPUTED ===== */
  const featuredAnime = useMemo(() => animeList.filter(a => a.rating >= 8.5).slice(0, 5), [animeList])
  const trendingAnime = useMemo(() => [...animeList].sort((a, b) => b.rating - a.rating).slice(0, 8), [animeList])
  const ongoingAnime = useMemo(() => animeList.filter(a => a.status === 'Ongoing'), [animeList])
  const completedAnime = useMemo(() => animeList.filter(a => a.status === 'Completed'), [animeList])

  const filteredAnime = useMemo(() => {
    let result = animeList
    if (selectedGenre !== 'All') {
      result = result.filter(a => a.genre.includes(selectedGenre))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.titleJp.toLowerCase().includes(q) ||
        a.genre.some(g => g.toLowerCase().includes(q)) ||
        a.studio.toLowerCase().includes(q)
      )
    }
    return result
  }, [animeList, selectedGenre, searchQuery])

  const currentAnime = useMemo(() => animeList.find(a => a.id === view.animeId), [animeList, view.animeId])
  const currentEpisode = useMemo(() =>
    currentAnime?.episodes.find(e => e.episode === view.episodeNum),
    [currentAnime, view.episodeNum]
  )
  const currentEpisodeIndex = useMemo(() =>
    currentAnime?.episodes.findIndex(e => e.episode === view.episodeNum) ?? -1,
    [currentAnime, view.episodeNum]
  )

  /* ===== HANDLERS ===== */
  const navigate = (newView: ViewProps) => {
    setView(newView)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleFavorite = (animeId: string) => {
    setFavorites(prev => {
      const next = prev.includes(animeId)
        ? prev.filter(id => id !== animeId)
        : [...prev, animeId]
      setToStorage('lenzyii_favorites', next)
      return next
    })
  }

  const updateContinueWatching = (animeId: string, episode: string, progress: number) => {
    setContinueWatching(prev => {
      const anime = animeList.find(a => a.id === animeId)
      if (!anime) return prev
      const filtered = prev.filter(c => !(c.animeId === animeId && c.episode === episode))
      const entry: ContinueWatching = {
        animeId,
        animeTitle: anime.title,
        animeThumbnail: anime.thumbnail,
        episode,
        progress,
        timestamp: Date.now(),
      }
      const next = [entry, ...filtered].slice(0, 20)
      setToStorage('lenzyii_continue', next)
      return next
    })
  }

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!playerRef.current) return
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    videoRef.current.currentTime = pos * duration
  }

  const skipIntro = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 85, duration)
    }
  }

  const playNextEpisode = useCallback(() => {
    if (!currentAnime || currentEpisodeIndex < 0) return
    const nextEp = currentAnime.episodes[currentEpisodeIndex + 1]
    if (nextEp) {
      navigate({ view: 'player', animeId: currentAnime.id, episodeNum: nextEp.episode })
    }
  }, [currentAnime, currentEpisodeIndex])

  const playPrevEpisode = () => {
    if (!currentAnime || currentEpisodeIndex < 0) return
    const prevEp = currentAnime.episodes[currentEpisodeIndex - 1]
    if (prevEp) {
      navigate({ view: 'player', animeId: currentAnime.id, episodeNum: prevEp.episode })
    }
  }

  const handleVideoEnd = () => {
    if (autoplayNext && currentAnime) {
      const nextEp = currentAnime.episodes[currentEpisodeIndex + 1]
      if (nextEp) {
        navigate({ view: 'player', animeId: currentAnime.id, episodeNum: nextEp.episode })
      }
    }
    setIsPlaying(false)
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
    if (duration > 0) {
      const progress = (videoRef.current.currentTime / duration) * 100
      if (view.animeId && view.episodeNum) {
        updateContinueWatching(view.animeId, view.episodeNum, progress)
      }
    }
  }

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleImageLoad = (id: string) => {
    setImageLoadState(prev => ({ ...prev, [id]: true }))
  }

  // Banner auto-rotate
  useEffect(() => {
    const featured = animeList.filter(a => a.rating >= 8.5).slice(0, 5)
    if (featured.length === 0) return
    bannerTimerRef.current = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % featured.length)
    }, 6000)
    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current)
    }
  }, [animeList])

  // Random quote rotation
  const [quote, setQuote] = useState(() => ANIME_QUOTES[Math.floor(Math.random() * ANIME_QUOTES.length)])
  useEffect(() => {
    const interval = setInterval(() => {
      setQuote(ANIME_QUOTES[Math.floor(Math.random() * ANIME_QUOTES.length)])
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcuts for player
  useEffect(() => {
    if (view.view !== 'player') return
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowRight':
          e.preventDefault()
          if (videoRef.current) videoRef.current.currentTime += 10
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (videoRef.current) videoRef.current.currentTime -= 10
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(v => Math.min(1, v + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(v => Math.max(0, v - 0.1))
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          setIsMuted(m => !m)
          break
        case 'n':
          e.preventDefault()
          playNextEpisode()
          break
        case 'Escape':
          if (isFullscreen) toggleFullscreen()
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [view, isFullscreen, togglePlay, toggleFullscreen, playNextEpisode])

  // Sync volume to video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  /* ===== RENDER: Loading Screen ===== */
  const renderLoading = () => (
    <div className={`loading-screen ${!loading ? 'hidden' : ''}`}>
      <div className="loading-logo">Lenzyii Anime</div>
      <p style={{ color: '#64748b', marginTop: 8, fontSize: 14, letterSpacing: 2 }}>
        Welcome to Lenzyii Anime
      </p>
      <div className="loading-bar">
        <div className="loading-bar-fill" />
      </div>
    </div>
  )

  /* ===== RENDER: Particles ===== */
  const renderParticles = () => (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            background: i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#3b82f6' : '#06b6d4',
            animationDuration: `${Math.random() * 15 + 10}s`,
            animationDelay: `${Math.random() * 10}s`,
            boxShadow: `0 0 ${Math.random() * 6 + 2}px ${i % 3 === 0 ? 'rgba(168,85,247,0.4)' : i % 3 === 1 ? 'rgba(59,130,246,0.4)' : 'rgba(6,182,212,0.4)'}`,
          }}
        />
      ))}
    </div>
  )

  /* ===== RENDER: Navbar ===== */
  const renderNavbar = () => {
    const navItems = [
      { label: 'Home', id: 'home', icon: <HomeIcon size={16} /> },
      { label: 'Anime List', id: 'list', icon: <List size={16} /> },
      { label: 'Ongoing', id: 'ongoing', icon: <Tv size={16} /> },
      { label: 'Completed', id: 'completed', icon: <CheckCircle size={16} /> },
      { label: 'Genres', id: 'genres', icon: <Filter size={16} /> },
    ]

    return (
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => navigate({ view: 'home' })}
          >
            <Sparkles size={22} style={{ color: '#a855f7' }} />
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }} className="gradient-neon-text">
              Lenzyii
            </span>
            <span style={{ fontSize: 18, fontWeight: 400, color: '#94a3b8' }}>Anime</span>
          </div>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="hidden md:flex">
            {navItems.map(item => (
              <span
                key={item.id}
                className={`nav-link ${view.view === item.id ? 'active' : ''}`}
                onClick={() => navigate({ view: item.id })}
              >
                {item.label}
              </span>
            ))}
          </div>

          {/* Search + Mobile Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="search-container hidden sm:block">
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                className="search-input"
                placeholder="Search anime..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim()) navigate({ view: 'search' })
                  else if (view.view === 'search') navigate({ view: 'home' })
                }}
                style={{ width: 220 }}
              />
            </div>

            {/* Hamburger */}
            <div
              className={`hamburger ${mobileMenuOpen ? 'open' : ''} md:hidden`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span /><span /><span />
            </div>
          </div>
        </div>
      </nav>
    )
  }

  /* ===== RENDER: Mobile Menu ===== */
  const renderMobileMenu = () => (
    <>
      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Mobile Search */}
        <div className="search-container" style={{ marginBottom: 20 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              if (e.target.value.trim()) navigate({ view: 'search' })
              else if (view.view === 'search') navigate({ view: 'home' })
            }}
          />
        </div>

        {[
          { label: 'Home', id: 'home', icon: <HomeIcon size={18} /> },
          { label: 'Anime List', id: 'list', icon: <List size={18} /> },
          { label: 'Ongoing', id: 'ongoing', icon: <Tv size={18} /> },
          { label: 'Completed', id: 'completed', icon: <CheckCircle size={18} /> },
          { label: 'Genres', id: 'genres', icon: <Filter size={18} /> },
          { label: 'My Favorites', id: 'favorites', icon: <Heart size={18} /> },
        ].map(item => (
          <div
            key={item.id}
            className={`mobile-nav-link ${view.view === item.id ? 'active' : ''}`}
            onClick={() => navigate({ view: item.id })}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            {item.icon}
            {item.label}
          </div>
        ))}

        <div style={{ marginTop: 24, padding: '0 16px' }}>
          <div className="discord-btn" style={{ width: '100%', justifyContent: 'center' }}>
            <MessageCircle size={16} />
            Join Discord
          </div>
        </div>
      </div>
    </>
  )

  /* ===== RENDER: Hero Banner ===== */
  const renderHeroBanner = () => {
    if (featuredAnime.length === 0) return null
    const current = featuredAnime[bannerIndex % featuredAnime.length]
    if (!current) return null

    return (
      <section className="hero-banner">
        {featuredAnime.map((anime, i) => (
          <div key={anime.id} className={`hero-slide ${i === bannerIndex % featuredAnime.length ? 'active' : ''}`}>
            <img
              src={anime.banner}
              alt={anime.title}
              className="hero-slide-image"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
        <div className="hero-gradient" />

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 60px', maxWidth: 1400, margin: '0 auto', zIndex: 5 }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {current.genre.slice(0, 3).map(g => (
                <span key={g} className="genre-badge" onClick={() => { setSelectedGenre(g); navigate({ view: 'genres' }) }}>{g}</span>
              ))}
              <span className={`status-badge ${current.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'}`} style={{ position: 'static' }}>
                {current.status}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: 4, color: '#f8fafc' }}>
              {current.title}
            </h1>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>{current.titleJp}</p>
            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {current.synopsis}
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate({ view: 'player', animeId: current.id, episodeNum: current.episodes[0]?.episode })}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(168,85,247,0.3)', transition: 'all 0.3s ease' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(168,85,247,0.5)'; e.currentTarget.style.transform = 'scale(1.03)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(168,85,247,0.3)'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                <Play size={18} fill="white" /> Watch Now
              </button>
              <button
                onClick={() => toggleFavorite(current.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: favorites.includes(current.id) ? '#ef4444' : '#94a3b8', fontWeight: 500, fontSize: 14, cursor: 'pointer', transition: 'all 0.3s ease' }}
              >
                <Heart size={16} fill={favorites.includes(current.id) ? '#ef4444' : 'none'} />
                {favorites.includes(current.id) ? 'Favorited' : 'Favorite'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24', fontSize: 14, fontWeight: 600 }}>
                <Star size={14} fill="#fbbf24" /> {current.rating}
              </div>
              <span style={{ color: '#64748b', fontSize: 13 }}>{current.episodes.length} Episodes</span>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="hero-dots">
          {featuredAnime.map((_, i) => (
            <button
              key={i}
              className={`hero-dot ${i === bannerIndex % featuredAnime.length ? 'active' : ''}`}
              onClick={() => setBannerIndex(i)}
            />
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={() => setBannerIndex(prev => (prev - 1 + featuredAnime.length) % featuredAnime.length)}
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}
          className="hidden md:flex"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setBannerIndex(prev => (prev + 1) % featuredAnime.length)}
          style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}
          className="hidden md:flex"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
        >
          <ChevronRight size={20} />
        </button>
      </section>
    )
  }

  /* ===== RENDER: Anime Card ===== */
  const renderAnimeCard = (anime: Anime, index?: number) => {
    const isFav = favorites.includes(anime.id)
    const imgLoaded = imageLoadState[anime.id]

    return (
      <div
        key={anime.id}
        className="anime-card"
        onClick={() => navigate({ view: 'detail', animeId: anime.id })}
      >
        <div className="card-image">
          {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
          <img
            src={anime.thumbnail}
            alt={anime.title}
            loading="lazy"
            className={`lazy-image ${imgLoaded ? 'loaded' : ''}`}
            onLoad={() => handleImageLoad(anime.id)}
          />
          <div className="card-overlay" />
          <div className="play-btn">
            <Play size={20} fill="white" color="white" />
          </div>
          <span className={`status-badge ${anime.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'}`}>
            {anime.status}
          </span>
          <span className="rating-badge">
            <Star size={10} fill="#fbbf24" style={{ marginRight: 3, display: 'inline', verticalAlign: 'middle' }} />
            {anime.rating}
          </span>
          <span className="ep-badge">{anime.episodes.length} Ep</span>
          <button
            className={`fav-btn ${isFav ? 'active' : ''}`}
            onClick={e => { e.stopPropagation(); toggleFavorite(anime.id) }}
          >
            <Heart size={14} fill={isFav ? '#ef4444' : 'none'} />
          </button>
        </div>
        <div style={{ padding: '10px 12px 14px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {anime.title}
          </h3>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {anime.genre.slice(0, 2).map(g => (
              <span key={g} style={{ fontSize: 10, color: '#a78bfa', background: 'rgba(168,85,247,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ===== RENDER: Continue Watching ===== */
  const renderContinueWatching = () => {
    if (continueWatching.length === 0) return null
    return (
      <section style={{ padding: '0 20px', maxWidth: 1400, margin: '0 auto' }}>
        <div className="section-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} style={{ color: '#a855f7' }} /> Continue Watching
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {continueWatching.slice(0, 6).map(item => (
            <div
              key={`${item.animeId}-${item.episode}`}
              className="glass-card"
              style={{ display: 'flex', gap: 12, padding: 12, cursor: 'pointer' }}
              onClick={() => navigate({ view: 'player', animeId: item.animeId, episodeNum: item.episode })}
            >
              <div style={{ position: 'relative', width: 100, minHeight: 70, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <img src={item.animeThumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                  <Play size={20} fill="white" color="white" />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.animeTitle}
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Episode {item.episode}</p>
                <div className="continue-progress">
                  <div className="continue-progress-bar" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  /* ===== RENDER: Trending ===== */
  const renderTrending = () => (
    <section style={{ padding: '0 20px', maxWidth: 1400, margin: '0 auto' }}>
      <div className="section-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} style={{ color: '#a855f7' }} /> Top Trending
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
        {trendingAnime.map((anime, i) => (
          <div
            key={anime.id}
            style={{ display: 'flex', gap: 12, alignItems: 'flex-end', cursor: 'pointer', position: 'relative' }}
            onClick={() => navigate({ view: 'detail', animeId: anime.id })}
          >
            <span className="trending-num">{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div className="anime-card" style={{ transform: 'none' }}>
                <div className="card-image">
                  {!imageLoadState[anime.id] && <div className="skeleton" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
                  <img
                    src={anime.thumbnail}
                    alt={anime.title}
                    loading="lazy"
                    className={`lazy-image ${imageLoadState[anime.id] ? 'loaded' : ''}`}
                    onLoad={() => handleImageLoad(anime.id)}
                  />
                  <div className="card-overlay" />
                  <div className="play-btn">
                    <Play size={16} fill="white" color="white" />
                  </div>
                  <span className="rating-badge">
                    <Star size={10} fill="#fbbf24" style={{ marginRight: 2, display: 'inline', verticalAlign: 'middle' }} />
                    {anime.rating}
                  </span>
                </div>
                <div style={{ padding: '8px 10px 10px' }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {anime.title}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )

  /* ===== RENDER: Latest Episodes ===== */
  const renderLatestEpisodes = () => {
    const latest: { anime: Anime; episode: Episode }[] = []
    animeList.forEach(a => {
      const lastEp = a.episodes[a.episodes.length - 1]
      if (lastEp) latest.push({ anime: a, episode: lastEp })
    })
    latest.reverse()

    return (
      <section style={{ padding: '0 20px', maxWidth: 1400, margin: '0 auto' }}>
        <div className="section-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Film size={18} style={{ color: '#a855f7' }} /> Latest Episodes
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {latest.slice(0, 8).map(({ anime, episode }) => (
            <div
              key={`${anime.id}-${episode.episode}`}
              className="glass-card"
              style={{ display: 'flex', gap: 12, padding: 12, cursor: 'pointer' }}
              onClick={() => navigate({ view: 'player', animeId: anime.id, episodeNum: episode.episode })}
            >
              <div style={{ position: 'relative', width: 120, minHeight: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <img src={anime.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(168,85,247,0.9)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                  EP {episode.episode}
                </div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', opacity: 0, transition: 'opacity 0.3s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                >
                  <Play size={24} fill="white" color="white" />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {anime.title}
                </p>
                <p style={{ fontSize: 12, color: '#a78bfa', marginBottom: 4 }}>{episode.title}</p>
                <span className={`status-badge ${anime.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'}`} style={{ position: 'static', fontSize: 10, padding: '1px 8px' }}>
                  {anime.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  /* ===== RENDER: Schedule ===== */
  const renderSchedule = () => {
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
    return (
      <section style={{ padding: '0 20px', maxWidth: 1400, margin: '0 auto' }}>
        <div className="section-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} style={{ color: '#a855f7' }} /> Anime Schedule
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {days.map(day => (
            <div key={day} className="schedule-day">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#a855f7', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                {day}
              </h3>
              {SCHEDULE_DATA[day]?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < (SCHEDULE_DATA[day]?.length || 0) - 1 ? '1px solid rgba(168,85,247,0.06)' : 'none' }}>
                  <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>{item.time}</span>
                  <span style={{ fontSize: 12, color: '#e2e8f0' }}>{item.title}</span>
                </div>
              )) || <p style={{ fontSize: 12, color: '#4a4a6a' }}>No schedule</p>}
            </div>
          ))}
        </div>
      </section>
    )
  }

  /* ===== RENDER: Quote ===== */
  const renderQuote = () => (
    <section style={{ padding: '0 20px', maxWidth: 1400, margin: '0 auto' }}>
      <div className="quote-container">
        <p style={{ fontSize: 16, fontStyle: 'italic', color: '#e2e8f0', lineHeight: 1.7, marginBottom: 8, position: 'relative', zIndex: 1 }}>
          {quote.text}
        </p>
        <p style={{ fontSize: 13, color: '#a855f7', fontWeight: 600 }}>
          — {quote.char} <span style={{ color: '#64748b', fontWeight: 400 }}>from {quote.anime}</span>
        </p>
        <button
          onClick={() => setQuote(ANIME_QUOTES[Math.floor(Math.random() * ANIME_QUOTES.length)])}
          style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, padding: 6, color: '#a855f7', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(168,85,247,0.1)'}
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </section>
  )

  /* ===== RENDER: Anime Grid ===== */
  const renderAnimeGrid = (animes: Anime[], title: string, icon: React.ReactNode) => (
    <section style={{ padding: '0 20px', maxWidth: 1400, margin: '0 auto' }}>
      <div className="section-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon} {title}</h2>
      </div>
      {animes.length === 0 ? (
        <div className="no-results">
          <Search size={48} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No anime found</p>
          <p style={{ fontSize: 14 }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {animes.map((anime, i) => renderAnimeCard(anime, i))}
        </div>
      )}
    </section>
  )

  /* ===== RENDER: Genres View ===== */
  const renderGenresView = () => (
    <section style={{ padding: '80px 20px 40px', maxWidth: 1400, margin: '0 auto' }} className="page-enter">
      <div className="section-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={18} style={{ color: '#a855f7' }} /> Browse by Genre
        </h2>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {ALL_GENRES.map(g => (
          <span
            key={g}
            className={`genre-badge ${selectedGenre === g ? 'active' : ''}`}
            onClick={() => setSelectedGenre(g)}
            style={{ fontSize: 13, padding: '6px 16px' }}
          >
            {g}
          </span>
        ))}
      </div>
      {renderAnimeGrid(filteredAnime, selectedGenre === 'All' ? 'All Anime' : selectedGenre, <Film size={18} style={{ color: '#a855f7' }} />)}
    </section>
  )

  /* ===== RENDER: Search View ===== */
  const renderSearchView = () => (
    <section style={{ padding: '80px 20px 40px', maxWidth: 1400, margin: '0 auto' }} className="page-enter">
      <div className="search-container" style={{ marginBottom: 24 }}>
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input
          type="text"
          className="search-input"
          placeholder="Search anime by title, genre, or studio..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoFocus
          style={{ fontSize: 16, padding: '14px 16px 14px 46px' }}
        />
      </div>
      {renderAnimeGrid(filteredAnime, `Search: "${searchQuery}"`, <Search size={18} style={{ color: '#a855f7' }} />)}
    </section>
  )

  /* ===== RENDER: Favorites View ===== */
  const renderFavoritesView = () => {
    const favAnime = animeList.filter(a => favorites.includes(a.id))
    return (
      <section style={{ padding: '80px 20px 40px', maxWidth: 1400, margin: '0 auto' }} className="page-enter">
        {renderAnimeGrid(favAnime, 'My Favorites', <Heart size={18} style={{ color: '#ef4444' }} />)}
      </section>
    )
  }

  /* ===== RENDER: Anime Detail ===== */
  const renderAnimeDetail = () => {
    if (!currentAnime) return (
      <section style={{ padding: '80px 20px 40px', maxWidth: 1400, margin: '0 auto' }} className="page-enter">
        <div className="no-results">
          <Film size={48} />
          <p>Anime not found</p>
        </div>
      </section>
    )

    const isFav = favorites.includes(currentAnime.id)

    return (
      <section style={{ padding: '80px 20px 40px', maxWidth: 1400, margin: '0 auto' }} className="page-enter">
        {/* Back Button */}
        <button
          onClick={() => navigate({ view: 'home' })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 20, padding: '6px 0' }}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        {/* Header */}
        <div className="glass-card" style={{ display: 'flex', gap: 24, padding: 24, marginBottom: 24, flexDirection: 'row', flexWrap: 'wrap' }}>
          <div style={{ width: 200, flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
            <img src={currentAnime.thumbnail} alt={currentAnime.title} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, minWidth: 250 }}>
            <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 2rem)', fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>{currentAnime.title}</h1>
            <p style={{ fontSize: 14, color: '#a78bfa', marginBottom: 12 }}>{currentAnime.titleJp}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {currentAnime.genre.map(g => (
                <span key={g} className="genre-badge" onClick={() => { setSelectedGenre(g); navigate({ view: 'genres' }) }}>{g}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24', fontWeight: 600, fontSize: 15 }}>
                <Star size={16} fill="#fbbf24" /> {currentAnime.rating}
              </span>
              <span className={`status-badge ${currentAnime.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'}`} style={{ position: 'static' }}>
                {currentAnime.status}
              </span>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{currentAnime.episodes.length} Episodes</span>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{currentAnime.year}</span>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{currentAnime.studio}</span>
            </div>
            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>{currentAnime.synopsis}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate({ view: 'player', animeId: currentAnime.id, episodeNum: currentAnime.episodes[0]?.episode })}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(168,85,247,0.3)', transition: 'all 0.3s ease' }}
              >
                <Play size={18} fill="white" /> Watch Episode 1
              </button>
              <button
                onClick={() => toggleFavorite(currentAnime.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: isFav ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${isFav ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)'}`, color: isFav ? '#ef4444' : '#94a3b8', fontWeight: 500, fontSize: 14, cursor: 'pointer', transition: 'all 0.3s ease' }}
              >
                <Heart size={16} fill={isFav ? '#ef4444' : 'none'} />
                {isFav ? 'Favorited' : 'Add to Favorites'}
              </button>
            </div>
          </div>
        </div>

        {/* Episodes */}
        <div className="section-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <List size={18} style={{ color: '#a855f7' }} /> Episodes
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100%, 1fr))', gap: 8 }}>
          {currentAnime.episodes.map(ep => (
            <div
              key={ep.episode}
              className="episode-item"
              onClick={() => navigate({ view: 'player', animeId: currentAnime.id, episodeNum: ep.episode })}
            >
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Play size={16} fill="#a855f7" color="#a855f7" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Episode {ep.episode}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title}</p>
              </div>
              <ChevronRight size={16} style={{ color: '#4a4a6a', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  /* ===== RENDER: Player ===== */
  const renderPlayer = () => {
    if (!currentAnime || !currentEpisode) return (
      <section style={{ padding: '80px 20px 40px', maxWidth: 1400, margin: '0 auto' }} className="page-enter">
        <div className="no-results">
          <Film size={48} />
          <p>Episode not found</p>
        </div>
      </section>
    )

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
      <section style={{ padding: '64px 20px 40px', maxWidth: 1400, margin: '0 auto' }} className="page-enter">
        {/* Back */}
        <button
          onClick={() => navigate({ view: 'detail', animeId: currentAnime.id })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16, padding: '6px 0' }}
        >
          <ArrowLeft size={16} /> Back to {currentAnime.title}
        </button>

        {/* Video Player */}
        <div
          ref={playerRef}
          className="player-wrapper"
          style={{ aspectRatio: '16/9', marginBottom: 20 }}
          onMouseMove={resetControlsTimeout}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          <video
            ref={videoRef}
            src={currentEpisode.video}
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => { if (videoRef.current) setDuration(videoRef.current.duration) }}
            onEnded={handleVideoEnd}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onVolumeChange={() => { if (videoRef.current) { setVolume(videoRef.current.volume); setIsMuted(videoRef.current.muted) } }}
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />

          {/* Center Play Button */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.2)' }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(168,85,247,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(168,85,247,0.5)' }}>
                <Play size={28} fill="white" color="white" style={{ marginLeft: 3 }} />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className={`player-controls ${showControls ? '' : ''}`} style={{ opacity: showControls ? 1 : 0 }}>
            {/* Progress */}
            <div className="player-progress" onClick={seekTo}>
              <div className="player-progress-bar" style={{ width: `${progress}%` }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="player-btn" onClick={playPrevEpisode} title="Previous Episode (disabled if first)">
                  <SkipForward size={18} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button className="player-btn" onClick={togglePlay} title="Play/Pause (Space/K)">
                  {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" />}
                </button>
                <button className="player-btn" onClick={playNextEpisode} title="Next Episode (N)">
                  <SkipForward size={18} />
                </button>
                <button className="player-btn" onClick={() => setIsMuted(!isMuted)} title="Mute (M)">
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  className="player-volume-slider"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false) }}
                  title="Volume (↑/↓)"
                />
                <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="player-skip-btn" onClick={skipIntro} title="Skip 85 seconds">
                  <FastForward size={14} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />
                  Skip Intro
                </button>
                <button
                  className="player-btn"
                  onClick={() => setAutoplayNext(!autoplayNext)}
                  title={`Autoplay Next: ${autoplayNext ? 'ON' : 'OFF'}`}
                  style={{ color: autoplayNext ? '#a855f7' : '#64748b' }}
                >
                  <Settings size={16} />
                </button>
                <button className="player-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Watermark on player */}
          <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, color: 'rgba(168,85,247,0.3)', letterSpacing: 1, pointerEvents: 'none' }}>
            LENZYII
          </div>
        </div>

        {/* Episode Info + List */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          {/* Info */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{currentAnime.title}</h2>
            <p style={{ fontSize: 14, color: '#a78bfa', marginBottom: 12 }}>Episode {currentEpisode.episode} — {currentEpisode.title}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {currentAnime.genre.map(g => (
                <span key={g} className="genre-badge">{g}</span>
              ))}
              <span className={`status-badge ${currentAnime.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'}`} style={{ position: 'static' }}>
                {currentAnime.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24', fontWeight: 600 }}>
                <Star size={14} fill="#fbbf24" /> {currentAnime.rating}
              </span>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{currentAnime.studio} • {currentAnime.year}</span>
              <button
                onClick={() => toggleFavorite(currentAnime.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: favorites.includes(currentAnime.id) ? '#ef4444' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                <Heart size={14} fill={favorites.includes(currentAnime.id) ? '#ef4444' : 'none'} />
                {favorites.includes(currentAnime.id) ? 'Favorited' : 'Favorite'}
              </button>
            </div>
          </div>

          {/* Episode List */}
          <div>
            <div className="section-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <List size={18} style={{ color: '#a855f7' }} /> All Episodes
                {autoplayNext && (
                  <span style={{ fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                    Auto-play ON
                  </span>
                )}
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
              {currentAnime.episodes.map(ep => (
                <div
                  key={ep.episode}
                  className={`episode-item ${ep.episode === view.episodeNum ? 'active' : ''}`}
                  onClick={() => navigate({ view: 'player', animeId: currentAnime.id, episodeNum: ep.episode })}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: ep.episode === view.episodeNum ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {ep.episode === view.episodeNum ? (
                      <Pause size={14} fill="#a855f7" color="#a855f7" />
                    ) : (
                      <Play size={14} fill="#a855f7" color="#a855f7" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Episode {ep.episode}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title}</p>
                  </div>
                  {ep.episode === view.episodeNum && (
                    <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 600 }}>Playing</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="glass-card" style={{ padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>Keyboard Shortcuts</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 12, color: '#64748b' }}>
              <span><kbd style={{ background: 'rgba(168,85,247,0.15)', padding: '1px 6px', borderRadius: 4, color: '#a78bfa', fontSize: 11 }}>Space</kbd> Play/Pause</span>
              <span><kbd style={{ background: 'rgba(168,85,247,0.15)', padding: '1px 6px', borderRadius: 4, color: '#a78bfa', fontSize: 11 }}>←→</kbd> Seek ±10s</span>
              <span><kbd style={{ background: 'rgba(168,85,247,0.15)', padding: '1px 6px', borderRadius: 4, color: '#a78bfa', fontSize: 11 }}>↑↓</kbd> Volume</span>
              <span><kbd style={{ background: 'rgba(168,85,247,0.15)', padding: '1px 6px', borderRadius: 4, color: '#a78bfa', fontSize: 11 }}>F</kbd> Fullscreen</span>
              <span><kbd style={{ background: 'rgba(168,85,247,0.15)', padding: '1px 6px', borderRadius: 4, color: '#a78bfa', fontSize: 11 }}>M</kbd> Mute</span>
              <span><kbd style={{ background: 'rgba(168,85,247,0.15)', padding: '1px 6px', borderRadius: 4, color: '#a78bfa', fontSize: 11 }}>N</kbd> Next Ep</span>
            </div>
          </div>
        </div>
      </section>
    )
  }

  /* ===== RENDER: Home View ===== */
  const renderHomeView = () => (
    <div className="page-enter">
      {renderHeroBanner()}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40, paddingTop: 40, paddingBottom: 40 }}>
        {renderContinueWatching()}
        {renderTrending()}
        {renderLatestEpisodes()}
        {renderSchedule()}
        {renderQuote()}
        {/* Discord CTA */}
        <section style={{ padding: '0 20px', maxWidth: 1400, margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
            <MessageCircle size={32} style={{ color: '#8b9bff', marginBottom: 12 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>Join Our Community</h3>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>Discuss anime, get recommendations, and stay updated with the latest episodes.</p>
            <div className="discord-btn" style={{ display: 'inline-flex' }}>
              <MessageCircle size={16} /> Join Discord Server
            </div>
          </div>
        </section>
      </div>
    </div>
  )

  /* ===== RENDER: Footer ===== */
  const renderFooter = () => (
    <footer style={{ borderTop: '1px solid rgba(168,85,247,0.08)', marginTop: 'auto', background: 'rgba(10,10,15,0.9)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, marginBottom: 32 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Sparkles size={20} style={{ color: '#a855f7' }} />
              <span style={{ fontSize: 16, fontWeight: 800 }} className="gradient-neon-text">Lenzyii Anime</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              Your ultimate destination for streaming anime online. Free, fast, and high quality.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Home', 'Anime List', 'Ongoing', 'Completed', 'Genres'].map(link => (
                <span key={link} className="footer-link" style={{ fontSize: 13 }} onClick={() => navigate({ view: link.toLowerCase().replace(' ', '') })}>
                  {link}
                </span>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Popular Genres</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Action', 'Fantasy', 'Romance', 'Comedy', 'Drama', 'Sci-Fi'].map(g => (
                <span key={g} className="footer-link" style={{ fontSize: 13 }} onClick={() => { setSelectedGenre(g); navigate({ view: 'genres' }) }}>
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Info</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="footer-link" style={{ fontSize: 13 }}>About Us</span>
              <span className="footer-link" style={{ fontSize: 13 }}>Contact</span>
              <span className="footer-link" style={{ fontSize: 13 }}>DMCA</span>
              <span className="footer-link" style={{ fontSize: 13 }}>Privacy Policy</span>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid rgba(168,85,247,0.06)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: '#4a4a6a' }}>
            © 2025 Lenzyii Anime. All rights reserved. Made with <Heart size={10} fill="#ef4444" color="#ef4444" style={{ display: 'inline', verticalAlign: 'middle' }} /> for anime fans.
          </p>
          <p style={{ fontSize: 11, color: '#3a3a5a', letterSpacing: 0.5 }}>
            LENZYII ANIME™
          </p>
        </div>
      </div>
    </footer>
  )

  /* ===== MAIN RENDER ===== */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {renderLoading()}
      {renderParticles()}
      {renderNavbar()}
      {renderMobileMenu()}

      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        {view.view === 'home' && renderHomeView()}
        {view.view === 'list' && (
          <div className="page-enter" style={{ paddingTop: 80, paddingBottom: 40 }}>
            {renderAnimeGrid(animeList, 'All Anime', <List size={18} style={{ color: '#a855f7' }} />)}
          </div>
        )}
        {view.view === 'ongoing' && (
          <div className="page-enter" style={{ paddingTop: 80, paddingBottom: 40 }}>
            {renderAnimeGrid(ongoingAnime, 'Ongoing Anime', <Tv size={18} style={{ color: '#22c55e' }} />)}
          </div>
        )}
        {view.view === 'completed' && (
          <div className="page-enter" style={{ paddingTop: 80, paddingBottom: 40 }}>
            {renderAnimeGrid(completedAnime, 'Completed Anime', <CheckCircle size={18} style={{ color: '#3b82f6' }} />)}
          </div>
        )}
        {view.view === 'genres' && renderGenresView()}
        {view.view === 'search' && renderSearchView()}
        {view.view === 'favorites' && renderFavoritesView()}
        {view.view === 'detail' && renderAnimeDetail()}
        {view.view === 'player' && renderPlayer()}
      </main>

      {renderFooter()}

      {/* Watermark */}
      <div className="watermark">LENZYII</div>
    </div>
  )
}
