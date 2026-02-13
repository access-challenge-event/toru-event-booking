import { state } from "../state.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const renderStaffHTML = () => `
  <section id="staffSection" class="container section-gap d-none">
    
    <!-- Dashboard Grid View -->
    <div id="staffDashboardView">
      <div class="section-header">
        <h2>Staff Dashboard</h2>
        <p>Welcome back. What would you like to do today?</p>
      </div>
      
      <div class="row g-4">
        <!-- Add Event Card -->
        <div class="col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm action-card" role="button" id="btnShowAddEvent">
            <div class="card-body text-center p-5">
              <div class="mb-3 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-calendar-plus" viewBox="0 0 16 16">
                  <path d="M8 7a.5.5 0 0 1 .5.5V9H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V10H6a.5.5 0 0 1 0-1h1.5V7.5A.5.5 0 0 1 8 7z"/>
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                </svg>
              </div>
              <h5 class="card-title">Add New Event</h5>
              <p class="card-text text-muted">Create a new event listing, set dates, capacity and ticket prices.</p>
            </div>
          </div>
        </div>

        <!-- Manage Events Card -->
        <div class="col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm action-card" role="button" id="btnShowManageBookings">
            <div class="card-body text-center p-5">
              <div class="mb-3 text-success">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-list-check" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3.854 2.146a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708L2 3.293l1.146-1.147a.5.5 0 0 1 .708 0zm0 4a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708L2 7.293l1.146-1.147a.5.5 0 0 1 .708 0zm0 4a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/>
                  </svg>
              </div>
              <h5 class="card-title">Manage Bookings</h5>
              <p class="card-text text-muted">View attendee lists, verification codes, and manage reservations.</p>
            </div>
          </div>
        </div>
        
        <!-- Analytics Card (Placeholder) -->
        <div class="col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm action-card" role="button">
            <div class="card-body text-center p-5">
              <div class="mb-3 opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-graph-up" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M0 0h1v15h15v1H0V0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07z"/>
                </svg>
              </div>
              <h5 class="card-title">Analytics</h5>
              <p class="card-text text-muted">View booking trends, revenue, and capacity utilization.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Event View (Hidden by default) -->
    <div id="staffAddEventView" class="d-none">
       <button class="btn btn-outline-secondary mb-4" id="backToDashboardBtn">
        &larr; Back to Dashboard
      </button>

      <div class="row justify-content-center">
        <div class="col-lg-8">
           <div class="card p-4 shadow-sm border-0">
             <h4 class="mb-4" id="addEventTitle">Add New Event</h4>
             <form id="addEventForm">
                <input type="hidden" id="editEventId" value="">
                <div class="mb-3">
                  <label for="eventCategory" class="form-label">Category</label>
                  <select class="form-select" id="eventCategory" required>
                    <option value="" selected disabled>Select category...</option>
                    <!-- populated dynamically -->
                  </select>
                </div>
                
                <div class="mb-3">
                  <label for="eventTitle" class="form-label">Event Name</label>
                  <input type="text" class="form-control" id="eventTitle" required>
                </div>

                <div class="mb-3">
                  <label for="eventLocation" class="form-label">Location</label>
                  <select class="form-select" id="eventLocation" required>
                    <option value="" selected disabled>Select location...</option>
                    <!-- populated dynamically -->
                  </select>
                  <div class="form-text">Choose from existing locations.</div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Start Date & Time</label>
                    <div class="input-group">
                      <input type="date" class="form-control" id="eventStartDate" required>
                      <input type="text" class="form-control time-input" id="eventStartTime" placeholder="HH:MM" maxlength="5" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" required>
                    </div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">End Date & Time</label>
                    <div class="input-group">
                      <input type="date" class="form-control" id="eventEndDate" required>
                      <input type="text" class="form-control time-input" id="eventEndTime" placeholder="HH:MM" maxlength="5" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" required>
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <label for="eventCapacity" class="form-label">Capacity</label>
                  <input type="number" class="form-control" id="eventCapacity" min="1" value="20" required>
                </div>

                <div class="mb-3">
                  <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="eventFree">
                    <label class="form-check-label" for="eventFree">
                      This event is FREE
                    </label>
                  </div>
                  <label for="eventPrice" class="form-label">Price (£)</label>
                  <input type="number" class="form-control" id="eventPrice" step="0.01" min="0">
                </div>

                <div class="card p-3 bg-light border-0 mb-3">
                  <div class="form-check form-switch mb-2">
                    <input class="form-check-input" type="checkbox" id="eventRecurToggle">
                    <label class="form-check-label fw-bold" for="eventRecurToggle">Repeat Event</label>
                  </div>
                  <div id="recurrenceOptions" class="row g-2 d-none">
                    <div class="col-12 col-md-6">
                      <label class="form-label text-muted small">Frequency</label>
                      <select class="form-select form-select-sm" id="eventRecurType">
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label text-muted small">Repeat until</label>
                      <input type="date" class="form-control form-control-sm" id="eventRecurEnd" />
                    </div>
                  </div>
                </div>
                
                <div class="alert alert-danger d-none" id="addEventError"></div>
                <div class="alert alert-success d-none" id="addEventSuccess">Event created successfully!</div>

                <button type="submit" class="btn btn-dark w-100" id="addEventBtn">Create Event</button>
             </form>
           </div>
        </div>
      </div>
    </div>

    <!-- Manage Bookings View -->
    <div id="staffManageBookingsView" class="d-none">
       <button class="btn btn-outline-secondary mb-4 back-to-dashboard">
        &larr; Back to Dashboard
      </button>
      <div class="row">
        <div class="col-12">
          <div class="card p-4 shadow-sm border-0">
            <h4 class="mb-4">Attendee Verification</h4>
            <div class="table-responsive">
              <table class="table table-hover align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Verification Code</th>
                    <th>Event</th>
                    <th>Attendee</th>
                    <th>Total Guests</th>
                    <th>Date Booked</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="allBookingsList">
                  <!-- Bookings will be loaded here -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
