import { apiFetch } from "../utils/api.js";
import { state } from "../state.js";
import { router } from "../router.js";

export const renderPreferencesHTML = () => `
  <section id="preferencesSection" class="container section-gap d-none">
    <div class="row">
      <div class="col-lg-8">
        <h2>Preferences</h2>
        <p>Manage your contact details and notification preferences.</p>
        <form id="preferencesForm" class="vstack gap-3">
          <label>Phone number</label>
          <input class="form-control" id="prefPhone" placeholder="+44 7000 000000" />

          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="prefEmailOptIn" />
            <label class="form-check-label" for="prefEmailOptIn">Receive emails about events</label>
          </div>

          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="prefSmsOptIn" />
            <label class="form-check-label" for="prefSmsOptIn">Receive SMS updates</label>
          </div>

          <div>
            <button class="btn btn-dark" id="savePrefs">Save preferences</button>
            <p class="auth-status" id="prefsStatus"></p>
          </div>
        </form>
      </div>
    </div>
  </section>
`;

export const initPreferencesPage = () => {
  const phoneInput = document.querySelector("#prefPhone");
  const smsCheckbox = document.querySelector("#prefSmsOptIn");

  const updateSmsEnabled = () => {
    const hasPhone = phoneInput && phoneInput.value.trim().length > 0;
    if (smsCheckbox) {
      smsCheckbox.disabled = !hasPhone;
      const smsLabel = document.querySelector("label[for='prefSmsOptIn']");
      if (smsLabel) smsLabel.style.opacity = hasPhone ? "1" : "0.5";
    }
  };

  phoneInput?.addEventListener("input", updateSmsEnabled);

  document.querySelector("#savePrefs")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const status = document.querySelector("#prefsStatus");
    if (status) status.textContent = "";
    try {
      const phoneVal = document.querySelector("#prefPhone").value.trim() || null;
      const smsChecked = document.querySelector("#prefSmsOptIn").checked;

      if (smsChecked && !phoneVal) {
        throw new Error("Enter a phone number before enabling SMS updates.");
      }

      const payload = {
        phone: phoneVal,
        email_opt_in: document.querySelector("#prefEmailOptIn").checked,
        sms_opt_in: smsChecked,
      };
      await apiFetch("/api/user/preferences", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (status) {
        status.textContent = "Preferences saved.";
        status.classList.add("success");
      }
      updateSmsEnabled();
    } catch (err) {
      if (status) {
        status.textContent = err.message || 'Failed to save';
      }
    }
  });
};

export const showPreferencesPage = () => {
  document.querySelector("#preferencesSection")?.classList.remove("d-none");
  // load current prefs
  (async () => {
    try {
      const data = await apiFetch("/api/user/preferences");
      document.querySelector("#prefPhone").value = data.phone || "";
      document.querySelector("#prefEmailOptIn").checked = !!data.email_opt_in;
      document.querySelector("#prefSmsOptIn").checked = !!data.sms_opt_in;
      // enable/disable SMS checkbox depending on whether phone present
      const phoneInput = document.querySelector("#prefPhone");
      const smsCheckbox = document.querySelector("#prefSmsOptIn");
      const hasPhone = phoneInput && phoneInput.value.trim().length > 0;
      if (smsCheckbox) smsCheckbox.disabled = !hasPhone;
      const smsLabel = document.querySelector("label[for='prefSmsOptIn']");
      if (smsLabel) smsLabel.style.opacity = hasPhone ? "1" : "0.5";
    } catch (err) {
      // ignore
    }
  })();
};

export const hidePreferencesPage = () => {
  document.querySelector("#preferencesSection")?.classList.add("d-none");
};
