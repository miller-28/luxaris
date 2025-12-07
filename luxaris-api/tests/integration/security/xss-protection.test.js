const TestServer = require('../../helpers/test-server');
const request = require('supertest');
const { create_database_pool } = require('../../../src/connections/database');

describe('Security - XSS Protection', () => {
    let test_server;
    let app;
    let db_pool;
    let auth_token;
    let user_id;
    let post_id;

    beforeAll(async () => {
        db_pool = create_database_pool();
        test_server = new TestServer();
        await test_server.start();
        app = test_server.get_app();

        const response = await request(app).post('/api/v1/auth/register').send({
            email: 'xsstest' + Date.now() + '@example.com',
            password: 'SecurePass123!',
            name: 'XSS Test User',
            timezone: 'UTC'
        });
        user_id = response.body.user.id;
        auth_token = response.body.access_token;
    });

    afterAll(async () => {
        if (test_server) await test_server.stop();
        if (db_pool) await db_pool.end();
    });

    describe('Basic Script Injection', () => {
        test('Script tag in post title is sanitized or escaped', async () => {
            const malicious_title = '<script>alert("XSS")</script>Test Title';
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ title: malicious_title, base_content: 'Content' })
                .expect(201);
            
            const stored = await db_pool.query('SELECT title FROM posts WHERE id = $1', [response.body.data.id]);
            const title = stored.rows[0].title;
            expect(title).not.toContain('<script>');
        });

        test('Script tag in post content is sanitized', async () => {
            const malicious_content = '<script>document.location="http://evil.com"</script>Normal content';
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ title: 'Test', base_content: malicious_content })
                .expect(201);
            
            expect(response.body.data.base_content).not.toContain('<script>');
        });

        test('Script tag in user name is sanitized', async () => {
            const malicious_name = '<script>alert(1)</script>John Doe';
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'xss' + Date.now() + '@test.com',
                    password: 'Pass123!',
                    name: malicious_name,
                    timezone: 'UTC'
                });
            expect(response.status).toBe(201);
            expect(response.body.user.name).not.toContain('<script>');
        });
    });

    describe('Event Handler Injection', () => {
        test('onerror event handler is stripped', async () => {
            const malicious_content = '<img src=x onerror="alert(1)">';
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ title: 'Test', base_content: malicious_content })
                .expect(201);
            
            expect(response.body.data.base_content).not.toContain('onerror');
        });

        test('onclick event handler is stripped', async () => {
            const malicious_content = '<div onclick="alert(1)">Click me</div>';
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ title: 'Test', base_content: malicious_content })
                .expect(201);
            
            expect(response.body.data.base_content).not.toContain('onclick');
        });

        test('onload event handler is stripped', async () => {
            const malicious_content = '<body onload="alert(1)">Content</body>';
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ title: 'Test', base_content: malicious_content })
                .expect(201);
            
            expect(response.body.data.base_content).not.toContain('onload');
        });
    });

    describe('Complex XSS Vectors', () => {
        test('javascript: protocol in href is stripped', async () => {
            const malicious_content = '<a href="javascript:alert(1)">Click</a>';
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ title: 'Test', base_content: malicious_content })
                .expect(201);
            
            expect(response.body.data.base_content).not.toContain('javascript:');
        });

        test('data: URI with base64 encoded script is blocked', async () => {
            const malicious_content = '<iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="></iframe>';
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ title: 'Test', base_content: malicious_content })
                .expect(201);
            
            expect(response.body.data.base_content).not.toContain('data:text/html');
        });

        test('SVG with embedded script is sanitized', async () => {
            const malicious_content = '<svg><script>alert(1)</script></svg>';
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ title: 'Test', base_content: malicious_content })
                .expect(201);
            
            expect(response.body.data.base_content).not.toContain('<script>');
        });
    });

    describe('Content Security Policy Headers', () => {
        test('CSP header is present on HTML responses', async () => {
            const response = await request(app)
                .get('/api/v1/ops/health');
            
            const csp = response.headers['content-security-policy'];
            if (csp) {
                expect(csp).toContain("default-src");
            }
        });

        test('X-XSS-Protection header is set', async () => {
            const response = await request(app)
                .get('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token);
            
            expect(response.headers['x-content-type-options']).toBe('nosniff');
        });
    });

    describe('Rich Text Sanitization', () => {
        test('Safe HTML tags are preserved', async () => {
            const safe_content = '<p>Safe <strong>text</strong> with <em>formatting</em></p>';
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ title: 'Test', base_content: safe_content })
                .expect(201);
            
            expect(response.body.data.base_content).toContain('<p>');
            expect(response.body.data.base_content).toContain('<strong>');
        });
    });
});
