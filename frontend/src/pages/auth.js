import { state, setAuthState } from "../state.js";
import { apiFetch } from "../utils/api.js";
import { router } from "../router.js";
import { loadBookings, updateAuthGreeting } from "./bookings.js";
import { loadEvents } from "./events.js";

export const renderAuthHTML = () => `
  <section id="authSection" class="auth-page d-none">
    <div class="container">
      <div class="auth-shell">
        <div class="auth-card" id="loginCard">
          <h3>Sign in</h3>
          <p>Welcome back. Use your details to access your bookings.</p>
          <form class="vstack gap-3" id="loginForm">
            <input class="form-control" type="email" placeholder="Email address" id="loginEmail" required />
            <input class="form-control" type="password" placeholder="Password" id="loginPassword" required />
            <button class="btn btn-dark" type="submit">Sign in</button>
            <p class="auth-status" id="loginStatus"></p>
            <p class="auth-footnote">
              New here?
              <button class="link-button" type="button" data-auth-switch="register">Create an account</button>
            </p>
          </form>
        </div>
        <div class="auth-card light d-none" id="registerCard">
          <h3>Create account</h3>
          <p>Register once to manage bookings and save your details.</p>
          <form class="vstack gap-3" id="registerForm">
            <div class="row g-2">
              <div class="col-12 col-md-6">
                <input class="form-control" type="text" placeholder="First name" id="registerFirstName" required />
              </div>
              <div class="col-12 col-md-6">
                <input class="form-control" type="text" placeholder="Last name" id="registerLastName" required />
              </div>
            </div>
            <input class="form-control" type="email" placeholder="Email address" id="registerEmail" required />
            <input class="form-control" type="password" placeholder="Password" id="registerPassword" required />
            <button class="btn btn-dark" type="submit">Create account</button>
            <p class="auth-status" id="registerStatus"></p>
            <p class="auth-footnote">
              Already have an account?
              <button class="link-button" type="button" data-auth-switch="login">Sign in</button>
            </p>
          </form>
        </div>
      </div>
    </div>
  </section>
`;

export const initAuthPage = () => {
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");

  loginForm?.addEventListener("submit", handleLogin);
  registerForm?.addEventListener("submit", handleRegister);

  document.querySelectorAll("[data-auth-switch]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.authSwitch;
      showAuthView(target);
    });
  });
};

export const showAuthPage = () => {
  document.querySelector("#authSection")?.classList.remove("d-none");
};

export const hideAuthPage = () => {
  document.querySelector("#authSection")?.classList.add("d-none");
};

export const showAuthView = (view) => {
  const registerCard = document.querySelector("#registerCard");
  const loginCard = document.querySelector("#loginCard");
  
  if (!registerCard || !loginCard) return;
  
  if (view === "register") {
    registerCard.classList.remove("d-none");
    loginCard.classList.add("d-none");
  } else {
    registerCard.classList.add("d-none");
    loginCard.classList.remove("d-none");
  }
};

export const syncAuthUI = () => {
  const navLogout = document.querySelector("#navLogout");
  const navLogin = document.querySelector("#navLogin");
  const isAuthed = Boolean(state.token);
  
  navLogout?.classList.toggle("d-none", !isAuthed);
  navLogin?.classList.toggle("d-none", isAuthed);
  
  updateAuthGreeting();
};

const handleLogin = async (event) => {
  event.preventDefault();
  console.log("Login form submitted");
  const { loginStatus, eventsGrid } = elements;
  loginStatus.textContent = "";
  
  try {
    const payload = {
      email: document.querySelector("#loginEmail").value.trim(),
      password: document.querySelector("#loginPassword").value,
    };
    console.log("Login payload:", { email: payload.email });
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log("Login successful");
    setAuthState(data.token, data.user);
    syncAuthUI();
    loadEvents();
    
    if (loginStatus) {
      loginStatus.textContent = "Signed in successfully.";
      loginStatus.classList.add("success");
    }
    showAuthView("login");
    router.navigateTo("bookings");
    loadBookings();
  } catch (error) {
    console.error("Login error:", error);
    loginStatus.textContent = error.message;
    loginStatus.classList.remove("success");
  }
};

const handleRegister = async (event) => {
  event.preventDefault();
  const registerStatus = document.querySelector("#registerStatus");
  const registerCard = document.querySelector("#registerCard");
  const loginCard = document.querySelector("#loginCard");
  
  if (registerStatus) registerStatus.textContent = "";
  
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
    syncAuthUI();
    loadEvents();
    
    if (registerStatus) {
      registerStatus.textContent = "Account created. You are signed in.";
      registerStatus.classList.add("success");
    }
    registerCard?.classList.add("d-none");
    loginCard?.classList.remove("d-none");
    router.navigateTo("bookings");
    loadBookings();
  } catch (error) {
    if (registerStatus) {
      registerStatus.textContent = error.message;
      registerStatus.classList.remove("success");
    }
  }
};
