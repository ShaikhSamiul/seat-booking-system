/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SeatDashboard Component
 * * The primary UI container for the VIP Seat Booking application.
 * This component manages real-time socket connections, grid state, 
 * user authentication, and ticket inventory management.
 */
const SeatDashboard = () => {
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const [seats, setSeats] = useState([]);               // The master array of all 50 seat objects
  const [loading, setLoading] = useState(true);         // Controls the initial loading skeleton
  const [error, setError] = useState(null);             // Global error state for fetch failures
  const [selectedSeat, setSelectedSeat] = useState(null); // The specific seat ID the user is currently holding
  const [timeLeft, setTimeLeft] = useState(300);        // 5-minute countdown timer (in seconds) for active locks
  
  // Authentication & User State
  const [currentUser, setCurrentUser] = useState(null); // The authenticated user object {id, name}
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(false); // Toggles between Register and Login UI
  
  // UI Specific State
  const [toast, setToast] = useState(null);             // Controls the custom floating notification {message, type}
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Controls the right-side ticket inventory panel

  // Environment Configuration: Safely grab the backend URL or default to localhost for local dev
  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Derived State: Dynamically filters the master seat array to find tickets owned by the active user
  const myTickets = seats.filter(
    seat => seat.status === 'BOOKED' && seat.bookedBy === currentUser?.id
  );

  // ==========================================
  // 2. HELPER FUNCTIONS
  // ==========================================
  
  /**
   * Triggers a custom Framer Motion toast notification that auto-dismisses.
   * @param {string} message - The text to display.
   * @param {string} type - 'success', 'warning', or 'error' (determines color).
   */
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  /**
   * Formats raw seconds into a digital MM:SS string layout.
   */
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Evaluates a seat's status and returns the corresponding Tailwind CSS class string.
   */
  const getSeatStyles = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-pointer';
      case 'LOCKED':
        return 'bg-amber-500/20 border-amber-500 text-amber-500 cursor-not-allowed animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]';
      case 'BOOKED':
        return 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50';
      default:
        return 'bg-gray-800 border-gray-600';
    }
  };

  // ==========================================
  // 3. EFFECTS & SUBSCRIPTIONS
  // ==========================================

  /**
   * WebSocket Initialization & Subscription
   * Establishes a persistent connection to the Express server once a user is authenticated.
   * Listens for 'seatUpdated' broadcasts to mutate local state without HTTP polling.
   */
  useEffect(() => {
    if (!currentUser) return;
    
    // Connect to Socket.io and pass the userId so the backend can track active connections
    const socket = io(API_URL, {
      query: { userId: currentUser.id } 
    });

    // Listen for global broadcasts indicating a seat changed status (Locked, Booked, or Available)
    socket.on('seatUpdated', (updatedData) => {
      setSeats((prevSeats) => 
        prevSeats.map((seat) => 
          seat.seatId === updatedData.seatId 
            ? { ...seat, status: updatedData.status } 
            : seat
        )
      );
    });

    // Cleanup function to prevent memory leaks when component unmounts
    return () => {
      socket.disconnect();
    };
  }, [currentUser, API_URL]);

  /**
   * Initial Data Fetch
   * Retrieves the master grid of all 50 seats on component mount.
   */
  useEffect(() => {
    fetchSeats();
  }, []);

  /**
   * Distributed Locking Timer
   * Manages the local 5-minute countdown clock when a user holds a seat.
   */
  useEffect(() => {
    let timer;
    if (selectedSeat) {
      setTimeLeft(300); // Reset to 5 minutes (300 seconds)
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [selectedSeat]);

  /**
   * Time Expiration Handler
   * Automatically triggers a release command if the countdown reaches zero.
   */
  useEffect(() => {
    if (timeLeft === 0 && selectedSeat) {
      showToast("Time expired! Your seat has been released.", "warning");
      handleCancelSeat(); 
    }
  }, [timeLeft, selectedSeat]);

  /**
   * Session Initialization
   * Checks browser LocalStorage to determine if a returning user needs to bypass the Auth Modal.
   */
  useEffect(() => {
    const savedUserId = localStorage.getItem('seat_booking_user_id');
    const savedUserName = localStorage.getItem('seat_booking_user_name');

    if (savedUserId && savedUserName) {
      setCurrentUser({ id: savedUserId, name: savedUserName });
      fetchSeats();
    } else {
      setShowWelcomeModal(true);
      fetchSeats(); 
    }
  }, []);


  // ==========================================
  // 4. API INTERACTIONS (HTTP)
  // ==========================================

  /**
   * Handles user registration or login via the Welcome Modal.
   */
  const handleAuthSubmit = async (e) => {
    e.preventDefault(); 
    
    try {
      let endpoint = `${API_URL}/api/users`;
      let payload = {};

      if (isLoginMode) {
        if (!emailInput.trim()) return;
        endpoint = `${API_URL}/api/users/login`;
        payload = { email: emailInput.trim() };
      } 
      else {
        if (!nameInput.trim() || !emailInput.trim()) return;
        payload = { username: nameInput.trim(), email: emailInput.trim() };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const userData = await response.json();

      if (!response.ok) {
        throw new Error(userData.error || 'Authentication failed');
      }

      // Persist session to LocalStorage
      localStorage.setItem('seat_booking_user_id', userData._id);
      localStorage.setItem('seat_booking_user_name', userData.username);
      localStorage.setItem('seat_booking_user_email', userData.email);

      setCurrentUser({ id: userData._id, name: userData.username });
      setShowWelcomeModal(false);

    } catch (error) {
      console.error('Auth error:', error);
      showToast(error.message, "error");
    }
  };

  /**
   * Destroys local session data and forces the user back to the Auth Modal.
   */
  const handleLogout = () => {
    localStorage.removeItem('seat_booking_user_id');
    localStorage.removeItem('seat_booking_user_name');
    localStorage.removeItem('seat_booking_user_email');

    setCurrentUser(null);
    setNameInput('');
    setEmailInput('');
    setIsLoginMode(true); 
    setIsDrawerOpen(false); 
    setShowWelcomeModal(true);
  };

  /**
   * Fetches the entire grid from MongoDB/Redis and sorts it alphanumerically (A1 -> J5).
   */
  const fetchSeats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/seats`);
      if (!response.ok) throw new Error('Failed to fetch seats');
      const data = await response.json();
      
      // Custom alphanumeric sort to prevent A10 from appearing before A2
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

  /**
   * Attempts to acquire a Redis lock for a specific seat.
   */
  const handleSeatClick = async (seatId) => {
    try {
      const response = await fetch(`${API_URL}/api/seats/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, userId: currentUser.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Failed to lock seat', "error");
        fetchSeats(); // Refresh grid in case our local state was stale
        return;
      }

      // Optimistically update UI to 'LOCKED' to provide instant feedback
      setSeats(prevSeats => 
        prevSeats.map(seat => 
          seat.seatId === seatId ? { ...seat, status: 'LOCKED' } : seat
        )
      );
      setSelectedSeat(seatId);

    } catch (error) {
      console.error('Error locking seat:', error);
      showToast('Network error while trying to lock the seat.', "error");
    }
  };

  /**
   * Commits an active Redis lock to the permanent MongoDB database.
   */
  const handleBookSeat = async () => {
    try {
      const response = await fetch(`${API_URL}/api/seats/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId: selectedSeat, userId: currentUser.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Failed to book seat', "error");
        setSelectedSeat(null);
        fetchSeats(); 
        return;
      }

      // Update UI and assign ownership to active user for instant Drawer injection
      setSeats(prevSeats => 
        prevSeats.map(seat => 
          seat.seatId === selectedSeat ? { ...seat, status: 'BOOKED', bookedBy: currentUser.id } : seat
        )
      );
      
      setSelectedSeat(null); 
      showToast(`Success! Seat ${selectedSeat} is permanently yours.`, "success");

    } catch (error) {
      console.error('Error booking seat:', error);
      showToast('Network error while trying to book the seat.', "error");
    }
  };

  /**
   * Voluntarily abandons an active Redis lock and returns the seat to the pool.
   */
  const handleCancelSeat = async () => {
    if (!selectedSeat) return;

    try {
      const response = await fetch(`${API_URL}/api/seats/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId: selectedSeat, userId: currentUser.id }),
      });

      if (!response.ok) {
        console.error('Failed to unlock on server, but closing UI anyway.');
      }

      setSeats(prevSeats => 
        prevSeats.map(seat => 
          seat.seatId === selectedSeat ? { ...seat, status: 'AVAILABLE' } : seat
        )
      );
      
      setSelectedSeat(null);

    } catch (error) {
      console.error('Error canceling seat:', error);
      setSelectedSeat(null); 
    }
  };

  /**
   * Revokes ownership of a previously purchased ticket and clears the MongoDB record.
   */
  const handleUnbookSeat = async (seatId) => {
    try {
      const response = await fetch(`${API_URL}/api/seats/unbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, userId: currentUser.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Failed to release seat', "error");
        return;
      }

      // Strip ownership data from local state to instantly remove it from the Drawer
      setSeats(prevSeats => 
        prevSeats.map(seat => 
          seat.seatId === seatId ? { ...seat, status: 'AVAILABLE', bookedBy: null } : seat
        )
      );
      
      showToast(`Seat ${seatId} has been successfully released.`, "success");

    } catch (error) {
      console.error('Error unbooking seat:', error);
      showToast('Network error while trying to release the seat.', "error");
    }
  };


  // ==========================================
  // 5. RENDER PHASE
  // ==========================================

  // Render initial Loading Screen
  if (loading) return <div className="flex h-screen items-center justify-center text-xl md:text-2xl font-bold tracking-widest text-emerald-400 animate-pulse">INITIALIZING GRID...</div>;
  
  // Render absolute Error Screen
  if (error) return <div className="text-red-500 text-center mt-20">Error: {error}</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
      
      {/* -------------------------------------- */}
      {/* GLOBAL TOAST NOTIFICATION              */}
      {/* -------------------------------------- */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-4 md:top-10 left-0 right-0 z-200 flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`w-full max-w-sm md:max-w-md px-4 py-3 md:px-6 md:py-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-center justify-center gap-3 pointer-events-auto ${
                toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' :
                toast.type === 'warning' ? 'bg-amber-900/90 border-amber-500 text-amber-100' :
                'bg-red-900/90 border-red-500 text-red-100'
              }`}>
              <span className="text-xl">
                {toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⏳' : '⚠️'}
              </span>
              <span className="font-medium tracking-wide text-sm md:text-base text-center">{toast.message}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------- */}
      {/* TOP NAVIGATION HEADER                  */}
      {/* -------------------------------------- */}
      <header className="w-full flex justify-center sm:justify-end items-center mb-8 md:mb-6">
        {currentUser && (
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="bg-slate-800/80 px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-slate-700 flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-slate-700 hover:border-emerald-500/50 transition-all group"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-slate-200 text-xs md:text-sm font-bold tracking-wider group-hover:text-white">
                {currentUser.name} {myTickets.length > 0 && <span className="ml-1 text-emerald-400">{myTickets.length}🎟️</span>}
              </span>
            </button>
            <button 
              onClick={handleLogout}
              className="text-[10px] md:text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider underline underline-offset-4 decoration-slate-700 hover:decoration-red-400"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* -------------------------------------- */}
      {/* HERO TITLE & INSTRUCTIONS              */}
      {/* -------------------------------------- */}
      <div className="text-center space-y-2 md:space-y-4 mb-8 md:mb-12 px-2">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          VIP SEAT SELECTION
        </h1>
        <p className="text-slate-400 text-sm md:text-lg max-w-lg mx-auto mt-2 md:mt-4">
          Secure your spot. Seats are held for 5 minutes once selected.
        </p>
      </div>

      {/* -------------------------------------- */}
      {/* STATUS LEGEND                          */}
      {/* -------------------------------------- */}
      <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8 md:mb-10 bg-slate-800/50 p-3 md:p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm w-full max-w-2xl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          <span className="text-xs md:text-sm font-medium tracking-wide text-slate-300">AVAILABLE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-amber-500 animate-pulse"></div>
          <span className="text-xs md:text-sm font-medium tracking-wide text-slate-300">HELD</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-slate-700"></div>
          <span className="text-xs md:text-sm font-medium tracking-wide text-slate-500">SOLD OUT</span>
        </div>
      </div>

      {/* -------------------------------------- */}
      {/* INTERACTIVE SEATING GRID               */}
      {/* -------------------------------------- */}
      <div className="bg-slate-900/50 p-4 sm:p-6 md:p-10 rounded-2xl md:rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md w-full max-w-5xl">
        {/* Stage Graphic */}
        <div className="w-full h-1 md:h-2 bg-linear-to-r from-transparent via-emerald-500/50 to-transparent rounded-full mb-8 md:mb-12 shadow-[0_0_20px_rgba(16,185,129,0.3)]"></div>
        <p className="text-center text-slate-500 tracking-[0.3em] md:tracking-[0.5em] text-xs md:text-sm mb-8 md:mb-12 font-bold uppercase">Stage</p>

        {/* Scrollable Container for Mobile Saftey */}
        <div className="w-full overflow-x-auto pb-6">
          <div className="min-w-112.5 sm:min-w-full grid grid-cols-10 gap-2 sm:gap-3 md:gap-4 justify-items-center">
            {seats.map((seat) => (
              <button
                key={seat.seatId}
                disabled={seat.status !== 'AVAILABLE'}
                onClick={() => handleSeatClick(seat.seatId)}
                className={`
                  w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg md:rounded-xl border-2 flex items-center justify-center 
                  font-bold text-xs md:text-base transition-all duration-300 ease-out transform hover:-translate-y-1 shrink-0
                  ${getSeatStyles(seat.status)}
                `}
                title={`Seat ${seat.seatId}`}
              >
                {seat.seatId}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* -------------------------------------- */}
      {/* CHECKOUT MODAL (ACTIVE LOCK)           */}
      {/* -------------------------------------- */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.7)] max-w-md w-full text-center transform transition-all">
            
            {/* Seat Graphic */}
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <span className="text-3xl md:text-4xl font-black text-emerald-400">{selectedSeat}</span>
            </div>
            
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Seat Locked!</h3>
            
            {/* Live Countdown Timer */}
            <div className="mb-4 md:mb-6 flex flex-col items-center justify-center">
              <p className="text-slate-400 text-xs md:text-sm uppercase tracking-widest mb-1 md:mb-2">Time Remaining</p>
              <div className={`text-3xl md:text-4xl font-mono font-black tracking-tight ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 md:p-4 mb-6 md:mb-8">
              <p className="text-amber-400 text-xs md:text-sm font-medium leading-relaxed">
                ⚠️ <span className="font-bold">Note:</span> Do not refresh the page or you may lose your hold on this seat.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleBookSeat}
                className="w-full py-3 md:py-4 rounded-xl font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all transform hover:-translate-y-1 text-base md:text-lg"
              >
                Confirm Purchase
              </button>
              <button 
                onClick={handleCancelSeat}
                className="w-full py-3 md:py-4 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 text-sm md:text-base"
              >
                Cancel Selection
              </button>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------- */}
      {/* AUTHENTICATION MODAL                   */}
      {/* -------------------------------------- */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] max-w-md w-full text-center transform transition-all">
            
            <h2 className="text-3xl md:text-4xl font-black bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2 uppercase">
              {isLoginMode ? 'Welcome Back' : 'VIP Access'}
            </h2>
            <p className="text-slate-400 text-sm md:text-base mb-6 md:mb-8">
              {isLoginMode ? 'Enter your email to resume your session.' : 'Please enter your details to enter the arena.'}
            </p>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4 md:gap-5">
              
              {/* Username Input (Hidden during Login) */}
              {!isLoginMode && (
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your VIP username..."
                  className="w-full bg-slate-800 border border-slate-600 text-white px-4 py-3 md:px-5 md:py-4 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-base md:text-lg font-medium placeholder-slate-500"
                  autoFocus
                  required
                />
              )}

              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full bg-slate-800 border border-slate-600 text-white px-4 py-3 md:px-5 md:py-4 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-base md:text-lg font-medium placeholder-slate-500"
                required
              />

              {!isLoginMode && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left">
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                    <span>⚠️</span> The username cannot be changed later. Choose wisely.
                  </p>
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-3 md:py-4 rounded-xl font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all transform hover:-translate-y-1 text-base md:text-lg uppercase tracking-widest mt-2"
              >
                {isLoginMode ? 'Log In' : 'Enter Arena'}
              </button>

              <button 
                type="button" 
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-slate-400 hover:text-emerald-400 text-xs md:text-sm transition-colors mt-2"
              >
                {isLoginMode ? "Don't have an account? Sign up" : "Already signed up? Log in"}
              </button>

            </form>

          </div>
        </div>
      )}

      {/* -------------------------------------- */}
      {/* USER TICKETS DRAWER (SLIDE-IN)         */}
      {/* -------------------------------------- */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            key="drawer-container"
            className="fixed inset-0 z-150 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Dark Overlay (Click to close) */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setIsDrawerOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative h-full w-full sm:max-w-md bg-slate-900 border-l border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-200 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  🎟️ MY TICKETS
                </h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content Area */}
              <div className="p-4 md:p-6 flex-1 overflow-y-auto flex flex-col gap-4">
                
                {/* Empty State View */}
                {myTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                    <span className="text-5xl md:text-6xl opacity-20">🎫</span>
                    <p className="text-sm md:text-base">You haven't secured any seats yet.</p>
                  </div>
                ) : (
                  
                  // Populated Ticket View
                  myTickets.map(ticket => (
                    <div key={ticket.seatId} className="relative overflow-hidden bg-slate-800 border border-emerald-500/30 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-lg group transition-colors">
                      {/* Ticket Cutout Graphic (Left/Right) */}
                      <div className="absolute -left-4 w-6 h-6 md:w-8 md:h-8 bg-slate-900 rounded-full border-r border-emerald-500/30 transition-colors"></div>
                      <div className="absolute -right-4 w-6 h-6 md:w-8 md:h-8 bg-slate-900 rounded-full border-l border-emerald-500/30 transition-colors"></div>

                      <div className="pl-4 md:pl-6">
                        <p className="text-slate-400 text-[10px] md:text-xs uppercase tracking-widest mb-1">VIP Seat</p>
                        <p className="text-3xl md:text-4xl font-black text-white">{ticket.seatId}</p>
                      </div>
                      <div className="pr-4 md:pr-6 text-right flex flex-col items-end gap-2">
                        <div className="inline-block px-2 py-1 md:px-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] md:text-xs font-bold tracking-wide shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                          CONFIRMED
                        </div>
                        <button 
                          onClick={() => handleUnbookSeat(ticket.seatId)}
                          className="text-[10px] md:text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors mt-1"
                        >
                          Release Seat
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default SeatDashboard;