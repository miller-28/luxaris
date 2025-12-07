# Content Generation Flows

Complete flows for AI-powered content generation and template management in the Luxaris Dashboard.

---

## Flow Pattern

Content generation leverages AI to create platform-optimized social media posts. Users can:
- Generate content from scratch or templates
- Create reusable templates
- Manage template library
- Review and refine AI suggestions

**Standard Pattern:**
- Select template (optional)
- Configure generation parameters
- Generate content (AI processing)
- Review suggestions
- Accept and apply to post

---

## 1. Generate Post Content

**Trigger:** "Generate with AI" button  
**Location:** Post creation/edit panel  
**Components:** `GenerationPanel.vue`  
**API:** `POST /api/v1/posts/generate`  
**Permission:** `generation:create`

### Flow Steps

1. **Initiate Generation**
   - User is in post create/edit panel
   - Click "Generate with AI" button
   - Generation panel slides in (replaces post form)
   - Show generation wizard

2. **Step 1: Choose Template (Optional)**
   - Display template selector
   - Show template cards with:
     - Template name
     - Category
     - Description
     - Preview
   - Options:
     - Select existing template
     - "Start from scratch" (no template)
   - Show "Skip" or "Next" button

3. **Step 2: Configure Parameters**
   - **Prompt/Topic** (required if no template)
     - Text area: "What do you want to post about?"
     - Example prompts shown
     - Min 10 characters
   
   - **Target Channels** (required)
     - Checkboxes: X, LinkedIn, etc.
     - Select one or multiple
     - Shows character limits for each
   
   - **Tone** (optional)
     - Dropdown: Professional, Casual, Friendly, Formal, Humorous
     - Default: Professional
   
   - **Length** (optional)
     - Slider: Short (50-100) / Medium (100-200) / Long (200-280 for X)
     - Adapts to selected channels
   
   - **Include** (optional)
     - Checkboxes:
       - Hashtags
       - Emojis
       - Call-to-action
       - Questions
   
   - **Additional Instructions** (optional)
     - Text area for custom guidance
     - "e.g., mention our new product launch"

4. **Validation**
   - At least one target channel selected
   - Prompt/topic provided (if no template)
   - Enable "Generate" button when valid

5. **Submit Generation**
   - Click "Generate" button
   - Show full-screen loading overlay
   - Loading animation with messages:
     - "Analyzing your request..."
     - "Generating content..."
     - "Optimizing for platforms..."
   - Estimated time: 10-30 seconds

6. **API Request**
   ```javascript
   POST /api/v1/posts/generate
   Body: {
       template_id: "uuid-or-null",
       prompt: "Product launch announcement",
       target_channels: ["x", "linkedin"],
       parameters: {
           tone: "professional",
           length: "medium",
           include_hashtags: true,
           include_emojis: false,
           include_cta: true
       },
       additional_instructions: "Mention sustainability"
   }
   ```

7. **Processing**
   - API forwards request to AI service
   - AI generates multiple suggestions
   - Each suggestion optimized for target channels
   - Returns 3-5 variations

8. **Success Response**
   ```json
   {
       "session_id": "uuid",
       "suggestions": [
           {
               "id": "suggestion_1",
               "content": {
                   "x": "Excited to announce...",
                   "linkedin": "We're thrilled to introduce..."
               },
               "score": 0.92,
               "reasoning": "Professional tone, includes CTA"
           },
           {
               "id": "suggestion_2",
               "content": {
                   "x": "Big news! We're launching...",
                   "linkedin": "Today marks a significant milestone..."
               },
               "score": 0.88,
               "reasoning": "Engaging opening, clear message"
           },
           {
               "id": "suggestion_3",
               "content": {
                   "x": "🚀 Launching our new...",
                   "linkedin": "Innovation meets sustainability..."
               },
               "score": 0.85,
               "reasoning": "Eye-catching, emphasizes sustainability"
           }
       ],
       "created_at": "2025-12-04T10:00:00Z"
   }
   ```

9. **Display Suggestions**
   - Close loading overlay
   - Show suggestions panel
   - Display each suggestion as a card:
     - **Score indicator** (0-100%)
     - **Content tabs** (X, LinkedIn, etc.)
     - **Reasoning** (why this suggestion)
     - **Character counts** per platform
     - **Preview** how it looks on platform
     - **Actions**:
       - "Use This" button (primary)
       - "Edit" button (opens editor)
       - "Regenerate Similar" button

10. **Select Suggestion**
    - User clicks "Use This" on preferred suggestion
    - Confirmation: "Apply to post?"
    - Options:
      - "Apply to all variants" (recommended)
      - "Apply to specific platforms" (checkboxes)
    - Click "Apply"

