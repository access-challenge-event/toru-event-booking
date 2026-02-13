import { router } from "../router.js";
import { formatDate, formatTime } from "../utils/formatters.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const renderHomeHTML = () => `
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
                <p class="tag" id="heroTag">Next up</p>
                <h3 id="heroTitle">Abbey Gardens Tour</h3>
                <p class="mb-2" id="heroDate">Sun, Mar 1 · 10:00 AM</p>
                <p class="text-muted" id="heroLocation">Delapre Abbey Gardens</p>
              </div>
              <div class="hero-badge" id="heroBadge">Free</div>
            </div>
            <div class="hero-card-bottom">
              <div>
                <p class="mb-1">Spaces left</p>
                <strong id="heroSpaces">12</strong>
              </div>
              <button class="btn btn-dark" id="heroReserveBtn" data-event-id="">Reserve spot</button>
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
          <p>Filter by day, time, and venue.</p>
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
          <p>Reserve in seconds.</p>
        </div>
      </div>
    </div>
  </section>
`;

export const initHomePage = () => {
  const browseBtn = document.querySelector("#browseBtn");
  const myBookingsBtn = document.querySelector("#myBookingsBtn");

  browseBtn?.addEventListener("click", () => {
    router.navigateTo("events");
  });

  myBookingsBtn?.addEventListener("click", () => {
    router.navigateTo("bookings");
  });
  
  // Populate the hero card with the next upcoming event from the API
  const heroReserveBtn = document.querySelector("#heroReserveBtn");

  const populateHero = (event) => {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value ?? "";
    };

    if (!event) {
      set("heroTag", "");
      set("heroTitle", "No upcoming events");
      set("heroDate", "");
      set("heroLocation", "");
      set("heroBadge", "");
      set("heroSpaces", "");
      if (heroReserveBtn) {
        heroReserveBtn.dataset.eventId = "";
        heroReserveBtn.disabled = true;
        heroReserveBtn.onclick = null;
      }
      return;
    }

    set("heroTag", (event.category && event.category.name) ? event.category.name : "Next up");
    set("heroTitle", event.title || "");
    try {
      set("heroDate", `${formatDate(event.starts_at, { weekday: "short", month: "short", day: "numeric" })} · ${formatTime(event.starts_at)}`);
    } catch (e) {
      set("heroDate", "");
    }
    set("heroLocation", event.location || "");
    set("heroBadge", event.is_free ? "Free" : (event.price != null ? `£${Number(event.price).toFixed(2)}` : ""));
    set("heroSpaces", event.spots_left ?? event.capacity ?? "");

    if (heroReserveBtn) {
      heroReserveBtn.dataset.eventId = event.id ?? "";
      heroReserveBtn.disabled = (event.spots_left === 0);
      heroReserveBtn.onclick = () => {
        router.navigateTo("events");
      };
    }
  };

  const loadNextEvent = async () => {
    try {
      const resp = await fetch(`${apiBaseUrl}/api/events`);
      if (!resp.ok) throw new Error("Failed to fetch events");
      const events = await resp.json();
      if (!Array.isArray(events) || events.length === 0) {
        populateHero(null);
        return;
      }

      const now = new Date();
      const upcoming = events
        .map((e) => ({ ...e, starts_at: new Date(e.starts_at) }))
        .filter((e) => e.starts_at >= now)
        .sort((a, b) => a.starts_at - b.starts_at);

      const next = upcoming[0] || events[0];
      populateHero(next);
    } catch (err) {
      console.error("loadNextEvent error:", err);
      populateHero(null);
    }
  };

  loadNextEvent();
};

export const showHomePage = () => {
  document.querySelector("#homeSection")?.classList.remove("d-none");
  document.querySelector("#howSection")?.classList.remove("d-none");
};

export const hideHomePage = () => {
  document.querySelector("#homeSection")?.classList.add("d-none");
  document.querySelector("#howSection")?.classList.add("d-none");
};
