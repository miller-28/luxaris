/**
 * Preset Manager
 * Core class for managing UI preset state and persistence
 */
import { merge } from 'lodash';

/**
 * Get nested property value by path
 */
function getByPath(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested property value by path
 */
function setByPath(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

export class PresetManager {
  constructor() {
    this.settings = {};
    this.presetId = null;
    this.presetSource = null; // 'user', 'role', 'global'
    this.isModified = false;
    this.saveTimer = null;
    this.saveDelay = 1000; // Debounce delay in ms
  }

  /**
   * Load preset with hierarchical resolution
   * Priority: User > Role > Global > Empty
   */
  loadPreset(presetData) {
    if (!presetData) {
      this.settings = this.getDefaultSettings();
      this.presetId = null;
      this.presetSource = null;
      return;
    }

    this.presetId = presetData.id;
    this.presetSource = presetData.source; // 'user', 'role', 'global'
    
    // Merge hierarchically using lodash
    const defaults = this.getDefaultSettings();
    this.settings = merge({}, defaults, presetData.settings || {});
    this.isModified = false;
  }

  /**
   * Get default settings structure
   */
  getDefaultSettings() {
    return {
      theme: {
        mode: 'light',
        primaryColor: '#1976D2',
      },
      locale: {
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm:ss',
      },
      layout: {
        sidebarCollapsed: false,
        sidebarWidth: 260,
        openMenuGroups: [],
      },
      grids: {
        // Grid settings per context/view
        // Example: posts: { columns: [...], filters: {...}, pageSize: 25 }
      },
      preferences: {
        notifications: true,
        autoSave: true,
      },
    };
  }

  /**
   * Get setting value by path
   */
  getSetting(path, defaultValue = null) {
    const value = getByPath(this.settings, path);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Update setting value by path
   */
  updateSetting(path, value) {
    setByPath(this.settings, path, value);
    this.isModified = true;
    this.debouncedSave();
  }

  /**
   * Update multiple settings at once
   */
  updateSettings(updates) {
    for (const [path, value] of Object.entries(updates)) {
      setByPath(this.settings, path, value);
    }
    this.isModified = true;
    this.debouncedSave();
  }

  /**
   * Get grid settings for a specific context
   */
  getGridSettings(contextName) {
    return this.getSetting(`grids.${contextName}`, {});
  }

  /**
   * Update grid settings for a specific context
   */
  updateGridSettings(contextName, settings) {
    this.updateSetting(`grids.${contextName}`, settings);
  }

  /**
   * Get sidebar state
   */
  getSidebarState() {
    return {
      collapsed: this.getSetting('layout.sidebarCollapsed', false),
      width: this.getSetting('layout.sidebarWidth', 260),
      openGroups: this.getSetting('layout.openMenuGroups', []),
    };
  }

  /**
   * Update sidebar state
   */
  updateSidebarState(state) {
    if (state.collapsed !== undefined) {
      this.updateSetting('layout.sidebarCollapsed', state.collapsed);
    }
    if (state.width !== undefined) {
      this.updateSetting('layout.sidebarWidth', state.width);
    }
    if (state.openGroups !== undefined) {
      this.updateSetting('layout.openMenuGroups', state.openGroups);
    }
  }

  /**
   * Get theme settings
   */
  getTheme() {
    return {
      mode: this.getSetting('theme.mode', 'light'),
      primaryColor: this.getSetting('theme.primaryColor', '#1976D2'),
    };
  }

  /**
   * Update theme settings
   */
  updateTheme(theme) {
    if (theme.mode) {
      this.updateSetting('theme.mode', theme.mode);
    }
    if (theme.primaryColor) {
      this.updateSetting('theme.primaryColor', theme.primaryColor);
    }
  }

  /**
   * Get locale settings
   */
  getLocale() {
    return {
      language: this.getSetting('locale.language', 'en'),
      timezone: this.getSetting('locale.timezone', 'UTC'),
      dateFormat: this.getSetting('locale.dateFormat', 'YYYY-MM-DD'),
      timeFormat: this.getSetting('locale.timeFormat', 'HH:mm:ss'),
    };
  }

  /**
   * Update locale settings
   */
  updateLocale(locale) {
    if (locale.language) {
      this.updateSetting('locale.language', locale.language);
    }
    if (locale.timezone) {
      this.updateSetting('locale.timezone', locale.timezone);
    }
    if (locale.dateFormat) {
      this.updateSetting('locale.dateFormat', locale.dateFormat);
    }
    if (locale.timeFormat) {
      this.updateSetting('locale.timeFormat', locale.timeFormat);
    }
  }

  /**
   * Debounced save - prevents excessive API calls
   */
  debouncedSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.triggerSave();
    }, this.saveDelay);
  }

  /**
   * Trigger save callback (should be set by store)
   */
  triggerSave() {
    if (this.onSave && this.isModified) {
      this.onSave(this.settings, this.presetId, this.presetSource);
    }
  }

  /**
   * Set save callback
   */
  setSaveCallback(callback) {
    this.onSave = callback;
  }

  /**
   * Reset to default settings
   */
  reset() {
    this.settings = this.getDefaultSettings();
    this.isModified = true;
    this.debouncedSave();
  }

  /**
   * Get all settings
   */
  getAllSettings() {
    return { ...this.settings };
  }

  /**
   * Check if preset needs cloning (not a user preset)
   */
  needsCloning() {
    return this.presetSource !== 'user' && this.isModified;
  }
}
