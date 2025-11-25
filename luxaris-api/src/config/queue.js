const amqp = require('amqplib');

async function create_queue_connection() {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

  try {
    const connection = await amqp.connect(url);

    // Handle connection errors
    connection.on('error', (error) => {
      console.error('RabbitMQ connection error:', error.message);
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
    });

    const channel = await connection.createChannel();

    console.log('RabbitMQ connected successfully');

    return { connection, channel };
  } catch (error) {
    console.error('RabbitMQ connection failed:', error.message);
    throw error;
  }
}

async function declare_queues(channel) {
  // Declare queues used by the application
  const queues = [
    'post_publish',
    'post_analytics',
    'notification_email',
    'notification_webhook'
  ];

  for (const queue of queues) {
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
        'x-max-length': 10000
      }
    });
  }

  console.log('RabbitMQ queues declared:', queues.join(', '));
}

async function close_queue_connection(connection) {
  await connection.close();
  console.log('RabbitMQ connection closed');
}

module.exports = {
  create_queue_connection,
  declare_queues,
  close_queue_connection
};
