/**
 * Lightweight client-side router for the event booking application.
 * Provides hash-based routing with support for route matching, navigation, and callbacks.
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.listeners = [];
    this.init();
  }

  /**
   * Register a route pattern to a handler function.
   * @param {string} path - Route path (e.g., '/bookings', '/cart', '/')
   * @param {Function} handler - Function to call when route matches
   */
  register(path, handler) {
    this.routes.set(path, handler);
  }

  /**
   * Initialize router with hash-based navigation.
   * Listens to window hashchange events and popstate (back button).
   */
  init() {
    window.addEventListener('hashchange', () => this.navigate());
    window.addEventListener('popstate', () => this.navigate());
  }

  /**
   * Start the router - navigates to the current hash.
   * Call this AFTER all routes are registered.
   */
  start() {
    this.navigate();
  }

  /**
   * Navigate to a specific route and update browser history.
   * @param {string} path - Route path to navigate to
   * @param {boolean} replace - If true, replaces history instead of pushing
   */
  navigateTo(path, replace = false) {
    const cleanPath = '/' + path.replace(/^\/?/, '');
    
    if (replace) {
      window.location.replace('#' + cleanPath);
    } else {
      window.location.hash = cleanPath;
    }
  }

  /**
   * Navigate programmatically (internal method called by hashchange).
   * Finds matching route and calls its handler.
   */
  navigate() {
    const path = window.location.hash.slice(1) || '/';
    const handler = this.routes.get(path);

    if (handler) {
      this.currentRoute = path;
      handler();
      this.notifyListeners(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (path !== '/') {
      // Unknown route, redirect to home
      this.navigateTo('/', true);
    }
  }

  /**
   * Subscribe to route changes.
   * @param {Function} callback - Called with new route path
   */
  onRouteChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners of route change.
   * @param {string} path - New route path
   */
  notifyListeners(path) {
    this.listeners.forEach(listener => listener(path));
  }

  /**
   * Get the current route path.
   * @returns {string} Current route or '/'
   */
  getCurrentRoute() {
    return this.currentRoute || '/';
  }

  /**
   * Check if a route is currently active.
   * @param {string} path - Route to check
   * @returns {boolean}
   */
  isActive(path) {
    const cleanPath = '/' + path.replace(/^\/?/, '');
    return this.getCurrentRoute() === cleanPath;
  }

  /**
   * Generate a href for a route (hash-based).
   * @param {string} path - Route path
   * @returns {string} Full href like '#/bookings'
   */
  href(path) {
    return '#/' + path.replace(/^\/?/, '');
  }
}

// Export as singleton
export const router = new Router();
