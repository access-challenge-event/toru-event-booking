
import "bootstrap/dist/css/bootstrap.min.css";
import * as bootstrap from "bootstrap";
import { state } from "../state.js";
import { formatDate, formatTime } from "../utils/formatters.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

let currentFilter = "all";
let currentSearch = "";
let currentWaitlistEventId = null;

const titleCase = (s) =>
  s.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );

/* ===============================
   WAITLIST MODAL CREATION
   =============================== */

const createWaitlistModal = () => {
  if (document.getElementById("waitlistModal")) return;

  const modalHTML = `
  <div class="modal fade" id="waitlistModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Join Waitlist</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p>This event is currently full. Enter how many spaces you'd like:</p>
          <input type="number" min="1" value="1" class="form-control" id="waitlistSpotsInput">
          <div id="waitlistError" class="text-danger mt-2 d-none"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            Cancel
          </button>
          <button type="button" class="btn btn-dark" id="confirmWaitlistBtn">
            Join Waitlist
          </button>
        </div>
      </div>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  document
    .getElementById("confirmWaitlistBtn")
    .addEventListener("click", handleWaitlistSubmit);
};

const handleWaitlistSubmit = async () => {
  const input = document.getElementById("waitlistSpotsInput");
  const errorDiv = document.getElementById("waitlistError");

  const requested = parseInt(input.value);

  if (!requested || requested < 1) {
    errorDiv.textContent = "Please enter a valid number.";
    errorDiv.classList.remove("d-none");
    return;
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/api/events/${currentWaitlistEventId}/waitlist`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({ requested_spots: requested }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to join waitlist");
    }

    const modalEl = document.getElementById("waitlistModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    setTimeout(() => {
      loadEvents();
    }, 500);

  } catch (err) {
    errorDiv.textContent = err.message;
    errorDiv.classList.remove("d-none");
  }
};

/* ===============================
   MAIN EVENTS PAGE
   =============================== */

export const renderEventsHTML = () => `
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
          <div id="categoryFilters" class="btn-group w-100" role="group"></div>
        </div>
      </div>
    </div>
    <div id="eventsGrid" class="row g-4"></div>
  </section>
`;

export const initEventsPage = () => {
  createWaitlistModal();

  const searchInput = document.querySelector("#searchInput");

  searchInput?.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderEvents(state.events);
  });
};

export const showEventsPage = () => {
  document.querySelector("#eventsSection")?.classList.remove("d-none");
  currentFilter = "all";
  currentSearch = "";
  loadEvents();
};

export const hideEventsPage = () => {
  document.querySelector("#eventsSection")?.classList.add("d-none");
};

const renderEvents = (events) => {
  const eventsGrid = document.querySelector("#eventsGrid");
  if (!eventsGrid) return;

  state.events = events;

  let filtered = events;

  if (currentSearch) {
    const search = currentSearch.toLowerCase();
    filtered = filtered.filter(
      (event) =>
        event.title.toLowerCase().includes(search) ||
        event.description.toLowerCase().includes(search) ||
        event.location.toLowerCase().includes(search)
    );
  }

  eventsGrid.innerHTML = filtered
    .map(
      (event) => `
        <div class="col-md-6 col-lg-4">
          <div class="event-card h-100">
            <div class="event-card-top">
              <div>
                <p class="tag">${
                  event.is_free ? "Free" : `£${event.price.toFixed(2)}`
                }</p>
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
              <span>${
                event.spots_left !== undefined
                  ? event.spots_left
                  : event.capacity
              } spaces left</span>
              ${
                state.user && state.user.is_staff
                  ? `<button class="btn btn-outline-dark btn-sm edit-event-btn">Edit Event</button>`
                  : event.spots_left === 0
                  ? `<button class="btn btn-outline-secondary btn-sm waitlist-btn px-4" data-event-id="${event.id}">
                      Join Waitlist
                    </button>`
                  : `<button class="btn btn-dark btn-sm book-btn px-4">
                      Add to cart
                    </button>`
              }
            </div>
          </div>
        </div>
      `
    )
    .join("");

  // Attach waitlist click listeners
  document.querySelectorAll(".waitlist-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.user || !state.token) {
        alert("You must be logged in to join the waitlist.");
        return;
      }

      currentWaitlistEventId = btn.dataset.eventId;

      // Reset modal input and error
      const modalInput = document.getElementById("waitlistSpotsInput");
      const modalError = document.getElementById("waitlistError");
      if (modalInput) modalInput.value = 1;
      if (modalError) modalError.classList.add("d-none");

      const modalEl = document.getElementById("waitlistModal");
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    });
  });
};

const showEventsLoading = () => {
  const eventsGrid = document.querySelector("#eventsGrid");
  if (!eventsGrid) return;

  eventsGrid.innerHTML = `
    <div class="col-12 text-center p-5">
      <div class="spinner-border text-dark"></div>
    </div>
  `;
};

const showEventsError = () => {
  const eventsGrid = document.querySelector("#eventsGrid");
  if (!eventsGrid) return;

  eventsGrid.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger">
        Could not load events. Please try again.
      </div>
    </div>
  `;
};

export const loadEvents = async () => {
  showEventsLoading();
  try {
    const response = await fetch(`${apiBaseUrl}/api/events`);
    if (!response.ok) throw new Error("Failed to fetch events");
    const data = await response.json();
    renderEvents(data);
  } catch {
    showEventsError();
  }
};