# UI Stateful Presets Flows

Complete flows for user interface stateful presets system in the Luxaris Dashboard.

---

## Overview

The UI Stateful Presets system allows users and administrators to persist and customize UI configurations including:
- Grid column order, visibility, and width
- Component visibility and order on dashboards
- Menu state (collapsed, opened groups)
- Filters, sorting, and pagination settings
- User preferences (theme, locale, timezone, date format)

### Preset Hierarchy

1. **User Custom Preset** (highest priority) - User's personal customizations
2. **Role Default Preset** (medium priority) - Admin-defined preset for role
3. **Global Default Preset** (lowest priority) - System-wide default

---

## 1. Load User Preset on Login

**Trigger:** User successfully logs in  
**Components:** Router Guard, `presetStore`  
**API:** `GET /api/v1/system/users/:user_id/ui-preset`

### Flow Steps

1. **User Logs In**
   - User completes login (email/password or Google OAuth)
   - Tokens stored in localStorage
   - User data stored in authStore

2. **Router Guard Triggers**
   ```javascript
   router.beforeEach(async (to, from, next) => {
     const authStore = useAuthStore();
     const presetStore = usePresetStore();
     
     if (authStore.isAuthenticated && !presetStore.currentPreset) {
       // Load preset on first authenticated navigation
       await presetStore.loadPreset(authStore.user.id);
     }
     
     next();
   });
   ```

3. **API Request**
   ```javascript
   GET /api/v1/system/users/uuid-12345/ui-preset
   Headers: { Authorization: "Bearer JWT_TOKEN" }
   ```

4. **API Preset Resolution**
   - **Step 1:** Check for user's custom preset:
     ```sql
     SELECT * FROM user_ui_stateful_presets
     WHERE user_id = 'uuid-12345'
     LIMIT 1;
     ```
   
   - **Step 2:** If no custom preset, check role default:
     ```sql
     SELECT p.* FROM user_ui_stateful_presets p
     JOIN user_roles ur ON p.role_id = ur.role_id
     WHERE ur.user_id = 'uuid-12345'
     AND p.is_default = TRUE
     LIMIT 1;
     ```
   
   - **Step 3:** If no role preset, return global default:
     ```sql
     SELECT * FROM user_ui_stateful_presets
     WHERE is_global = TRUE
     LIMIT 1;
     ```

5. **API Response**
   ```json
   {
     "id": "preset-uuid",
     "user_id": "uuid-12345",
     "role_id": null,
     "preset_name": "My Custom Layout",
     "is_global": false,
     "is_default": false,
     "settings": {
       "menu": {
         "collapsed": false,
         "openedGroups": ["posts", "channels"]
       },
       "grids": {
         "posts-grid": {
           "columns": [
             { "field": "title", "order": 1, "visible": true, "width": 300 },
             { "field": "status", "order": 2, "visible": true, "width": 120 },
             { "field": "created_at", "order": 3, "visible": true, "width": 180 }
           ],
           "filters": {
             "status": "draft",
             "search": "",
             "tags": []
           },
           "sorting": {
             "field": "created_at",
             "order": "desc"
           },
           "pageSize": 20
         }
       },
       "components": {
         "dashboard-widgets": {
           "recent-posts": { "visible": true, "order": 1 },
           "schedule-calendar": { "visible": true, "order": 2 }
         }
       },
       "preferences": {
         "theme": "light",
         "locale": "en",
         "timezone": "UTC",
         "dateFormat": "YYYY-MM-DD",
         "compactMode": false
       }
     },
     "created_at": "2025-12-05T10:00:00Z",
     "updated_at": "2025-12-05T12:30:00Z"
   }
   ```

6. **Client Applies Preset**
   ```javascript
   // Store in Pinia
   presetStore.setCurrentPreset(preset);
   
   // Apply menu state
   if (preset.settings.menu) {
     menuStore.setCollapsed(preset.settings.menu.collapsed);
     menuStore.setOpenedGroups(preset.settings.menu.openedGroups);
   }
   
   // Apply preferences
   if (preset.settings.preferences) {
     themeStore.setTheme(preset.settings.preferences.theme);
     i18n.global.locale.value = preset.settings.preferences.locale;
     setupRTL(preset.settings.preferences.locale);
   }
   
   // Grid and component settings applied when views mount
   ```

