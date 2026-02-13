import { state } from "../state.js";
import { formatDate, formatTime } from "../utils/formatters.js";
import { apiFetch } from "../utils/api.js";
import { loadEvents } from "./events.js";
import QRCode from "qrcode";

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
    const receiptBtn = event.target.closest(".receipt-btn");
    const confirmBtn = event.target.closest(".confirm-btn");

    if (cancelBtn) handleCancel(cancelBtn.dataset.bookingId);
    if (receiptBtn) handleGeneratePDF(receiptBtn.dataset.bookingId, 'receipt');
    if (confirmBtn) handleGeneratePDF(confirmBtn.dataset.bookingId, 'confirmation');
  });

  viewHistoryBtn?.addEventListener("click", loadHistory);
  refreshBookings?.addEventListener("click", loadBookings);
};

const handleGeneratePDF = async (bookingId, type) => {
  try {
    const url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/bookings/${bookingId}/${type}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
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

const renderBookings = (bookings, isHistory = false) => {
  const bookingsList = document.querySelector("#bookingsList");
  if (!bookingsList) return;

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
        <h6>No ${isHistory ? 'history' : 'upcoming bookings'}</h6>
        <p class="mb-0">${isHistory ? 'You have no past bookings.' : 'Browse events and reserve your spot.'}</p>
      </div>
    `;
    return;
  }

  bookingsList.innerHTML = bookings
    .map((booking) => {
      const when = booking.status === 'cancelled' ? (booking.cancelled_at || booking.booked_at) : booking.booked_at;
      const action = booking.status === 'cancelled' ? 'Cancelled' : 'Booked';
      const guestInfo = booking.guest_names?.length
        ? `Guests: ${booking.guest_names.map(g => (typeof g === 'object' ? `${g.name} (${g.type})` : g)).join(', ')}`
        : (booking.guest_count > 1 ? `Guests: ${booking.guest_count}` : 'Guest: 1');

      const passMarkup = booking.confirmation_code && booking.status !== "cancelled"
        ? `
          <div class="booking-pass" data-confirmation-code="${booking.confirmation_code}">
            <div class="booking-pass-label">Check-in code</div>
            <div class="booking-pass-placeholder">Loading code...</div>
          </div>
        `
        : "";

      if (isHistory) {
        return `
          <div class="booking-row">
            <div>
              <h6>${booking.event.title}</h6>
              <p class="mb-0">${formatDate(booking.event.starts_at, { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatTime(booking.event.starts_at)} · ${booking.event.location}</p>
              <p class="mb-0 booking-guest">${guestInfo}</p>
              <p class="mb-0" style="color:rgba(0,0,0,0.6)">${action} — ${formatDate(when, { weekday: 'short', month: 'short', day: 'numeric' })} ${formatTime(when)}</p>
            </div>
            <div class="d-flex gap-2 flex-wrap justify-content-end">
              <button class="btn btn-outline-dark btn-sm receipt-btn" data-booking-id="${booking.id}">Receipt</button>
              ${booking.status !== 'cancelled' ? `<button class="btn btn-outline-dark btn-sm confirm-btn" data-booking-id="${booking.id}">Confirmation</button>` : ''}
              ${passMarkup}
            </div>
          </div>
        `;
      }

      return `
        <div class="booking-row">
          <div>
            <h6>${booking.event.title}</h6>
            <p class="mb-0">${formatDate(booking.event.starts_at, { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatTime(booking.event.starts_at)} · ${booking.event.location}</p>
            <p class="mb-0 booking-guest">${guestInfo}</p>
          </div>
          <div class="d-flex gap-2 flex-wrap justify-content-end">
            <button class="btn btn-outline-dark btn-sm receipt-btn" data-booking-id="${booking.id}">Receipt</button>
            <button class="btn btn-outline-dark btn-sm confirm-btn" data-booking-id="${booking.id}">Confirmation</button>
            <button class="btn btn-outline-dark btn-sm cancel-btn" data-booking-id="${booking.id}">Cancel</button>
            ${passMarkup}
          </div>
        </div>
      `;
    })
    .join("");

  renderBookingPasses(bookingsList);
};

const renderBookingPasses = async (bookingsList) => {
  const passNodes = Array.from(bookingsList.querySelectorAll(".booking-pass"));
  if (passNodes.length === 0) return;

  await Promise.all(
    passNodes.map(async (node) => {
      const code = node.dataset.confirmationCode;
      if (!code) return;
      try {
        const dataUrl = await QRCode.toDataURL(code, { width: 120, margin: 1 });
        node.innerHTML = `
          <div class="booking-pass-label">Check-in code</div>
          <img src="${dataUrl}" alt="Confirmation code ${code}" class="booking-pass-image" />
          <div class="booking-pass-code">${code}</div>
        `;
      } catch (error) {
        node.innerHTML = `
          <div class="booking-pass-label">Check-in code</div>
          <div class="booking-pass-code">${code}</div>
        `;
      }
    })
  );
};

export const loadBookings = async () => {
  const bookingStatus = document.querySelector("#bookingStatus");
  const bookingsList = document.querySelector("#bookingsList");

  if (!bookingsList) return;
  if (bookingStatus) bookingStatus.textContent = "";

  if (!state.token) {
    renderBookings([]);
    return;
  }

  try {
    const data = await apiFetch("/api/bookings");
    renderBookings(data, false);
  } catch (error) {
    bookingsList.innerHTML = `
      <div class="booking-empty">
        <h6>Unable to load bookings</h6>
        <p class="mb-0">${error.message}</p>
      </div>
    `;
  }
};

const handleCancel = async (bookingId) => {
  const bookingStatus = document.querySelector("#bookingStatus");
  if (bookingStatus) bookingStatus.textContent = "";

  try {
    await apiFetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    loadBookings();
    loadEvents();
  } catch (error) {
    if (bookingStatus) bookingStatus.textContent = error.message;
  }
};

const loadHistory = async () => {
  if (!state.token) return;

  const bookingStatus = document.querySelector("#bookingStatus");
  if (bookingStatus) bookingStatus.textContent = "";

  try {
    const data = await apiFetch("/api/bookings/history");
    renderBookings(data, true);
  } catch (error) {
    if (bookingStatus) bookingStatus.textContent = error.message;
  }
};

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
