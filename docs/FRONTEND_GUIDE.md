# 💻 Frontend Architecture & UI Guide

This guide covers the React 19 frontend implementation, styling patterns, state flow, and real-time integration in the **VIP Seat Booking System**.

---

## 🏗️ Component Tree

The frontend architecture is intentionally compact and centered around a single high-performance orchestrator:

```
src/
├── main.jsx                 # React 19 StrictMode mount
├── App.jsx                  # Root layout shell
└── components/
    └── SeatDashboard.jsx    # Primary UI orchestrator:
        ├── Global Toast     # Framer Motion elevated notification system (z-100)
        ├── Top Header       # Brand badge, live status indicators, ticket drawer trigger, user exit
        ├── Arena Grandstand # 8-column amphitheater interactive grandstand (Rows A..E × 10 cols)
        ├── Order Inspector  # 4-column persistent checkout rail with pricing breakdown & lock countdown
        ├── Mobile Dock      # Sticky bottom floating action dock on small screens (<lg)
        ├── Auth Modal       # Password-based registration & login with show/hide toggle & error banner
        └── Tickets Drawer   # Slide-in drawer with perforated boarding passes
```

---

## 📊 State Management Architecture

All core client state is maintained inside [`SeatDashboard.jsx`](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/client/src/components/SeatDashboard.jsx):

```typescript
// Core Data State
const [seats, setSeats] = useState([]);               // Master array of 50 seat objects
const [loading, setLoading] = useState(true);         // Initial grid loading skeleton
const [error, setError] = useState(null);             // Fetch failure error state

// Reservation & Locking State
const [selectedSeat, setSelectedSeat] = useState(null); // Seat ID held by current user (e.g., 'C4')
const [timeLeft, setTimeLeft] = useState(300);        // Seconds remaining on active lock (5 min)

// Authentication State
const [currentUser, setCurrentUser] = useState(null); // { id: string, name: string }
const [showWelcomeModal, setShowWelcomeModal] = useState(false);
const [nameInput, setNameInput] = useState('');
const [emailInput, setEmailInput] = useState('');
const [passwordInput, setPasswordInput] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [isLoginMode, setIsLoginMode] = useState(false);

// UI & Theme Switcher State
const [toast, setToast] = useState(null);             // { message: string, type: 'success'|'warning'|'error' }
const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Right-side ticket drawer toggle
const [currentTheme, setCurrentTheme] = useState('cinema'); // 'cinema' | 'linear' | 'arena'
```

### Derived State: Real-Time Ticket Inventory
Instead of making an extra API call to query user tickets, the dashboard uses a **derived calculation**:

```javascript
const myTickets = seats.filter(
  seat => seat.status === 'BOOKED' && seat.bookedBy === currentUser?.id
);
```
Whenever a seat is booked or updated over the WebSocket, `myTickets` recalculates instantly with zero lag.

---

## ⚡ Cold-Start & Warm-Up Polling Architecture

Because the backend is hosted on a free-tier Render instance that spins down during periods of inactivity, the client includes an automated self-healing polling loop (`wakeUpServer`):

```javascript
const wakeUpServer = async () => {
  let isAwake = false;
  let attempt = 0;

  while (!isAwake) {
    try {
      // 3-second abort timeout so fetch doesn't freeze on spinning backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${API_URL}/wakeup`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        isAwake = true;
        fetchSeats(); // Server is awake! Load grid.
        break;
      }
    } catch (error) {
      if (attempt === 0) {
        showToast("Wait for a minute as the Render backend is starting. It may take upto a minute", "warning", 10000);
      }
    }
    attempt++;
    // Wait 5 seconds before retrying
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};
```

---

## 🔤 Natural Alphanumeric Grid Sorting

Standard JavaScript array sorting treats alphanumeric strings lexicographically, placing `A10` before `A2`. [`SeatDashboard.jsx`](file:///c:/Workspace/My%20Projects/Seat%20Booking%20System/client/src/components/SeatDashboard.jsx#L97-L108) implements natural sorting:

```javascript
const sortedSeats = data.sort((a, b) => {
  const rowA = a.seatId.charAt(0);
  const colA = parseInt(a.seatId.slice(1));
  const rowB = b.seatId.charAt(0);
  const colB = parseInt(b.seatId.slice(1));

  if (rowA === rowB) {
    return colA - colB; // Numerical sort for column (1, 2, ... 10)
  }
  return rowA.localeCompare(rowB); // Alphabetical sort for row (A, B, C, D, E)
});
```

---

## 🎨 Design System & Styling (Tailwind CSS v4)

The application uses **Tailwind CSS v4** via the official `@tailwindcss/vite` plugin.

### Seat Status Visual Language

| Status | Tailwind Style Class | Visual Cue |
| :--- | :--- | :--- |
| **AVAILABLE** | `bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]` | Neon green border, glowing hover effect |
| **LOCKED / HELD** | `bg-amber-500/20 border-amber-500 text-amber-500 cursor-not-allowed animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]` | Amber glow with breathing pulse animation |
| **BOOKED / SOLD OUT** | `bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50` | Muted dark slate, non-interactive |

### Mobile-First Horizontal Overflow Safeguard
To keep 10-column seating touch-targets large and legible on smartphones, the grid wraps in a horizontal overflow container:
```jsx
<div className="w-full overflow-x-auto pb-6">
  <div className="min-w-112.5 sm:min-w-full grid grid-cols-10 gap-2 sm:gap-3 md:gap-4 justify-items-center">
    {/* 50 Seats */}
  </div>
</div>
```

### Ticket Graphic Design (Drawer Cutouts)
Tickets rendered inside the slide-in drawer emulate real concert tickets with semicircular notch cutouts on either side:
```jsx
{/* Left Cutout */}
<div className="absolute -left-4 w-6 h-6 md:w-8 md:h-8 bg-slate-900 rounded-full border-r border-emerald-500/30"></div>
{/* Right Cutout */}
<div className="absolute -right-4 w-6 h-6 md:w-8 md:h-8 bg-slate-900 rounded-full border-l border-emerald-500/30"></div>
```

---

## ⏳ Active Lock Expiration Flow

1. User clicks an available seat $\rightarrow$ `POST /api/seats/lock` succeeds.
2. `selectedSeat` is set to the seat ID, and `timeLeft` is initialized to `300` (seconds).
3. A 1-second interval decreases `timeLeft`.
4. When `timeLeft === 0`:
   - An alert toast fires: `"Time expired! Your seat has been released."`
   - `handleCancelSeat()` is invoked automatically, calling `POST /api/seats/unlock`.
   - The checkout modal closes and the seat reverts to `AVAILABLE` on all clients.