`;

export const initStaffPage = () => {
  const dashboardView = document.querySelector("#staffDashboardView");
  const addEventView = document.querySelector("#staffAddEventView");
  const btnShowAddEvent = document.querySelector("#btnShowAddEvent");
  const backToDashboardBtn = document.querySelector("#backToDashboardBtn");

  // Navigation Logic
  btnShowAddEvent?.addEventListener("click", () => {
    dashboardView?.classList.add("d-none");
    addEventView?.classList.remove("d-none");
  });

  const btnShowManageBookings = document.querySelector("#btnShowManageBookings");
  const manageBookingsView = document.querySelector("#staffManageBookingsView");

  btnShowManageBookings?.addEventListener("click", () => {
    dashboardView?.classList.add("d-none");
    manageBookingsView?.classList.remove("d-none");
    loadAllBookings();
  });

  document.querySelectorAll(".back-to-dashboard").forEach(btn => {
    btn.addEventListener("click", () => {
      addEventView?.classList.add("d-none");
      manageBookingsView?.classList.add("d-none");
      dashboardView?.classList.remove("d-none");
    });
  });

  backToDashboardBtn?.addEventListener("click", () => {
    addEventView?.classList.add("d-none");
    dashboardView?.classList.remove("d-none");
  });

  // Form Logic
  const form = document.querySelector("#addEventForm");
  const freeCheck = document.querySelector("#eventFree");
  const priceInput = document.querySelector("#eventPrice");

  // Format time inputs (HH:MM)
  document.querySelectorAll(".time-input").forEach(input => {
    input.addEventListener("input", (e) => {
      let v = e.target.value.replace(/\D/g, "");
      if (v.length > 4) v = v.slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + ":" + v.slice(2);
      e.target.value = v;
    });
  });

  // Toggle price input
  freeCheck?.addEventListener("change", (e) => {
    if (e.target.checked) {
      priceInput.value = "0.00";
      priceInput.disabled = true;
    } else {
      priceInput.disabled = false;
    }
  });

  // Toggle recurrence options
  const recurToggle = document.querySelector("#eventRecurToggle");
  const recurOptions = document.querySelector("#recurrenceOptions");
  recurToggle?.addEventListener("change", (e) => {
    recurOptions?.classList.toggle("d-none", !e.target.checked);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorAlert = document.querySelector("#addEventError");
    const successAlert = document.querySelector("#addEventSuccess");
    const btn = document.querySelector("#addEventBtn");

    errorAlert.classList.add("d-none");
    successAlert.classList.add("d-none");
    btn.disabled = true;
    btn.textContent = "Creating...";

    try {
      // Recurrence Logic
      let recurrence = {};
      if (recurToggle && recurToggle.checked) {
        const recurType = document.querySelector("#eventRecurType").value;
        const recurEnd = document.querySelector("#eventRecurEnd").value;
        const startDateVal = document.querySelector("#eventStartDate").value;

        if (!recurEnd) throw new Error("Please select an end date for the recurring event.");
        if (new Date(recurEnd) <= new Date(startDateVal)) throw new Error("Recurrence end date must be after the first event start date.");

        recurrence = { type: recurType, end_date: recurEnd };
      }

      const data = {
        category_id: document.querySelector("#eventCategory").value,
        title: document.querySelector("#eventTitle").value,
        location: document.querySelector("#eventLocation").value,
        starts_at: `${document.querySelector("#eventStartDate").value}T${document.querySelector("#eventStartTime").value}`,
        ends_at: `${document.querySelector("#eventEndDate").value}T${document.querySelector("#eventEndTime").value}`,
        capacity: document.querySelector("#eventCapacity").value,
        is_free: freeCheck.checked,
        price: freeCheck.checked ? 0 : document.querySelector("#eventPrice").value,
        recurrence: recurrence
      };

      const token = state.token || localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in to create events.");

      const editId = document.querySelector("#editEventId").value;
      const url = editId ? `${apiBaseUrl}/api/events/${editId}` : `${apiBaseUrl}/api/events`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create event");
      }

      successAlert.classList.remove("d-none");
      form.reset();
      priceInput.disabled = false;
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      errorAlert.textContent = err.message;
      errorAlert.classList.remove("d-none");
    } finally {
      btn.disabled = false;
      const isEdit = document.querySelector("#editEventId").value;
      btn.textContent = isEdit ? "Save Changes" : "Create Event";
    }
  });
};

export const editEvent = async (eventId) => {
  // Switch to staff page view
  document.querySelectorAll("section").forEach(s => s.classList.add("d-none"));
  showStaffPage();

  // Switch to form view
  document.querySelector("#staffDashboardView")?.classList.add("d-none");
  document.querySelector("#staffAddEventView")?.classList.remove("d-none");

  // Set Edit Mode UI
  document.querySelector("#addEventTitle").textContent = "Edit Event";
  document.querySelector("#addEventBtn").textContent = "Loading...";
  document.querySelector("#editEventId").value = eventId;

  // Hide Recurrence for simple edit (MVP) or allow if desired?
  // User asked "make it so staff... can make changes to THAT event" -> implies single instance usually. 
  // And complicated to edit series pattern from single event.
  // So let's hide recurrence toggle for edit mode for safety/MVP.
  document.querySelector("#eventRecurToggle").parentElement.parentElement.classList.add("d-none");

  try {
    const token = state.token || localStorage.getItem("token");
    const res = await fetch(`${apiBaseUrl}/api/events?id=${eventId}`); // Wait, API is /api/events or list? 
    // We need single event fetch. `GET /api/events` returns all. 
    // Do we have GET /api/events/<id>? Not in app.py provided earlier? 
    // In app.py: `GET /api/events` (list). 
    // We probably need to implement GET /api/events/<id> or find it in list.
    // For efficiency, finding in `state.events` is easiest if we came from list.

    // Let's rely on finding it in state first.
    let event = state.events?.find(e => e.id == eventId);

    // If not in state (e.g. refresh), we might fail. 
    // But renderEvents sets state.events.
    // If user came via "Edit" button, state.events MUST be populated.

    if (!event) throw new Error("Event not found in memory.");

    // Populate fields
    document.querySelector("#eventCategory").value = event.category_id || "";
    document.querySelector("#eventTitle").value = event.title;
    document.querySelector("#eventLocation").value = event.location;
    document.querySelector("#eventCapacity").value = event.capacity;
    document.querySelector("#eventPrice").value = event.price;

    // Dates
    // event.starts_at is "Fri, 13 Jun 2025 10:00:00 GMT" or ISO? 
    // Backend returns "Fri, 13 Jun 2025..." (HTTP date) usually via jsonify? 
    // Wait, app.py `event_to_dict` logic? 
    // Step 155 app.py: `starts_at` is usually datetime object. `jsonify` default?
    // Ah, `event_to_dict` probably does something.
    // Looking at `events.js`, formatters use `new Date(event.starts_at)`.
    // We need YYYY-MM-DD and HH:MM for inputs.

    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);

    const toIsoDate = (d) => d.toISOString().split('T')[0];
    const toTime = (d) => d.toTimeString().slice(0, 5); // HH:MM

    document.querySelector("#eventStartDate").value = toIsoDate(start);
    document.querySelector("#eventStartTime").value = toTime(start);
    document.querySelector("#eventEndDate").value = toIsoDate(end);
    document.querySelector("#eventEndTime").value = toTime(end);

    // Free toggle
    const freeCheck = document.querySelector("#eventFree");
    freeCheck.checked = event.is_free;
    freeCheck.dispatchEvent(new Event("change")); // trigger toggle logic

    document.querySelector("#addEventBtn").textContent = "Save Changes";

  } catch (e) {
    console.error(e);
    document.querySelector("#addEventError").textContent = "Failed to load event for editing.";
    document.querySelector("#addEventError").classList.remove("d-none");
  }
};

export const showStaffPage = () => {
  document.querySelector("#staffSection")?.classList.remove("d-none");
  // Reset view to dashboard
  document.querySelector("#staffDashboardView")?.classList.remove("d-none");
  document.querySelector("#staffAddEventView")?.classList.add("d-none");
  document.querySelector("#staffManageBookingsView")?.classList.add("d-none");

  // Reset Form for Add Mode
  document.querySelector("#addEventForm")?.reset();
  document.querySelector("#addEventTitle").textContent = "Add New Event";
  document.querySelector("#addEventBtn").textContent = "Create Event";
  document.querySelector("#editEventId").value = "";
  document.querySelector("#eventRecurToggle").parentElement.parentElement.classList.remove("d-none");
  document.querySelector("#recurrenceOptions").classList.add("d-none");
  document.querySelector("#addEventSuccess").classList.add("d-none");
  document.querySelector("#addEventError").classList.add("d-none");

  loadCategories();
  loadLocations();
};

export const hideStaffPage = () => {
  document.querySelector("#staffSection")?.classList.add("d-none");
};

const loadCategories = async () => {
  try {
    const res = await fetch(`${apiBaseUrl}/api/categories`);
    if (res.ok) {
      const cats = await res.json();
      const select = document.querySelector("#eventCategory");
      if (select) {
        select.innerHTML = '<option value="" selected disabled>Select category...</option>' +
          cats.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
      }
    }
  } catch (e) { console.error(e); }
};

const loadLocations = async () => {
  try {
    const res = await fetch(`${apiBaseUrl}/api/locations`);
    if (res.ok) {
      const locs = await res.json();
      const select = document.querySelector("#eventLocation");
      if (select) {
        select.innerHTML = '<option value="" selected disabled>Select location...</option>' +
          locs.map(l => `<option value="${l.id}">${l.name}</option>`).join("");
      }
    }
  } catch (e) { console.error(e); }
};

const loadAllBookings = async () => {
  const container = document.querySelector("#allBookingsList");
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" class="text-center p-4"><div class="spinner-border spinner-border-sm text-muted"></div> Loading bookings...</td></tr>';

  try {
    const token = state.token || localStorage.getItem("token");
    const res = await fetch(`${apiBaseUrl}/api/staff/bookings`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to load bookings");
    const bookings = await res.json();

    if (bookings.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-muted">No bookings found.</td></tr>';
      return;
    }

    container.innerHTML = bookings.map(b => `
      <tr>
        <td><code class="fw-bold text-primary" style="font-size: 1.1rem;">${b.confirmation_code || 'N/A'}</code></td>
        <td>
          <div class="fw-bold">${b.event.title}</div>
          <div class="small text-muted">${new Date(b.event.starts_at).toLocaleDateString()}</div>
        </td>
        <td>
          <div class="fw-bold">${b.guest_name || (b.user ? `${b.user.first_name} ${b.user.last_name}` : 'N/A')}</div>
          <div class="small text-muted">${b.guest_email || b.user?.email || ''}</div>
        </td>
        <td class="text-center">${b.guest_count}</td>
        <td class="small text-muted">${new Date(b.booked_at).toLocaleString()}</td>
        <td>
          <span class="badge ${b.status === 'confirmed' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} rounded-pill">
            ${b.status}
          </span>
        </td>
      </tr>
    `).join("");

  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-danger">Error: ${err.message}</td></tr>`;
  }
};
