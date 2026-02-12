# Event Booking App - Routing System Guide

## Overview

The event booking app has been refactored from a single-page application using manual page visibility toggling to a proper **hash-based client-side routing system**. This provides:

- ✅ URL-based navigation (e.g., `/#/bookings`, `/#/cart`)
- ✅ Browser history support (back/forward buttons work)
- ✅ Deep linking (shareable URLs for specific pages)
- ✅ Clean separation of concerns using route handlers

## Architecture

### Router Module (`frontend/src/router.js`)

A lightweight, framework-agnostic router that provides:

```javascript
router.register(path, handler)      // Register a route handler
router.navigateTo(path)             // Navigate to a route
router.getCurrentRoute()            // Get current route
router.isActive(path)               // Check if route is active
router.href(path)                   // Generate valid href for route
router.onRouteChange(callback)      // Listen to route changes
```

### Route Structure

The app uses hash-based routing with the following routes:

| Route | Page | Handler |
|-------|------|---------|
| `/` | Home page with events list | `renderHome()` |
| `/events` | Events page (full width) | `renderEventsPage()` |
| `/bookings` | Bookings dashboard | `renderBookingsPage()` |
| `/cart` | Shopping cart & checkout | `renderCartPage()` |
| `/auth` | Login/Register forms | `renderAuthPage()` |

### URL Examples

```
Home:           http://localhost:3000/#/
Events:         http://localhost:3000/#/events
Bookings:       http://localhost:3000/#/bookings
Cart:           http://localhost:3000/#/cart
Login/Register: http://localhost:3000/#/auth
```

## Implementation Details

### 1. Router Registration (main.js)

Routes are registered in the initialization phase:

```javascript
router.register("/", renderHome);
router.register("/events", renderEventsPage);
router.register("/bookings", renderBookingsPage);
router.register("/cart", renderCartPage);
router.register("/auth", renderAuthPage);

// Listen for route changes
router.onRouteChange((path) => {
  showPage(path);
});
```

### 2. Page Visibility Management

Instead of the old `data-page` attribute system, pages are now shown/hidden based on the current route:

```javascript
const showPage = (route) => {
  homeSection.classList.toggle("d-none", route !== "/" && route !== "");
  eventsSection.classList.toggle("d-none", route !== "events");
  bookingsSection.classList.toggle("d-none", route !== "bookings");
  cartSection.classList.toggle("d-none", route !== "cart");
  authSection.classList.toggle("d-none", route !== "auth");
};
```

### 3. Navigation API

Navigate programmatically using:

```javascript
router.navigateTo("bookings");  // Go to /bookings with smooth scroll
router.navigateTo("/", true);   // Replace history instead of push
```

### 4. Navigation Links

Links in the HTML now use `router.href()`:

```html
<a class="nav-link" href="${router.href('bookings')}">Bookings</a>
<a class="nav-link" href="${router.href('cart')}">Cart</a>
```

### 5. Button Navigation

Buttons navigate using `router.navigateTo()`:

```javascript
browseBtn.addEventListener("click", () => {
  router.navigateTo("events");
});

myBookingsBtn.addEventListener("click", () => {
  router.navigateTo("bookings");
});
```

## State Persistence

### localStorage Integration

The router works seamlessly with localStorage for:
- **Authentication**: token and user data persist across routes
- **Cart**: items persist when navigating away and returning
- **Route**: Hash is automatically preserved in browser history

No changes needed to state management—localStorage continues to work as before.

### Example Flow

1. User registers → token stored in localStorage
2. User navigates to `/bookings` → auth state available
3. User goes to `/cart`, adds items → cart persists
4. User clicks back button → cart data still available
5. User refreshes → router initializes to correct route with all state intact

## Routing Patterns

### Authentication Flow

```javascript
// After successful login/register
setAuthState(data.token, data.user);  // Updates localStorage
router.navigateTo("bookings");         // Navigate to bookings page
```

### Adding to Cart

```javascript
const addToCart = (eventId) => {
  // ... add event to state.cart
  saveCart();               // Persist to localStorage
  renderCart();             // Update cart display
  router.navigateTo("cart"); // Navigate to cart page
};
```

### Checkout Flow

```javascript
const checkoutCart = async () => {
  if (!state.token) {
    router.navigateTo("auth");  // Redirect to login if not authed
    return;
  }
  // ... process bookings
  router.navigateTo("bookings"); // Show confirmation
};
```

## Browser History

The router automatically handles browser history:

- **Forward button**: Navigates to next route in history
- **Back button**: Returns to previous route
- **Refresh**: Maintains current route with all state intact

Example: 
```
User: Home → Events → Cart → Bookings
Browser back: Bookings → Cart → Events → Home
Browser forward: Home → Events → Cart → Bookings
```

## Query Parameters (Optional Future Enhancement)

The current router supports simple path-based routing. For query parameters, you could extend it:

```javascript
// Example for future: /event/123 for specific event detail
router.register("/event/:id", renderEventDetail);
```

## CSS Classes for Visibility

Pages use Bootstrap's `d-none` class for hiding:

```css
/* Not needed - handled by router */
.page-view.is-hidden {
  display: none !important;
}

/* Now uses Bootstrap */
.d-none {
  display: none !important;
}
```

## Comparison: Old vs New

### Old System
```javascript
showPage("bookings");  // Toggles data-page attributes
// No URL change
// Back button doesn't work
```

### New System
```javascript
router.navigateTo("bookings");  // Updates URL to #/bookings
// URL changes to /#/bookings
// Back button works automatically
// Bookmarks work
// Can share URLs
```

## Testing the Router

### Manual Testing Checklist

1. **Navigation**
   - [ ] Click nav links → correct page displays
   - [ ] Share URL like `/#/bookings` → page loads correctly
   - [ ] Browser back/forward buttons work

2. **State Persistence**
   - [ ] Add to cart → navigate away → return → cart items persist
   - [ ] Login → refresh page → still logged in
   - [ ] Cart items survive route changes

3. **Deep Linking**
   - [ ] Copy URL from bookmarks bar → share → friend can access that page
   - [ ] Direct navigation to `/#/cart` works without going through home first

4. **Edge Cases**
   - [ ] Invalid route (e.g., `/#/invalid`) → redirects to home
   - [ ] Closing and reopening browser → restores route and state

## File Changes Summary

### New Files
- `frontend/src/router.js` - Lightweight router implementation

### Modified Files
- `frontend/src/main.js` - Refactored to use routing system
  - Removed `data-page` attributes
  - Replaced `showPage()` with router navigation
  - Added route handlers
  - Updated all navigation calls

### Unchanged Files
- `api/app.py` - No changes
- `docker-compose.yml` - No changes
- `frontend/src/style.css` - No changes needed
- Database schema - No changes

## Performance Notes

- Router is **lightweight** (~150 lines) - no external dependencies
- Hash-based routing works **without server-side changes**
- Routes resolve **instantly** without API calls
- State remains in memory for fast navigation

## Future Improvements

Potential enhancements:

1. **Parameterized routes**: `/event/:id` for event details
2. **Query parameters**: `/bookings?status=cancelled`
3. **Lazy loading**: Load page content only when route is active
4. **Route transitions**: Add animations when changing routes
5. **Route guards**: Redirect unauthenticated users automatically

## References

- [Navigation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
- [Hash-based Routing](https://en.wikipedia.org/wiki/Single-page_application#Routing)
- [Browser History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
