import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";
import { router } from "./router.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const app = document.querySelector("#app");

app.innerHTML = `
  <nav class="navbar navbar-expand-lg navbar-light py-3">
    <div class="container">
      <a class="navbar-brand" href="${router.href('')}">
        <span class="brand-mark">DA</span>
        <span class="brand-text">Delapre Abbey Events</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav ms-auto gap-lg-3">
          <li class="nav-item"><a class="nav-link" href="${router.href('')}">Home</a></li>
<li class="nav-item"><a class="nav-link" href="${router.href('events')}">Events</a></li>
          <li class="nav-item"><a class="nav-link" href="${router.href('bookings')}">Bookings</a></li>
          <li class="nav-item"><a class="nav-link" href="${router.href('cart')}">Cart <span class="cart-badge" id="cartBadge">0</span></a></li>
        </ul>
        <div class="d-flex gap-2 ms-lg-3">
          <button class="btn btn-dark btn-sm" id="navLogin">Sign in</button>
          <button class="btn btn-outline-dark btn-sm d-none" id="navLogout">Sign out</button>
        </div>
      </div>
    </div>
  </nav>

  <main class="page">
    <header class="hero" id="homeSection">
      <div class="container hero-body">
        <div class="row align-items-center g-4">
          <div class="col-lg-6">
            <p class="eyebrow">Delapre Abbey</p>
            <h1>Book free events in a calm, guided flow.</h1>
            <p class="lead">Explore tours, talks, and family days. Create an account, reserve your spot, and manage bookings in one place.</p>
            <div class="d-flex gap-3 flex-wrap">
              <button class="btn btn-dark btn-lg" id="browseBtn">Browse events</button>
              <button class="btn btn-outline-dark btn-lg" id="myBookingsBtn">View my bookings</button>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="hero-card">
              <div class="hero-card-top">
                <div>
                  <p class="tag">Next up</p>
                  <h3>Abbey Gardens Tour</h3>
                  <p class="mb-2">Sun, Mar 1 · 10:00 AM</p>
                  <p class="text-muted">Delapre Abbey Gardens</p>
                </div>
                <div class="hero-badge">Free</div>
              </div>
              <div class="hero-card-bottom">
                <div>
                  <p class="mb-1">Spaces left</p>
                  <strong>12</strong>
                </div>
                <button class="btn btn-dark">Reserve spot</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <section id="howSection" class="container section-gap">
      <div class="section-header">
        <h2>Your booking journey</h2>
        <p>Designed for clarity and ease, from first browse to confirmation.</p>
      </div>
      <div class="row g-4">
        <div class="col-md-4">
          <div class="step-card">
            <p class="step-number">01</p>
            <h5>Browse events</h5>
            <p>Filter by day, time, and venue. All events are free to attend.</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="step-card">
            <p class="step-number">02</p>
            <h5>Create an account</h5>
            <p>Save your details once and manage all bookings in one dashboard.</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="step-card">
            <p class="step-number">03</p>
            <h5>Confirm your place</h5>
            <p>Reserve in seconds, then reschedule or cancel whenever needed.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="eventsSection" class="container section-gap d-none">
      <div class="section-header">
        <h2>Upcoming free events</h2>
      </div>
      <div class="mb-4">
        <div class="row g-3 align-items-end">
          <div class="col-md-6">
            <input type="text" class="form-control" id="searchInput" placeholder="Search events by name...">
          </div>
          <div class="col-md-6">
            <div class="btn-group w-100" role="group">
              <button type="button" class="btn btn-outline-dark filter-btn active" data-filter="all">All</button>
              <button type="button" class="btn btn-outline-dark filter-btn" data-filter="tours">Tours</button>
              <button type="button" class="btn btn-outline-dark filter-btn" data-filter="talks">Talks</button>
              <button type="button" class="btn btn-outline-dark filter-btn" data-filter="family">Family</button>
            </div>
          </div>
        </div>
      </div>
      <div id="eventsGrid" class="row g-4"></div>
    </section>

    <section id="bookingsSection" class="container section-gap d-none">
      <div class="section-header">
        <div>
          <h2>Your bookings</h2>
          <p id="authGreeting">Sign in to manage your reservations.</p>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-dark btn-sm" id="viewHistoryBtn">View history</button>
          <button class="btn btn-dark btn-sm" id="refreshBookings">Refresh bookings</button>
        </div>
      </div>
      <p class="status-line" id="bookingStatus"></p>
      <div class="booking-panel">
        <div id="bookingsList"></div>
      </div>
    </section>

    <section id="authSection" class="auth-page d-none">
      <div class="container">
        <div class="auth-shell">
          <div class="auth-card" id="loginCard">
            <h3>Sign in</h3>
            <p>Welcome back. Use your details to access your bookings.</p>
            <form class="vstack gap-3" id="loginForm">
              <input class="form-control" type="email" placeholder="Email address" id="loginEmail" required />
              <input class="form-control" type="password" placeholder="Password" id="loginPassword" required />
              <button class="btn btn-dark" type="submit">Sign in</button>
              <p class="auth-status" id="loginStatus"></p>
              <p class="auth-footnote">
                New here?
                <button class="link-button" type="button" data-auth-switch="register">Create an account</button>
              </p>
            </form>
          </div>
          <div class="auth-card light d-none" id="registerCard">
            <h3>Create account</h3>
            <p>Register once to manage bookings and save your details.</p>
            <form class="vstack gap-3" id="registerForm">
              <div class="row g-2">
                <div class="col-12 col-md-6">
                  <input class="form-control" type="text" placeholder="First name" id="registerFirstName" required />
                </div>
                <div class="col-12 col-md-6">
                  <input class="form-control" type="text" placeholder="Last name" id="registerLastName" required />
                </div>
              </div>
              <input class="form-control" type="email" placeholder="Email address" id="registerEmail" required />
              <input class="form-control" type="password" placeholder="Password" id="registerPassword" required />
              <button class="btn btn-dark" type="submit">Create account</button>
              <p class="auth-status" id="registerStatus"></p>
              <p class="auth-footnote">
                Already have an account?
                <button class="link-button" type="button" data-auth-switch="login">Sign in</button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section id="cartSection" class="cart-page d-none">
      <div class="container">
        <div class="section-header">
          <div>
            <h2>Your cart</h2>
            <p>Confirm attendee details and checkout.</p>
          </div>
          <button class="btn btn-outline-dark btn-sm" id="clearCart">Clear cart</button>
        </div>
        <div class="cart-shell">
          <div>
            <div id="cartList"></div>
          </div>
          <div class="cart-summary">
            <h4>Checkout</h4>
            <p class="mb-2">Review your booking details below.</p>
            <div class="cart-total">
              <span>Total</span>
              <strong id="cartTotal">£0.00</strong>
            </div>
            <button class="btn btn-light w-100" id="stripePayBtn">Pay with Stripe</button>
            <button class="btn btn-outline-light w-100" id="checkoutBtn">Confirm bookings</button>
            <p class="cart-note">You will receive confirmation in your bookings list.</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <div>
          <h4>Delapre Abbey</h4>
          <p>Open, welcoming events for the local community.</p>
        </div>
        <div>
          <p class="mb-1">Contact</p>
          <p class="mb-0">events@delapreabbey.org</p>
        </div>
        <div class="built-by">
          <span>Built by</span>
          <img src="/groupLogo.svg" alt="Group logo" />
        </div>
      </div>
    </footer>
  </main>
`;

