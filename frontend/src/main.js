import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";
import { router } from "./router.js";
import { state, setAuthState, saveCart } from "./state.js";
import { renderHomeHTML, initHomePage, showHomePage, hideHomePage } from "./pages/home.js";
import { renderEventsHTML, initEventsPage, showEventsPage, hideEventsPage, loadEvents } from "./pages/events.js";
import { renderBookingsHTML, initBookingsPage, showBookingsPage, hideBookingsPage, loadBookings, updateAuthGreeting } from "./pages/bookings.js";
import { renderCartHTML, initCartPage, showCartPage, hideCartPage, renderCart, addToCart } from "./pages/cart.js";

import { renderAuthHTML, initAuthPage, showAuthPage, hideAuthPage, showAuthView, syncAuthUI } from "./pages/auth.js";
import { renderStaffHTML, initStaffPage, showStaffPage, hideStaffPage } from "./pages/staff.js";

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
          <li class="nav-item"><a class="nav-link" href="${router.href('staff')}">Staff</a></li>
        </ul>
        <div class="d-flex gap-2 ms-lg-3">
          <button class="btn btn-dark btn-sm" id="navLogin">Sign in</button>
          <button class="btn btn-outline-dark btn-sm d-none" id="navLogout">Sign out</button>
        </div>
      </div>
    </div>
  </nav>

  <main class="page">
    ${renderHomeHTML()}
    ${renderEventsHTML()}
    ${renderBookingsHTML()}
    ${renderAuthHTML()}

    ${renderCartHTML()}
    ${renderStaffHTML()}

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
  eventsSection: document.querySelector("#eventsSection"),
  bookingsSection: document.querySelector("#bookingsSection"),
  authSection: document.querySelector("#authSection"),
  cartSection: document.querySelector("#cartSection"),
  staffSection: document.querySelector("#staffSection"),
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

// --- Hide All Pages ---
const hideAllPages = () => {
  hideHomePage();
  hideEventsPage();
  hideBookingsPage();
  hideCartPage();
  hideAuthPage();
  hideStaffPage();
};

// --- Route Handlers ---
const renderHome = () => {
  hideAllPages();
  showHomePage();
};

const renderEventsRoute = () => {
  hideAllPages();
  showEventsPage();
  loadEvents();
};

const renderBookingsRoute = () => {
  hideAllPages();
  showBookingsPage();
  loadBookings();
};

const renderCartRoute = () => {
  hideAllPages();
  showCartPage();
  renderCart();
};

const renderAuthRoute = () => {
  hideAllPages();
  showAuthPage();
};

const renderStaffRoute = () => {
  if (!state.token) {
    router.navigateTo("auth");
    showAuthView("login");
    return;
  }
  hideAllPages();
  showStaffPage();
};

// --- Router Setup ---
router.register("/", renderHome);
router.register("/events", renderEventsRoute);
router.register("/bookings", renderBookingsRoute);
router.register("/cart", renderCartRoute);
router.register("/auth", renderAuthRoute);
router.register("/staff", renderStaffRoute);

// --- Initialize Page Modules ---
initHomePage();
initEventsPage();
initBookingsPage();
initCartPage();
initAuthPage();
initStaffPage();

// --- Global Event Listeners ---
elements.eventsGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".book-btn");
  if (!button) return;
  console.log("Book button clicked for event:", button.dataset.eventId);
  addToCart(button.dataset.eventId, elements);
});

elements.navLogin.addEventListener("click", () => {
  console.log("Nav login clicked, navigating to auth");
  router.navigateTo("auth");
  showAuthView("login");
});

elements.navLogout.addEventListener("click", () => {
  console.log("Nav logout clicked");
  setAuthState(null, null);
  syncAuthUI();
  loadBookings();
  showAuthView("login");
  router.navigateTo("/");
});

// --- Initialize App ---
console.log("Delapre Events App Initializing");
console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL || "http://localhost:8080");

syncAuthUI(elements);
renderCart(elements);
showAuthView("login", elements);

// Debug: Verify event listeners are attached
console.log("Elements loaded:", {
  navLogin: elements.navLogin ? "Loaded" : "Missing",
  loginForm: elements.loginForm ? "Loaded" : "Missing",
  registerForm: elements.registerForm ? "Loaded" : "Missing",
  eventsGrid: elements.eventsGrid ? "Loaded" : "Missing",
  authSection: elements.authSection ? "Loaded" : "Missing",
});

// Start router after all routes are registered
router.start();

console.log("App initialized and router started");
