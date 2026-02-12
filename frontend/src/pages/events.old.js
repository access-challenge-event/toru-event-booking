import { state } from "../state.js";
import { formatDate, formatTime } from "../utils/formatters.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

let currentFilter = "all";
let currentSearch = "";

export const initEventsPage = (elements) => {
  const { eventsGrid, searchInput } = elements;

  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderEvents(state.events, eventsGrid);
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      renderEvents(state.events, eventsGrid);
    });
  }
};

export const renderEventsPage = (elements) => {
  const { searchInput } = elements;
  currentFilter = "all";
  currentSearch = "";
  document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector('[data-filter="all"]').classList.add("active");
  if (searchInput) searchInput.value = "";
  loadEvents(elements.eventsGrid);
};

export const renderEvents = (events, eventsGrid) => {
  state.events = events;
  
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

const showEventsLoading = (eventsGrid) => {
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

const showEventsError = (eventsGrid) => {
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

export const loadEvents = async (eventsGrid) => {
  showEventsLoading(eventsGrid);
  try {
    const response = await fetch(`${apiBaseUrl}/api/events`);
    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }
    const data = await response.json();
    renderEvents(data, eventsGrid);
  } catch (error) {
    showEventsError(eventsGrid);
  }
};
