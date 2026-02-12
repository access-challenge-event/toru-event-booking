# Frontend Code Structure

The frontend has been refactored into a modular architecture for better maintainability.

## Directory Structure

```
src/
├── main.js                 # App entry point, routing setup, initialization
├── state.js                # Global state management (auth, cart, events)
├── router.js               # Client-side hash-based router
├── style.css               # Global styles
├── pages/                  # Page-specific modules
│   ├── home.js            # Home page logic
│   ├── events.js          # Events listing, filtering, searching
│   ├── bookings.js        # Bookings management
│   ├── cart.js            # Shopping cart and checkout
│   └── auth.js            # Login and registration
└── utils/                  # Shared utilities
    ├── api.js             # API fetch wrapper
    └── formatters.js      # Date/time formatting helpers
```

## Module Responsibilities

### main.js
- Sets up HTML structure
- Creates DOM element references
- Initializes all page modules
- Sets up global event listeners
- Configures routing
- Starts the application

### state.js
- Manages application state (token, user, cart, events)
- Handles localStorage persistence
- Provides state mutation functions

### pages/home.js
- Home page interactions
- Navigation to events/bookings

### pages/events.js
- Events listing and rendering
- Search and filter functionality
- Event loading from API
- "Add to cart" functionality

### pages/bookings.js
- Bookings list rendering
- Booking cancellation
- History view
- Bookings API integration

### pages/cart.js
- Cart rendering with prices
- Guest count management
- Item removal
- Checkout process
- Total calculation

### pages/auth.js
- Login form handling
- Registration form handling
- Auth state synchronization
- View switching (login/register)

### utils/api.js
- Centralized API fetch wrapper
- Automatic token injection
- Error handling

### utils/formatters.js
- Date formatting
- Time formatting

## Benefits of This Structure

1. **Separation of Concerns**: Each module has a single, clear responsibility
2. **Maintainability**: Easier to locate and update specific functionality
3. **Testability**: Individual modules can be tested in isolation
4. **Reusability**: Utility functions are centralized and can be reused
5. **Scalability**: Easy to add new pages or features without bloating main.js
6. **Hot Reload**: Vite HMR works more efficiently with smaller modules

## Usage

All modules export functions that are imported and initialized in `main.js`. The page modules receive an `elements` object containing all necessary DOM references, making them independent of the DOM structure.

## Migration Notes

The old monolithic `main.js` has been backed up as `main.old.js` for reference.
