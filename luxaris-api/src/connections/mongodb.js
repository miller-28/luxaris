const { MongoClient } = require('mongodb');

let mongo_client = null;

function create_mongodb_client() {
    const mongodb_url = process.env.MONGODB_URL || build_mongodb_url();
    
    const config = {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        retryReads: true,
    };

    mongo_client = new MongoClient(mongodb_url, config);

    // Handle connection errors
    mongo_client.on('error', (error) => {
        console.error('MongoDB connection error:', error);
    });

    mongo_client.on('connectionPoolCreated', () => {
        console.log('MongoDB connection pool created');
    });

    mongo_client.on('connectionPoolClosed', () => {
        console.log('MongoDB connection pool closed');
    });

    return mongo_client;
}

function build_mongodb_url() {
    const host = process.env.MONGODB_HOST || 'localhost';
    const port = process.env.MONGODB_PORT || 27017;
    const user = process.env.MONGODB_USER;
    const password = process.env.MONGODB_PASSWORD;
    const database = process.env.MONGODB_DATABASE || 'luxaris';

    if (user && password) {
        return `mongodb://${user}:${password}@${host}:${port}/${database}?authSource=admin`;
    }
    
    return `mongodb://${host}:${port}/${database}`;
}

async function connect_mongodb(client) {
    try {
        await client.connect();
        console.log('MongoDB connected successfully');
        return true;
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
}

async function test_mongodb_connection(client) {
    try {
        await client.db('admin').command({ ping: 1 });
        console.log('MongoDB ping successful');
        return true;
    } catch (error) {
        console.error('MongoDB ping failed:', error.message);
        throw error;
    }
}

async function close_mongodb_client(client) {
    if (client) {
        await client.close();
        console.log('MongoDB client closed');
    }
}

function get_mongodb_database(client, database_name = null) {
    const db_name = database_name || process.env.MONGODB_DATABASE || 'luxaris';
    return client.db(db_name);
}

function get_mongodb_collection(client, collection_name, database_name = null) {
    const db = get_mongodb_database(client, database_name);
    return db.collection(collection_name);
}

module.exports = {
    create_mongodb_client,
    connect_mongodb,
    test_mongodb_connection,
    close_mongodb_client,
    get_mongodb_database,
    get_mongodb_collection
};
