/**
 * Preset Composable
 * Exposes preset functionality to components
 */
import { computed } from 'vue';
import { usePresetStore } from '../../infrastructure/store/presetStore';

export function usePreset() {
    
    const presetStore = usePresetStore();

    // Computed properties
    const isLoaded = computed(() => presetStore.isLoaded);
    const isLoading = computed(() => presetStore.isLoading);
    const theme = computed(() => presetStore.theme);
    const locale = computed(() => presetStore.locale);
    const sidebarState = computed(() => presetStore.sidebarState);

    /**
     * Get setting value
     */
    const getSetting = (path, defaultValue) => {
        return presetStore.getSetting(path, defaultValue);
    };

    /**
     * Update setting value
     */
    const updateSetting = (path, value) => {
        presetStore.updateSetting(path, value);
    };

    /**
     * Update multiple settings
     */
    const updateSettings = (updates) => {
        presetStore.updateSettings(updates);
    };

    /**
     * Update theme
     */
    const updateTheme = (themeSettings) => {
        presetStore.updateTheme(themeSettings);
    };

    /**
     * Update locale
     */
    const updateLocale = (localeSettings) => {
        presetStore.updateLocale(localeSettings);
    };

    /**
     * Update sidebar state
     */
    const updateSidebarState = (state) => {
        presetStore.updateSidebarState(state);
    };

    /**
     * Get grid settings for a context
     */
    const getGridSettings = (contextName) => {
        return presetStore.getGridSettings(contextName);
    };

    /**
     * Update grid settings for a context
     */
    const updateGridSettings = (contextName, settings) => {
        presetStore.updateGridSettings(contextName, settings);
    };

    /**
     * Reset to default settings
     */
    const resetToDefault = async (userId) => {
        return await presetStore.resetToDefault(userId);
    };

    return {
    
        // State
        isLoaded,
        isLoading,
        theme,
        locale,
        sidebarState,

        // Methods
        getSetting,
        updateSetting,
        updateSettings,
        updateTheme,
        updateLocale,
        updateSidebarState,
        getGridSettings,
        updateGridSettings,
        resetToDefault,
    };
}
