# Luxaris API - Test Design

Testing strategy for the Luxaris API following TDD principles with pragmatic focus on critical paths and interface validation.

---

## Testing Philosophy

**Pragmatic TDD Approach:**
- Write tests before implementation to drive design
- Prioritize **high coverage for crucial parts** over exhaustive unit testing
- Focus on **front controllers and interfaces** rather than internal implementation details
- Prefer **sanity tests for interface outcomes** over deep unit checks of all classes
- Test through the API (integration tests) rather than mocking everything

**Key Principle:** Test behavior and outcomes, not implementation details.

---

## Test Layers

### 1. API Integration Tests (Primary Focus)

**What to test:**
- REST API endpoints through HTTP
- Request validation and error responses
- Authentication and authorization checks
- Complete workflows (register → login → create post → schedule → publish)

**How to test:**
- Use `supertest` to make actual HTTP requests
- Assert responses match expected format and status codes
- Verify database state after operations (direct DB queries)
- Clean up test data after each test

**Example:**
```javascript
describe('POST /api/v1/posts', () => {
  it('creates post and stores in database', async () => {
    const response = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Test Post', status: 'draft' })
      .expect(201);
    
    // Verify via API
    expect(response.body.id).toBeDefined();
    
    // Verify in database
    const post = await db('posts').where({ id: response.body.id }).first();
    expect(post.title).toBe('Test Post');
  });
});
```

### 2. Domain Logic Tests (Secondary)

**What to test:**
- Business rules and validation logic
- Permission calculations
- Complex algorithms (schedule time calculations, rate limits)
- Pure functions in domain layer

**Keep it minimal:** Only test complex logic that's easy to break.

### 3. Database Tests

**Focus on:**
- Migrations run successfully
- Constraints are enforced (foreign keys, unique indexes)
- Queries return expected results
- Transaction rollbacks work correctly

---

## Test Structure

### Organized by Context

```
tests/
  integration/
    system/
      auth.test.js         # Register, login, logout, refresh
      users.test.js        # User management
      permissions.test.js  # ACL checks
    posts/
      posts.test.js        # CRUD operations
      variants.test.js     # Post variants
      schedules.test.js    # Scheduling
      publishing.test.js   # Publish workflow
      generation.test.js   # AI generation
    channels/
      connections.test.js  # OAuth flows
  unit/
    domain/
      schedule_validator.test.js
      permission_checker.test.js
  helpers/
    test_db.js            # DB setup/teardown
    test_auth.js          # Token generation helpers
    factories.js          # Test data factories
```

---

## Test Data Management

**Factories for consistent test data:**
```javascript
// factories.js
const createTestUser = async (overrides = {}) => {
  return await db('users').insert({
    email: `test-${uuid()}@example.com`,
    password_hash: await argon2.hash('TestPassword123!'),
    status: 'active',
    ...overrides
  }).returning('*');
};
```

**Cleanup after tests:**
```javascript
afterEach(async () => {
  await db('schedules').delete();
  await db('post_variants').delete();
  await db('posts').delete();
  await db('users').delete();
});
```

---

## Key Testing Patterns

**1. Test Complete Flows:**
- Not just individual endpoints, but entire user journeys
- Example: Register → Verify Email → Login → Create Post → Schedule → Verify in Queue

**2. Verify Database State:**
- Don't trust API responses alone
- Query database directly to confirm data persistence
- Check cascade deletes and updates work correctly

**3. Test Error Scenarios:**
- Invalid input validation
- Authentication failures (expired tokens, wrong passwords)
- Authorization failures (accessing other user's resources)
- Conflict scenarios (duplicate schedules, already published)
- Rate limiting enforcement

**4. Test External Dependencies:**
- Mock external APIs (social platforms, AI services)
- Test OAuth flows with fake providers
- Simulate failures (network errors, API downtime)

---

## Test Execution

**Commands:**
```bash
npm test                    # Run all tests
npm test -- auth.test.js    # Run specific file
npm test -- --coverage      # With coverage report
npm test -- --watch         # Watch mode
```

**CI/CD Integration:**
- Run tests on every commit
- Block merges if tests fail
- Generate coverage reports (target: >80% for API layer)

**Test Database:**
- Separate test database (e.g., `luxaris_test`)
- Reset schema before test suite
- Use transactions for test isolation (rollback after each test)

---

## Coverage Goals

- **API Integration Tests:** >80% coverage of endpoints
- **Domain Logic:** >90% coverage of complex business rules
- **Overall:** >75% code coverage, but quality over quantity
- **Focus:** All error scenarios covered, happy paths verified with database checks
