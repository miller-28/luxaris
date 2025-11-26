const { Pool } = require('pg');

function create_database_pool() {
	const schema = process.env.DB_SCHEMA || 'luxaris';
	const config = {
		host: process.env.DB_HOST || 'localhost',
		port: parseInt(process.env.DB_PORT) || 5432,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		max: 20, // Maximum pool size
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000,
	};

	const pool = new Pool(config);

	// Set search_path to use the luxaris schema by default
	pool.on('connect', async (client) => {
		await client.query(`SET search_path TO ${schema}, public`);
	});

	// Handle pool errors
	pool.on('error', (error) => {
		console.error('Unexpected error on idle database client', error);
	});

	return pool;
}

async function test_database_connection(pool) {
	try {
		const result = await pool.query('SELECT NOW()');
		console.log('Database connected successfully at', result.rows[0].now);
		return true;
	} catch (error) {
		console.error('Database connection failed:', error.message);
		throw error;
	}
}

async function close_database_pool(pool) {
	await pool.end();
	console.log('Database pool closed');
}

module.exports = {
	create_database_pool,
	test_database_connection,
	close_database_pool
};
