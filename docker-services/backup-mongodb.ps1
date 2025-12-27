# MongoDB Backup Script for Luxaris
# Creates a backup of the MongoDB database running in Docker
# Usage: .\backup-mongodb.ps1

$ErrorActionPreference = "Stop"

# Configuration
$CONTAINER_NAME = "luxaris-mongodb"
$MONGO_USER = "luxaris_user"
$MONGO_PASSWORD = "luxaris_password"
$MONGO_DATABASE = "luxaris"
$BACKUP_DIR = "backups/mongodb"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_PATH = "$BACKUP_DIR/backup_$TIMESTAMP"

Write-Host "=== MongoDB Backup Script ===" -ForegroundColor Cyan
Write-Host "Container: $CONTAINER_NAME" -ForegroundColor Gray
Write-Host "Database: $MONGO_DATABASE" -ForegroundColor Gray
Write-Host "Timestamp: $TIMESTAMP" -ForegroundColor Gray
Write-Host ""

# Check if container is running
Write-Host "Checking if MongoDB container is running..." -ForegroundColor Yellow
$containerStatus = docker inspect -f '{{.State.Running}}' $CONTAINER_NAME 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Container '$CONTAINER_NAME' not found!" -ForegroundColor Red
    Write-Host "Make sure the container is running: docker-compose up -d mongodb" -ForegroundColor Yellow
    exit 1
}

if ($containerStatus -ne "true") {
    Write-Host "Error: Container '$CONTAINER_NAME' is not running!" -ForegroundColor Red
    Write-Host "Start the container: docker-compose up -d mongodb" -ForegroundColor Yellow
    exit 1
}

Write-Host "Container is running!" -ForegroundColor Green
Write-Host ""

# Create backup directory if it doesn't exist
if (-not (Test-Path -Path $BACKUP_DIR)) {
    Write-Host "Creating backup directory: $BACKUP_DIR" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

if (-not (Test-Path -Path $BACKUP_PATH)) {
    Write-Host "Creating backup path: $BACKUP_PATH" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BACKUP_PATH -Force | Out-Null
}

# Perform backup using mongodump
Write-Host "Starting MongoDB backup..." -ForegroundColor Yellow
Write-Host "This may take a few minutes depending on database size..." -ForegroundColor Gray
Write-Host ""

try {
    # Run mongodump inside the container
    docker exec $CONTAINER_NAME mongodump `
        --username=$MONGO_USER `
        --password=$MONGO_PASSWORD `
        --authenticationDatabase=admin `
        --db=$MONGO_DATABASE `
        --out=/backups/backup_$TIMESTAMP `
        --gzip

    if ($LASTEXITCODE -ne 0) {
        throw "mongodump command failed with exit code $LASTEXITCODE"
    }

    Write-Host ""
    Write-Host "Backup completed successfully!" -ForegroundColor Green
    Write-Host ""

    # Get backup size
    $backupSize = docker exec $CONTAINER_NAME du -sh "/backups/backup_$TIMESTAMP" 2>$null
    if ($backupSize) {
        Write-Host "Backup size: $($backupSize.Split()[0])" -ForegroundColor Cyan
    }

    Write-Host "Backup location: $BACKUP_PATH" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Backup details:" -ForegroundColor Yellow
    Write-Host "  - Container: $CONTAINER_NAME" -ForegroundColor Gray
    Write-Host "  - Database: $MONGO_DATABASE" -ForegroundColor Gray
    Write-Host "  - Format: Gzipped BSON" -ForegroundColor Gray
    Write-Host "  - Timestamp: $TIMESTAMP" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To restore this backup, run:" -ForegroundColor Yellow
    Write-Host "  docker exec $CONTAINER_NAME mongorestore --username=$MONGO_USER --password=$MONGO_PASSWORD --authenticationDatabase=admin --db=$MONGO_DATABASE --gzip --drop /backups/backup_$TIMESTAMP/$MONGO_DATABASE" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "Backup failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "  1. Verify container is running: docker ps | findstr mongodb" -ForegroundColor Gray
    Write-Host "  2. Check MongoDB credentials in docker-compose.yml" -ForegroundColor Gray
    Write-Host "  3. Verify MongoDB is accessible: docker exec $CONTAINER_NAME mongosh --eval 'db.runCommand({ ping: 1 })' --username=$MONGO_USER --password=$MONGO_PASSWORD --authenticationDatabase=admin" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "Done!" -ForegroundColor Green