// --- DOM Elements ---
const homeSection = document.querySelector("#homeSection");
const howSection = document.querySelector("#howSection");
const eventsSection = document.querySelector("#eventsSection");
const bookingsSection = document.querySelector("#bookingsSection");
const authSection = document.querySelector("#authSection");
const cartSection = document.querySelector("#cartSection");

const eventsGrid = document.querySelector("#eventsGrid");
const bookingsList = document.querySelector("#bookingsList");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const loginStatus = document.querySelector("#loginStatus");
const registerStatus = document.querySelector("#registerStatus");
const authGreeting = document.querySelector("#authGreeting");
const bookingStatus = document.querySelector("#bookingStatus");
const navLogin = document.querySelector("#navLogin");
const navLogout = document.querySelector("#navLogout");
const viewHistoryBtn = document.querySelector("#viewHistoryBtn");
const refreshBookings = document.querySelector("#refreshBookings");
const cartBadge = document.querySelector("#cartBadge");
const cartList = document.querySelector("#cartList");
const cartTotal = document.querySelector("#cartTotal");
const clearCart = document.querySelector("#clearCart");
const stripePayBtn = document.querySelector("#stripePayBtn");
const checkoutBtn = document.querySelector("#checkoutBtn");
const loginCard = document.querySelector("#loginCard");
const registerCard = document.querySelector("#registerCard");
const browseBtn = document.querySelector("#browseBtn");
const myBookingsBtn = document.querySelector("#myBookingsBtn");

