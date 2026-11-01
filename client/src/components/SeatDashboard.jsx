/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ============================================================================
 * ARCHITECTURAL THEATER SEATING SYSTEM (Anti-Slop Design)
 * ============================================================================
 * Modeled after world-class cultural institutions (Lincoln Center, Royal Opera House).
 * Principles:
 * - 0% generic AI slop: No neon glow halos, no gamer laser colors, no buzzwords.
 * - Architectural physical truth: Real center aisle (Left & Right Stalls), stage apron,
 *   authentic ticket ledger, and physical admission stubs with barcodes.
 * - Real-time concurrency: Atomic Redis locks, single-seat hold policy, and 5-min timer.
 */

// Elegant, minimal vector iconography
const Icons = {
  Armchair: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 19v2M18 19v2M4 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6z" />
      <path d="M6 9V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
      <path d="M4 12h2v4H4zM18 12h2v4h-2z" />
    </svg>
  ),
  Clock: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Ticket: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2M13 17v2M13 11v2" />
    </svg>
  ),
  User: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Check: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Close: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Info: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  Lock: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Barcode: () => (
    <svg className="w-full h-10 text-zinc-300" viewBox="0 0 200 40" fill="currentColor">
      <rect x="0" y="0" width="3" height="40" />
      <rect x="5" y="0" width="1" height="40" />
      <rect x="8" y="0" width="4" height="40" />
      <rect x="15" y="0" width="2" height="40" />
      <rect x="20" y="0" width="5" height="40" />
      <rect x="28" y="0" width="1" height="40" />
      <rect x="32" y="0" width="3" height="40" />
      <rect x="38" y="0" width="2" height="40" />
      <rect x="44" y="0" width="4" height="40" />
      <rect x="51" y="0" width="1" height="40" />
      <rect x="55" y="0" width="3" height="40" />
      <rect x="62" y="0" width="6" height="40" />
      <rect x="71" y="0" width="2" height="40" />
      <rect x="76" y="0" width="4" height="40" />
      <rect x="83" y="0" width="1" height="40" />
      <rect x="87" y="0" width="5" height="40" />
      <rect x="95" y="0" width="3" height="40" />
      <rect x="101" y="0" width="2" height="40" />
      <rect x="106" y="0" width="4" height="40" />
      <rect x="113" y="0" width="2" height="40" />
      <rect x="118" y="0" width="5" height="40" />
      <rect x="126" y="0" width="1" height="40" />
      <rect x="130" y="0" width="3" height="40" />
      <rect x="136" y="0" width="4" height="40" />
      <rect x="143" y="0" width="2" height="40" />
      <rect x="148" y="0" width="6" height="40" />
      <rect x="157" y="0" width="1" height="40" />
      <rect x="161" y="0" width="3" height="40" />
      <rect x="167" y="0" width="4" height="40" />
      <rect x="174" y="0" width="2" height="40" />
      <rect x="179" y="0" width="5" height="40" />
      <rect x="187" y="0" width="2" height="40" />
      <rect x="192" y="0" width="4" height="40" />
      <rect x="198" y="0" width="2" height="40" />
    </svg>
  )
};

// Seat & Pricing Specifications (Grounded cultural venue tiers)
const getSeatMeta = (seatId) => {
  const row = seatId.charAt(0);
  if (row === 'A' || row === 'B') {
    return {
      tier: 'Stalls Orchestra',
      description: 'Front stalls with direct acoustic line to stage',
      price: 65,
      fee: 4.50
    };
  }
  if (row === 'C' || row === 'D') {
    return {
      tier: 'Grand Tier',
      description: 'Elevated mid-tier with complete stage panoramic sightline',
      price: 45,
      fee: 3.50
    };
  }
  return {
    tier: 'Balcony Promenade',
    description: 'Acoustically tuned upper circle seating',
    price: 28,
    fee: 2.50
  };
};

/**
 * Seat Styling Logic:
 * Non-slop: crisp borders, confident fills, 0% neon halos.
 */
