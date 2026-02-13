import { state } from "../state.js";
import { formatDate, formatTime } from "../utils/formatters.js";
import { apiFetch } from "../utils/api.js";
import { loadEvents } from "./events.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const renderBookingsHTML = () => `
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
`;

export const initBookingsPage = () => {
  const bookingsList = document.querySelector("#bookingsList");
  const viewHistoryBtn = document.querySelector("#viewHistoryBtn");
  const refreshBookings = document.querySelector("#refreshBookings");

  bookingsList?.addEventListener("click", (event) => {
    const cancelBtn = event.target.closest(".cancel-btn");
    const cancelWaitBtn = event.target.closest(".cancel-waitlist-btn");
    const receiptBtn = event.target.closest(".receipt-btn");
    const confirmBtn = event.target.closest(".confirm-btn");

    if (cancelBtn) handleCancel(cancelBtn.dataset.bookingId);
    if (cancelWaitBtn) handleCancelWaitlist(cancelWaitBtn.dataset.waitlistId);
    if (receiptBtn) handleGeneratePDF(receiptBtn.dataset.bookingId, 'receipt');
    if (confirmBtn) handleGeneratePDF(confirmBtn.dataset.bookingId, 'confirmation');
  });

  viewHistoryBtn?.addEventListener("click", loadHistory);
  refreshBookings?.addEventListener("click", loadBookings);
};

const handleGeneratePDF = async (bookingId, type) => {
  try {
    const url = `${API_BASE}/api/bookings/${bookingId}/${type}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (!response.ok) throw new Error(`Failed to generate ${type}`);

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${type}_${bookingId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
  } catch (error) {
    alert(error.message);
  }
};

export const showBookingsPage = () => {
  document.querySelector("#bookingsSection")?.classList.remove("d-none");
  loadBookings();
};

export const hideBookingsPage = () => {
  document.querySelector("#bookingsSection")?.classList.add("d-none");
};

/* =====================================================
   RENDER BOOKINGS + WAITLISTS
===================================================== */
const renderBookings = (bookings = [], waitlists = [], isHistory = false) => {
  const bookingsList = document.querySelector("#bookingsList");
  if (!bookingsList) return;

  if (!state.token) {
    bookingsList.innerHTML = `
      <div class="booking-empty">
        <h6>Sign in to view bookings</h6>
        <p class="mb-0">Your reservations and waitlists will appear here once you are logged in.</p>
      </div>
    `;
    return;
  }

  // Render waitlists first
  const waitlistHTML = waitlists.length
    ? waitlists.map(entry => `
        <div class="booking-row" style="background:#f8f9fa">
          <div>
            <h6>${entry.event.title}</h6>
            <p class="mb-0">
              ${formatDate(entry.event.starts_at, { weekday: 'short', month: 'short', day: 'numeric' })} · 
              ${formatTime(entry.event.starts_at)} · 
              ${entry.event.location}
            </p>
            <p class="mb-0 booking-guest">
              Waitlist — ${entry.requested_spots} space(s)
            </p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-danger btn-sm cancel-waitlist-btn" data-waitlist-id="${entry.id}">
              Cancel Waitlist
            </button>
          </div>
        </div>
      `).join("")
    : `<p class="mb-2 text-muted">No waitlists currently.</p>`;

  // Render bookings
  const bookingsHTML = bookings.length
    ? bookings.map(booking => {
        const when = booking.status === 'cancelled' ? (booking.cancelled_at || booking.booked_at) : booking.booked_at;
        const action = booking.status === 'cancelled' ? 'Cancelled' : 'Booked';
        const guestInfo = booking.guest_names?.length
          ? `Guests: ${booking.guest_names.map(g => typeof g === 'object' ? `${g.name} (${g.type})` : g).join(', ')}`
          : (booking.guest_count > 1 ? `Guests: ${booking.guest_count}` : 'Guest: 1');

        return `
          <div class="booking-row">
            <div>
              <h6>${booking.event.title}</h6>
              <p class="mb-0">${formatDate(booking.event.starts_at, { weekday:'short', month:'short', day:'numeric' })} · ${formatTime(booking.event.starts_at)} · ${booking.event.location}</p>
              <p class="mb-0 booking-guest">${guestInfo}</p>
              ${isHistory ? `<p class="mb-0" style="color:rgba(0,0,0,0.6)">${action} — ${formatDate(when, { weekday:'short', month:'short', day:'numeric' })} ${formatTime(when)}</p>` : ''}
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-dark btn-sm receipt-btn" data-booking-id="${booking.id}">Receipt</button>
              ${booking.status !== 'cancelled' ? `<button class="btn btn-outline-dark btn-sm confirm-btn" data-booking-id="${booking.id}">Confirmation</button>` : ''}
              ${!isHistory && booking.status !== 'cancelled' ? `<button class="btn btn-outline-dark btn-sm cancel-btn" data-booking-id="${booking.id}">Cancel</button>` : ''}
            </div>
          </div>
        `;
      }).join("")
    : `<p class="mb-2 text-muted">No upcoming bookings.</p>`;

  bookingsList.innerHTML = `
    <h6 class="mb-3">Your Waitlists</h6>
    ${waitlistHTML}
    <h6 class="mt-4 mb-3">Your Bookings</h6>
    ${bookingsHTML}
  `;
};

/* =====================================================
   LOAD BOOKINGS + WAITLISTS
===================================================== */
export const loadBookings = async () => {
  const bookingStatus = document.querySelector("#bookingStatus");
  if (bookingStatus) bookingStatus.textContent = "";

  if (!state.token) {
    renderBookings([], []);
    return;
  }

  try {
    const [bookings, waitlists] = await Promise.all([
      apiFetch("/api/bookings", { headers: { Authorization: `Bearer ${state.token}` } }),
      apiFetch("/api/waitlist", { headers: { Authorization: `Bearer ${state.token}` } })
    ]);

    renderBookings(bookings || [], waitlists || [], false);
  } catch (error) {
    renderBookings([], []);
    if (bookingStatus) bookingStatus.textContent = error.message || "Unable to load data";
  }
};

/* =====================================================
   ACTIONS
===================================================== */
const handleCancel = async (bookingId) => {
  try {
    await apiFetch(`/api/bookings/${bookingId}`, { method: "DELETE", headers: { Authorization: `Bearer ${state.token}` } });
    loadBookings();
    loadEvents();
  } catch (error) {
    document.querySelector("#bookingStatus").textContent = error.message;
  }
};

const handleCancelWaitlist = async (waitlistId) => {
  try {
    await apiFetch(`/api/waitlist/${waitlistId}`, { method: "DELETE", headers: { Authorization: `Bearer ${state.token}` } });
    loadBookings();
    loadEvents();
  } catch (error) {
    document.querySelector("#bookingStatus").textContent = error.message;
  }
};

const loadHistory = async () => {
  if (!state.token) return;

  try {
    const bookings = await apiFetch("/api/bookings/history", { headers: { Authorization: `Bearer ${state.token}` } });
    renderBookings(bookings || [], [], true);
  } catch (error) {
    document.querySelector("#bookingStatus").textContent = error.message;
  }
};

/* =====================================================
   AUTH GREETING
===================================================== */
export const updateAuthGreeting = () => {
  const authGreeting = document.querySelector("#authGreeting");
  if (!authGreeting) return;

  if (state.token && state.user) {
    const firstName = state.user.first_name || "";
    const lastName = state.user.last_name || "";
    authGreeting.textContent = `Welcome back, ${firstName} ${lastName}`.trim() + ".";
  } else {
    authGreeting.textContent = "Sign in to manage your reservations.";
  }
};
