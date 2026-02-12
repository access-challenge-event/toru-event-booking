import { router } from "../router.js";

export const initHomePage = (elements) => {
  const { browseBtn, myBookingsBtn } = elements;

  browseBtn.addEventListener("click", () => {
    router.navigateTo("events");
  });

  myBookingsBtn.addEventListener("click", () => {
    router.navigateTo("bookings");
  });
};