// --- State ---
const state = {
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  cart: JSON.parse(localStorage.getItem("cart") || "[]"),
  events: [],
};

state.cart = state.cart.map((item) => ({
  ...item,
  guest_count: item.guest_count || 1,
  guest_names: Array.isArray(item.guest_names) ? item.guest_names : [],
  maxGuests: item.maxGuests || item.event?.spots_left || item.event?.capacity || 1,
}));

const setAuthState = (token, user) => {
  state.token = token;
  state.user = user;
  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
  syncAuthUI();
  loadEvents();
};

const showAuthView = (view) => {
  if (view === "register") {
    registerCard.classList.remove("d-none");
    loginCard.classList.add("d-none");
  } else {
    registerCard.classList.add("d-none");
    loginCard.classList.remove("d-none");
  }
};

const syncAuthUI = () => {
  const isAuthed = Boolean(state.token);
  navLogout.classList.toggle("d-none", !isAuthed);
  navLogin.classList.toggle("d-none", isAuthed);
  if (isAuthed && state.user) {
    const firstName = state.user.first_name || "";
    const lastName = state.user.last_name || "";
    authGreeting.textContent = `Welcome back, ${firstName} ${lastName}`.trim() + ".";
  } else {
    authGreeting.textContent = "Sign in to manage your reservations.";
  }
};

const saveCart = () => {
  localStorage.setItem("cart", JSON.stringify(state.cart));
  updateCartBadge();
};

const updateCartBadge = () => {
  cartBadge.textContent = String(state.cart.length);
};

const showPage = (route) => {
  homeSection.classList.toggle("d-none", route !== "/" && route !== "");
  howSection.classList.toggle("d-none", route !== "/" && route !== "");
  eventsSection.classList.toggle("d-none", route !== "events");
  bookingsSection.classList.toggle("d-none", route !== "bookings");
  cartSection.classList.toggle("d-none", route !== "cart");
  authSection.classList.toggle("d-none", route !== "auth");
};

// --- Page State ---
let currentFilter = "all";
let currentSearch = "";

// --- Route Handlers ---
const renderHome = () => {
  showPage("/");
  loadEvents();
};

const renderEventsPage = () => {
  showPage("events");
  currentFilter = "all";
  currentSearch = "";
  document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector('[data-filter="all"]').classList.add("active");
  document.querySelector("#searchInput").value = "";
  loadEvents();
};

const renderBookingsPage = () => {
  showPage("bookings");
  loadBookings();
};

const renderCartPage = () => {
  showPage("cart");
  renderCart();
};

const renderAuthPage = () => {
  showPage("auth");
};

// --- Router Setup ---
router.register("/", renderHome);
router.register("/events", renderEventsPage);
router.register("/bookings", renderBookingsPage);
router.register("/cart", renderCartPage);
router.register("/auth", renderAuthPage);

// Start router after all routes are registered
router.start();

const formatDate = (value, options) =>
  new Date(value).toLocaleDateString("en-GB", options);

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

