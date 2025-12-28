# Luxaris Seeds System

Autonomous database seeding system independent from db-migrate migrations. Provides idempotent, trackable database seeding with precise rollback capabilities.

## Architecture

```
seeds/
├── seed.js                      # CLI entry point
├── seed-runner.js               # Core execution engine
├── init-seeds-table.js          # Autonomous table initialization
└── seeders/                     # Seed files
    └── YYYYMMDDHHMMSS-description.js
```

## Core Principles

### 1. Autonomous & Independent
- **Self-contained**: No dependency on db-migrate migrations
- **Auto-initializing**: Creates `public.seeds` tracking table automatically
- **Separate lifecycle**: Seeds can run/rollback independently of migrations

### 2. Idempotent by Default
- Checks execution history before running
- Skips already-executed seeds automatically
- Safe to run multiple times without duplication

### 3. Force Mode
- Override idempotency for specific seeds only
- `--force` flag passed to seed's `up(db_pool, force)` function
- Seed decides how to handle force mode
- Entity-specific force commands prevent accidents

### 4. Precise Rollback
- **One-step rollback**: `npm run seed:rollback` removes latest execution
- **ID range tracking**: Stores `new_records_id_from` and `new_records_id_to`
- **Metadata-driven**: Uses execution metadata for precise deletion
- Removes only data created by that specific execution

### 5. Multiple Executions
- Same seed can be executed multiple times (no UNIQUE constraint)
- Each execution tracked separately with own metadata
- Rollback targets latest execution only

## Database Schema

### Seeds Tracking Table

```sql
CREATE TABLE public.seeds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_seeds_executed_at ON public.seeds(executed_at);
CREATE INDEX idx_seeds_name ON public.seeds(name);
CREATE INDEX idx_seeds_metadata ON public.seeds USING gin (metadata);
```

**Key Features:**
- No UNIQUE constraint on `name` (allows multiple executions)
- `metadata` stores both seed-specific data AND execution metadata
- Auto-created via `init_seeds_table()` (not migration)

### Metadata Structure

```javascript
metadata: {
    // Seed-specific metadata
    total_posts: 50000,
    existing: 0,
    created: 50000,
    
    // Execution metadata (for rollback)
    affected_db_table: 'posts',
    new_records_id_from: 100001,
    new_records_id_to: 150000
}
```

## Usage

### List Seeds

```bash
npm run seed:list
```

Shows:
1. **Executed seeds**: Table with execution history
2. **Available seeds**: Files in seeders/ directory
3. **Example CLI commands**: How to run specific seeds

### Run All Seeds (Idempotent)

```bash
npm run seed
```

- Runs all seeds in `seeders/` directory
- Skips already-executed seeds
- Executes in alphabetical order

### Run Specific Seed

```bash
npm run seed -- --name=posts
```

Uses partial name matching to find and execute seed.

### Force Re-run Specific Seed

```bash
npm run seed:force:posts
```

- Bypasses tracking check (seed-runner level)
- Passes `force=true` to seed's `up()` function
- Seed decides whether to skip idempotency checks
- Creates new execution record

**Important**: No global force mode - only entity-specific commands to prevent accidents.

### Rollback Latest Execution

```bash
npm run seed:rollback
```

- Automatically finds latest execution from `public.seeds`
- Calls seed's `down()` function with execution metadata
- Deletes data using ID ranges
- Removes execution record from tracking table

**One-step rollback**: Removes only the most recent execution.

### Rollback Specific Seed (Latest)

```bash
npm run seed:rollback -- --name=posts
```

Rolls back the latest execution of a specific seed.

### Reset Seeds Table

```bash
npm run seed:reset
```

**⚠️ Warning**: Drops `public.seeds` table and all execution history, then recreates it empty.

## Creating Seeds

### File Naming Convention

Format: `YYYYMMDDHHMMSS-description.js`

Example: `20251228000001-seed-posts-50k.js`

### Seed File Structure

