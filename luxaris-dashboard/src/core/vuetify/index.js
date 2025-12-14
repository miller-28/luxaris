import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

// Custom theme configuration - Dark theme inspired by modern AI tools
const luxarisTheme = {
  dark: true,
  colors: {
    primary: '#fad104ff',      // Yellow-300 (accent color)
    secondary: '#1F2937',    // Gray-800
    accent: '#FDE047',       // Yellow-300
    error: '#ef4444',        // Red-500
    warning: '#f59e0b',      // Amber-500
    info: '#3b82f6',         // Blue-500
    success: '#10b981',      // Green-500
    background: '#1d1d1dff',   // Near black
    surface: '#1A1A1A',      // Dark gray
    'surface-variant': '#262626', // Slightly lighter gray
    'on-background': '#E5E5E5', // Light gray text
    'on-surface': '#E5E5E5',    // Light gray text
  },
};

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'luxarisTheme',
    themes: {
      luxarisTheme,
    },
  },
  defaults: {
    VBtn: {
      style: 'text-transform: none;',
    },
  },
  display: {
    mobileBreakpoint: 'sm',
  },
});
