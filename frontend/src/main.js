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
import { renderPreferencesHTML, initPreferencesPage, showPreferencesPage, hidePreferencesPage } from "./pages/preferences.js";

const app = document.querySelector("#app");

app.innerHTML = `
  <nav class="navbar navbar-expand-lg navbar-light">
    <div class="container">
      <a class="" href="${router.href('')}">
        <img class="brand-logo" src="/logo-1.webp" alt="Delapre Abbey Events" />
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav ms-auto gap-lg-3">
          <li class="nav-item"><a class="nav-link" href="${router.href('')}">Home</a></li>
          <li class="nav-item"><a class="nav-link" href="${router.href('events')}">Events</a></li>
          <li class="nav-item"><a class="nav-link" href="${router.href('bookings')}">Bookings</a></li>
          <li class="nav-item"><a class="nav-link" href="${router.href('cart')}">My Events <span class="cart-badge" id="cartBadge">0</span></a></li>
          <li class="nav-item d-none" id="navStaff"><a class="nav-link" href="${router.href('staff')}">Staff</a></li>
          <li class="nav-item d-none" id="navPrefs"><a class="nav-link" href="${router.href('preferences')}">Preferences</a></li>
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
    ${renderPreferencesHTML()}

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
        <div class="social-media">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" title="Facebook" class="social-link">
            <i class="fa-brands fa-facebook"></i>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" title="Instagram" class="social-link">
            <i class="fa-brands fa-square-instagram"></i>
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" title="LinkedIn" class="social-link">
            <i class="fa-brands fa-linkedin-in"></i>
          </a>
        </div>
        <div class="built-by">
          <span>Built by</span>
          <img src="/groupLogo.svg" alt="Group logo" />
        </div>
      </div>
    </footer>
  </main>

  <!-- Confirmation Modal -->
  <div class="modal fade" id="confirmationModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-body text-center p-5">
          <div class="mb-4 text-success">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </svg>
          </div>
          <h3 class="mb-3">Booking Confirmed!</h3>
          <p class="text-muted mb-4" id="confirmationMessage">Your events have been successfully booked. You'll receive a confirmation email shortly.</p>
          <button type="button" class="btn btn-dark px-5 py-2" data-bs-dismiss="modal">Great!</button>
        </div>
      </div>
    </div>
  </div>
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
  hidePreferencesPage();
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

const renderPreferencesRoute = () => {
  if (!state.token) {
    router.navigateTo("auth");
    showAuthView("login");
    return;
  }
  hideAllPages();
  showPreferencesPage();
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
router.register("/preferences", renderPreferencesRoute);

// --- Initialize Page Modules ---
initHomePage();
initEventsPage();
initBookingsPage();
initCartPage();
initAuthPage();
initStaffPage();
initPreferencesPage();

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