11. **Apply to Post**
    - Close generation panel
    - Return to post form
    - Content fields populated:
      - Base content (longest version)
      - Variants created for each channel
    - Success toast: "Content applied. Review and edit as needed."
    - User can further edit content

12. **Save Generation Session**
    - API stores generation session
    - Can review past generations
    - Access via "Generation History"

### Edit Suggestion

If user clicks "Edit" on a suggestion:
1. Open inline editor
2. Modify content
3. Character counter updates
4. "Save Edits" applies changes
5. Updated suggestion remains in list

### Regenerate Similar

If user clicks "Regenerate Similar":
1. API generates new suggestions based on selected one
2. Loading overlay (shorter, 5-10s)
3. New suggestions replace current ones
4. Can repeat multiple times

### Error Handling

**AI Service Unavailable**
```json
{
    "errors": [{
        "error_code": "AI_SERVICE_UNAVAILABLE",
        "error_description": "Content generation is temporarily unavailable",
        "error_severity": "error"
    }]
}
```
- Show error message
- Provide "Try Again" button
- Option to "Write Manually"

**Invalid Parameters**
```json
{
    "errors": [{
        "error_code": "INVALID_PARAMETERS",
        "error_description": "Prompt is too short. Minimum 10 characters.",
        "error_severity": "error"
    }]
}
```
- Highlight invalid fields
- Show error messages
- Keep form open for correction

**Generation Failed**
```json
{
    "errors": [{
        "error_code": "GENERATION_FAILED",
        "error_description": "Failed to generate content. Please try different parameters.",
        "error_severity": "error"
    }]
}
```
- Show error toast
- Return to parameters screen
- Keep parameters filled
- Suggest modifications

---

## 2. List Templates

**Route:** `/dashboard/templates`  
**Components:** `TemplatesView.vue`, `TemplatesGrid.vue`  
**API:** `GET /api/v1/templates`  
**Permission:** `templates:read`

### Flow Steps

1. **Navigation**
   - Click "Templates" in sidebar
   - Navigate to `/dashboard/templates`
   - Show loading skeleton

2. **API Request**
   ```javascript
   GET /api/v1/templates?page=1&limit=20
   ```

3. **Display Grid**
   - Card layout for each template
   - Each card shows:
     - **Name** - Template title
     - **Category** - Badge (Product Launch, Event, Announcement, etc.)
     - **Description** - Brief summary
     - **Preview** - Sample output
     - **Metadata**:
       - Visibility: Public / Private
       - Created by: User name (or "System")
       - Usage count: X times used
       - Last used: [date]
     - **Actions**:
       - "Use Template" button
       - "Edit" button (if owner)
       - "Delete" button (if owner)
       - "Duplicate" button

4. **Toolbar Features**
   - **Search**: Template name/description search
   - **Filter by Category**: Dropdown (All, Product Launch, Event, etc.)
   - **Filter by Visibility**: All / Public / My Templates
   - **Sort**: Name, Usage count, Created date
   - **New Template**: Primary action button

5. **Empty State**
   - No templates
   - Message: "No templates yet"
   - "Create Template" button
   - "Browse Public Templates" link

---

## 3. Create Template

**Trigger:** "New Template" button  
**Components:** `TemplateEditPanel.vue`  
**API:** `POST /api/v1/templates`  
**Permission:** `templates:create`

### Flow Steps

1. **Open Create Panel**
   - Click "New Template" button
   - Right panel slides in
   - Empty form
   - Focus on name field

2. **Form Fields**
   - **Name** (required)
     - Text input, max 100 characters
     - "e.g., Product Launch Template"
   
   - **Category** (required)
     - Dropdown: Product Launch, Event, Announcement, Promotion, Educational, Other
     - Option to create new category
   
   - **Description** (optional)
     - Textarea, max 500 characters
     - "Brief description of when to use this template"
   
   - **Instructions** (required)
     - Rich text editor
     - AI prompt/instructions
     - "e.g., Create an exciting product launch announcement..."
     - Min 50 characters
     - Markdown support
   
   - **Variables** (optional)
     - Dynamic placeholders
     - Add variable button
     - Each variable has:
       - Name: `{{product_name}}`
       - Description: "Name of the product"
       - Default value (optional)
     - Up to 10 variables
   
   - **Constraints** (optional)
     - Tone: Dropdown
     - Length: Short/Medium/Long
     - Include: Checkboxes (hashtags, emojis, CTA)
   
   - **Example Output** (optional)
     - Show expected result
     - Helps users understand template
   
   - **Visibility** (required)
     - Radio buttons:
       - **Private**: Only you can use
       - **Public**: Anyone in organization can use
     - Default: Private

