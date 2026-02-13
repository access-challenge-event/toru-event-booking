import { state, saveCart, saveGuestInfo } from "../state.js";
import { formatDate, formatTime } from "../utils/formatters.js";
import { apiFetch } from "../utils/api.js";
import { router } from "../router.js";
import { loadBookings } from "./bookings.js";
import { loadEvents } from "./events.js";

export const renderCartHTML = () => `
  <section id="cartSection" class="cart-page d-none">
    <div class="container">
      <div class="section-header">
        <div>
          <h2>Your cart</h2>
          <p>Confirm attendee details and checkout.</p>
        </div>
        <button class="btn btn-outline-dark btn-sm" id="clearCart">Clear cart</button>
      </div>
      <div class="cart-shell">
        <div>
          <div id="cartList"></div>
        </div>
        <div class="cart-summary">
          <h4>Checkout</h4>
          <p class="mb-2">Review your booking details below.</p>
          <div class="cart-total">
            <span>Total</span>
            <strong id="cartTotal">£0.00</strong>
          </div>
          <div id="guestFormContainer"></div>
          <div id="authCheckoutControls">
            <button class="btn btn-light w-100" id="stripePayBtn" style="margin-bottom: 10px;">Pay with Stripe</button>
            <button class="btn btn-outline-light w-100" id="checkoutBtn">Confirm bookings</button>
          </div>
          <p class="cart-note" id="cartNote">You will receive confirmation in your bookings list.</p>
          <p class="auth-status" id="cartStatus"></p>
        </div>
      </div>
    </div>
  </section>
`;

export const initCartPage = () => {
  const cartList = document.querySelector("#cartList");
  const clearCart = document.querySelector("#clearCart");
  const stripePayBtn = document.querySelector("#stripePayBtn");
  const checkoutBtn = document.querySelector("#checkoutBtn");

  cartList?.addEventListener("change", (event) => {
    const cartItem = event.target.closest(".cart-item");
    if (!cartItem) return;

    const eventId = Number(cartItem.dataset.cartId);
    const item = state.cart.find((cart) => cart.event.id === eventId);
    if (!item) return;

    if (event.target.hasAttribute("data-cart-guests")) {
      item.guest_count = Number(event.target.value);
    }
    if (event.target.hasAttribute("data-cart-names")) {
      item.guest_names = event.target.value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, item.guest_count);
    }

    // Resize guest names array when count changes
    if (item.guest_count > item.guest_names.length) {
      // Expand array with empty objects if growing
      while (item.guest_names.length < item.guest_count) {
        item.guest_names.push({ name: "", type: "Adult" });
      }
    } else if (item.guest_count < item.guest_names.length) {
      // Shrink array if reducing
      item.guest_names = item.guest_names.slice(0, item.guest_count);
    }

    saveCart();
    renderCart();
  });

  cartList?.addEventListener("input", (event) => {
    const cartItem = event.target.closest(".cart-item");
    if (!cartItem) return;

    if (event.target.dataset.guestField) {
      const eventId = Number(cartItem.dataset.cartId);
      const item = state.cart.find((cart) => cart.event.id === eventId);
      if (!item) return;

      const index = Number(event.target.dataset.guestIndex);
      const field = event.target.dataset.guestField; // 'name' or 'type'

      // Ensure guest object exists
      if (!item.guest_names[index]) {
        item.guest_names[index] = { name: "", type: "Adult" };
      }

      // Handle legacy string data if present
      if (typeof item.guest_names[index] === "string") {
        item.guest_names[index] = { name: item.guest_names[index], type: "Adult" };
      }

      item.guest_names[index][field] = event.target.value;
      saveCart();
    }
  });

  cartList?.addEventListener("click", (event) => {
    const cartItem = event.target.closest(".cart-item");
    if (!cartItem) return;

    if (event.target.hasAttribute("data-cart-remove")) {
      const eventId = Number(cartItem.dataset.cartId);
      state.cart = state.cart.filter((item) => item.event.id !== eventId);
      saveCart();
      renderCart();
    }
  });

  clearCart?.addEventListener("click", () => {
    state.cart = [];
    saveCart();
    renderCart();
  });

  stripePayBtn?.addEventListener("click", checkoutCart);
  checkoutBtn?.addEventListener("click", checkoutCart);

  // Guest checkout form submission (delegated since it's rendered dynamically)
  document.addEventListener("click", (event) => {
    if (event.target.id === "guestCheckoutBtn") {
      event.preventDefault();
      checkoutAsGuest();
    }
  });
};

export const showCartPage = () => {
  document.querySelector("#cartSection")?.classList.remove("d-none");
  renderCart();
};

export const hideCartPage = () => {
  document.querySelector("#cartSection")?.classList.add("d-none");
};

