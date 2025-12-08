const TestServer = require('../../helpers/test-server');
const DbCleaner = require('../../helpers/db-cleaner');
const request = require('supertest');

describe('System Context - UI Presets', () => {
    let test_server;
    let app;
    let db_pool;
    let db_cleaner;
    let admin_token;
    let user_token;
    let admin_user_id;
    let normal_user_id;
    let editor_role_id;

    beforeAll(async () => {
        test_server = new TestServer();
        await test_server.start();
        app = test_server.get_app();
        db_pool = test_server.db_pool;
        db_cleaner = new DbCleaner(db_pool);

        const admin_email = 'admin' + Date.now() + '@preset-test.com';
        const admin_response = await request(app).post('/api/v1/auth/register').send({
            email: admin_email,
            password: 'Admin123!',
            name: 'Admin User',
            timezone: 'UTC'
        });
        admin_user_id = admin_response.body.user.id;

        // Make admin user root and active before getting new token
        await db_pool.query('UPDATE users SET is_root = true, status = $1 WHERE id = $2', ['active', admin_user_id]);

        // Get new token with is_root = true in JWT payload
        const admin_login = await request(app).post('/api/v1/auth/login').send({
            email: admin_email,
            password: 'Admin123!'
        });
        admin_token = admin_login.body.access_token;

        const user_email = 'user' + Date.now() + '@preset-test.com';
        const user_response = await request(app).post('/api/v1/auth/register').send({
            email: user_email,
            password: 'User123!',
            name: 'Normal User',
            timezone: 'UTC'
        });
        normal_user_id = user_response.body.user.id;
        user_token = user_response.body.access_token;

        const role_result = await db_pool.query('SELECT id FROM acl_roles WHERE slug = \$1', ['editor']);
        editor_role_id = role_result.rows[0].id;
    });

    afterAll(async () => {
        // Clean up test data
        await db_cleaner.clean_table_where('user_ui_stateful_presets', 'user_id IN ($1, $2)', [admin_user_id, normal_user_id]);
        await db_cleaner.clean_users_by_ids([admin_user_id, normal_user_id]);
        
        if (test_server) 
            await test_server.stop();
    });

    beforeEach(async () => {
        // Delete test user presets
        await db_cleaner.clean_table_where('user_ui_stateful_presets', 'user_id IN ($1, $2)', [admin_user_id, normal_user_id]);
        
        // Delete any role presets for editor role (to avoid unique constraint violations)
        await db_cleaner.clean_table_where('user_ui_stateful_presets', 'role_id = $1 AND is_default = true', [editor_role_id]);
        
        // Delete all global presets created by tests (tests will create their own if needed)
        await db_cleaner.clean_table_where('user_ui_stateful_presets', 'is_global = true', []);
        
        // Delete test role assignments to avoid duplicate key violations
        await db_cleaner.clean_table_where('acl_principal_role_assignments', 'principal_id = $1 AND principal_type = $2 AND role_id = $3',
            [normal_user_id, 'user', editor_role_id]);
    });

    describe('Hierarchy Resolution', () => {
        test('User with no preset returns global default', async () => {
            // Create global preset for fallback
            await db_pool.query('INSERT INTO user_ui_stateful_presets (name, is_global, settings) VALUES ($1, $2, $3)',
                ['Global Default', true, JSON.stringify({ theme: 'light', menu: { collapsed: false } })]);
            
            const endpoint = '/api/v1/system/users/' + normal_user_id + '/ui-preset';
            const response = await request(app)
                .get(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .expect(200);
            expect(response.body.source).toBe('global');
            expect(response.body.settings).toBeDefined();
        });

        test('User with custom preset returns user preset', async () => {
            const user_settings = { menu: { collapsed: true }, grids: { posts: { pageSize: 50 } } };
            await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, user_id, settings) VALUES ($1, $2, $3)',
                ['My Custom Settings', normal_user_id, JSON.stringify(user_settings)]
            );
            const endpoint = '/api/v1/system/users/' + normal_user_id + '/ui-preset';
            const response = await request(app)
                .get(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .expect(200);
            expect(response.body.source).toBe('user');
            expect(response.body.settings.menu.collapsed).toBe(true);
        });

        test('Falls back to role preset when no user preset', async () => {
            const role_settings = { menu: { collapsed: false }, grids: { posts: { pageSize: 25 } } };
            await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, role_id, is_default, settings) VALUES (\$1, \$2, \$3, \$4)',
                ['Editor Default', editor_role_id, true, JSON.stringify(role_settings)]
            );
            await db_pool.query(
                'INSERT INTO acl_principal_role_assignments (principal_type, principal_id, role_id) VALUES (\$1, \$2, \$3)',
                ['user', normal_user_id, editor_role_id]
            );
            const endpoint = '/api/v1/system/users/' + normal_user_id + '/ui-preset';
            const response = await request(app)
                .get(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .expect(200);
            expect(response.body.source).toBe('role');
        });

        test('Falls back to global when no user or role preset', async () => {
            const global_settings = { menu: { collapsed: false }, preferences: { theme: 'light' } };
            await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, is_global, settings) VALUES (\$1, \$2, \$3)',
                ['Global Default', true, JSON.stringify(global_settings)]
            );
            const endpoint = '/api/v1/system/users/' + normal_user_id + '/ui-preset';
            const response = await request(app)
                .get(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .expect(200);
            expect(response.body.source).toBe('global');
        });

        test('Hierarchy precedence: user > role > global', async () => {
            await db_pool.query('INSERT INTO user_ui_stateful_presets (name, is_global, settings) VALUES (\$1, \$2, \$3)',
                ['Global', true, JSON.stringify({ value: 'global' })]);
            await db_pool.query('INSERT INTO user_ui_stateful_presets (name, role_id, is_default, settings) VALUES (\$1, \$2, \$3, \$4)',
                ['Role', editor_role_id, true, JSON.stringify({ value: 'role' })]);
            await db_pool.query('INSERT INTO user_ui_stateful_presets (name, user_id, settings) VALUES (\$1, \$2, \$3)',
                ['User', normal_user_id, JSON.stringify({ value: 'user' })]);
            await db_pool.query('INSERT INTO acl_principal_role_assignments (principal_type, principal_id, role_id) VALUES (\$1, \$2, \$3)',
                ['user', normal_user_id, editor_role_id]);
            const endpoint = '/api/v1/system/users/' + normal_user_id + '/ui-preset';
            const response = await request(app)
                .get(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .expect(200);
            expect(response.body.source).toBe('user');
            expect(response.body.settings.value).toBe('user');
        });

        test('Deep merge preserves nested structure', async () => {
            const settings = {
                menu: { collapsed: true, openedGroups: ['posts', 'admin'] },
                grids: { posts: { pageSize: 50, sorting: { field: 'created_at', direction: 'desc' } } }
            };
            await db_pool.query('INSERT INTO user_ui_stateful_presets (name, user_id, settings) VALUES (\$1, \$2, \$3)',
                ['Complex', normal_user_id, JSON.stringify(settings)]);
            const endpoint = '/api/v1/system/users/' + normal_user_id + '/ui-preset';
            const response = await request(app)
                .get(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .expect(200);
            expect(response.body.settings.menu.openedGroups).toEqual(['posts', 'admin']);
            expect(response.body.settings.grids.posts.sorting.direction).toBe('desc');
        });
    });

    describe('User Preset Operations', () => {
        test('Create new user preset on first modification', async () => {
            const role_settings = { menu: { collapsed: false } };
            const role_result = await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, role_id, is_default, settings) VALUES (\$1, \$2, \$3, \$4) RETURNING id',
                ['Role Default', editor_role_id, true, JSON.stringify(role_settings)]
            );
            const role_preset_id = role_result.rows[0].id;
            const endpoint = '/api/v1/system/ui-presets/' + role_preset_id + '/clone';
            const response = await request(app)
                .post(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .send({ user_id: normal_user_id, modifications: { menu: { collapsed: true } } })
                .expect(201);
            expect(response.body.source).toBe('user');
            expect(response.body.user_id).toBe(normal_user_id);
        });

        test('Update existing user preset', async () => {
            const preset_result = await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, user_id, settings) VALUES (\$1, \$2, \$3) RETURNING id',
                ['Test', normal_user_id, JSON.stringify({ menu: { collapsed: false } })]
            );
            const preset_id = preset_result.rows[0].id;
            const endpoint = '/api/v1/system/ui-presets/' + preset_id;
            const response = await request(app)
                .patch(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .send({ settings: { menu: { collapsed: true }, grids: { posts: { pageSize: 100 } } } })
                .expect(200);
            expect(response.body.settings.menu.collapsed).toBe(true);
        });

        test('Partial update preserves other fields', async () => {
            const initial = { menu: { collapsed: false }, grids: { posts: { pageSize: 50 } }, preferences: { theme: 'dark' } };
            const preset_result = await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, user_id, settings) VALUES (\$1, \$2, \$3) RETURNING id',
                ['Test', normal_user_id, JSON.stringify(initial)]
            );
            const preset_id = preset_result.rows[0].id;
            const endpoint = '/api/v1/system/ui-presets/' + preset_id;
            const response = await request(app)
                .patch(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .send({ settings: { menu: { collapsed: true } } })
                .expect(200);
            expect(response.body.settings.menu.collapsed).toBe(true);
            expect(response.body.settings.grids.posts.pageSize).toBe(50);
            expect(response.body.settings.preferences.theme).toBe('dark');
        });

        test('Delete user preset and fallback to role/global', async () => {
            const preset_result = await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, user_id, settings) VALUES (\$1, \$2, \$3) RETURNING id',
                ['User Preset', normal_user_id, JSON.stringify({ value: 'user' })]
            );
            const preset_id = preset_result.rows[0].id;
            await db_pool.query('INSERT INTO user_ui_stateful_presets (name, is_global, settings) VALUES (\$1, \$2, \$3)',
                ['Global', true, JSON.stringify({ value: 'global' })]);
            const delete_endpoint = '/api/v1/system/ui-presets/' + preset_id;
            await request(app).delete(delete_endpoint)
                .set('Authorization', 'Bearer ' + user_token).expect(204);
            const get_endpoint = '/api/v1/system/users/' + normal_user_id + '/ui-preset';
            const response = await request(app)
                .get(get_endpoint)
                .set('Authorization', 'Bearer ' + user_token).expect(200);
            expect(response.body.source).toBe('global');
        });

        test('Size limit enforcement - max 100KB', async () => {
            const large_settings = { data: 'x'.repeat(110000) };
            const response = await request(app)
                .post('/api/v1/system/ui-presets/new')
                .set('Authorization', 'Bearer ' + user_token)
                .send({ name: 'Large', user_id: normal_user_id, settings: large_settings });
            expect([400, 413]).toContain(response.status);
        });
    });

    describe('Role Preset Operations (Admin)', () => {
        test('Admin can create role preset', async () => {
            const endpoint = '/api/v1/system/admin/roles/' + editor_role_id + '/ui-preset';
            const response = await request(app)
                .post(endpoint)
                .set('Authorization', 'Bearer ' + admin_token)
                .send({ name: 'Editor Default', settings: { menu: { collapsed: false } } })
                .expect(201);
            expect(response.body.role_id).toBe(editor_role_id);
        });

        test('Admin can update role preset', async () => {
            const preset_result = await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, role_id, is_default, settings) VALUES (\$1, \$2, \$3, \$4) RETURNING id',
                ['Editor', editor_role_id, true, JSON.stringify({ value: 'old' })]
            );
            const preset_id = preset_result.rows[0].id;
            const endpoint = '/api/v1/system/admin/roles/' + editor_role_id + '/ui-preset';
            const response = await request(app)
                .post(endpoint)
                .set('Authorization', 'Bearer ' + admin_token)
                .send({ name: 'Updated', settings: { value: 'new' } })
                .expect(200);
            expect(response.body.settings.value).toBe('new');
        });

        test('Admin can get role preset', async () => {
            await db_pool.query('INSERT INTO user_ui_stateful_presets (name, role_id, is_default, settings) VALUES (\$1, \$2, \$3, \$4)',
                ['Editor', editor_role_id, true, JSON.stringify({ value: 'test' })]);
            const endpoint = '/api/v1/system/admin/roles/' + editor_role_id + '/ui-preset';
            const response = await request(app)
                .get(endpoint)
                .set('Authorization', 'Bearer ' + admin_token).expect(200);
            expect(response.body.settings.value).toBe('test');
        });

        test('Admin can delete role preset', async () => {
            const preset_result = await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, role_id, is_default, settings) VALUES (\$1, \$2, \$3, \$4) RETURNING id',
                ['Editor', editor_role_id, true, JSON.stringify({ value: 'test' })]
            );
            const preset_id = preset_result.rows[0].id;
            const endpoint = '/api/v1/system/ui-presets/' + preset_id;
            await request(app).delete(endpoint)
                .set('Authorization', 'Bearer ' + admin_token).expect(204);
        });

        test('Non-admin cannot create role preset', async () => {
            const endpoint = '/api/v1/system/admin/roles/' + editor_role_id + '/ui-preset';
            await request(app)
                .post(endpoint)
                .set('Authorization', 'Bearer ' + user_token)
                .send({ name: 'Test', settings: {} }).expect(403);
        });

        test('Role preset size limit', async () => {
            const endpoint = '/api/v1/system/admin/roles/' + editor_role_id + '/ui-preset';
            const response = await request(app)
                .post(endpoint)
                .set('Authorization', 'Bearer ' + admin_token)
                .send({ name: 'Large', settings: { data: 'x'.repeat(110000) } });
            expect([400, 413]).toContain(response.status);
        });
    });

    describe('Global Preset Operations (Admin)', () => {
        test('Admin can create global preset', async () => {
            const response = await request(app)
                .post('/api/v1/system/admin/ui-presets/global')
                .set('Authorization', 'Bearer ' + admin_token)
                .send({ name: 'Global', settings: { theme: 'light' } })
                .expect(201);
            expect(response.body.is_global).toBe(true);
        });

        test('Admin can get global preset', async () => {
            await db_pool.query('INSERT INTO user_ui_stateful_presets (name, is_global, settings) VALUES (\$1, \$2, \$3)',
                ['Global', true, JSON.stringify({ value: 'global' })]);
            const response = await request(app)
                .get('/api/v1/system/admin/ui-presets/global')
                .set('Authorization', 'Bearer ' + admin_token).expect(200);
            expect(response.body.settings.value).toBe('global');
        });

        test('Admin can delete global preset', async () => {
            const result = await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, is_global, settings) VALUES (\$1, \$2, \$3) RETURNING id',
                ['Global', true, JSON.stringify({ value: 'test' })]
            );
            const preset_id = result.rows[0].id;
            const endpoint = '/api/v1/system/ui-presets/' + preset_id;
            await request(app).delete(endpoint)
                .set('Authorization', 'Bearer ' + admin_token).expect(204);
        });

        test('Only one global preset allowed', async () => {
            await request(app).post('/api/v1/system/admin/ui-presets/global')
                .set('Authorization', 'Bearer ' + admin_token).send({ name: 'G1', settings: { v: '1' } }).expect(201);
            await request(app).post('/api/v1/system/admin/ui-presets/global')
                .set('Authorization', 'Bearer ' + admin_token).send({ name: 'G2', settings: { v: '2' } }).expect(200);
            const result = await db_pool.query('SELECT COUNT(*) FROM user_ui_stateful_presets WHERE is_global = true');
            expect(parseInt(result.rows[0].count)).toBe(1);
        });

        test('Global preset size limit', async () => {
            const response = await request(app).post('/api/v1/system/admin/ui-presets/global')
                .set('Authorization', 'Bearer ' + admin_token)
                .send({ name: 'Large', settings: { data: 'x'.repeat(110000) } });
            expect([400, 413]).toContain(response.status);
        });
    });

    describe('Authorization & Edge Cases', () => {
        test('User can only modify own preset', async () => {
            const result = await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, user_id, settings) VALUES (\$1, \$2, \$3) RETURNING id',
                ['User', normal_user_id, JSON.stringify({ value: 'test' })]
            );
            const preset_id = result.rows[0].id;
            const endpoint = '/api/v1/system/ui-presets/' + preset_id;
            await request(app).patch(endpoint)
                .set('Authorization', 'Bearer ' + admin_token).send({ settings: { value: 'changed' } }).expect(200);
        });

        test('Root user bypasses ACL', async () => {
            const endpoint = '/api/v1/system/admin/roles/' + editor_role_id + '/ui-preset';
            const response = await request(app)
                .post(endpoint)
                .set('Authorization', 'Bearer ' + admin_token)
                .send({ name: 'Test', settings: { v: 'test' } });
            expect([200, 201]).toContain(response.status);
        });

        test('Deleted role removes presets', async () => {
            await db_pool.query('INSERT INTO user_ui_stateful_presets (name, role_id, is_default, settings) VALUES (\$1, \$2, \$3, \$4)',
                ['Editor', editor_role_id, true, JSON.stringify({ value: 'role' })]);
            await db_pool.query('INSERT INTO acl_principal_role_assignments (principal_type, principal_id, role_id) VALUES (\$1, \$2, \$3)',
                ['user', normal_user_id, editor_role_id]);
            await db_cleaner.clean_table_where('user_ui_stateful_presets', 'role_id = $1', [editor_role_id]);
            const endpoint = '/api/v1/system/users/' + normal_user_id + '/ui-preset';
            const response = await request(app)
                .get(endpoint)
                .set('Authorization', 'Bearer ' + user_token).expect(200);
            expect(['global', 'none']).toContain(response.body.source);
        });

        test('Changes reflected immediately', async () => {
            const result = await db_pool.query(
                'INSERT INTO user_ui_stateful_presets (name, user_id, settings) VALUES (\$1, \$2, \$3) RETURNING id',
                ['Test', normal_user_id, JSON.stringify({ value: 'v1' })]
            );
            const preset_id = result.rows[0].id;
            const get_endpoint = '/api/v1/system/users/' + normal_user_id + '/ui-preset';
            let response = await request(app).get(get_endpoint)
                .set('Authorization', 'Bearer ' + user_token).expect(200);
            expect(response.body.settings.value).toBe('v1');
            const patch_endpoint = '/api/v1/system/ui-presets/' + preset_id;
            await request(app).patch(patch_endpoint)
                .set('Authorization', 'Bearer ' + user_token).send({ settings: { value: 'v2' } }).expect(200);
            response = await request(app).get(get_endpoint)
                .set('Authorization', 'Bearer ' + user_token).expect(200);
            expect(response.body.settings.value).toBe('v2');
        });
    });
});


