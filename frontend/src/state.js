export const state = {
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  cart: JSON.parse(localStorage.getItem("cart") || "[]"),
  events: [],
  guestInfo: JSON.parse(localStorage.getItem("guestInfo") || "null"),
};

// Normalize cart items
state.cart = state.cart.map((item) => ({
  ...item,
  guest_count: item.guest_count || 1,
  guest_names: Array.isArray(item.guest_names) ? item.guest_names : [],
  maxGuests: item.maxGuests || item.event?.spots_left || item.event?.capacity || 1,
}));

export const saveCart = () => {
  localStorage.setItem("cart", JSON.stringify(state.cart));
};

export const saveGuestInfo = (info) => {
  state.guestInfo = info;
  if (info) {
    localStorage.setItem("guestInfo", JSON.stringify(info));
  } else {
    localStorage.removeItem("guestInfo");
  }
};

export const setAuthState = (token, user) => {
  state.token = token;
  state.user = user;
  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
};
