# Flow: Create Template

**Endpoint:** `POST /api/v1/templates`

**Context:** Posts - Content Generation

**Purpose:** Create a reusable template for content generation.

---

## Request

```json
{
  "name": "Product Launch Template",
  "description": "Template for announcing new product features and launches",
  "category": "product_updates",
  "prompt_template": "Create a {tone} announcement about {topic}. Highlight: {key_points}. Target audience: {target_audience}. {additional_instructions}",
  "variables": [
    {
      "key": "tone",
      "label": "Tone",
      "type": "select",
      "required": true,
      "options": ["professional", "casual", "enthusiastic", "formal"],
      "default": "professional"
    },
    {
      "key": "topic",
      "label": "Topic",
      "type": "text",
      "required": true
    },
    {
      "key": "key_points",
      "label": "Key Points",
      "type": "textarea",
      "required": true,
      "placeholder": "List key points to highlight"
    },
    {
      "key": "target_audience",
      "label": "Target Audience",
      "type": "text",
      "required": false,
      "default": "general audience"
    },
    {
      "key": "additional_instructions",
      "label": "Additional Instructions",
      "type": "textarea",
      "required": false
    }
  ],
  "default_options": {
    "include_hashtags": true,
    "include_emojis": false,
    "variants_per_channel": 2
  },
  "is_public": false
}
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Input**
   - Validate `name` is not empty (max 200 chars)
   - Validate `prompt_template` is not empty
   - Validate `variables` array structure
   - Validate variable types are supported
   - Check for duplicate variable keys

3. **Validate Template Syntax**
   - Check all placeholders in `prompt_template` have matching variables
   - Verify placeholder syntax: `{variable_key}`
   - Ensure no undefined placeholders

4. **Create Template Record**
   - Insert into `templates` table:
     - `id` (UUID)
     - `owner_principal_id`
     - `name`
     - `description`
     - `category`
     - `prompt_template`
     - `variables` (JSON array)
     - `default_options` (JSON object)
     - `is_public`
     - `status` = `active`
     - `usage_count` = 0
     - `created_at`, `updated_at`

5. **Create Audit Log**
   - Log `TEMPLATE_CREATED` event

6. **Return Response**
   - Return created template

---

## Response

**Success (201 Created):**
```json
{
  "id": "template-uuid-123",
  "name": "Product Launch Template",
  "description": "Template for announcing new product features and launches",
  "category": "product_updates",
  "prompt_template": "Create a {tone} announcement about {topic}. Highlight: {key_points}. Target audience: {target_audience}. {additional_instructions}",
  "variables": [
    {
      "key": "tone",
      "label": "Tone",
      "type": "select",
      "required": true,
      "options": ["professional", "casual", "enthusiastic", "formal"],
      "default": "professional"
    },
    {
      "key": "topic",
      "label": "Topic",
      "type": "text",
      "required": true
    },
    {
      "key": "key_points",
      "label": "Key Points",
      "type": "textarea",
      "required": true,
      "placeholder": "List key points to highlight"
    },
    {
      "key": "target_audience",
      "label": "Target Audience",
      "type": "text",
      "required": false,
      "default": "general audience"
    },
    {
      "key": "additional_instructions",
      "label": "Additional Instructions",
      "type": "textarea",
      "required": false
    }
  ],
  "default_options": {
    "include_hashtags": true,
    "include_emojis": false,
    "variants_per_channel": 2
  },
  "is_public": false,
  "status": "active",
  "usage_count": 0,
  "created_at": "2025-11-25T16:00:00Z",
  "updated_at": "2025-11-25T16:00:00Z",
  "owner": {
    "id": "user-uuid",
    "name": "John Doe"
  }
}
```

**Error (400 Bad Request) - Invalid variable:**
```json
{
  "errors": [
    {
      "error_code": "INVALID_TEMPLATE_VARIABLE",
      "error_description": "Placeholder '{undefined_var}' in template has no matching variable definition",
      "error_severity": "error",
      "meta": {
        "placeholder": "undefined_var"
      }
    }
  ]
}
```

**Error (400 Bad Request) - Duplicate variable:**
```json
{
  "errors": [
    {
      "error_code": "DUPLICATE_VARIABLE_KEY",
      "error_description": "Variable key 'tone' is defined multiple times",
      "error_severity": "error"
    }
  ]
}
```

---

## Variable Types

**Supported Types:**

**1. `text`**: Single-line text input
```json
{
  "key": "topic",
  "label": "Topic",
  "type": "text",
  "required": true,
  "max_length": 200
}
```

**2. `textarea`**: Multi-line text input
```json
{
  "key": "key_points",
  "label": "Key Points",
  "type": "textarea",
  "required": true,
  "rows": 5
}
```

**3. `select`**: Dropdown selection
```json
{
  "key": "tone",
  "label": "Tone",
  "type": "select",
  "required": true,
  "options": ["professional", "casual", "enthusiastic"],
  "default": "professional"
}
```

**4. `number`**: Numeric input
```json
{
  "key": "word_count",
  "label": "Target Word Count",
  "type": "number",
  "required": false,
  "min": 50,
  "max": 500,
  "default": 150
}
```

**5. `checkbox`**: Boolean toggle
```json
{
  "key": "include_call_to_action",
  "label": "Include Call to Action",
  "type": "checkbox",
  "required": false,
  "default": true
}
```

---

## Template Categories

**Built-in Categories:**
- `product_updates`: Product launches, feature announcements
- `marketing`: Promotional content, campaigns
- `company_news`: Company announcements, press releases
- `engagement`: Questions, polls, conversations
- `educational`: Tips, how-tos, guides
- `seasonal`: Holiday posts, event-based content
- `custom`: User-defined category

---

## Public vs Private Templates

**Private Template (`is_public: false`):**
- Only accessible by owner
- Not visible in marketplace
- Personal use only

**Public Template (`is_public: true`):**
- Visible in template marketplace
- Can be used by other users
- Owner gets usage statistics
- Optional: Owner can monetize (future feature)

---

## Template Validation Rules

**1. Name:**
- Required
- 3-200 characters
- Must be unique per user

**2. Prompt Template:**
- Required
- Max 5000 characters
- Must contain at least one placeholder

**3. Variables:**
- Max 20 variables per template
- Variable keys must be alphanumeric + underscore
- No duplicate variable keys

**4. Placeholders:**
- Must use `{variable_key}` syntax
- Must have matching variable definition
- Case-sensitive

---

## Usage Tracking

**Track template usage:**
```javascript
// When template is used for generation
UPDATE templates 
SET 
  usage_count = usage_count + 1,
  last_used_at = NOW()
WHERE id = template_id;
```

**Usage statistics:**
- Total usage count
- Last used timestamp
- Usage trend (daily/weekly/monthly)

---

## Authorization

- Any authenticated user can create templates
- Only owner can edit/delete private templates
- Public templates can be forked/cloned by others

---

## Use Cases

**1. Consistent Brand Voice:**
- Create templates with brand guidelines
- Ensure all posts match tone and style

**2. Team Collaboration:**
- Share templates with team members
- Standardize content creation process

**3. Content Library:**
- Build library of proven templates
- Reuse successful content patterns

**4. Time Saving:**
- Avoid writing prompts from scratch
- Quick content generation