7. **Views Apply Settings on Mount**
   ```javascript
   // In PostsView.vue
   onMounted(() => {
     const gridSettings = presetStore.getGridSettings('posts-grid');
     
     if (gridSettings) {
       // Apply saved filters
       filters.value = gridSettings.filters;
       
       // Apply saved sorting
       sorting.value = gridSettings.sorting;
       
       // Apply saved page size
       pageSize.value = gridSettings.pageSize;
       
       // Fetch posts with saved settings
       fetchPosts();
     }
   });
   ```

### Success Actions

- Preset loaded and stored in Pinia
- Menu state applied (collapsed, opened groups)
- Theme and locale applied
- Grid and component settings ready for view mounting
- User sees personalized UI immediately

### Error Handling

**No Preset Found (404)**
- Create default preset for user automatically
- Apply system defaults
- Log warning for investigation

**Network Error**
- Use cached preset from previous session (if available)
- Apply system defaults
- Show warning toast: "Using offline settings"

---

## 2. Auto-Save Grid Column Reorder

**Trigger:** User reorders columns in any grid  
**Components:** `DataGrid.vue`, `presetStore`  
**API:** `PATCH /api/v1/system/ui-presets/:preset_id` (auto-saved)

### Flow Steps

1. **User Reorders Columns**
   - User drags column header to new position
   - PrimeVue DataTable emits `column-reorder` event

2. **Event Handler Captures New Order**
   ```vue
   <template>
     <DataTable
       :value="posts"
       :reorderable-columns="true"
       @column-reorder="handleColumnReorder"
     >
       <Column field="title" header="Title" />
       <Column field="status" header="Status" />
       <Column field="created_at" header="Created" />
     </DataTable>
   </template>
   
   <script setup>
   function handleColumnReorder(event) {
     // event.columns contains new column order
     const newColumnOrder = event.columns.map((col, index) => ({
       field: col.field,
       order: index + 1,
       visible: col.visible !== false,
       width: col.width || 'auto'
     }));
     
     // Update preset (will auto-save)
     presetStore.updateSetting(
       `grids.${gridId}.columns`,
       newColumnOrder
     );
   }
   </script>
   ```

3. **PresetStore Updates Local State**
   ```javascript
   // In presetStore.js
   updateSetting(path, value) {
     // Update nested setting
     presetManager.updateSetting(path, value);
   }
   ```

4. **PresetManager Debounces Save**
   ```javascript
   // In presetManager.js
   updateSetting(path, value) {
     if (!this.currentPreset) return;
     
     // Update nested value
     this.setNestedValue(this.currentPreset.settings, path, value);
     
     // Debounced save (2 seconds)
     if (this.autoSaveEnabled) {
       this.debouncedSave();
     }
   }
   
   debouncedSave = debounce(async () => {
     try {
       await this.savePreset();
       console.log('Preset auto-saved');
     } catch (error) {
       console.error('Failed to auto-save preset:', error);
     }
   }, 2000); // 2 second debounce
   ```

5. **API Request (After Debounce)**
   ```javascript
   PATCH /api/v1/system/ui-presets/preset-uuid
   Headers: { Authorization: "Bearer JWT_TOKEN" }
   Body: {
     "settings": {
       "menu": { ... },
       "grids": {
         "posts-grid": {
           "columns": [
             { "field": "status", "order": 1, "visible": true, "width": 120 },
             { "field": "title", "order": 2, "visible": true, "width": 300 },
             { "field": "created_at", "order": 3, "visible": true, "width": 180 }
           ],
           ...
         }
       },
       ...
     }
   }
   ```

6. **API Updates Preset**
   ```sql
   UPDATE user_ui_stateful_presets
   SET settings = $1,
       updated_at = CURRENT_TIMESTAMP
   WHERE id = 'preset-uuid'
   AND user_id = 'uuid-12345';
   ```

