import { state, saveCart } from "../state.js";
import { formatDate, formatTime } from "../utils/formatters.js";
import { apiFetch } from "../utils/api.js";
import { router } from "../router.js";

export const initCartPage = (elements) => {
  const { cartList, clearCart, stripePayBtn, checkoutBtn } = elements;

  cartList.addEventListener("change", (event) => {
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
    saveCart();
    renderCart(elements);
  });

  cartList.addEventListener("click", (event) => {
    const cartItem = event.target.closest(".cart-item");
    if (!cartItem) return;
    
    if (event.target.hasAttribute("data-cart-remove")) {
      const eventId = Number(cartItem.dataset.cartId);
      state.cart = state.cart.filter((item) => item.event.id !== eventId);
      saveCart();
      renderCart(elements);
    }
  });

  clearCart.addEventListener("click", () => {
    state.cart = [];
    saveCart();
    renderCart(elements);
  });

  stripePayBtn.addEventListener("click", () => checkoutCart(elements));
  checkoutBtn.addEventListener("click", () => checkoutCart(elements));
};

export const renderCart = (elements) => {
  const { cartList, cartTotal, cartBadge } = elements;
  
  if (state.cart.length === 0) {
    cartList.innerHTML = `
      <div class="booking-empty">
        <h6>Your cart is empty</h6>
        <p class="mb-0">Browse events and add bookings to checkout.</p>
      </div>
    `;
    cartTotal.textContent = "£0.00";
    cartBadge.textContent = "0";
    return;
  }

  const total = state.cart.reduce((sum, item) => {
    const price = item.event.price || 0;
    return sum + (price * item.guest_count);
  }, 0);

  cartList.innerHTML = state.cart
    .map(
      (item) => {
        const itemPrice = (item.event.price || 0) * item.guest_count;
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
            <select class="form-select" data-cart-guests>
              ${Array.from({ length: Math.min(item.maxGuests, 6) }, (_, i) => i + 1)
                .map(
                  (count) =>
                    `<option value="${count}" ${count === item.guest_count ? "selected" : ""}>${count}</option>`
                )
                .join("")}
            </select>
            <label class="form-label">Guest names (optional)</label>
            <textarea class="form-control" rows="2" data-cart-names placeholder="Alex, Priya, Sam">${
              item.guest_names.join(", ")
            }</textarea>
            ${itemPrice > 0 ? `<p class="text-end mb-2"><strong>£${itemPrice.toFixed(2)}</strong></p>` : ""}
            <button class="btn btn-outline-dark btn-sm" data-cart-remove>Remove</button>
          </div>
        </div>
      `;
      }
    )
    .join("");
  
  cartTotal.textContent = `£${total.toFixed(2)}`;
  cartBadge.textContent = String(state.cart.length);
};

export const addToCart = (eventId, elements) => {
  const event = state.events.find((item) => item.id === Number(eventId));
  if (!event) return;
  
  const maxGuests = event.spots_left ?? event.capacity ?? 1;
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
  renderCart(elements);
  router.navigateTo("cart");
};

const checkoutCart = async (elements) => {
  const { loginStatus } = elements;
  
  if (!state.token) {
    router.navigateTo("auth");
    loginStatus.textContent = "Please sign in to complete checkout.";
    return;
  }
  
  if (state.cart.length === 0) return;
  
  try {
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
    renderCart(elements);
    router.navigateTo("bookings");
  } catch (error) {
    loginStatus.textContent = error.message;
  }
};