const renderEvents = (events) => {
  state.events = events;
  
  // Filter and search events
  let filtered = events;
  
  // Apply search filter
  if (currentSearch) {
    const search = currentSearch.toLowerCase();
    filtered = filtered.filter(event =>
      event.title.toLowerCase().includes(search) ||
      event.description.toLowerCase().includes(search) ||
      event.location.toLowerCase().includes(search)
    );
  }
  
  // Apply category filter
  if (currentFilter !== "all") {
    filtered = filtered.filter(event => {
      const category = event.title.toLowerCase().includes("tour") ? "tours" :
                      event.title.toLowerCase().includes("talk") ? "talks" :
                      event.title.toLowerCase().includes("family") ? "family" : "";
      return category === currentFilter;
    });
  }
  
  eventsGrid.innerHTML = filtered
    .map(
      (event) => `
        <div class="col-md-6 col-lg-4">
          <div class="event-card h-100">
            <div class="event-card-top">
              <div>
                <p class="tag">${event.is_free ? "Free" : `£${event.price.toFixed(2)}`}</p>
                <h5>${event.title}</h5>
              </div>
              <span class="chip">${formatDate(event.starts_at, {
                month: "short",
                day: "numeric",
              })}</span>
            </div>
            <p>${event.description}</p>
            <div class="event-meta">
              <span>${formatTime(event.starts_at)}</span>
              <span>${event.location}</span>
            </div>
            <div class="event-actions">
              <span>${event.spots_left ?? event.capacity} spaces left</span>
              <button class="btn btn-dark btn-sm book-btn" data-event-id="${event.id}" ${
                event.spots_left === 0 ? "disabled" : ""
              }>
                Add to cart
              </button>
            </div>
          </div>
        </div>
      `
    )
    .join("");
  
  // Show message if no events
  if (filtered.length === 0) {
    eventsGrid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">
          No events found matching your search.
        </div>
      </div>
    `;
  }
};

const showEventsLoading = () => {
  eventsGrid.innerHTML = `
    <div class="col-12">
      <div class="loading-card">
        <div>
          <h5>Loading events</h5>
          <p>Fetching the latest listings from Delapre Abbey.</p>
        </div>
        <div class="spinner-border text-dark" role="status"></div>
      </div>
    </div>
  `;
};

const showEventsError = () => {
  eventsGrid.innerHTML = `
    <div class="col-12">
      <div class="loading-card">
        <div>
          <h5>Events are offline</h5>
          <p>We could not reach the API. Please try again in a moment.</p>
        </div>
      </div>
    </div>
  `;
};

const renderBookings = (bookings) => {
  if (!state.token) {
    bookingsList.innerHTML = `
      <div class="booking-empty">
        <h6>Sign in to view bookings</h6>
        <p class="mb-0">Your reservations will appear here once you are logged in.</p>
      </div>
    `;
    return;
  }

  if (bookings.length === 0) {
    bookingsList.innerHTML = `
      <div class="booking-empty">
        <h6>No upcoming bookings</h6>
        <p class="mb-0">Browse events and reserve your spot.</p>
      </div>
    `;
    return;
  }

  bookingsList.innerHTML = bookings
    .map(
      (booking) => `
        <div class="booking-row">
          <div>
            <h6>${booking.event.title}</h6>
            <p class="mb-0">
              ${formatDate(booking.event.starts_at, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })} · ${formatTime(booking.event.starts_at)} · ${booking.event.location}
            </p>
            <p class="mb-0 booking-guest">${
              booking.guest_count > 1
                ? `Guests: ${booking.guest_count}${
                    booking.guest_names?.length
                      ? ` · ${booking.guest_names.join(", ")}`
                      : ""
                  }`
                : ""
            }</p>
          </div>
          <button class="btn btn-outline-dark btn-sm cancel-btn" data-booking-id="${booking.id}">
            Cancel
          </button>
        </div>
      `
    )
    .join("");
};

const apiFetch = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

const loadEvents = async () => {
  showEventsLoading();
  try {
    const response = await fetch(`${apiBaseUrl}/api/events`);
    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }
    const data = await response.json();
    renderEvents(data);
  } catch (error) {
    showEventsError();
  }
};

const renderCart = () => {
  if (state.cart.length === 0) {
    cartList.innerHTML = `
      <div class="booking-empty">
        <h6>Your cart is empty</h6>
        <p class="mb-0">Browse events and add bookings to checkout.</p>
      </div>
    `;
    cartTotal.textContent = "£0.00";
    return;
  }

  const total = state.cart.reduce((sum, item) => {
    const price = item.event.price || 0;
    return sum + (price * item.guest_count);
  }, 0);

  cartList.innerHTML = state.cart
    .map(
      (item) => {
        const itemPrice = (item.event.price || 0) * item.guest_count;
        return `
        <div class="cart-item" data-cart-id="${item.event.id}">
          <div>
            <h5>${item.event.title}</h5>
            <p>${formatDate(item.event.starts_at, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })} · ${formatTime(item.event.starts_at)} · ${item.event.location}</p>
            <p class="text-muted mb-0">${item.event.is_free ? "Free" : `£${item.event.price.toFixed(2)} per guest`} · Spaces left: ${item.event.spots_left ?? item.event.capacity}</p>
          </div>
          <div class="cart-controls">
            <label class="form-label">Guests</label>
            <select class="form-select" data-cart-guests>
              ${Array.from({ length: Math.min(item.maxGuests, 6) }, (_, i) => i + 1)
                .map(
                  (count) =>
                    `<option value="${count}" ${count === item.guest_count ? "selected" : ""}>${count}</option>`
                )
                .join("")}
            </select>
            <label class="form-label">Guest names (optional)</label>
            <textarea class="form-control" rows="2" data-cart-names placeholder="Alex, Priya, Sam">${
              item.guest_names.join(", ")
            }</textarea>
            ${itemPrice > 0 ? `<p class="text-end mb-2"><strong>£${itemPrice.toFixed(2)}</strong></p>` : ""}
            <button class="btn btn-outline-dark btn-sm" data-cart-remove>Remove</button>
          </div>
        </div>
      `;
      }
    )
    .join("");
  
  cartTotal.textContent = `£${total.toFixed(2)}`;
};

const loadBookings = async () => {
  bookingStatus.textContent = "";
  if (!state.token) {
    renderBookings([]);
    return;
  }
  try {
    const data = await apiFetch("/api/bookings");
    renderBookings(data);
  } catch (error) {
    bookingsList.innerHTML = `
      <div class="booking-empty">
        <h6>Unable to load bookings</h6>
        <p class="mb-0">${error.message}</p>
      </div>
    `;
  }
};

const handleLogin = async (event) => {
  event.preventDefault();
  loginStatus.textContent = "";
  try {
    const payload = {
      email: document.querySelector("#loginEmail").value.trim(),
      password: document.querySelector("#loginPassword").value,
    };
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setAuthState(data.token, data.user);
    loginStatus.textContent = "Signed in successfully.";
    loginStatus.classList.add("success");
    showAuthView("login");
    router.navigateTo("bookings");
    loadBookings();
  } catch (error) {
    loginStatus.textContent = error.message;
    loginStatus.classList.remove("success");
  }
};

const handleRegister = async (event) => {
  event.preventDefault();
  registerStatus.textContent = "";
  try {
    const payload = {
      first_name: document.querySelector("#registerFirstName").value.trim(),
      last_name: document.querySelector("#registerLastName").value.trim(),
      email: document.querySelector("#registerEmail").value.trim(),
      password: document.querySelector("#registerPassword").value,
    };
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setAuthState(data.token, data.user);
    registerStatus.textContent = "Account created. You are signed in.";
    registerStatus.classList.add("success");
    registerCard.classList.add("d-none");
    loginCard.classList.remove("d-none");
    router.navigateTo("bookings");
    loadBookings();
  } catch (error) {
    registerStatus.textContent = error.message;
    registerStatus.classList.remove("success");
  }
};

const addToCart = (eventId) => {
  const event = state.events.find((item) => item.id === Number(eventId));
  if (!event) {
    return;
  }
  const maxGuests = event.spots_left ?? event.capacity ?? 1;
  const existing = state.cart.find((item) => item.event.id === event.id);
  if (existing) {
    existing.guest_count = Math.min(existing.guest_count + 1, maxGuests);
  } else {
    state.cart.push({
      event,
      guest_count: 1,
      guest_names: [],
      maxGuests: Math.max(1, maxGuests),
    });
  }
  saveCart();
  renderCart();
  router.navigateTo("cart");
};

const handleCancel = async (bookingId) => {
  bookingStatus.textContent = "";
  try {
    await apiFetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    loadBookings();
    loadEvents();
  } catch (error) {
    bookingStatus.textContent = error.message;
  }
};

const checkoutCart = async () => {
  if (!state.token) {
    router.navigateTo("auth");
    loginStatus.textContent = "Please sign in to complete checkout.";
    return;
  }
  if (state.cart.length === 0) {
    return;
  }
  try {
    for (const item of state.cart) {
      await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          event_id: item.event.id,
          guest_count: item.guest_count,
          guest_names: item.guest_names,
        }),
      });
    }
    state.cart = [];
    saveCart();
    renderCart();
    loadBookings();
    loadEvents();
    router.navigateTo("bookings");
  } catch (error) {
    loginStatus.textContent = error.message;
  }
};

const loadHistory = async () => {
  if (!state.token) {
    return;
  }
  bookingStatus.textContent = "";
  try {
    const data = await apiFetch("/api/bookings/history");
    renderBookings(data);
  } catch (error) {
    bookingStatus.textContent = error.message;
  }
};

// --- Event Listeners ---
loginForm.addEventListener("submit", handleLogin);
registerForm.addEventListener("submit", handleRegister);

document.querySelectorAll("[data-auth-switch]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.authSwitch;
    showAuthView(target);
  });
});

eventsGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".book-btn");
  if (!button) {
    return;
  }
  addToCart(button.dataset.eventId);
});

cartList.addEventListener("change", (event) => {
  const cartItem = event.target.closest(".cart-item");
  if (!cartItem) {
    return;
  }
  const eventId = Number(cartItem.dataset.cartId);
  const item = state.cart.find((cart) => cart.event.id === eventId);
  if (!item) {
    return;
  }
  if (event.target.hasAttribute("data-cart-guests")) {
    item.guest_count = Number(event.target.value);
  }
  if (event.target.hasAttribute("data-cart-names")) {
    item.guest_names = event.target.value
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, item.guest_count);
  }
  saveCart();
  renderCart();
});

cartList.addEventListener("click", (event) => {
  const cartItem = event.target.closest(".cart-item");
  if (!cartItem) {
    return;
  }
  if (event.target.hasAttribute("data-cart-remove")) {
    const eventId = Number(cartItem.dataset.cartId);
    state.cart = state.cart.filter((item) => item.event.id !== eventId);
    saveCart();
    renderCart();
  }
});

bookingsList.addEventListener("click", (event) => {
  const button = event.target.closest(".cancel-btn");
  if (!button) {
    return;
  }
  handleCancel(button.dataset.bookingId);
});

viewHistoryBtn.addEventListener("click", loadHistory);
refreshBookings.addEventListener("click", loadBookings);

clearCart.addEventListener("click", () => {
  state.cart = [];
  saveCart();
  renderCart();
});

stripePayBtn.addEventListener("click", checkoutCart);
checkoutBtn.addEventListener("click", checkoutCart);

navLogin.addEventListener("click", () => {
  router.navigateTo("auth");
  showAuthView("login");
});

navLogout.addEventListener("click", () => {
  setAuthState(null, null);
  renderBookings([]);
  showAuthView("login");
  router.navigateTo("/");
});

browseBtn.addEventListener("click", () => {
  router.navigateTo("events");
});

myBookingsBtn.addEventListener("click", () => {
  router.navigateTo("bookings");
});

// Filter buttons
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderEvents(state.events);
  });
});

// Search input
const searchInput = document.querySelector("#searchInput");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderEvents(state.events);
  });
}

// --- Initialize ---
syncAuthUI();
updateCartBadge();
showAuthView("login");