3. **Real-time Validation**
   - Name: Required, unique
   - Category: Required
   - Instructions: Required, min 50 chars
   - Variable names: Valid format `{{var_name}}`

4. **Preview Template**
   - "Preview" button
   - Shows how template will generate
   - Mock generation with sample data
   - Helps validate instructions

5. **Submit Template**
   ```javascript
   POST /api/v1/templates
   Body: {
       name: "Product Launch Template",
       category: "product_launch",
       description: "Use for announcing new products",
       instructions: "Create an exciting announcement...",
       variables: [
           {
               name: "product_name",
               description: "Name of the product",
               default_value: "Product X"
           }
       ],
       constraints: {
           tone: "professional",
           length: "medium",
           include_hashtags: true
       },
       visibility: "private"
   }
   ```

6. **Success Actions**
   - Close edit panel
   - Success toast: "Template created successfully"
   - Refresh templates grid
   - New template appears in list
   - Option: "Use Template Now"

---

## 4. Edit Template

**Trigger:** "Edit" button on template card  
**Components:** `TemplateEditPanel.vue`  
**API:** `PATCH /api/v1/templates/:id`  
**Permission:** `templates:update` (owner only)

### Flow Steps

1. **Open Edit Panel**
   - Click "Edit" on template card
   - Right panel slides in
   - Load template data
   - Pre-fill form

2. **Form Pre-filled**
   - All fields contain current values
   - Show "Created: [date]"
   - Show "Used: X times"

3. **Modify Fields**
   - User edits name, instructions, constraints
   - Real-time validation
   - Unsaved changes indicator

4. **Submit Changes**
   ```javascript
   PATCH /api/v1/templates/:id
   Body: {
       name: "Updated Template Name",
       instructions: "Updated instructions..."
   }
   ```

5. **Success Actions**
   - Close panel
   - Success toast: "Template updated"
   - Update template in grid
   - Maintain scroll position

### Permissions

**Not Owner**
- Cannot edit
- Show "Duplicate to Edit" button
- Creates copy as new template

---

## 5. Delete Template

**Trigger:** "Delete" button on template card  
**Components:** `DeleteConfirmModal.vue`  
**API:** `DELETE /api/v1/templates/:id`  
**Permission:** `templates:delete` (owner only)

### Flow Steps

1. **Trigger Delete**
   - Click "Delete" button
   - Confirmation modal appears

2. **Confirmation Modal**
   - Title: "Delete Template?"
   - Message: "Are you sure you want to delete '{template.name}'?"
   - Warning: "Used X times by team members"
   - Info: "This will not affect existing generated content"
   - Buttons: "Cancel" / "Delete"

3. **Confirm Deletion**
   - API: `DELETE /api/v1/templates/:id`
   - Success: Remove from grid
   - Success toast: "Template deleted"

---

## 6. Use Template (Quick Action)

**Trigger:** "Use Template" button on template card  
**Flow:** Opens generation panel with template pre-selected

### Flow Steps

1. **Quick Use**
   - Click "Use Template" button
   - If in post context: Opens generation panel with template selected
   - If on templates page: Prompts to "Create New Post" or "Cancel"

2. **Create Post with Template**
   - Navigate to post creation
   - Open generation panel
   - Template pre-selected
   - Skip to parameters step
   - Continue normal generation flow

---

## 7. Duplicate Template

**Trigger:** "Duplicate" button on template card  
**API:** `POST /api/v1/templates/:id/duplicate`  
**Permission:** `templates:create`

### Flow Steps

1. **Duplicate**
   - Click "Duplicate" button
   - Creates copy of template
   - Name: "[Original Name] (Copy)"
   - Ownership: Current user
   - Visibility: Private

2. **Edit Copy**
   - Auto-open edit panel for new template
   - User can modify as needed
   - Save as new template

---

## Summary

**Content Generation Flows:** 7 flows

1. **Generate Post Content** - AI-powered content creation with suggestions
2. **List Templates** - Browse template library
3. **Create Template** - Design reusable generation templates
4. **Edit Template** - Modify existing templates
5. **Delete Template** - Remove templates
6. **Use Template** - Quick generation from template
7. **Duplicate Template** - Copy and customize templates

**Key Features:**
- ✅ AI-powered content generation
- ✅ Multi-platform optimization
- ✅ Template system for reusability
- ✅ Multiple suggestion variants
- ✅ Inline editing of suggestions
- ✅ Generation session history
- ✅ Variable support in templates
- ✅ Public/private template sharing
- ✅ Regenerate capability
- ✅ Preview before applying

**AI Capabilities:**
- Platform-specific optimization (X, LinkedIn)
- Tone and length customization
- Hashtag and emoji generation
- Call-to-action inclusion
- Multiple variations per request
- Scoring and reasoning
- Context-aware generation
