import { state } from "../state.js";
import { formatDate, formatTime } from "../utils/formatters.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

let currentFilter = "all";
let currentSearch = "";

const titleCase = (s) =>
  s.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );

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
  const searchInput = document.querySelector("#searchInput");

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderEvents(state.events);
    });
  });

  searchInput?.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderEvents(state.events);
  });
};

export const showEventsPage = () => {
  const eventsSection = document.querySelector("#eventsSection");
  const searchInput = document.querySelector("#searchInput");

  eventsSection?.classList.remove("d-none");

  currentFilter = "all";
  currentSearch = "";
  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.querySelector('[data-filter="all"]')?.classList.add("active");
  if (searchInput) searchInput.value = "";

  loadEvents();
};

export const hideEventsPage = () => {
  document.querySelector("#eventsSection")?.classList.add("d-none");
};

const renderEvents = (events) => {
  const eventsGrid = document.querySelector("#eventsGrid");
  if (!eventsGrid) return;

  state.events = events;

  const filtersContainer = document.querySelector("#categoryFilters");
  if (filtersContainer) {
    const cats = Array.from(
      new Set(
        events
          .map((e) =>
            e.category && e.category.name
              ? e.category.name.toLowerCase()
              : null
          )
          .filter(Boolean)
      )
    );

    const buttons = ["all", ...cats];

    filtersContainer.innerHTML = buttons
      .map(
        (f) =>
          `<button type="button" class="btn btn-outline-dark filter-btn ${
            f === currentFilter ? "active" : ""
          }" data-filter="${f}">
            ${f === "all" ? "All" : titleCase(f)}
          </button>`
      )
      .join("");

    filtersContainer.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderEvents(events);
      });
    });
  }

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

  if (currentFilter !== "all") {
    filtered = filtered.filter(
      (event) =>
        (
          event.category && event.category.name
            ? event.category.name
            : ""
        ).toLowerCase() === currentFilter
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
                  ? `<button class="btn btn-outline-dark btn-sm edit-event-btn" data-event-id="${event.id}">Edit Event</button>`
                  : event.spots_left === 0
                  ? `<button class="btn btn-outline-secondary btn-sm waitlist-btn px-4" data-event-id="${event.id}">Join Waitlist</button>`
                  : `<button class="btn btn-dark btn-sm book-btn px-4" data-event-id="${event.id}">Add to cart</button>`
              }
            </div>
          </div>
        </div>
      `
    )
    .join("");

  /* ===============================
     WAITLIST LISTENER + AUTO REFRESH
     =============================== */

  document.querySelectorAll(".waitlist-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!state.user || !state.token) {
        alert("You must be logged in to join the waitlist.");
        return;
      }

      const eventId = btn.dataset.eventId;
      const requested = prompt(
        "How many spaces would you like to wait for?",
        "1"
      );

      if (!requested || isNaN(requested) || parseInt(requested) < 1) {
        return;
      }

      try {
        btn.disabled = true;
        btn.innerText = "Joining...";

        const response = await fetch(
          `${apiBaseUrl}/api/events/${eventId}/waitlist`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${state.token}`,
            },
            body: JSON.stringify({
              requested_spots: parseInt(requested),
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to join waitlist");
        }

        btn.innerText = "Joined Waitlist";
        btn.classList.remove("btn-outline-secondary");
        btn.classList.add("btn-success");

        // 🔄 Auto refresh events after short delay
        setTimeout(() => {
          loadEvents();
        }, 1500);

      } catch (err) {
        btn.disabled = false;
        btn.innerText = "Join Waitlist";
        alert(err.message || "Something went wrong.");
      }
    });
  });

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
  const eventsGrid = document.querySelector("#eventsGrid");
  if (!eventsGrid) return;

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
  const eventsGrid = document.querySelector("#eventsGrid");
  if (!eventsGrid) return;

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

export const loadEvents = async () => {
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