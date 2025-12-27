# Luxaris Service Dockers

Docker Compose setup for Luxaris backend services: PostgreSQL, Memcached, RabbitMQ, MongoDB, and Redis.

## Services

### PostgreSQL (Port 5432)
- **Image:** `postgres:16-alpine`
- **Database:** `luxaris`
- **User:** `luxaris_user`
- **Password:** `luxaris_password`
- **Data Volume:** `postgres_data`

### Memcached (Port 11211)
- **Image:** `memcached:1.6-alpine`
- **Memory:** 256 MB
- **Max Connections:** 1024

### RabbitMQ (Ports 5672, 15672)
- **Image:** `rabbitmq:3.12-management-alpine`
- **AMQP Port:** 5672
- **Management UI:** http://localhost:15672
- **User:** `luxaris_user`
- **Password:** `luxaris_password`
- **Virtual Host:** `luxaris`
- **Data Volume:** `rabbitmq_data`

### MongoDB (Port 27017)
- **Image:** `mongo:latest`
- **Database:** `luxaris`
- **User:** `luxaris_user`
- **Password:** `luxaris_password`
- **Data Volume:** `mongodb_data`
- **Authentication Database:** `admin`

### Redis (Port 6379)
- **Image:** `redis:7-alpine`
- **Password:** `luxaris_password`
- **Max Memory:** 512 MB
- **Eviction Policy:** allkeys-lru
- **Persistence:** AOF enabled (appendonly.aof)
- **Data Volume:** `redis_data`

## Quick Start

### Start All Services

```powershell
docker-compose up -d
```

### Stop All Services

```powershell
docker-compose down
```

### Stop and Remove Volumes (Clean Reset)

```powershell
docker-compose down -v
```

### View Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f memcached
docker-compose logs -f rabbitmq
```

### Check Service Status

```powershell
docker-compose ps
```

## Service Health Checks

All services include health checks:

```powershell
# Check if all services are healthy
docker-compose ps
```

Services will show as "healthy" when ready.

## Connection Strings for Luxaris API

Add these to your Luxaris API `.env` file:

```bash
# Database
DATABASE_URL=postgresql://luxaris_user:luxaris_password@localhost:5432/luxaris

# Memcached
MEMCACHED_URL=localhost:11211

# RabbitMQ
RABBITMQ_URL=amqp://luxaris_user:luxaris_password@localhost:5672/luxaris

# MongoDB
MONGODB_URL=mongodb://luxaris_user:luxaris_password@localhost:27017/luxaris?authSource=admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USER=luxaris_user
REDIS_PASSWORD=luxaris_password
REDIS_DB=0
```

## Individual Service Management

### PostgreSQL

```powershell
# Start only PostgreSQL
docker-compose up -d postgres

# Connect to PostgreSQL
docker exec -it luxaris-postgres psql -U luxaris_user -d luxaris

# Backup database
.\backup-postgres.ps1

# Restore database
cat backup.sql | docker exec -i luxaris-postgres psql -U luxaris_user -d luxaris
```

### Memcached

```powershell
# Start only Memcached
docker-compose up -d memcached

# Connect to Memcached (telnet)
telnet localhost 11211

# Check stats
echo "stats" | nc localhost 11211
```

### RabbitMQ

```powershell
# Start only RabbitMQ
docker-compose up -d rabbitmq

# Access Management UI
# Open browser: http://localhost:15672
# Login: luxaris_user / luxaris_password

# List queues
docker exec luxaris-rabbitmq rabbitmqctl list_queues

# List connections
docker exec luxaris-rabbitmq rabbitmqctl list_connections
```

### MongoDB

```powershell
# Start only MongoDB
docker-compose up -d mongodb

# Connect to MongoDB shell
docker exec -it luxaris-mongodb mongosh -u luxaris_user -p luxaris_password --authenticationDatabase admin luxaris

# Backup database
.\backup-mongodb.ps1

# List databases
docker exec luxaris-mongodb mongosh -u luxaris_user -p luxaris_password --authenticationDatabase admin --eval "show dbs"

# List collections
docker exec luxaris-mongodb mongosh -u luxaris_user -p luxaris_password --authenticationDatabase admin luxaris --eval "show collections"
```

### Redis

```powershell
# Start only Redis
docker-compose up -d redis

# Connect to Redis CLI
docker exec -it luxaris-redis redis-cli -a luxaris_password

# Backup database
.\backup-redis.ps1

# Check database size
docker exec luxaris-redis redis-cli -a luxaris_password DBSIZE

# Get Redis info
docker exec luxaris-redis redis-cli -a luxaris_password INFO

# List all keys (warning: slow on large databases)
docker exec luxaris-redis redis-cli -a luxaris_password KEYS '*'

# Monitor Redis commands in real-time
docker exec luxaris-redis redis-cli -a luxaris_password MONITOR
```

## Production Considerations

For production deployment:

1. **Change Default Passwords**
   - Update credentials in `.env` file
   - Use strong, randomly generated passwords

2. **Configure Volumes**
   - Use named volumes or bind mounts for data persistence
   - Ensure proper backup strategy

3. **Network Configuration**
   - Restrict port exposure (don't expose to public)
   - Use internal Docker networks
   - Consider using reverse proxy

4. **Resource Limits**
   - Add memory and CPU limits to docker-compose.yml
   - Monitor resource usage

5. **Security**
   - Enable SSL/TLS for PostgreSQL
   - Configure RabbitMQ SSL
   - Use secrets management instead of environment variables

## Troubleshooting

### PostgreSQL Connection Issues

```powershell
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec luxaris-postgres pg_isready -U luxaris_user
```

### Memcached Connection Issues

```powershell
# Check if Memcached is running
docker-compose ps memcached

# Test connection
echo "stats" | nc localhost 11211
```

### RabbitMQ Connection Issues

```powershell
# Check if RabbitMQ is running
docker-compose ps rabbitmq

# Check RabbitMQ status
docker exec luxaris-rabbitmq rabbitmqctl status

# View RabbitMQ logs
docker-compose logs rabbitmq
```

### Reset Everything

```powershell
# Stop and remove all containers and volumes
docker-compose down -v

# Remove all images (optional)
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## Development vs Production

This docker-compose setup is designed for:
- **Local development** - Quick setup, easy debugging
- **Testing environments** - Consistent infrastructure
- **Small deployments** - Single-server installations

For production at scale, consider:
- Managed database services (AWS RDS, Azure Database)
- Managed cache services (ElastiCache, Azure Cache)
- Managed message queue services (AWS MQ, CloudAMQP)
- Kubernetes for orchestration
