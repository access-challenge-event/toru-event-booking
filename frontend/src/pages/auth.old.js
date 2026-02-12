import { state, setAuthState } from "../state.js";
import { apiFetch } from "../utils/api.js";
import { router } from "../router.js";

export const initAuthPage = (elements) => {
  const { loginForm, registerForm } = elements;

  loginForm.addEventListener("submit", (e) => handleLogin(e, elements));
  registerForm.addEventListener("submit", (e) => handleRegister(e, elements));

  document.querySelectorAll("[data-auth-switch]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.authSwitch;
      showAuthView(target, elements);
    });
  });
};

export const showAuthView = (view, elements) => {
  const { registerCard, loginCard } = elements;
  
  if (view === "register") {
    registerCard.classList.remove("d-none");
    loginCard.classList.add("d-none");
  } else {
    registerCard.classList.add("d-none");
    loginCard.classList.remove("d-none");
  }
};

export const syncAuthUI = (elements) => {
  const { navLogout, navLogin, authGreeting } = elements;
  const isAuthed = Boolean(state.token);
  
  navLogout.classList.toggle("d-none", !isAuthed);
  navLogin.classList.toggle("d-none", isAuthed);
  
  if (isAuthed && state.user) {
    const firstName = state.user.first_name || "";
    const lastName = state.user.last_name || "";
    authGreeting.textContent = `Welcome back, ${firstName} ${lastName}`.trim() + ".";
  } else {
    authGreeting.textContent = "Sign in to manage your reservations.";
  }
};

const handleLogin = async (event, elements) => {
  event.preventDefault();
  const { loginStatus, eventsGrid } = elements;
  loginStatus.textContent = "";
  
  try {
    const payload = {
      email: document.querySelector("#loginEmail").value.trim(),
      password: document.querySelector("#loginPassword").value,
    };
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setAuthState(data.token, data.user);
    syncAuthUI(elements);
    
    // Reload events to refresh availability
    const { loadEvents } = await import("./events.js");
    loadEvents(eventsGrid);
    
    loginStatus.textContent = "Signed in successfully.";
    loginStatus.classList.add("success");
    showAuthView("login", elements);
    router.navigateTo("bookings");
    
    const { loadBookings } = await import("./bookings.js");
    loadBookings(elements);
  } catch (error) {
    loginStatus.textContent = error.message;
    loginStatus.classList.remove("success");
  }
};

const handleRegister = async (event, elements) => {
  event.preventDefault();
  const { registerStatus, registerCard, loginCard, eventsGrid } = elements;
  registerStatus.textContent = "";
  
  try {
    const payload = {
      first_name: document.querySelector("#registerFirstName").value.trim(),
      last_name: document.querySelector("#registerLastName").value.trim(),
      email: document.querySelector("#registerEmail").value.trim(),
      password: document.querySelector("#registerPassword").value,
    };
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setAuthState(data.token, data.user);
    syncAuthUI(elements);
    
    // Reload events to refresh availability
    const { loadEvents } = await import("./events.js");
    loadEvents(eventsGrid);
    
    registerStatus.textContent = "Account created. You are signed in.";
    registerStatus.classList.add("success");
    registerCard.classList.add("d-none");
    loginCard.classList.remove("d-none");
    router.navigateTo("bookings");
    
    const { loadBookings } = await import("./bookings.js");
    loadBookings(elements);
  } catch (error) {
    registerStatus.textContent = error.message;
    registerStatus.classList.remove("success");
  }
};
