import { router } from "../router.js";

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
                <p class="tag">Next up</p>
                <h3>Abbey Gardens Tour</h3>
                <p class="mb-2">Sun, Mar 1 · 10:00 AM</p>
                <p class="text-muted">Delapre Abbey Gardens</p>
              </div>
              <div class="hero-badge">Free</div>
            </div>
            <div class="hero-card-bottom">
              <div>
                <p class="mb-1">Spaces left</p>
                <strong>12</strong>
              </div>
              <button class="btn btn-dark">Reserve spot</button>
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
          <p>Filter by day, time, and venue. All events are free to attend.</p>
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
          <p>Reserve in seconds, then reschedule or cancel whenever needed.</p>
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
};

export const showHomePage = () => {
  document.querySelector("#homeSection")?.classList.remove("d-none");
  document.querySelector("#howSection")?.classList.remove("d-none");
};

export const hideHomePage = () => {
  document.querySelector("#homeSection")?.classList.add("d-none");
  document.querySelector("#howSection")?.classList.add("d-none");
};