```javascript
/**
 * Seed: Description of what this seed does
 */

const BATCH_SIZE = 1000;
const SCHEMA = process.env.DB_SCHEMA || 'luxaris';

/**
 * Seed execution (UP)
 * @param {object} db_pool - PostgreSQL connection pool
 * @param {boolean} force - Whether to skip idempotency checks
 */
exports.up = async function(db_pool, force = false) {
    const client = await db_pool.connect();
    
    try {
        // Track ID range for precise rollback
        let first_inserted_id = null;
        let last_inserted_id = null;
        
        // Idempotency check (skip if forced)
        if (!force) {
            const existing = await client.query(`
                SELECT COUNT(*) as count FROM ${SCHEMA}.your_table 
                WHERE metadata->>'seed_marker' = 'unique-identifier'
            `);
            
            if (parseInt(existing.rows[0].count) > 0) {
                console.log('[Seed] Data already exists. Skipping...');
                return {
                    records_created: 0,
                    metadata: { message: 'Already seeded' }
                };
            }
        } else {
            console.log('[Seed] Force mode - creating data...');
        }
        
        // Insert data in batches
        for (let i = 0; i < TOTAL_RECORDS; i += BATCH_SIZE) {
            const result = await client.query(`
                INSERT INTO ${SCHEMA}.your_table (col1, col2, metadata)
                VALUES ...
                RETURNING id
            `);
            
            // Track ID range
            const batch_ids = result.rows.map(r => r.id);
            if (first_inserted_id === null) {
                first_inserted_id = Math.min(...batch_ids);
            }
            last_inserted_id = Math.max(...batch_ids, last_inserted_id || 0);
        }
        
        console.log(`[Seed] ID range: ${first_inserted_id} to ${last_inserted_id}`);
        
        return {
            records_created: TOTAL_RECORDS,
            metadata: { 
                seed_marker: 'unique-identifier',
                total_records: TOTAL_RECORDS
            },
            execution_metadata: {
                affected_db_table: 'your_table',
                new_records_id_from: first_inserted_id,
                new_records_id_to: last_inserted_id
            }
        };
    } finally {
        client.release();
    }
};

/**
 * Seed rollback (DOWN)
 * @param {object} db_pool - PostgreSQL connection pool
 * @param {Array} execution_records - Array of execution records with metadata
 */
exports.down = async function(db_pool, execution_records = []) {
    const client = await db_pool.connect();
    
    try {
        console.log('[Seed] Rolling back...');
        
        // Precision rollback using ID ranges
        const id_ranges = execution_records
            .map(r => r.execution_metadata)
            .filter(m => m?.new_records_id_from && m?.new_records_id_to);
        
        if (id_ranges.length > 0) {
            console.log('[Seed] Using execution metadata for precise rollback...');
            
            const conditions = id_ranges.map((_, idx) => 
                `(id BETWEEN $${idx * 2 + 1} AND $${idx * 2 + 2})`
            ).join(' OR ');
            
            const params = id_ranges.flatMap(range => [
                range.new_records_id_from, 
                range.new_records_id_to
            ]);
            
            const result = await client.query(`
                DELETE FROM ${SCHEMA}.your_table
                WHERE ${conditions}
                RETURNING id
            `, params);
            
            console.log(`[Seed] Deleted by ID ranges: ${id_ranges.map(r => `${r.new_records_id_from}-${r.new_records_id_to}`).join(', ')}`);
            
            return {
                records_deleted: result.rowCount,
                metadata: { deletion_method: 'id_ranges' }
            };
        }
        
        // Fallback: metadata marker
        console.log('[Seed] Using metadata marker fallback...');
        const result = await client.query(`
            DELETE FROM ${SCHEMA}.your_table
            WHERE metadata->>'seed_marker' = 'unique-identifier'
            RETURNING id
        `);
        
        return {
            records_deleted: result.rowCount,
            metadata: { deletion_method: 'metadata_marker' }
        };
    } finally {
        client.release();
    }
};
```

## Best Practices

### 1. Idempotency Patterns

**Metadata Markers**:
```javascript
metadata: {
    source: 'seed',
    batch: 'unique-identifier',
    index: 123
}
```

