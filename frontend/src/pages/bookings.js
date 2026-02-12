import { state } from "../state.js";
import { formatDate, formatTime } from "../utils/formatters.js";
import { apiFetch } from "../utils/api.js";

export const initBookingsPage = (elements) => {
  const { bookingsList, viewHistoryBtn, refreshBookings } = elements;

  bookingsList.addEventListener("click", (event) => {
    const button = event.target.closest(".cancel-btn");
    if (!button) return;
    handleCancel(button.dataset.bookingId, elements);
  });

  viewHistoryBtn.addEventListener("click", () => loadHistory(elements));
  refreshBookings.addEventListener("click", () => loadBookings(elements));
};

export const renderBookings = (bookings, elements) => {
  const { bookingsList } = elements;
  
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

export const loadBookings = async (elements) => {
  const { bookingsList, bookingStatus } = elements;
  bookingStatus.textContent = "";
  
  if (!state.token) {
    renderBookings([], elements);
    return;
  }
  
  try {
    const data = await apiFetch("/api/bookings");
    renderBookings(data, elements);
  } catch (error) {
    bookingsList.innerHTML = `
      <div class="booking-empty">
        <h6>Unable to load bookings</h6>
        <p class="mb-0">${error.message}</p>
      </div>
    `;
  }
};

const handleCancel = async (bookingId, elements) => {
  const { bookingStatus, eventsGrid } = elements;
  bookingStatus.textContent = "";
  
  try {
    await apiFetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    loadBookings(elements);
    // Reload events to update spots
    const { loadEvents } = await import("./events.js");
    loadEvents(eventsGrid);
  } catch (error) {
    bookingStatus.textContent = error.message;
  }
};

const loadHistory = async (elements) => {
  const { bookingStatus } = elements;
  
  if (!state.token) return;
  
  bookingStatus.textContent = "";
  try {
    const data = await apiFetch("/api/bookings/history");
    renderBookings(data, elements);
  } catch (error) {
    bookingStatus.textContent = error.message;
  }
};