export const renderCart = () => {
  const cartList = document.querySelector("#cartList");
  const cartTotal = document.querySelector("#cartTotal");
  const cartBadge = document.querySelector("#cartBadge");

  if (!cartList) return;

  if (state.cart.length === 0) {
    cartList.innerHTML = `
      <div class="booking-empty">
        <h6>Your cart is empty</h6>
        <p class="mb-0">Browse events and add bookings to checkout.</p>
      </div>
    `;
    if (cartTotal) cartTotal.textContent = "£0.00";
    if (cartBadge) cartBadge.textContent = "0";
    return;
  }

  const total = state.cart.reduce((sum, item) => {
    const basePrice = item.event.price || 0;
    if (basePrice === 0) return sum;

    let itemSum = 0;
    // Calculate price for each guest based on type
    for (let i = 0; i < item.guest_count; i++) {
      const guest = item.guest_names[i];
      const type = (guest && typeof guest === 'object' ? guest.type : 'Adult') || 'Adult';

      let multiplier = 1.0;
      if (type === 'Child' || type === 'Concession') {
        multiplier = 0.2; // 20% of adult price
      }
      itemSum += basePrice * multiplier;
    }
    return sum + itemSum;
  }, 0);

  cartList.innerHTML = state.cart
    .map(
      (item) => {
        // recompute availability from latest event data
        const available = item.event.spots_left ?? item.event.capacity ?? 0;
        // ensure guest_count does not exceed availability
        if (available === 0) item.guest_count = 0;
        if (item.guest_count > available) item.guest_count = available;

        // Calculate item total based on guest types
        const itemPrice = Array.from({ length: item.guest_count }).reduce((sum, _, i) => {
          // Ensure guest_names has valid objects for rendering loop later
          if (!item.guest_names[i]) item.guest_names[i] = { name: "", type: "Adult" };
          const type = (typeof item.guest_names[i] === 'object' ? item.guest_names[i].type : 'Adult') || 'Adult';

          let multiplier = 1.0;
          if (type === 'Child' || type === 'Concession') multiplier = 0.2;

          return sum + ((item.event.price || 0) * multiplier);
        }, 0);
        return `
        <div class="cart-item" data-cart-id="${item.event.id}">
          <div>
            <h5>${item.event.title}</h5>
            <p>${formatDate(item.event.starts_at, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} · ${formatTime(item.event.starts_at)} · ${item.event.location}</p>
            <p class="text-muted mb-0">${item.event.is_free ? "Free" : `£${item.event.price.toFixed(2)} per guest`} · Spaces left: ${item.event.spots_left ?? item.event.capacity}</p>
          </div>
          <div class="cart-controls">
            <label class="form-label">Guests</label>
            ${(() => {
            const max = Math.min(available, 4);
            if (max <= 0) {
              return `<select class="form-select" data-cart-guests disabled><option>0</option></select><div class="text-danger mt-2">Sold out</div>`;
            }
            return `<select class="form-select" data-cart-guests>${Array.from({ length: max }, (_, i) => i + 1)
              .map((count) => `<option value="${count}" ${count === item.guest_count ? "selected" : ""}>${count}</option>`)
              .join("")}</select>`;
          })()}
            
            <div class="mt-2">
              <label class="form-label mb-1">Guest Details</label>
              ${Array.from({ length: item.guest_count }, (_, i) => {
            let guest = item.guest_names[i] || { name: "", type: "Adult" };
            if (typeof guest === "string") guest = { name: guest, type: "Adult" };

            return `
                  <div class="d-flex gap-2 mb-2">
                    <input type="text" class="form-control" placeholder="Guest Name" 
                      data-guest-index="${i}" data-guest-field="name" value="${guest.name || ''}">
                    <select class="form-select" style="max-width: 150px;" 
                      data-guest-index="${i}" data-guest-field="type">
                      <option value="Adult" ${guest.type === 'Adult' ? 'selected' : ''}>Adult</option>
                      <option value="Child" ${guest.type === 'Child' ? 'selected' : ''}>Child</option>
                      <option value="Concession" ${guest.type === 'Concession' ? 'selected' : ''}>Concession (65+)</option>
                    </select>
                  </div>
                `;
          }).join("")}
            </div>
            
            ${itemPrice > 0 ? `<p class="text-end mb-2"><strong>£${itemPrice.toFixed(2)}</strong></p>` : ""}
            <button class="btn btn-outline-dark btn-sm" data-cart-remove>Remove</button>
          </div>
        </div>
      `;
      }
    )
    .join("");

  if (cartTotal) cartTotal.textContent = `£${total.toFixed(2)}`;
  if (cartBadge) cartBadge.textContent = String(state.cart.length);

  // Toggle guest form vs authenticated checkout controls
  const guestFormContainer = document.querySelector("#guestFormContainer");
  const authCheckoutControls = document.querySelector("#authCheckoutControls");
  const cartNote = document.querySelector("#cartNote");

  if (!state.token) {
    // Show guest info form
    if (authCheckoutControls) authCheckoutControls.style.display = "none";
    if (cartNote) cartNote.textContent = "You'll receive a confirmation email after booking.";
    if (guestFormContainer && state.cart.length > 0) {
      const gi = state.guestInfo || {};
      guestFormContainer.innerHTML = `
        <div class="guest-form">
          <p class="guest-form-title">Book as guest</p>
          <input class="form-control mb-2" type="email" id="guestEmail" placeholder="Email address *" value="${gi.email || ''}" required />
          <input class="form-control mb-2" type="text" id="guestName" placeholder="Full name *" value="${gi.name || ''}" required />
          <input class="form-control mb-2" type="tel" id="guestPhone" placeholder="Phone number (optional)" value="${gi.phone || ''}" />
          <button class="btn btn-light w-100 mb-2" id="guestCheckoutBtn">Book as guest</button>
          <p class="auth-footnote">Have an account? <a href="#/auth">Sign in</a> for full access.</p>
        </div>
      `;
    } else if (guestFormContainer) {
      guestFormContainer.innerHTML = "";
    }
  } else {
    // Show normal checkout
    if (authCheckoutControls) authCheckoutControls.style.display = "";
    if (cartNote) cartNote.textContent = "You will receive confirmation in your bookings list.";
    if (guestFormContainer) guestFormContainer.innerHTML = "";
  }
};