7. **API Response**
   ```json
   {
     "id": "preset-uuid",
     "settings": { ... },
     "updated_at": "2025-12-05T12:35:22Z"
   }
   ```

8. **Client Updates Local Preset**
   ```javascript
   presetManager.currentPreset = updatedPreset;
   ```

### Success Actions

- Column order persisted to server
- Visual feedback (optional subtle indicator)
- No user interruption
- Settings applied on next page load

### Error Handling

**Network Error**
- Keep changes in local state
- Retry save on next update
- Show warning if multiple saves fail
- Log for debugging

**Permission Denied (403)**
- User trying to modify role/global preset
- Automatically clone preset to user
- Retry save to new user preset
- Show toast: "Settings saved to your personal profile"

---

## 3. Clone Role Preset on First Modification

**Trigger:** User with role preset makes first UI change  
**Components:** `presetManager`  
**API:** `POST /api/v1/system/ui-presets/:preset_id/clone`

### Flow Steps

1. **User Has Role Default Preset**
   - User loaded role default preset on login
   - `preset.role_id` is not null
   - `preset.user_id` is null

2. **User Makes First Change**
   - Example: User changes filter in posts grid
   - `presetStore.updateSetting('grids.posts-grid.filters.status', 'published')`

3. **PresetManager Detects Role Preset**
   ```javascript
   updateSetting(path, value) {
     // Check if current preset is role/global preset
     if (this.currentPreset.user_id === null) {
       // Need to clone before modifying
       await this.cloneAndUpdate(path, value);
       return;
     }
     
     // Normal update for user preset
     this.setNestedValue(this.currentPreset.settings, path, value);
     this.debouncedSave();
   }
   ```

4. **Clone Preset API Call**
   ```javascript
   async cloneAndUpdate(path, value) {
     try {
       // Clone role preset to user
       const clonedPreset = await this.clonePreset(
         this.currentPreset.id,
         authStore.user.id
       );
       
       // Update current preset reference
       this.currentPreset = clonedPreset;
       
       // Now apply the change
       this.setNestedValue(clonedPreset.settings, path, value);
       
       // Save with change
       await this.savePreset();
       
       // Update Pinia store
       presetStore.setCurrentPreset(clonedPreset);
       
       // Notify user
       toast.add({
         severity: 'info',
         summary: 'Settings Personalized',
         detail: 'Your personal settings have been created',
         life: 3000
       });
     } catch (error) {
       console.error('Failed to clone preset:', error);
       throw error;
     }
   }
   ```

5. **API Clone Request**
   ```javascript
   POST /api/v1/system/ui-presets/role-preset-uuid/clone
   Headers: { Authorization: "Bearer JWT_TOKEN" }
   Body: {
     "user_id": "uuid-12345"
   }
   ```

6. **API Creates User Preset**
   ```sql
   -- Clone preset
   INSERT INTO user_ui_stateful_presets (
     user_id, role_id, preset_name, is_global, is_default, settings
   )
   SELECT
     'uuid-12345', -- User ID
     NULL,          -- No role (user-specific)
     'My Custom ' || preset_name,
     FALSE,
     FALSE,
     settings      -- Copy all settings
   FROM user_ui_stateful_presets
   WHERE id = 'role-preset-uuid';
   
   RETURNING *;
   ```

7. **API Response**
   ```json
   {
     "id": "new-preset-uuid",
     "user_id": "uuid-12345",
     "role_id": null,
     "preset_name": "My Custom Layout",
     "is_global": false,
     "is_default": false,
     "settings": {
       "menu": { ... },
       "grids": { ... },
       "preferences": { ... }
     },
     "created_at": "2025-12-05T12:40:00Z",
     "updated_at": "2025-12-05T12:40:00Z"
   }
   ```

8. **Client Uses New Preset**
   - All future changes save to user's personal preset
   - User can now fully customize UI
   - Changes don't affect role default

### Success Actions

- Role preset cloned to user
- User's change applied
- Toast notification shown
- Future changes save to personal preset
- User independence achieved

### Error Handling

**Clone Failed**
- Fall back to local-only changes
- Show error toast
- Changes persist in session but not saved
- Retry clone on next login

