# Flow: List Templates

**Endpoint:** `GET /api/v1/templates`

**Context:** Posts - Content Generation

**Purpose:** List available templates for content generation with filtering and search.

---

## Request

**Query Parameters:**
- `category` (optional): Filter by category
- `is_public` (optional): Filter by visibility (`true`, `false`)
- `owner` (optional): `me` (my templates) or `all` (include public)
- `search` (optional): Search by name/description
- `sort` (optional): Sort field (`created_at`, `usage_count`, `name`, default: `created_at`)
- `order` (optional): Sort order (`asc`, `desc`, default: `desc`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Examples:**
```
GET /api/v1/templates
GET /api/v1/templates?category=product_updates
GET /api/v1/templates?is_public=true&sort=usage_count&order=desc
GET /api/v1/templates?owner=me
GET /api/v1/templates?search=launch
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Query Parameters**
   - Validate pagination parameters
   - Validate sort and order values
   - Validate category is valid enum

3. **Build Database Query**
   - Start with base query: `SELECT * FROM templates WHERE status = 'active'`
   - Apply ownership filter:
     - `owner=me`: Only user's templates
     - `owner=all`: User's templates + public templates
     - Default: User's templates + public templates
   - Apply category filter (if provided)
   - Apply is_public filter (if provided)
   - Apply search filter (if provided):
     - Search in name, description
     - Use ILIKE for case-insensitive search

4. **Apply Sorting & Pagination**
   - Order by specified field and direction
   - Calculate offset: `(page - 1) * limit`
   - Apply LIMIT and OFFSET

5. **Execute Query**
   - Fetch templates
   - Count total matching records

6. **Format Response**
   - Transform database records to API format
   - Include owner information for public templates
   - Exclude sensitive data from other users' templates

7. **Return Response**
   - Return paginated list with metadata

---

## Response

**Success (200 OK):**
```json
{
  "data": [
    {
      "id": "template-uuid-1",
      "name": "Product Launch Template",
      "description": "Template for announcing new product features and launches",
      "category": "product_updates",
      "is_public": false,
      "status": "active",
      "usage_count": 15,
      "created_at": "2025-11-20T10:00:00Z",
      "updated_at": "2025-11-25T14:00:00Z",
      "last_used_at": "2025-11-25T14:00:00Z",
      "owner": {
        "id": "user-uuid",
        "name": "John Doe",
        "is_me": true
      },
      "variables_count": 5
    },
    {
      "id": "template-uuid-2",
      "name": "Weekly Newsletter Template",
      "description": "Template for weekly newsletter posts with key updates",
      "category": "company_news",
      "is_public": true,
      "status": "active",
      "usage_count": 142,
      "created_at": "2025-10-15T08:00:00Z",
      "updated_at": "2025-11-20T12:00:00Z",
      "last_used_at": "2025-11-24T16:30:00Z",
      "owner": {
        "id": "other-user-uuid",
        "name": "Sarah Smith",
        "is_me": false
      },
      "variables_count": 4
    },
    {
      "id": "template-uuid-3",
      "name": "Social Media Tips Template",
      "description": "Share quick tips and best practices",
      "category": "educational",
      "is_public": true,
      "status": "active",
      "usage_count": 87,
      "created_at": "2025-09-01T14:00:00Z",
      "updated_at": "2025-11-15T10:00:00Z",
      "last_used_at": "2025-11-23T09:15:00Z",
      "owner": {
        "id": "another-user-uuid",
        "name": "Mike Johnson",
        "is_me": false
      },
      "variables_count": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "filters": {
    "owner": "all",
    "sort": "created_at",
    "order": "desc"
  }
}
```

**Empty Result (200 OK):**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 0,
    "has_next": false,
    "has_prev": false
  },
  "filters": {}
}
```

---

## Filter Examples

**My templates only:**
```
GET /api/v1/templates?owner=me
```

**Public templates by popularity:**
```
GET /api/v1/templates?is_public=true&sort=usage_count&order=desc
```

**Product update templates:**
```
GET /api/v1/templates?category=product_updates
```

**Search for "launch" templates:**
```
GET /api/v1/templates?search=launch
```

**My marketing templates:**
```
GET /api/v1/templates?owner=me&category=marketing
```

---

## Authorization

**Visibility Rules:**

**1. Private Templates (`is_public: false`):**
- Only visible to owner
- Excluded from results for other users

**2. Public Templates (`is_public: true`):**
- Visible to all authenticated users
- Owner information included
- Full template details visible to all

**3. Detailed View:**
- GET `/api/v1/templates/:id` shows full template including variables and prompt
- Private templates: Only owner can view details
- Public templates: Anyone can view details

---

## Performance Optimization

**Database Indexes:**
- Index on `owner_principal_id`
- Index on `is_public`
- Index on `category`
- Index on `usage_count`
- Index on `created_at`
- Full-text index on `name` and `description` for search

**Caching:**
- Cache public templates list (5 minutes)
- Cache key: `templates:public:{filters_hash}:{page}`
- Invalidate on template creation/update/deletion

---

## Template Categories

Available categories for filtering:
- `product_updates`
- `marketing`
- `company_news`
- `engagement`
- `educational`
- `seasonal`
- `custom`

---

## Sorting Options

**By Creation Date:**
```
GET /api/v1/templates?sort=created_at&order=desc
```

**By Popularity:**
```
GET /api/v1/templates?sort=usage_count&order=desc
```

**Alphabetically:**
```
GET /api/v1/templates?sort=name&order=asc
```

**Recently Used:**
```
GET /api/v1/templates?sort=last_used_at&order=desc
```

---

## Response Fields

**Basic Information:**
- `id`: Template UUID
- `name`: Template name
- `description`: Template description
- `category`: Template category

**Visibility:**
- `is_public`: Public or private
- `status`: Active, archived, deleted

**Usage Metrics:**
- `usage_count`: Total times used
- `last_used_at`: Last usage timestamp

**Timestamps:**
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

**Owner:**
- `owner.id`: Owner UUID
- `owner.name`: Owner display name
- `owner.is_me`: Boolean indicating if current user is owner

**Metadata:**
- `variables_count`: Number of template variables

---

## Future Enhancements

**Template Marketplace:**
- Featured templates
- User ratings and reviews
- Template downloads/clones count
- Monetization (paid templates)

**Template Collections:**
- Group related templates
- Industry-specific template packs
- Branded template sets

**Template Analytics:**
- Success rate (posts created vs published)
- Average engagement for posts created with template
- User satisfaction ratings
