/**
 * Browser polyfills for karma tests.
 * Some Node.js libraries (like sockjs-client) expect 'global' to be defined.
 */
(window as any).global = window;