---

## 4. Toggle Column Visibility

**Trigger:** User shows/hides columns in grid  
**Components:** `DataGrid.vue`, Column Chooser Dialog  
**API:** `PATCH /api/v1/system/ui-presets/:preset_id` (auto-saved)

### Flow Steps

1. **User Opens Column Chooser**
   - User clicks column toggle icon in grid toolbar
   - Dialog displays all available columns with checkboxes

2. **Dialog Component**
   ```vue
   <template>
     <Dialog
       v-model:visible="showColumnChooser"
       header="Choose Columns"
       :modal="true"
     >
       <div v-for="col in allColumns" :key="col.field" class="field-checkbox">
         <Checkbox
           :id="col.field"
           v-model="col.visible"
           :binary="true"
           @change="handleColumnVisibilityChange"
         />
         <label :for="col.field">{{ col.header }}</label>
       </div>
     </Dialog>
   </template>
   
   <script setup>
   import { ref, computed } from 'vue';
   import { usePresetStore } from '@/core/store/presetStore';
   
   const presetStore = usePresetStore();
   const gridId = 'posts-grid';
   
   const allColumns = ref([
     { field: 'title', header: 'Title', visible: true, order: 1 },
     { field: 'status', header: 'Status', visible: true, order: 2 },
     { field: 'created_at', header: 'Created', visible: true, order: 3 },
     { field: 'tags', header: 'Tags', visible: false, order: 4 },
     { field: 'author', header: 'Author', visible: false, order: 5 }
   ]);
   
   function handleColumnVisibilityChange() {
     // Update preset
     presetStore.updateSetting(
       `grids.${gridId}.columns`,
       allColumns.value
     );
   }
   </script>
   ```

3. **Preset Auto-Saves**
   - Follows same debounced save as column reorder (see Flow 2)

4. **Grid Re-renders**
   ```vue
   <template>
     <DataTable :value="posts">
       <Column
         v-for="col in visibleColumns"
         :key="col.field"
         :field="col.field"
         :header="col.header"
         :style="{ width: col.width }"
       />
     </DataTable>
   </template>
   
   <script setup>
   const visibleColumns = computed(() => {
     const gridSettings = presetStore.getGridSettings(gridId);
     
     if (!gridSettings?.columns) return defaultColumns;
     
     return gridSettings.columns
       .filter(col => col.visible)
       .sort((a, b) => a.order - b.order);
   });
   </script>
   ```

### Success Actions

- Columns shown/hidden immediately
- Grid layout adjusts automatically
- Settings auto-saved to server
- Applied on next page load

---

## 5. Save Grid Filters

**Trigger:** User applies filters in grid  
**Components:** `DataGrid.vue`, Filter components  
**API:** `PATCH /api/v1/system/ui-presets/:preset_id` (auto-saved)

### Flow Steps

1. **User Applies Filter**
   ```vue
   <template>
     <DataTable :value="posts" v-model:filters="filters" filterDisplay="row">
       <Column field="status" header="Status" :showFilterMenu="true">
         <template #filter="{ filterModel, filterCallback }">
           <Dropdown
             v-model="filterModel.value"
             @change="filterCallback(); handleFilterChange()"
             :options="statusOptions"
             placeholder="Select Status"
           />
         </template>
       </Column>
     </DataTable>
   </template>
   
   <script setup>
   import { ref, onMounted } from 'vue';
   import { usePresetStore } from '@/core/store/presetStore';
   
   const presetStore = usePresetStore();
   const gridId = 'posts-grid';
   
   const filters = ref({
     status: { value: null, matchMode: 'equals' },
     search: { value: '', matchMode: 'contains' }
   });
   
   function handleFilterChange() {
     // Save filters to preset
     presetStore.updateSetting(
       `grids.${gridId}.filters`,
       {
         status: filters.value.status.value,
         search: filters.value.search.value
       }
     );
   }
   
   // Load saved filters on mount
   onMounted(() => {
     const gridSettings = presetStore.getGridSettings(gridId);
     if (gridSettings?.filters) {
       filters.value.status.value = gridSettings.filters.status;
       filters.value.search.value = gridSettings.filters.search;
     }
   });
   </script>
   ```

