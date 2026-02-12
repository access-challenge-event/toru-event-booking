import { state } from "../state.js";
import { formatDate, formatTime } from "../utils/formatters.js";
import { apiFetch } from "../utils/api.js";
import { loadEvents } from "./events.js";

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
    const button = event.target.closest(".cancel-btn");
    if (!button) return;
    handleCancel(button.dataset.bookingId);
  });

  viewHistoryBtn?.addEventListener("click", loadHistory);
  refreshBookings?.addEventListener("click", loadBookings);
};

export const showBookingsPage = () => {
  document.querySelector("#bookingsSection")?.classList.remove("d-none");
  loadBookings();
};

export const hideBookingsPage = () => {
  document.querySelector("#bookingsSection")?.classList.add("d-none");
};

const renderBookings = (bookings) => {
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
    renderBookings(data);
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