**Record Count Check**:
```javascript
const count = await client.query('SELECT COUNT(*) FROM table WHERE ...');
if (parseInt(count.rows[0].count) >= EXPECTED) {
    return { records_created: 0, metadata: { message: 'Already seeded' } };
}
```

### 2. ID Range Tracking

**Capture IDs**:
```javascript
let first_inserted_id = null;
let last_inserted_id = null;

const result = await client.query(`INSERT ... RETURNING id`);
const batch_ids = result.rows.map(r => r.id);

if (first_inserted_id === null) {
    first_inserted_id = Math.min(...batch_ids);
}
last_inserted_id = Math.max(...batch_ids, last_inserted_id || 0);
```

**Return in execution_metadata**:
```javascript
return {
    records_created: count,
    metadata: { /* seed-specific */ },
    execution_metadata: {
        affected_db_table: 'table_name',
        new_records_id_from: first_inserted_id,
        new_records_id_to: last_inserted_id
    }
};
```

### 3. Batch Processing

```javascript
const BATCH_SIZE = 1000; // Insert 1000 records per transaction

for (let batch = 0; batch < total_batches; batch++) {
    const batch_data = []; // Build batch array
    
    // Use UNNEST for efficient batch inserts
    const result = await client.query(`
        INSERT INTO table (col1, col2)
        SELECT * FROM UNNEST($1::text[], $2::int[])
        RETURNING id
    `, [col1_values, col2_values]);
    
    console.log(`Batch ${batch + 1}/${total_batches} inserted`);
}
```

### 4. Force Mode Handling

```javascript
exports.up = async function(db_pool, force = false) {
    if (!force) {
        // Check if already seeded
        if (alreadyExists) {
            return { records_created: 0, ... };
        }
    } else {
        console.log('[Seed] Force mode - creating duplicate data...');
        // Proceed without checks
    }
}
```

### 5. Rollback Safety

**Always prefer ID ranges**:
```javascript
// ✅ Precise - deletes only seed-created records
DELETE FROM table WHERE id BETWEEN 100001 AND 150000

// ⚠️ Less precise - might delete other matching records
DELETE FROM table WHERE metadata->>'seed_marker' = 'value'
```

**Support multiple executions**:
```javascript
const id_ranges = execution_records.map(r => r.execution_metadata);
// Build OR conditions for each range
```

## Examples

### Example 1: Posts Seed (50k records)

**File**: `seeders/20251228000001-seed-posts-50k.js`

**Features**:
- Batch inserts (1000 posts per batch)
- Random mock data generation
- Idempotency via metadata marker
- Force mode support
- ID range tracking for precise rollback
- Multiple execution support

**Usage**:
```bash
# First run - creates 50k posts
npm run seed

# Force run - creates another 50k posts (100k total)
npm run seed:force:posts

# Rollback - removes latest 50k posts (back to 50k)
npm run seed:rollback

# Rollback again - removes remaining 50k posts (back to 0)
npm run seed:rollback
```

### Example 2: Creating New Seed

```bash
# Create new seed file
touch seeds/seeders/20251228120000-seed-channels.js

# Edit file with up/down functions
# (see structure above)

# Run the seed
npm run seed -- --name=channels

# Or run all seeds
npm run seed
```

## VS Code Integration

Launch configurations available (F5 or Debug panel):

- **Luxaris - API - Seed Database**: Run all seeds (idempotent)
- **Luxaris - API - Seed Posts (Force)**: Force re-run posts seed
- **Luxaris - API - Seed List**: List all seeds
- **Luxaris - API - Seed Rollback**: Rollback latest execution
- **Luxaris - API - Seed Reset**: Reset seeds table

## Environment Variables

Required in `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=luxaris
DB_USER=postgres
DB_PASSWORD=your_password
DB_SCHEMA=luxaris
```

## CLI Reference

### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `seed` | Run all seeds (idempotent) | `npm run seed` |
| `seed -- --name=X` | Run specific seed | `npm run seed -- --name=posts` |
| `seed:force:posts` | Force re-run posts seed | `npm run seed:force:posts` |
| `seed:list` | List executed & available seeds | `npm run seed:list` |
| `seed:rollback` | Rollback latest execution | `npm run seed:rollback` |
| `seed:rollback -- --name=X` | Rollback latest of specific seed | `npm run seed:rollback -- --name=posts` |
| `seed:reset` | Reset seeds table | `npm run seed:reset` |

### Flags

| Flag | Description | Used With |
|------|-------------|-----------|
| `--name=XXXX` | Partial seed name | `seed`, `rollback` |
| `--force` | Skip idempotency check | Entity-specific scripts only |

## Execution Flow

### Seed Execution Flow

```
1. npm run seed
   ↓
2. seed.js parses arguments
   ↓
3. SeedRunner initializes (creates Pool)
   ↓
4. _ensure_seeds_table() → init_seeds_table()
   ↓
5. _get_seed_files() → reads seeders/
   ↓
6. For each seed:
   ├─ _is_seed_executed() → checks public.seeds
   ├─ Skip if already executed (unless force)
   ├─ _execute_seed()
   │  ├─ Load seed module
   │  ├─ Call up(db_pool, force)
   │  ├─ Seed returns stats + execution_metadata
   │  └─ _record_seed_execution()
   │     └─ INSERT INTO public.seeds (merges metadata)
   └─ Log results
   ↓
7. Close database pool
```

### Rollback Flow

```
1. npm run seed:rollback
   ↓
2. seed.js calls rollback(seed_name)
   ↓
3. SeedRunner.rollback():
   ├─ Query: SELECT * FROM seeds ORDER BY executed_at DESC LIMIT 1
   ├─ Get latest execution record
   ├─ Find seed file by name
   ├─ Load seed module
   ├─ Call down(db_pool, execution_records)
   │  └─ Seed deletes using ID ranges from metadata
   ├─ DELETE FROM public.seeds WHERE id = X
   └─ Log results
   ↓
4. Close database pool
```

## Troubleshooting

### Seeds table not found

**Solution**: Table is auto-created on first run. Just run any seed command:
```bash
npm run seed:list
```

### "Already executed" when using force

**Issue**: Seed's `up()` function has its own idempotency check.

**Solution**: Seed needs to check `force` parameter:
```javascript
exports.up = async function(db_pool, force = false) {
    if (!force) {
        // Check if exists
        if (exists) return { records_created: 0 };
    }
    // Proceed with creation
}
```

### Rollback deletes wrong data

**Issue**: Not using ID ranges, relying on metadata markers.

**Solution**: Always return `execution_metadata` with ID ranges:
```javascript
return {
    records_created: count,
    execution_metadata: {
        affected_db_table: 'table',
        new_records_id_from: firstId,
        new_records_id_to: lastId
    }
};
```

### Multiple executions show as one

**Issue**: Checking wrong table column.

**Check**: Query `public.seeds` - each execution should be a separate row:
```sql
SELECT * FROM public.seeds ORDER BY executed_at DESC;
```

## Differences from Migrations

| Feature | Migrations | Seeds |
|---------|-----------|-------|
| **Purpose** | Schema changes | Test/demo data |
| **Tracking** | `migrations` table | `public.seeds` table |
| **Tool** | db-migrate | Custom seed-runner |
| **Lifecycle** | Linear versioning | Multiple executions |
| **Idempotency** | Version-based | Execution-based |
| **Re-run** | Not designed for | Force mode supported |
| **Rollback** | Schema rollback | Data deletion |
| **Independence** | Sequential | Autonomous |

## Contributing

When adding new seeds:

1. **Follow naming convention**: `YYYYMMDDHHMMSS-description.js`
2. **Implement both functions**: `up()` and `down()`
3. **Track ID ranges**: Return execution_metadata
4. **Handle force mode**: Accept `force` parameter in `up()`
5. **Test idempotency**: Run twice, should skip second time
6. **Test rollback**: Should delete only seed-created records
7. **Test force mode**: Should create duplicates when forced
8. **Update README**: Document new patterns if applicable

## License

Part of Luxaris API - see main project LICENSE.
