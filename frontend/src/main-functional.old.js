import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";
import { router } from "./router.js";
import { state, setAuthState, saveCart } from "./state.js";
import { initHomePage } from "./pages/home.js";
import { initEventsPage, renderEventsPage, loadEvents } from "./pages/events.js";
import { initBookingsPage, loadBookings } from "./pages/bookings.js";
import { initCartPage, renderCart, addToCart } from "./pages/cart.js";
import { initAuthPage, showAuthView, syncAuthUI } from "./pages/auth.js";

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
        <h2>Upcoming events</h2>
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
const elements = {
  homeSection: document.querySelector("#homeSection"),
  howSection: document.querySelector("#howSection"),
  eventsSection: document.querySelector("#eventsSection"),
  bookingsSection: document.querySelector("#bookingsSection"),
  authSection: document.querySelector("#authSection"),
  cartSection: document.querySelector("#cartSection"),
  eventsGrid: document.querySelector("#eventsGrid"),
  searchInput: document.querySelector("#searchInput"),
  bookingsList: document.querySelector("#bookingsList"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  loginStatus: document.querySelector("#loginStatus"),
  registerStatus: document.querySelector("#registerStatus"),
  authGreeting: document.querySelector("#authGreeting"),
  bookingStatus: document.querySelector("#bookingStatus"),
  navLogin: document.querySelector("#navLogin"),
  navLogout: document.querySelector("#navLogout"),
  viewHistoryBtn: document.querySelector("#viewHistoryBtn"),
  refreshBookings: document.querySelector("#refreshBookings"),
  cartBadge: document.querySelector("#cartBadge"),
  cartList: document.querySelector("#cartList"),
  cartTotal: document.querySelector("#cartTotal"),
  clearCart: document.querySelector("#clearCart"),
  stripePayBtn: document.querySelector("#stripePayBtn"),
  checkoutBtn: document.querySelector("#checkoutBtn"),
  loginCard: document.querySelector("#loginCard"),
  registerCard: document.querySelector("#registerCard"),
  browseBtn: document.querySelector("#browseBtn"),
  myBookingsBtn: document.querySelector("#myBookingsBtn"),
};

// --- Page Visibility Control ---
const showPage = (route) => {
  elements.homeSection.classList.toggle("d-none", route !== "/" && route !== "");
  elements.howSection.classList.toggle("d-none", route !== "/" && route !== "");
  elements.eventsSection.classList.toggle("d-none", route !== "events");
  elements.bookingsSection.classList.toggle("d-none", route !== "bookings");
  elements.cartSection.classList.toggle("d-none", route !== "cart");
  elements.authSection.classList.toggle("d-none", route !== "auth");
};

// --- Route Handlers ---
const renderHome = () => {
  showPage("/");
  loadEvents(elements.eventsGrid);
};

const renderEvents = () => {
  showPage("events");
  renderEventsPage(elements);
};

const renderBookings = () => {
  showPage("bookings");
  loadBookings(elements);
};

const renderCartPage = () => {
  showPage("cart");
  renderCart(elements);
};

const renderAuthPage = () => {
  showPage("auth");
};

// --- Router Setup ---
router.register("/", renderHome);
router.register("/events", renderEvents);
router.register("/bookings", renderBookings);
router.register("/cart", renderCartPage);
router.register("/auth", renderAuthPage);

// --- Initialize Page Modules ---
initHomePage(elements);
initEventsPage(elements);
initBookingsPage(elements);
initCartPage(elements);
initAuthPage(elements);

// --- Global Event Listeners ---
elements.eventsGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".book-btn");
  if (!button) return;
  addToCart(button.dataset.eventId, elements);
});

elements.navLogin.addEventListener("click", () => {
  router.navigateTo("auth");
  showAuthView("login", elements);
});

elements.navLogout.addEventListener("click", () => {
  setAuthState(null, null);
  syncAuthUI(elements);
  loadBookings(elements);
  showAuthView("login", elements);
  router.navigateTo("/");
});

// --- Initialize App ---
syncAuthUI(elements);
renderCart(elements);
showAuthView("login", elements);

// Start router after all routes are registered
router.start();
