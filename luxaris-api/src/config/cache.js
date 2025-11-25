const Memcached = require('memcached');

function create_cache_client() {
  const host = process.env.MEMCACHED_HOST || 'localhost';
  const port = process.env.MEMCACHED_PORT || 11211;
  const location = `${host}:${port}`;

  const client = new Memcached(location, {
    retries: 3,
    retry: 10000,
    remove: true,
    failOverServers: []
  });

  // Handle cache errors
  client.on('failure', (details) => {
    console.error('Memcached failure:', details);
  });

  client.on('reconnecting', (details) => {
    console.log('Memcached reconnecting:', details);
  });

  return client;
}

async function test_cache_connection(client) {
  return new Promise((resolve, reject) => {
    const test_key = 'connection_test';
    const test_value = 'ok';

    client.set(test_key, test_value, 10, (error) => {
      if (error) {
        console.error('Cache connection failed:', error.message);
        reject(error);
      } else {
        client.get(test_key, (error, data) => {
          if (error || data !== test_value) {
            console.error('Cache connection failed:', error ? error.message : 'Value mismatch');
            reject(error || new Error('Value mismatch'));
          } else {
            console.log('Cache connected successfully');
            resolve(true);
          }
        });
      }
    });
  });
}

function close_cache_client(client) {
  client.end();
  console.log('Cache client closed');
}

module.exports = {
  create_cache_client,
  test_cache_connection,
  close_cache_client
};
