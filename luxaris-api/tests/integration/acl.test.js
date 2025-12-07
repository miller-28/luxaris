const TestServer = require('../helpers/test-server');
const request = require('supertest');
const { create_database_pool } = require('../../src/connections/database');
const { User } = require('../../src/contexts/system/domain/models/user');
const RoleRepository = require('../../src/contexts/system/infrastructure/persistence/role_repository');
const PermissionRepository = require('../../src/contexts/system/infrastructure/persistence/permission_repository');
const AclRepository = require('../../src/contexts/system/infrastructure/persistence/acl_repository');
const AclService = require('../../src/contexts/system/application/services/acl_service');

describe('ACL Integration Tests', () => {
    let test_server;
    let app;
    let db_pool;
    let role_repository;
    let permission_repository;
    let acl_repository;
    let acl_service;
    let root_user_token;
    let normal_user_token;
    let root_user_id;
    let normal_user_id;
    let owner_role;
    let editor_role;
    let viewer_role;

    beforeAll(async () => {
        // Initialize database pool
        db_pool = create_database_pool();

        // Start test server
        test_server = new TestServer();
        app = await test_server.start();

        role_repository = new RoleRepository(db_pool);
        permission_repository = new PermissionRepository(db_pool);
        acl_repository = new AclRepository(db_pool);
        acl_service = new AclService(db_pool);

        // Load default roles
        owner_role = await role_repository.find_by_slug('owner');
        editor_role = await role_repository.find_by_slug('editor');
        viewer_role = await role_repository.find_by_slug('viewer');
    });

    beforeEach(async () => {
        // Clean up test data
        await db_pool.query('DELETE FROM audit_logs');
        await db_pool.query('DELETE FROM request_logs');
        await db_pool.query('DELETE FROM system_events');
        await db_pool.query('DELETE FROM system_logs');
        await db_pool.query('DELETE FROM acl_principal_permission_grants WHERE principal_type = $1', ['user']);
        await db_pool.query('DELETE FROM acl_principal_role_assignments WHERE principal_type = $1', ['user']);
        await db_pool.query('DELETE FROM sessions');
        await db_pool.query('DELETE FROM users');

        // Create root user (first user)
        const root_response = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: 'root@test.com',
                password: 'RootPassword123!',
                name: 'Root User'
            });

        if (root_response.status !== 201) {
            console.error('Root registration failed:', root_response.body);
        }

        expect(root_response.status).toBe(201);
        root_user_token = root_response.body.access_token;
        root_user_id = root_response.body.user.id;

        // Create normal user
        const normal_response = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: 'normal@test.com',
                password: 'NormalPassword123!',
                name: 'Normal User'
            });

        expect(normal_response.status).toBe(201);

        // Approve normal user
        await db_pool.query(
            "UPDATE users SET status = 'active' WHERE id = $1",
            [normal_response.body.user.id]
        );

        // Login normal user
        const login_response = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'normal@test.com',
                password: 'NormalPassword123!'
            });

        expect(login_response.status).toBe(200);
        normal_user_token = login_response.body.access_token;
        normal_user_id = normal_response.body.user.id;
    });

    afterAll(async () => {
        await test_server.stop();
        await db_pool.end();
    });

    describe('Root User Permissions', () => {
        test('Root user should bypass all permission checks', async () => {
            const can_read_user = await acl_service.can(
                root_user_id,
                'user',
                'user',
                'read',
                { is_root: true }
            );
            expect(can_read_user).toBe(true);

            const can_delete_system_settings = await acl_service.can(
                root_user_id,
                'user',
                'system_settings',
                'delete',
                { is_root: true }
            );
            expect(can_delete_system_settings).toBe(true);

            const can_write_post = await acl_service.can(
                root_user_id,
                'user',
                'post',
                'write',
                { is_root: true }
            );
            expect(can_write_post).toBe(true);
        });

        test('Root user should have owner role assigned automatically', async () => {
            // Verify user is actually root
            const user_result = await db_pool.query('SELECT is_root FROM users WHERE id = $1', [root_user_id]);
            expect(user_result.rows[0]?.is_root).toBe(true);
			
            const roles = await acl_repository.get_principal_roles(root_user_id, 'user');
            expect(roles.length).toBeGreaterThan(0);
			
            const has_owner = roles.some(r => r.role.slug === 'owner');
            expect(has_owner).toBe(true);
        });
    });

    describe('Role Assignment', () => {
        test('Assign viewer role to normal user', async () => {
            const assigned = await acl_repository.assign_role(
                normal_user_id,
                'user',
                viewer_role.id
            );
            expect(assigned).toBe(true);

            const roles = await acl_repository.get_principal_roles(normal_user_id, 'user');
            expect(roles.length).toBe(1);
            expect(roles[0].role.slug).toBe('viewer');
        });

        test('Remove role from user', async () => {
            await acl_repository.assign_role(normal_user_id, 'user', viewer_role.id);
			
            const removed = await acl_repository.remove_role(
                normal_user_id,
                'user',
                viewer_role.id
            );
            expect(removed).toBe(true);

            const roles = await acl_repository.get_principal_roles(normal_user_id, 'user');
            expect(roles.length).toBe(0);
        });

        test('Assign multiple roles to user', async () => {
            await acl_repository.assign_role(normal_user_id, 'user', viewer_role.id);
            await acl_repository.assign_role(normal_user_id, 'user', editor_role.id);

            const roles = await acl_repository.get_principal_roles(normal_user_id, 'user');
            expect(roles.length).toBe(2);
			
            const role_slugs = roles.map(r => r.role.slug);
            expect(role_slugs).toContain('viewer');
            expect(role_slugs).toContain('editor');
        });
    });

    describe('Permission Checking', () => {
        test('User with viewer role can read but not write', async () => {
            await acl_repository.assign_role(normal_user_id, 'user', viewer_role.id);

            const can_read = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'read'
            );
            expect(can_read).toBe(true);

            const can_update = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'update'
            );
            expect(can_update).toBe(false);
        });

        test('User with editor role can read and write', async () => {
            await acl_repository.assign_role(normal_user_id, 'user', editor_role.id);

            const can_read = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'read'
            );
            expect(can_read).toBe(true);

            const can_create = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'create'
            );
            expect(can_create).toBe(true);

            const can_delete = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'delete'
            );
            expect(can_delete).toBe(true);
        });

        test('User with owner role has all permissions', async () => {
            await acl_repository.assign_role(normal_user_id, 'user', owner_role.id);

            const can_read = await acl_service.can(
                normal_user_id,
                'user',
                'system_settings',
                'read'
            );
            expect(can_read).toBe(true);

            const can_update = await acl_service.can(
                normal_user_id,
                'user',
                'system_settings',
                'update'
            );
            expect(can_update).toBe(true);

            const can_delete = await acl_service.can(
                normal_user_id,
                'user',
                'user',
                'delete'
            );
            expect(can_delete).toBe(true);
        });

        test('User with no roles has no permissions', async () => {
            const can_read = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'read'
            );
            expect(can_read).toBe(false);

            const can_write = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'write'
            );
            expect(can_write).toBe(false);
        });
    });

    describe('Direct Permission Grants', () => {
        test('Grant direct permission to user', async () => {
            const post_read_permission = await permission_repository.find_by_resource_action('post', 'read');
			
            const granted = await acl_repository.grant_permission(
                normal_user_id,
                'user',
                post_read_permission.id
            );
            expect(granted).toBe(true);

            const can_read = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'read'
            );
            expect(can_read).toBe(true);
        });

        test('Revoke direct permission from user', async () => {
            const post_read_permission = await permission_repository.find_by_resource_action('post', 'read');
			
            await acl_repository.grant_permission(normal_user_id, 'user', post_read_permission.id);
			
            const revoked = await acl_repository.revoke_permission(
                normal_user_id,
                'user',
                post_read_permission.id
            );
            expect(revoked).toBe(true);

            const can_read = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'read'
            );
            expect(can_read).toBe(false);
        });

        test('Direct grants override role permissions', async () => {
            const post_read_permission = await permission_repository.find_by_resource_action('post', 'read');
			
            // Grant direct permission
            await acl_repository.grant_permission(normal_user_id, 'user', post_read_permission.id);

            // User should have read permission from direct grant
            const can_read = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'read'
            );
            expect(can_read).toBe(true);

            // User should not have write permission
            const can_write = await acl_service.can(
                normal_user_id,
                'user',
                'post',
                'write'
            );
            expect(can_write).toBe(false);
        });
    });

    describe('Bulk Permission Checking', () => {
        test('Check multiple permissions at once', async () => {
            await acl_repository.assign_role(normal_user_id, 'user', viewer_role.id);

            const checks = [
                { resource: 'post', action: 'read' },
                { resource: 'post', action: 'write' },
                { resource: 'channel', action: 'read' }
            ];

            const results = await acl_service.can_bulk(normal_user_id, 'user', checks);

            expect(results['post:read']).toBe(true);
            expect(results['post:write']).toBe(false);
            expect(results['channel:read']).toBe(true);
        });

        test('Root user passes all bulk checks', async () => {
            const checks = [
                { resource: 'system_settings', action: 'read' },
                { resource: 'system_settings', action: 'write' },
                { resource: 'user', action: 'delete' }
            ];

            const results = await acl_service.can_bulk(
                root_user_id,
                'user',
                checks,
                { is_root: true }
            );

            expect(results['system_settings:read']).toBe(true);
            expect(results['system_settings:write']).toBe(true);
            expect(results['user:delete']).toBe(true);
        });
    });
});