2. **Preset Auto-Saves**
   - Debounced save triggers after 2 seconds
   - All filter values persisted

### Success Actions

- Filters persisted across sessions
- User returns to find filtered view
- No manual save required

---

## 6. Admin Creates Role Default Preset

**Trigger:** Admin wants to set default UI for role  
**Components:** `AdminPresetsView.vue`, `PresetEditorDialog.vue`  
**API:** `POST /api/v1/system/ui-presets`  
**Permission:** `system:admin` or `ui-presets:manage`

### Flow Steps

1. **Admin Navigates to Presets Management**
   - Route: `/dashboard/admin/ui-presets`
   - Only visible to admins

2. **Admin Clicks "Create Role Preset"**
   - Button opens preset editor dialog

3. **Admin Fills Form**
   ```vue
   <template>
     <Dialog v-model:visible="showDialog" header="Create Role Preset">
       <div class="field">
         <label for="roleSel">Role</label>
         <Dropdown
           id="role"
           v-model="selectedRole"
           :options="roles"
           optionLabel="name"
           optionValue="id"
           placeholder="Select Role"
         />
       </div>
       
       <div class="field">
         <label for="presetName">Preset Name</label>
         <InputText
           id="presetName"
           v-model="presetName"
           placeholder="Manager Default Layout"
         />
       </div>
       
       <div class="field-checkbox">
         <Checkbox id="isDefault" v-model="isDefault" :binary="true" />
         <label for="isDefault">Set as default for role</label>
       </div>
       
       <div class="field">
         <label>Settings (JSON)</label>
         <Textarea
           v-model="settingsJson"
           :autoResize="true"
           rows="10"
           placeholder='{"menu": {...}, "grids": {...}}'
         />
       </div>
       
       <template #footer>
         <Button label="Cancel" @click="showDialog = false" text />
         <Button label="Create" @click="createPreset" />
       </template>
     </Dialog>
   </template>
   ```

4. **Admin Clicks "Create"**
   - Client validates JSON settings
   - API request sent

5. **API Request**
   ```javascript
   POST /api/v1/system/ui-presets
   Headers: { Authorization: "Bearer JWT_TOKEN" }
   Body: {
     "role_id": "manager-role-uuid",
     "preset_name": "Manager Default Layout",
     "is_default": true,
     "settings": {
       "menu": {
         "collapsed": false,
         "openedGroups": ["posts", "schedules"]
       },
       "grids": {
         "posts-grid": {
           "columns": [...],
           "filters": {"status": "all"},
           "pageSize": 20
         }
       },
       "preferences": {
         "theme": "light",
         "locale": "en",
         "compactMode": false
       }
     }
   }
   ```

6. **API Validates and Creates**
   ```sql
   -- If is_default=true, unset existing default for role
   UPDATE user_ui_stateful_presets
   SET is_default = FALSE
   WHERE role_id = 'manager-role-uuid'
   AND is_default = TRUE;
   
   -- Create new preset
   INSERT INTO user_ui_stateful_presets (
     user_id, role_id, preset_name, is_global, is_default, settings
   ) VALUES (
     NULL, 'manager-role-uuid', 'Manager Default Layout',
     FALSE, TRUE, $settings_json
   )
   RETURNING *;
   ```

7. **API Response**
   ```json
   {
     "id": "new-preset-uuid",
     "user_id": null,
     "role_id": "manager-role-uuid",
     "preset_name": "Manager Default Layout",
     "is_default": true,
     "settings": { ... },
     "created_at": "2025-12-05T14:00:00Z"
   }
   ```

8. **Client Updates Grid**
   - New preset appears in admin grid
   - Success toast shown
   - Dialog closes

### Success Actions

- Role default preset created
- All users with that role (without custom presets) will use it
- Existing custom presets unaffected

### Impact

**For Existing Users:**
- Users with custom presets: No change
- Users with default preset: Will use new preset on next login

**For New Users:**
- New users assigned to role will use this preset by default

---

## Components

### DataGrid with Preset Support

