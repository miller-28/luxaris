/**
 * Example: Using Presets in a Grid Component
 * 
 * This example shows how to use the preset system to save and restore
 * grid configuration (columns, filters, page size, etc.)
 */

// In your grid component:
import { ref, onMounted, watch } from 'vue';
import { usePreset } from '@/contexts/system/application/composables/usePreset';

export function useGridPreset(gridName) {
    const { getGridSettings, updateGridSettings, isLoaded } = usePreset();
  
    // Grid state
    const columns = ref([]);
    const filters = ref({});
    const pageSize = ref(25);
    const sortBy = ref([]);
  
    // Load saved grid settings
    onMounted(() => {
        if (isLoaded.value) {
            loadGridSettings();
        }
    });
  
    // Watch for preset loading
    watch(isLoaded, (loaded) => {
        if (loaded) {
            loadGridSettings();
        }
    });
  
    function loadGridSettings() {
        const settings = getGridSettings(gridName);
    
        if (settings.columns) {
            columns.value = settings.columns;
        }
        if (settings.filters) {
            filters.value = settings.filters;
        }
        if (settings.pageSize) {
            pageSize.value = settings.pageSize;
        }
        if (settings.sortBy) {
            sortBy.value = settings.sortBy;
        }
    }
  
    function saveGridSettings() {
        if (!isLoaded.value) {
            return;
        }
    
        updateGridSettings(gridName, {
            columns: columns.value,
            filters: filters.value,
            pageSize: pageSize.value,
            sortBy: sortBy.value,
        });
    }
  
    // Watch for changes and auto-save
    watch([columns, filters, pageSize, sortBy], () => {
        saveGridSettings();
    }, { deep: true });
  
    return {
        columns,
        filters,
        pageSize,
        sortBy,
    };
}

/**
 * Usage in component:
 * 
 * <script setup>
 * import { useGridPreset } from './useGridPreset';
 * 
 * const { columns, filters, pageSize, sortBy } = useGridPreset('posts');
 * 
 * // Grid state is automatically loaded from preset
 * // Changes are automatically saved (debounced)
 * </script>
 */
