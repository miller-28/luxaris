/**
 * Abstract Store
 * Base class for all Pinia stores with common functionality
 */
export class AbstractStore {
    
    /**
     * Get common state properties
     */
    static getBaseState() {
        return {
            loading: false,
            error: null,
            selectedItems: []
        };
    }

    /**
     * Get common getters
     */
    static getBaseGetters() {

        return {
            /**
             * Check if loading
             */
            isLoading: (state) => state.loading,

            /**
             * Check if has error
             */
            hasError: (state) => !!state.error,

            /**
             * Get selected items count
             */
            selectedCount: (state) => state.selectedItems.length,

            /**
             * Check if any items are selected
             */
            hasSelection: (state) => state.selectedItems.length > 0
        };
    }

    /**
     * Get common actions
     * @param {string} itemKey - The key to use for item identification (default: 'id')
     */
    static getBaseActions(itemKey = 'id') {

        return {
            /**
             * Set selected items
             */
            setSelectedItems(items) {
                this.selectedItems = items;
            },

            /**
             * Clear selected items
             */
            clearSelectedItems() {
                this.selectedItems = [];
            },

            /**
             * Toggle item selection
             */
            toggleItemSelection(item) {
                const index = this.selectedItems.findIndex(
                    i => i[itemKey] === item[itemKey]
                );
                if (index > -1) {
                    this.selectedItems.splice(index, 1);
                } else {
                    this.selectedItems.push(item);
                }
            },

            /**
             * Select multiple items
             */
            selectItems(items) {
                items.forEach(item => {
                    if (!this.selectedItems.some(i => i[itemKey] === item[itemKey])) {
                        this.selectedItems.push(item);
                    }
                });
            },

            /**
             * Deselect multiple items
             */
            deselectItems(items) {
                items.forEach(item => {
                    const index = this.selectedItems.findIndex(
                        i => i[itemKey] === item[itemKey]
                    );
                    if (index > -1) {
                        this.selectedItems.splice(index, 1);
                    }
                });
            },

            /**
             * Check if item is selected
             */
            isItemSelected(item) {
                return this.selectedItems.some(i => i[itemKey] === item[itemKey]);
            },

            /**
             * Clear error
             */
            clearError() {
                this.error = null;
            },

            /**
             * Set error
             */
            setError(error) {
                this.error = error;
            }
        };
    }

    /**
     * Merge base state with custom state
     */
    static mergeState(customState) {
        return {
            ...this.getBaseState(),
            ...customState
        };
    }

    /**
     * Merge base getters with custom getters
     */
    static mergeGetters(customGetters) {
        return {
            ...this.getBaseGetters(),
            ...customGetters
        };
    }

    /**
     * Merge base actions with custom actions
     */
    static mergeActions(customActions, itemKey = 'id') {
        return {
            ...this.getBaseActions(itemKey),
            ...customActions
        };
    }
}