```vue
<template>
  <div class="data-grid-container">
    <!-- Toolbar -->
    <Toolbar>
      <template #start>
        <Button
          label="Columns"
          icon="pi pi-table"
          @click="showColumnChooser = true"
        />
      </template>
    </Toolbar>
    
    <!-- DataTable -->
    <DataTable
      :value="items"
      :reorderableColumns="true"
      v-model:filters="filters"
      filterDisplay="row"
      @column-reorder="handleColumnReorder"
      @filter="handleFilter"
      @sort="handleSort"
    >
      <Column
        v-for="col in visibleColumns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :sortable="true"
        :style="{ width: col.width }"
      />
    </DataTable>
    
    <!-- Column Chooser Dialog -->
    <ColumnChooserDialog
      v-model:visible="showColumnChooser"
      :columns="allColumns"
      @update:columns="handleColumnVisibilityChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { usePresetStore } from '@/core/store/presetStore';

const props = defineProps({
  gridId: { type: String, required: true },
  items: { type: Array, required: true }
});

const presetStore = usePresetStore();
const showColumnChooser = ref(false);

// Load grid settings from preset
const gridSettings = computed(() => 
  presetStore.getGridSettings(props.gridId)
);

// Visible columns based on preset
const visibleColumns = computed(() => {
  if (!gridSettings.value?.columns) return defaultColumns;
  
  return gridSettings.value.columns
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order);
});

// Handlers
function handleColumnReorder(event) {
  const newOrder = event.columns.map((col, idx) => ({
    ...col,
    order: idx + 1
  }));
  
  presetStore.updateSetting(
    `grids.${props.gridId}.columns`,
    newOrder
  );
}

function handleFilter() {
  presetStore.updateSetting(
    `grids.${props.gridId}.filters`,
    filters.value
  );
}

function handleSort(event) {
  presetStore.updateSetting(
    `grids.${props.gridId}.sorting`,
    {
      field: event.sortField,
      order: event.sortOrder === 1 ? 'asc' : 'desc'
    }
  );
}

// Load saved settings on mount
onMounted(() => {
  if (gridSettings.value) {
    if (gridSettings.value.filters) {
      filters.value = gridSettings.value.filters;
    }
    if (gridSettings.value.sorting) {
      // Apply sorting
    }
  }
});
</script>
```

---

## API Endpoints

### GET /api/v1/system/users/:user_id/ui-preset

**Purpose:** Get active preset for user

**Response:** User's custom preset, role default, or global default

---

### PATCH /api/v1/system/ui-presets/:preset_id

**Purpose:** Update preset settings (auto-save)

**Body:** `{ "settings": { ... } }`

**Response:** Updated preset

---

### POST /api/v1/system/ui-presets/:preset_id/clone

**Purpose:** Clone preset for user customization

**Body:** `{ "user_id": "uuid" }`

**Response:** New user-specific preset

---

### POST /api/v1/system/ui-presets

**Purpose:** Create new preset (admin only)

**Body:** Role/global preset configuration

**Response:** Created preset

---

## Summary

**Total Flows:** 6

1. **Load User Preset on Login** - Automatic preset loading with hierarchy resolution
2. **Auto-Save Grid Column Reorder** - Debounced auto-save on column drag
3. **Clone Role Preset on First Modification** - Automatic preset personalization
4. **Toggle Column Visibility** - Show/hide columns with persistence
5. **Save Grid Filters** - Persist filter state across sessions
6. **Admin Creates Role Default Preset** - Admin defines defaults for roles

**Key Features:**
- ✅ Hierarchical preset system (user → role → global)
- ✅ Auto-save with debouncing (2 seconds)
- ✅ Automatic cloning on first modification
- ✅ Deep merge for nested settings
- ✅ PrimeVue DataTable integration
- ✅ Admin preset management
- ✅ No manual save required
- ✅ Comprehensive error handling

**Supported Settings:**
- Grid column order, visibility, width
- Grid filters, sorting, pagination
- Menu state (collapsed, opened groups)
- Component visibility and order
- User preferences (theme, locale, timezone, dateFormat)