const getSeatClasses = (seat, isSelected, hasActiveHold) => {
  if (isSelected) {
    // Pure bone-white fill with dark charcoal numeral: maximum clarity & confidence
    return 'bg-white text-zinc-950 font-bold shadow-md scale-105 ring-2 ring-white ring-offset-2 ring-offset-[#0c0e12] z-10 cursor-pointer';
  }

  if (seat.status === 'AVAILABLE') {
    if (hasActiveHold) {
      return 'bg-[#151821] border border-zinc-700/60 text-zinc-400 hover:border-amber-400/80 hover:text-amber-200 cursor-pointer';
    }
    return 'bg-[#181c26] border border-zinc-700/80 text-zinc-200 hover:border-zinc-300 hover:text-white hover:bg-[#202533] cursor-pointer';
  }

  if (seat.status === 'LOCKED') {
    return 'bg-amber-950/20 border border-amber-600/40 text-amber-400/90 cursor-not-allowed animate-pulse';
  }

  // Booked / Taken
  return 'bg-[#101217] border border-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-35';
};

const SeatDashboard = () => {
  // Concurrency & Seating State
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Drawer & Notification State
  const [toast, setToast] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

  // Confirmed passes
  const myTickets = seats.filter(
    (seat) => seat.status === 'BOOKED' && seat.bookedBy === currentUser?.id
  );

  const showToast = (message, type = 'error', duration = 3500) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --------------------------------------------------------------------------
  // Data Fetching & WebSockets
  // --------------------------------------------------------------------------
  const fetchSeats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/seats`);
      if (!response.ok) throw new Error('Unable to connect to box office service');
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
          showToast('Connecting to box office server...', 'warning', 6000);
        }
      }
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  };

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

  // 5-Minute Hold Timer
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
      showToast('Reservation window expired. Seat returned to box office inventory.', 'warning');
      handleCancelSeat();
    }
  }, [timeLeft, selectedSeat]);

  // Local Storage Session Init
  useEffect(() => {
    const savedUserId = localStorage.getItem('seat_booking_user_id');
    const savedUserName = localStorage.getItem('seat_booking_user_name');

    if (savedUserId && savedUserName) {
      setCurrentUser({ id: savedUserId, name: savedUserName });
      wakeUpServer();
    } else {
      setShowAuthModal(true);
      wakeUpServer();
    }
  }, []);

  // --------------------------------------------------------------------------
  // Concurrency Transactions
  // --------------------------------------------------------------------------
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
      setShowAuthModal(false);
      showToast(`Welcome, ${userData.username}`, 'success');
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
    setShowAuthModal(true);
  };

  const handleSeatClick = async (seatId) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    // Single-Seat Hold Policy: User may only hold 1 seat at a time
    if (selectedSeat && selectedSeat !== seatId) {
      showToast(
        `You currently hold seat ${selectedSeat}. Complete booking or release it before choosing seat ${seatId}.`,
        'warning',
        4000
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
        showToast(result.error || 'Seat could not be reserved', 'error');
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
      showToast('Network error while requesting seat hold', 'error');
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
        showToast(result.error || 'Reservation expired', 'error');
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
      showToast(`Admission confirmed for seat ${confirmedSeatId}. Ticket generated.`, 'success');
      setIsDrawerOpen(true);
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
        showToast(result.error || 'Failed to release pass', 'error');
        return;
      }

      setSeats((prevSeats) =>
        prevSeats.map((seat) =>
          seat.seatId === seatId ? { ...seat, status: 'AVAILABLE', bookedBy: null } : seat
        )
      );

      showToast(`Pass for seat ${seatId} cancelled and refunded`, 'success');
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

  // Metrics
  const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0c0e12] text-zinc-300 gap-3">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
          Loading Auditorium Plan...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0c0e12] text-zinc-300 gap-3">
        <span className="text-sm text-red-400 font-mono">Service Error: {error}</span>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-xs bg-zinc-800 text-white rounded-md hover:bg-zinc-700 cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const selectedMeta = selectedSeat ? getSeatMeta(selectedSeat) : null;
  const totalDue = selectedMeta ? (selectedMeta.price + selectedMeta.fee).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* -------------------------------------------------------------------- */}
      {/* ACCESSIBLE LIVE ANNOUNCEMENT TOAST                                   */}
      {/* -------------------------------------------------------------------- */}
      <AnimatePresence>
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4"
          >
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className={`px-4 py-2.5 rounded-lg border text-xs font-medium tracking-wide flex items-center gap-2.5 pointer-events-auto shadow-2xl backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-zinc-900/95 border-emerald-500/40 text-emerald-300'
                  : toast.type === 'warning'
                  ? 'bg-zinc-900/95 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-900/95 border-red-500/40 text-red-300'
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

      {/* -------------------------------------------------------------------- */}
      {/* TOP INSTITUTIONAL NAVIGATION                                         */}
      {/* -------------------------------------------------------------------- */}
      <header className="border-b border-white/10 bg-[#0c0e12]/95 sticky top-0 z-30 px-6 lg:px-12 py-3.5 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Institutional Venue Identity */}
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-wider uppercase text-white font-serif">
                  The Royal Pavilion
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Hall A
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Box Office & Seat Reservation</p>
            </div>
          </div>

          {/* Show Name (Center) */}
          <div className="hidden md:block text-center">
            <h2 className="text-xs font-medium text-zinc-200">
              London Symphony Orchestra · Dvořák Symphony No. 9
            </h2>
            <span className="text-[11px] text-zinc-400 font-mono">
              Saturday, 14 November 2026 • 19:30 GMT
            </span>
          </div>

          {/* User Account & Passes */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  aria-label={`View your confirmed passes (${myTickets.length})`}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                >
                  <Icons.Ticket />
                  <span>My Passes</span>
                  {myTickets.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white text-zinc-950 text-[10px] font-bold flex items-center justify-center">
                      {myTickets.length}
                    </span>
                  )}
                </button>
                <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-mono">{currentUser.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 cursor-pointer"
                  >
                    Exit
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-white hover:bg-zinc-200 text-zinc-950 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>

        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* AUDITORIUM & ORDER INSPECTOR GRID                                    */}
      {/* -------------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left 8 Columns: Physical Seating Plan */}
          <div className="lg:col-span-8 bg-[#12151c] border border-white/10 rounded-xl p-6 sm:p-8 space-y-8">
            
            {/* Header: Overview & Availability */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Auditorium Seating Plan
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  50 Allocated Seats • {availableCount} Available
                </p>
              </div>

              {/* Tier Legend (Compact, Architectural) */}
              <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#181c26] border border-zinc-700" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/20 border border-amber-500/40" />
                  <span className="text-amber-300">5m Hold</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#101217] border border-zinc-800" />
                  <span className="text-zinc-600">Booked</span>
                </div>
              </div>
            </div>

            {/* Stage Apron & Orchestra Pit Representation */}
            <div className="w-full text-center space-y-2">
              <div className="w-full h-8 rounded-t-3xl border-t border-x border-zinc-700 bg-linear-to-b from-zinc-800/40 to-transparent flex items-center justify-center relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent pointer-events-none"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
                <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase relative z-10">
                  Stage & Orchestra Pit
                </span>
              </div>
              <div className="w-3/4 mx-auto border-b border-dashed border-zinc-800" />
            </div>

            {/* Seating Grid with Authentic Center Aisle Split (Seats 1-5 | Aisle | Seats 6-10) */}
            <div className="overflow-x-auto pb-4">
              <div className="min-w-120 flex flex-col gap-3">
                {rows.map((rowLetter) => {
                  const rowSeats = groupedSeats[rowLetter] || [];
                  const leftBlock = rowSeats.slice(0, 5);
                  const rightBlock = rowSeats.slice(5, 10);

                  return (
                    <div key={rowLetter} className="flex items-center justify-center gap-3">
                      
                      {/* Left Row Label */}
                      <span className="w-6 text-xs font-mono font-medium text-zinc-500 text-center">
                        {rowLetter}
                      </span>

                      {/* Left Block (Seats 1..5) */}
                      <div className="flex gap-2">
                        {leftBlock.map((seat) => {
                          const isAvailable = seat.status === 'AVAILABLE';
                          const isSelected = selectedSeat === seat.seatId;
                          const hasActiveHold = Boolean(selectedSeat);
                          const meta = getSeatMeta(seat.seatId);
                          const statusLabel = isSelected
                            ? 'Held by you'
                            : seat.status === 'AVAILABLE'
                            ? 'Available'
                            : seat.status === 'LOCKED'
                            ? 'Temporarily reserved'
                            : 'Booked';

                          return (
                            <motion.button
                              key={seat.seatId}
                              disabled={!isAvailable}
                              onClick={() => handleSeatClick(seat.seatId)}
                              whileHover={isAvailable ? { scale: 1.08, y: -1 } : undefined}
                              whileTap={isAvailable ? { scale: 0.94 } : undefined}
                              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                              title={`Seat ${seat.seatId} • ${meta.tier} ($${meta.price})`}
                              aria-label={`Seat ${seat.seatId}, ${meta.tier}, $${meta.price}, ${statusLabel}`}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md text-xs font-mono font-medium transition-colors duration-150 relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${getSeatClasses(
                                seat,
                                isSelected,
                                hasActiveHold
                              )}`}
                            >
                              <span>{seat.seatId}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Center Aisle (Walkway Gap) */}
                      <div className="w-6 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-mono text-zinc-600 select-none">|</span>
                      </div>

                      {/* Right Block (Seats 6..10) */}
                      <div className="flex gap-2">
                        {rightBlock.map((seat) => {
                          const isAvailable = seat.status === 'AVAILABLE';
                          const isSelected = selectedSeat === seat.seatId;
                          const hasActiveHold = Boolean(selectedSeat);
                          const meta = getSeatMeta(seat.seatId);
                          const statusLabel = isSelected
                            ? 'Held by you'
                            : seat.status === 'AVAILABLE'
                            ? 'Available'
                            : seat.status === 'LOCKED'
                            ? 'Temporarily reserved'
                            : 'Booked';

                          return (
                            <motion.button
                              key={seat.seatId}
                              disabled={!isAvailable}
                              onClick={() => handleSeatClick(seat.seatId)}
                              whileHover={isAvailable ? { scale: 1.08, y: -1 } : undefined}
                              whileTap={isAvailable ? { scale: 0.94 } : undefined}
                              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                              title={`Seat ${seat.seatId} • ${meta.tier} ($${meta.price})`}
                              aria-label={`Seat ${seat.seatId}, ${meta.tier}, $${meta.price}, ${statusLabel}`}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md text-xs font-mono font-medium transition-colors duration-150 relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${getSeatClasses(
                                seat,
                                isSelected,
                                hasActiveHold
                              )}`}
                            >
                              <span>{seat.seatId}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Right Row Label */}
                      <span className="w-6 text-xs font-mono font-medium text-zinc-500 text-center">
                        {rowLetter}
                      </span>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aisle & Tier Guide Footer */}
            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
              <div className="flex items-center gap-4">
                <span className="text-zinc-300">Rows A–B: Stalls Orchestra ($65)</span>
                <span className="text-zinc-400">Rows C–D: Grand Tier ($45)</span>
                <span className="text-zinc-500">Row E: Balcony ($28)</span>
              </div>
              <span className="font-mono text-[11px] text-zinc-500">Center Aisle Division</span>
            </div>

            {/* Single-Seat Hold Notice */}
            {selectedSeat && (
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Icons.Info />
                  <span>
                    You currently hold seat <strong>{selectedSeat}</strong>. Single-seat reservation in progress.
                  </span>
                </span>
                <button
                  onClick={handleCancelSeat}
                  className="text-amber-400 hover:text-white underline text-[11px] font-medium shrink-0 ml-2 cursor-pointer"
                >
                  Release Hold
                </button>
              </div>
            )}

          </div>

          {/* Right 4 Columns: Authentic Order Slip Ledger */}
          <div className="lg:col-span-4 bg-[#12151c] border border-white/10 rounded-xl p-6 sm:p-7 space-y-6">
            
            <div className="border-b border-white/10 pb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Reservation Summary
              </span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-1">
                Admission Ledger
              </h3>
            </div>

            <AnimatePresence mode="wait">
              {selectedSeat ? (
                <motion.div
                  key={selectedSeat}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  
                  {/* Seat Detail Block */}
                  <div className="p-4 rounded-lg bg-[#181c26] border border-white/10 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[11px] text-zinc-400 font-mono">SEAT NUMBER</span>
                        <h4 className="text-2xl font-mono font-bold text-white tracking-tight">
                          {selectedSeat}
                        </h4>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
                        {selectedMeta.tier}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {selectedMeta.description}
                    </p>
                  </div>

                  {/* Itemized Fee Breakdown (Complete Price Transparency) */}
                  <div className="space-y-2 text-xs border-b border-white/10 pb-4">
                    <div className="flex justify-between text-zinc-400">
                      <span>Base Admission</span>
                      <span className="font-mono text-zinc-200">${selectedMeta.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Restoration & Preservation Levy</span>
                      <span className="font-mono text-zinc-200">${selectedMeta.fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>VAT (Included)</span>
                      <span className="font-mono text-zinc-400">$0.00</span>
                    </div>
                    <div className="pt-2 flex justify-between items-center text-sm font-semibold text-white">
                      <span>Total Due</span>
                      <span className="font-mono text-base text-white">${totalDue}</span>
                    </div>
                  </div>

                  {/* 5-Minute Hold Timer Bar */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-300 flex items-center gap-1.5">
                        <Icons.Clock />
                        <span>Held Exclusively</span>
                      </span>
                      <span className="font-mono font-bold text-amber-200">
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                    {/* Depleting progress bar */}
                    <div className="w-full h-1 bg-amber-950/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
                        style={{ width: `${(timeLeft / 300) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Primary & Secondary Actions */}
                  <div className="space-y-2 pt-1">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBookSeat}
                      className="w-full py-3 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                    >
                      Confirm & Reserve Seat
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCancelSeat}
                      className="w-full py-2.5 rounded-lg bg-transparent hover:bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Release Hold
                    </motion.button>
                  </div>

                </motion.div>
              ) : (
                <motion.div
                  key="empty-ledger"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="py-12 px-4 rounded-lg border border-dashed border-white/10 text-center space-y-3"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-800 mx-auto flex items-center justify-center text-zinc-400">
                    <Icons.Armchair />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-200">No Seat Selected</p>
                    <p className="text-[11px] text-zinc-500 mt-1 max-w-xs mx-auto">
                      Choose any available coordinate on the seating plan to begin reservation.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Concurrency Integrity Notice */}
            <div className="pt-4 border-t border-white/5 text-[11px] text-zinc-500 space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <Icons.Lock />
                <span>Atomic Concurrency Lock</span>
              </div>
              <p className="leading-relaxed">
                When you select a seat, a Redis mutex lock reserves it for 5 minutes, preventing duplicate bookings.
              </p>
            </div>

          </div>

        </div>
      </main>

      {/* -------------------------------------------------------------------- */}
      {/* MOBILE STICKY FLOATING DOCK (<LG SCREENS)                            */}
      {/* -------------------------------------------------------------------- */}
      <AnimatePresence>
        {selectedSeat && (
          <div className="lg:hidden fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none flex justify-center">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full max-w-md p-3.5 rounded-xl bg-[#12151c] border border-white/20 shadow-2xl pointer-events-auto flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">Seat {selectedSeat}</span>
                  <span className="text-xs text-zinc-400 font-mono">${totalDue}</span>
                </div>
                <div className="text-[10px] text-amber-300 font-mono mt-0.5 flex items-center gap-1">
                  <Icons.Clock /> {formatTime(timeLeft)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBookSeat}
                  className="px-4 py-2 rounded-md bg-white text-zinc-950 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Confirm
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancelSeat}
                  aria-label="Release selected seat"
                  className="p-2 rounded-md bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <Icons.Close />
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------------- */}
      {/* AUTHENTICATION DIALOG                                                */}
      {/* -------------------------------------------------------------------- */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-sm rounded-xl bg-[#12151c] border border-white/10 p-6 shadow-2xl space-y-5"
            >
              <div className="text-center space-y-1">
                <span className="text-xs uppercase font-serif tracking-widest text-zinc-400">
                  The Royal Pavilion
                </span>
                <h3 className="text-lg font-semibold text-white tracking-tight">
                  {isLoginMode ? 'Patron Sign In' : 'Register Patron Account'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {isLoginMode ? 'Enter credentials to access your tickets' : 'Create an account to hold and confirm seating'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {!isLoginMode && (
                  <div>
                    <label htmlFor="auth-username" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Patron Name
                    </label>
                    <input
                      id="auth-username"
                      type="text"
                      value={nameInput}
                      onChange={(e) => {
                        setNameInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white"
                      required
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="patron@institution.org"
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white pr-12"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-white font-mono cursor-pointer"
                    >
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div role="alert" className="p-3 rounded-md bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <Icons.Lock />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-md bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold uppercase tracking-wider transition-colors mt-2 cursor-pointer"
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
                  className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isLoginMode ? "Need an account? Register" : 'Already registered? Sign in'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------------- */}
      {/* CONFIRMED PASSES DRAWER (Physical Ticket Stub Representation)        */}
      {/* -------------------------------------------------------------------- */}
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
              className="relative w-full sm:max-w-md h-full bg-[#12151c] border-l border-white/10 p-6 flex flex-col justify-between z-10 shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                      The Royal Pavilion
                    </span>
                    <h3 className="text-sm font-semibold text-white">Your Confirmed Passes</h3>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    aria-label="Close passes drawer"
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                  >
                    <Icons.Close />
                  </button>
                </div>

                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.08 }
                    }
                  }}
                  initial="hidden"
                  animate="visible"
                  className="space-y-5 overflow-y-auto max-h-[70vh] pr-1"
                >
                  {myTickets.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 mx-auto flex items-center justify-center text-zinc-400">
                        <Icons.Ticket />
                      </div>
                      <p className="text-xs">No admission passes on record.</p>
                      <p className="text-[11px] text-zinc-600">Select any open seat in Hall A to confirm a booking.</p>
                    </div>
                  ) : (
                    myTickets.map((ticket) => (
                      <motion.div
                        key={ticket.seatId}
                        variants={{
                          hidden: { opacity: 0, y: 14, scale: 0.97 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
                          }
                        }}
                        whileHover={{ y: -2, transition: { duration: 0.15 } }}
                        className="rounded-lg bg-[#181c26] border border-white/10 p-4 space-y-4 relative overflow-hidden shadow-sm"
                      >
                        {/* Notch cutouts */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#12151c] border-r border-white/10" />
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#12151c] border-l border-white/10" />

                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                              {getSeatMeta(ticket.seatId).tier}
                            </span>
                            <h4 className="text-2xl font-mono font-bold text-white tracking-tight">
                              Seat {ticket.seatId}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            VALIDATED
                          </span>
                        </div>

                        <div className="text-xs text-zinc-400 space-y-0.5">
                          <p className="text-white font-medium">London Symphony Orchestra</p>
                          <p>Hall A • Saturday 14 Nov 2026 • 19:30 GMT</p>
                        </div>

                        {/* Barcode component */}
                        <div className="pt-2 border-t border-dashed border-zinc-700/60">
                          <Icons.Barcode />
                          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-1">
                            <span>ENTRY CODE: PAVILION-2026-{ticket.seatId}</span>
                            <span>GATE 2</span>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-between items-center text-xs">
                          <span className="text-[11px] text-zinc-500 font-mono">Admission Granted</span>
                          <button
                            onClick={() => handleUnbookSeat(ticket.seatId)}
                            className="text-[11px] text-zinc-400 hover:text-red-400 underline underline-offset-2 cursor-pointer"
                          >
                            Cancel Pass & Refund
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </div>

              <div className="pt-4 border-t border-white/10 text-center text-[10px] font-mono text-zinc-500">
                The Royal Pavilion Box Office • Secure Admission System
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default SeatDashboard;
