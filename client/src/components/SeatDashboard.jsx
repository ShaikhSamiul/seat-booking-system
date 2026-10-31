/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modern SVG Icons (Crisp, Vector Iconography)
 */
const Icons = {
  Ticket: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  Armchair: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 18v3h2v-3h12v3h2v-3c1.1 0 2-.9 2-2v-5c0-1.1-.9-2-2-2h-1V6c0-1.66-1.34-3-3-3H8C6.34 3 5 4.34 5 6v3H4c-1.1 0-2 .9-2 2v5c0 1.1.9 2 2 2zm3-12c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v8H7V6zM4 11h1v4H4v-4zm15 0h1v4h-1v-4z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
};

/**
 * Tier & Pricing Metadata
 */
const getSeatMeta = (seatId) => {
  const row = seatId.charAt(0);
  if (row === 'A' || row === 'B') {
    return { tier: 'VIP Paddock Club', price: 65, fee: 5 };
  }
  if (row === 'C' || row === 'D') {
    return { tier: 'Prime Grandstand', price: 40, fee: 4 };
  }
  return { tier: 'Standard Arena', price: 25, fee: 3 };
};

const SeatDashboard = () => {
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [authError, setAuthError] = useState(null);

  // UI State
  const [toast, setToast] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

  // User's confirmed tickets
  const myTickets = seats.filter(
    (seat) => seat.status === 'BOOKED' && seat.bookedBy === currentUser?.id
  );

  // ==========================================
  // 2. HELPER FUNCTIONS
  // ==========================================
  const showToast = (message, type = 'error', duration = 3500) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // 3. DATA FETCHING & WARM-UP RECOVERY
  // ==========================================
  const fetchSeats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/seats`);
      if (!response.ok) throw new Error('Failed to fetch seats');
      const data = await response.json();

      const sortedSeats = data.sort((a, b) => {
        const rowA = a.seatId.charAt(0);
        const colA = parseInt(a.seatId.slice(1));
        const rowB = b.seatId.charAt(0);
        const colB = parseInt(b.seatId.slice(1));

        if (rowA === rowB) {
          return colA - colB;
        }
        return rowA.localeCompare(rowB);
      });

      setSeats(sortedSeats);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const wakeUpServer = async () => {
    let isAwake = false;
    let attempt = 0;

    while (!isAwake) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_URL}/wakeup`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          isAwake = true;
          fetchSeats();
          break;
        }
      } catch {
        if (attempt === 0) {
          showToast('Connecting to arena backend...', 'warning', 8000);
        }
      }
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  };

  // ==========================================
  // 4. EFFECTS & WEBSOCKET ENGINE
  // ==========================================
  useEffect(() => {
    if (!currentUser) return;

    const socket = io(API_URL, {
      query: { userId: currentUser.id }
    });

    socket.on('seatUpdated', (updatedData) => {
      setSeats((prevSeats) =>
        prevSeats.map((seat) =>
          seat.seatId === updatedData.seatId
            ? { ...seat, status: updatedData.status }
            : seat
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser, API_URL]);

  useEffect(() => {
    let timer;
    if (selectedSeat) {
      setTimeLeft(300);
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [selectedSeat]);

  useEffect(() => {
    if (timeLeft === 0 && selectedSeat) {
      showToast('Hold expired. Seat returned to arena pool.', 'warning');
      handleCancelSeat();
    }
  }, [timeLeft, selectedSeat]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('seat_booking_user_id');
    const savedUserName = localStorage.getItem('seat_booking_user_name');

    if (savedUserId && savedUserName) {
      setCurrentUser({ id: savedUserId, name: savedUserName });
      wakeUpServer();
    } else {
      setShowWelcomeModal(true);
      wakeUpServer();
    }
  }, []);

  // ==========================================
  // 5. API TRANSACTIONS
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);

    try {
      let endpoint = `${API_URL}/api/users`;
      let payload = {};

      if (isLoginMode) {
        if (!emailInput.trim() || !passwordInput) {
          const msg = 'Email and password are required';
          setAuthError(msg);
          showToast(msg, 'error');
          return;
        }
        endpoint = `${API_URL}/api/users/login`;
        payload = { email: emailInput.trim(), password: passwordInput };
      } else {
        if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
          const msg = 'All fields are required';
          setAuthError(msg);
          showToast(msg, 'error');
          return;
        }
        if (passwordInput.length < 6) {
          const msg = 'Password must be at least 6 characters';
          setAuthError(msg);
          showToast(msg, 'error');
          return;
        }
        payload = {
          username: nameInput.trim(),
          email: emailInput.trim(),
          password: passwordInput
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const userData = await response.json();

      if (!response.ok) {
        throw new Error(userData.error || 'Authentication failed');
      }

      localStorage.setItem('seat_booking_user_id', userData._id);
      localStorage.setItem('seat_booking_user_name', userData.username);
      localStorage.setItem('seat_booking_user_email', userData.email);

      setCurrentUser({ id: userData._id, name: userData.username });
      setPasswordInput('');
      setAuthError(null);
      setShowWelcomeModal(false);
      showToast(`Welcome to the Arena, ${userData.username}!`, 'success');
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError(error.message);
      showToast(error.message, 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('seat_booking_user_id');
    localStorage.removeItem('seat_booking_user_name');
    localStorage.removeItem('seat_booking_user_email');

    setCurrentUser(null);
    setNameInput('');
    setEmailInput('');
    setPasswordInput('');
    setAuthError(null);
    setIsLoginMode(true);
    setIsDrawerOpen(false);
    setShowWelcomeModal(true);
  };

  const handleSeatClick = async (seatId) => {
    if (!currentUser) {
      setShowWelcomeModal(true);
      return;
    }

    // Single-Seat Hold Policy: User can only hold one seat at a time
    if (selectedSeat && selectedSeat !== seatId) {
      showToast(
        `You are currently holding seat ${selectedSeat}. Complete purchase or cancel it before selecting another.`,
        'warning',
        4500
      );
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/seats/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, userId: currentUser.id })
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Failed to hold seat', 'error');
        fetchSeats();
        return;
      }

      setSeats((prevSeats) =>
        prevSeats.map((seat) =>
          seat.seatId === seatId ? { ...seat, status: 'LOCKED' } : seat
        )
      );
      setSelectedSeat(seatId);
    } catch (error) {
      console.error('Lock error:', error);
      showToast('Network error while holding seat', 'error');
    }
  };

  const handleBookSeat = async () => {
    try {
      const response = await fetch(`${API_URL}/api/seats/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId: selectedSeat, userId: currentUser.id })
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Checkout expired', 'error');
        setSelectedSeat(null);
        fetchSeats();
        return;
      }

      setSeats((prevSeats) =>
        prevSeats.map((seat) =>
          seat.seatId === selectedSeat
            ? { ...seat, status: 'BOOKED', bookedBy: currentUser.id }
            : seat
        )
      );

      const confirmedSeatId = selectedSeat;
      setSelectedSeat(null);
      showToast(`Pass confirmed for seat ${confirmedSeatId}!`, 'success');
    } catch (error) {
      console.error('Booking error:', error);
      showToast('Network error during checkout', 'error');
    }
  };

  const handleCancelSeat = async () => {
    if (!selectedSeat) return;

    try {
      await fetch(`${API_URL}/api/seats/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId: selectedSeat, userId: currentUser.id })
      });

      setSeats((prevSeats) =>
        prevSeats.map((seat) =>
          seat.seatId === selectedSeat ? { ...seat, status: 'AVAILABLE' } : seat
        )
      );
      setSelectedSeat(null);
    } catch (error) {
      console.error('Cancel error:', error);
      setSelectedSeat(null);
    }
  };

  const handleUnbookSeat = async (seatId) => {
    try {
      const response = await fetch(`${API_URL}/api/seats/unbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, userId: currentUser.id })
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Failed to release seat', 'error');
        return;
      }

      setSeats((prevSeats) =>
        prevSeats.map((seat) =>
          seat.seatId === seatId ? { ...seat, status: 'AVAILABLE', bookedBy: null } : seat
        )
      );

      showToast(`Seat ${seatId} released back to inventory`, 'success');
    } catch (error) {
      console.error('Unbook error:', error);
      showToast('Network error while releasing ticket', 'error');
    }
  };

  // Group seats by row (A..E)
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const groupedSeats = rows.reduce((acc, row) => {
    acc[row] = seats.filter((s) => s.seatId.startsWith(row));
    return acc;
  }, {});

  // ==========================================
  // 6. RENDER LOGIC
  // ==========================================
  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0a0d14] text-cyan-400 gap-3">
        <div className="w-7 h-7 border-2 border-cyan-950 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-widest uppercase text-zinc-400">
          Loading Arena Blueprint...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0a0d14] text-red-400 gap-2">
        <span className="text-sm font-mono">Initialization Error: {error}</span>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg hover:bg-zinc-800 text-white mt-2"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const selectedMeta = selectedSeat ? getSeatMeta(selectedSeat) : null;

  return (
    <div className="min-h-screen bg-[#0a0d14] font-sans selection:bg-cyan-500/20 text-zinc-100">
      
      {/* -------------------------------------- */}
      {/* TOAST SYSTEM (ELEVATED Z-100)          */}
      {/* -------------------------------------- */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-5 left-0 right-0 z-100 flex justify-center pointer-events-none px-4">
            <motion.div
              initial={{ y: -40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              className={`px-4 py-2.5 rounded-full shadow-2xl border text-xs font-medium tracking-wide flex items-center gap-2.5 pointer-events-auto backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'bg-zinc-950/90 border-cyan-500/30 text-cyan-300'
                  : toast.type === 'warning'
                  ? 'bg-zinc-950/90 border-amber-500/30 text-amber-300'
                  : 'bg-zinc-950/90 border-red-500/30 text-red-300'
              }`}
            >
              <span>
                {toast.type === 'success' ? (
                  <Icons.Check />
                ) : toast.type === 'warning' ? (
                  <Icons.Clock />
                ) : (
                  <Icons.Lock />
                )}
              </span>
              <span>{toast.message}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------- */}
      {/* TOP HEADER                             */}
      {/* -------------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0d14]/80 backdrop-blur-md px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Arena Branding */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-black text-xs shadow-sm">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-white">Grand Symphony Arena</h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                  Hall 1
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">Live Spatial Concurrency Grid</p>
            </div>
          </div>

          {/* Quick Status Legend (Desktop) */}
          <div className="hidden md:flex items-center gap-5 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300">Reserved (5m)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <span className="text-zinc-600">Booked</span>
            </div>
          </div>

          {/* User Controls & Ticket Drawer */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 transition-colors"
                >
                  <Icons.Ticket />
                  <span className="font-medium">My Passes</span>
                  {myTickets.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-cyan-400 text-black text-[10px] font-bold flex items-center justify-center">
                      {myTickets.length}
                    </span>
                  )}
                </button>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-mono">{currentUser.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors underline underline-offset-2"
                  >
                    Exit
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowWelcomeModal(true)}
                className="px-4 py-1.5 rounded-full text-xs font-medium bg-cyan-400 hover:bg-cyan-300 text-black transition-all shadow-sm font-semibold"
              >
                Sign In
              </button>
            )}
          </div>

        </div>
      </header>

      {/* -------------------------------------- */}
      {/* ARENA STUDIO: SPLIT-SCREEN LAYOUT      */}
      {/* -------------------------------------- */}
      <main className="max-w-7xl mx-auto px-4 py-8 lg:px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left 8 Columns: Interactive Grandstand */}
          <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-8 backdrop-blur-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <span className="text-xs uppercase font-mono tracking-widest text-cyan-400">
                  Arena Seating Map
                </span>
                <p className="text-xs text-zinc-500 mt-0.5">5 Concentric Tiers • 50 Premium Seats</p>
              </div>

              {/* Tier Price Tags */}
              <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[11px]">
                  Rows A-B: $65 (VIP)
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px]">
                  Rows C-D: $40
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5 text-[11px]">
                  Row E: $25
                </span>
              </div>
            </div>

            {/* Stage Projection */}
            <div className="w-full py-4 rounded-xl bg-linear-to-r from-cyan-950/20 via-cyan-900/30 to-cyan-950/20 border border-cyan-500/20 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-b from-cyan-400/5 to-transparent pointer-events-none" />
              <span className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
                Main Arena Stage · Live Acoustic Array
              </span>
            </div>

            {/* Seating Grid Container */}
            <div className="overflow-x-auto pb-4">
              <div className="min-w-120 flex flex-col gap-3">
                {rows.map((rowLetter) => (
                  <div key={rowLetter} className="flex items-center justify-center gap-3">
                    <span className="w-6 text-xs font-mono font-bold text-zinc-500 text-center">
                      {rowLetter}
                    </span>

                    <div className="grid grid-cols-10 gap-2 sm:gap-2.5">
                      {(groupedSeats[rowLetter] || []).map((seat) => {
                        const isAvailable = seat.status === 'AVAILABLE';
                        const isLocked = seat.status === 'LOCKED';
                        const isSelected = selectedSeat === seat.seatId;
                        const hasActiveHold = Boolean(selectedSeat);

                        return (
                          <button
                            key={seat.seatId}
                            disabled={!isAvailable}
                            onClick={() => handleSeatClick(seat.seatId)}
                            title={`Seat ${seat.seatId} • ${getSeatMeta(seat.seatId).tier} ($${getSeatMeta(seat.seatId).price})`}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-xs font-mono font-medium transition-all duration-200 relative group flex items-center justify-center ${
                              isSelected
                                ? 'bg-cyan-400 text-black font-black shadow-[0_0_15px_rgba(34,211,238,0.6)] scale-105 ring-2 ring-cyan-300 ring-offset-2 ring-offset-black'
                                : isAvailable
                                ? hasActiveHold
                                  ? 'bg-zinc-900/60 border border-zinc-700/40 text-zinc-400 hover:border-amber-400/80 hover:text-amber-300 cursor-pointer'
                                  : 'bg-zinc-900/90 border border-zinc-700/80 text-zinc-200 hover:border-cyan-400 hover:text-white hover:scale-105 cursor-pointer'
                                : isLocked
                                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400 cursor-not-allowed animate-pulse'
                                : 'bg-zinc-950 border border-zinc-900 text-zinc-700 cursor-not-allowed opacity-40'
                            }`}
                          >
                            <span>{seat.seatId}</span>
                          </button>
                        );
                      })}
                    </div>

                    <span className="w-6 text-xs font-mono font-bold text-zinc-500 text-center">
                      {rowLetter}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Single-Seat Hold Hint */}
            {selectedSeat && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Icons.Info />
                  <span>
                    You currently hold seat <strong>{selectedSeat}</strong>. To select a different seat, confirm or release this one first.
                  </span>
                </span>
                <button
                  onClick={handleCancelSeat}
                  className="text-amber-400 hover:text-amber-200 underline font-semibold text-[11px] shrink-0 ml-2"
                >
                  Release Hold
                </button>
              </div>
            )}
          </div>

          {/* Right 4 Columns: Persistent Order Inspector */}
          <div className="lg:col-span-4 p-6 sm:p-7 rounded-2xl bg-zinc-950 border border-white/10 space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-sm font-semibold text-white tracking-tight">Order Inspector</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Real-time concurrency checkout</p>
            </div>

            {selectedSeat ? (
              <div className="space-y-4">
                {/* Seat Detail Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Selected Coordinate</span>
                    <span className="text-base font-mono font-black text-cyan-300">{selectedSeat}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Tier Category</span>
                    <span className="text-white font-medium">{selectedMeta.tier}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Base Ticket Price</span>
                    <span className="text-white font-mono">${selectedMeta.price}.00</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Arena & Audio Facility Fee</span>
                    <span className="text-white font-mono">${selectedMeta.fee}.00</span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-white">Total Due</span>
                    <span className="text-cyan-300 font-mono text-base">
                      ${selectedMeta.price + selectedMeta.fee}.00
                    </span>
                  </div>
                </div>

                {/* Expiration Countdown Bar */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs">
                  <span className="text-amber-300 flex items-center gap-1.5 font-medium">
                    <Icons.Clock />
                    Hold Expires In
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-sm tracking-wide">
                    {formatTime(timeLeft)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={handleBookSeat}
                    className="flex-1 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-cyan-400/20"
                  >
                    Confirm Seat ${selectedMeta.price + selectedMeta.fee}
                  </button>
                  <button
                    onClick={handleCancelSeat}
                    className="px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 border border-white/10 text-xs text-zinc-400 transition-colors"
                  >
                    Release
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-white/10 text-center text-zinc-500 space-y-3">
                <div className="w-10 h-10 rounded-full bg-white/5 mx-auto flex items-center justify-center text-zinc-400">
                  <Icons.Armchair className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-300">No Seat Selected</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Click any open seat in the grandstand to acquire a temporary 5-minute lock.
                  </p>
                </div>
              </div>
            )}

            {/* Concurrency Rules Banner */}
            <div className="pt-4 border-t border-white/5 text-[11px] text-zinc-500 space-y-1.5">
              <p className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                <span>Single-seat policy: Users may hold 1 seat at a time.</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                <span>Double-booking is prevented via atomic Redis mutex locks.</span>
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* -------------------------------------- */}
      {/* MOBILE STICKY FLOATING DOCK (<LG)      */}
      {/* -------------------------------------- */}
      {selectedSeat && (
        <div className="lg:hidden fixed bottom-5 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="w-full max-w-md p-3.5 rounded-2xl bg-zinc-950/95 border border-cyan-400/40 shadow-2xl backdrop-blur-xl pointer-events-auto flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center font-mono font-bold text-cyan-300 text-xs">
                {selectedSeat}
              </div>
              <div>
                <span className="text-xs font-bold text-white">
                  ${selectedMeta.price + selectedMeta.fee}
                </span>
                <span className="text-[10px] text-amber-400 font-mono ml-2">
                  ⏳ {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBookSeat}
                className="px-4 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold uppercase tracking-wide"
              >
                Confirm
              </button>
              <button
                onClick={handleCancelSeat}
                className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-red-400 text-xs"
              >
                <Icons.Close />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* -------------------------------------- */}
      {/* AUTHENTICATION MODAL                   */}
      {/* -------------------------------------- */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl space-y-5"
            >
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-cyan-400/10 border border-cyan-400/20 mx-auto flex items-center justify-center text-cyan-400 mb-2">
                  <Icons.User />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {isLoginMode ? 'Welcome Back' : 'Arena Pass Registration'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {isLoginMode ? 'Enter credentials to resume your session' : 'Create an account to lock and purchase seats'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {!isLoginMode && (
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => {
                        setNameInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="e.g. AlexMorgan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-cyan-400/60"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-cyan-400/60"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Min. 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-cyan-400/60 pr-12"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-zinc-200 font-mono"
                    >
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>

                {/* Inline Auth Error Banner */}
                {authError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
                    <span className="text-red-400 shrink-0">
                      <Icons.Lock />
                    </span>
                    <span className="leading-snug">{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold uppercase tracking-wider transition-all mt-2"
                >
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setPasswordInput('');
                    setAuthError(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-cyan-300 transition-colors"
                >
                  {isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------- */}
      {/* USER TICKETS DRAWER                    */}
      {/* -------------------------------------- */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsDrawerOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full sm:max-w-md h-full bg-zinc-950 border-l border-white/10 p-6 flex flex-col justify-between z-10 shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div className="flex items-center gap-2">
                    <Icons.Ticket />
                    <h3 className="text-sm font-semibold text-white">Your Confirmed Passes</h3>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <Icons.Close />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
                  {myTickets.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-white/5 mx-auto flex items-center justify-center text-zinc-400">
                        <Icons.Ticket />
                      </div>
                      <p className="text-xs">No active tickets found.</p>
                      <p className="text-[11px] text-zinc-600">Select any open seat in the arena to purchase a pass.</p>
                    </div>
                  ) : (
                    myTickets.map((ticket) => (
                      <div
                        key={ticket.seatId}
                        className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-3 relative overflow-hidden"
                      >
                        {/* Ticket Notches */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-950 border-r border-white/10" />
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-950 border-l border-white/10" />

                        <div className="flex justify-between items-start pl-2 pr-2">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                              {getSeatMeta(ticket.seatId).tier}
                            </span>
                            <h4 className="text-2xl font-mono font-black text-white">{ticket.seatId}</h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            CONFIRMED
                          </span>
                        </div>

                        <div className="h-px border-t border-dashed border-white/10 pl-2 pr-2" />

                        <div className="flex justify-between items-center text-xs pl-2 pr-2">
                          <span className="text-zinc-500 text-[11px]">Grand Symphony Pass</span>
                          <button
                            onClick={() => handleUnbookSeat(ticket.seatId)}
                            className="text-[11px] text-red-400 hover:text-red-300 underline underline-offset-2"
                          >
                            Release Pass
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 text-center">
                <span className="text-[10px] font-mono text-zinc-500">
                  Grand Symphony Arena • Digital Access Engine
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SeatDashboard;