export const addToCart = (eventId) => {
  const event = state.events.find((item) => item.id === Number(eventId));
  if (!event) return;
  const available = event.spots_left ?? event.capacity ?? 0;
  if (available <= 0) {
    window.alert("This event is sold out and cannot be booked.");
    return;
  }
  const maxGuests = available;
  const existing = state.cart.find((item) => item.event.id === event.id);

  if (existing) {
    existing.guest_count = Math.min(existing.guest_count + 1, maxGuests);
  } else {
    state.cart.push({
      event,
      guest_count: 1,
      guest_names: [],
      maxGuests: Math.max(1, maxGuests),
    });
  }

  saveCart();
  renderCart();
  router.navigateTo("cart");
};

const checkoutCart = async () => {
  const cartStatus = document.querySelector("#cartStatus");

  if (!state.token) {
    // Not signed in — the guest form handles this
    if (cartStatus) cartStatus.textContent = "Please fill in the guest form or sign in to checkout.";
    return;
  }

  if (state.cart.length === 0) return;
  if (cartStatus) cartStatus.textContent = "";

  try {
    for (const item of state.cart) {
      const available = item.event.spots_left ?? item.event.capacity ?? 0;
      if (available <= 0) throw new Error(`${item.event.title} is sold out`);
      if (item.guest_count > available) throw new Error(`Not enough spaces available for ${item.event.title}`);
    }
    for (const item of state.cart) {
      await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          event_id: item.event.id,
          guest_count: item.guest_count,
          guest_names: item.guest_names,
        }),
      });
    }
    state.cart = [];
    saveCart();
    renderCart();
    loadBookings();
    loadEvents();
    router.navigateTo("bookings");
  } catch (error) {
    if (cartStatus) cartStatus.textContent = error.message;
  }
};

const checkoutAsGuest = async () => {
  const cartStatus = document.querySelector("#cartStatus");
  const email = document.querySelector("#guestEmail")?.value.trim() || "";
  const name = document.querySelector("#guestName")?.value.trim() || "";
  const phone = document.querySelector("#guestPhone")?.value.trim() || "";

  if (cartStatus) cartStatus.textContent = "";

  if (!email) {
    if (cartStatus) cartStatus.textContent = "Email address is required.";
    return;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    if (cartStatus) cartStatus.textContent = "Please enter a valid email address.";
    return;
  }
  if (!name) {
    if (cartStatus) cartStatus.textContent = "Full name is required.";
    return;
  }
  if (phone && !/^[\d\s\-\+\(\)]{7,20}$/.test(phone)) {
    if (cartStatus) cartStatus.textContent = "Please enter a valid phone number.";
    return;
  }
  if (state.cart.length === 0) return;

  // Save guest info for the session
  saveGuestInfo({ email, name, phone });

  try {
    for (const item of state.cart) {
      const available = item.event.spots_left ?? item.event.capacity ?? 0;
      if (available <= 0) throw new Error(`${item.event.title} is sold out`);
      if (item.guest_count > available) throw new Error(`Not enough spaces available for ${item.event.title}`);
    }
    for (const item of state.cart) {
      await apiFetch("/api/bookings/guest", {
        method: "POST",
        body: JSON.stringify({
          event_id: item.event.id,
          guest_count: item.guest_count,
          guest_names: item.guest_names,
          email,
          name,
          phone,
        }),
      });
    }
    state.cart = [];
    saveCart();
    renderCart();
    loadEvents();
    if (cartStatus) {
      cartStatus.textContent = `Booking confirmed! A confirmation will be sent to ${email}.`;
      cartStatus.classList.add("success");
    }
  } catch (error) {
    if (cartStatus) {
      cartStatus.textContent = error.message;
      cartStatus.classList.remove("success");
    }
  }
};
