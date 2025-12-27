#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Backup Redis database using RDB snapshot
.DESCRIPTION
    Creates a backup of the Redis database by triggering a BGSAVE command
    and copying the dump.rdb file to the backups directory.
    Backups are timestamped for easy identification and restore.
.EXAMPLE
    .\backup-redis.ps1
#>

# Configuration
$CONTAINER_NAME = "luxaris-redis"
$BACKUP_DIR = "./backups/redis"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_NAME = "redis_backup_$TIMESTAMP"
$BACKUP_PATH = "$BACKUP_DIR/$BACKUP_NAME"

# Colors for output
$COLOR_INFO = "Cyan"
$COLOR_SUCCESS = "Green"
$COLOR_ERROR = "Red"
$COLOR_WARNING = "Yellow"

Write-Host "`n=== Redis Backup Script ===" -ForegroundColor $COLOR_INFO
Write-Host "Container: $CONTAINER_NAME" -ForegroundColor $COLOR_INFO
Write-Host "Backup directory: $BACKUP_DIR" -ForegroundColor $COLOR_INFO
Write-Host "Timestamp: $TIMESTAMP`n" -ForegroundColor $COLOR_INFO

# Check if container is running
Write-Host "Checking if Redis container is running..." -ForegroundColor $COLOR_INFO
$containerStatus = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" 2>$null

if (-not $containerStatus) {
    Write-Host "ERROR: Container '$CONTAINER_NAME' is not running!" -ForegroundColor $COLOR_ERROR
    Write-Host "Start the container with: docker-compose up -d redis" -ForegroundColor $COLOR_WARNING
    exit 1
}

Write-Host "Container is running: $containerStatus" -ForegroundColor $COLOR_SUCCESS

# Create backup directory if it doesn't exist
if (-not (Test-Path $BACKUP_DIR)) {
    Write-Host "Creating backup directory: $BACKUP_DIR" -ForegroundColor $COLOR_INFO
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

# Trigger BGSAVE (background save)
Write-Host "`nTriggering Redis BGSAVE..." -ForegroundColor $COLOR_INFO
$bgsaveResult = docker exec $CONTAINER_NAME redis-cli BGSAVE 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to trigger BGSAVE!" -ForegroundColor $COLOR_ERROR
    Write-Host $bgsaveResult -ForegroundColor $COLOR_ERROR
    exit 1
}

Write-Host "BGSAVE triggered: $bgsaveResult" -ForegroundColor $COLOR_SUCCESS

# Wait for BGSAVE to complete
Write-Host "Waiting for BGSAVE to complete..." -ForegroundColor $COLOR_INFO
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $lastSaveStatus = docker exec $CONTAINER_NAME redis-cli LASTSAVE 2>&1
    Start-Sleep -Seconds 1
    $currentSaveStatus = docker exec $CONTAINER_NAME redis-cli LASTSAVE 2>&1
    
    if ($currentSaveStatus -gt $lastSaveStatus) {
        Write-Host "BGSAVE completed successfully!" -ForegroundColor $COLOR_SUCCESS
        break
    }
    
    $attempt++
    Write-Host "." -NoNewline -ForegroundColor $COLOR_INFO
}

if ($attempt -eq $maxAttempts) {
    Write-Host "`nWARNING: Timeout waiting for BGSAVE to complete. Proceeding anyway..." -ForegroundColor $COLOR_WARNING
}

# Copy dump.rdb from container to backup directory
Write-Host "`nCopying dump.rdb to backup directory..." -ForegroundColor $COLOR_INFO
$copyResult = docker cp "${CONTAINER_NAME}:/data/dump.rdb" "$BACKUP_PATH.rdb" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy dump.rdb!" -ForegroundColor $COLOR_ERROR
    Write-Host $copyResult -ForegroundColor $COLOR_ERROR
    exit 1
}

# Compress the backup
Write-Host "Compressing backup..." -ForegroundColor $COLOR_INFO
Compress-Archive -Path "$BACKUP_PATH.rdb" -DestinationPath "$BACKUP_PATH.zip" -Force

# Remove uncompressed file
Remove-Item "$BACKUP_PATH.rdb" -Force

# Get backup size
$backupSize = (Get-Item "$BACKUP_PATH.zip").Length / 1KB
$backupSizeFormatted = "{0:N2} KB" -f $backupSize

Write-Host "`n=== Backup Completed ===" -ForegroundColor $COLOR_SUCCESS
Write-Host "Backup file: $BACKUP_PATH.zip" -ForegroundColor $COLOR_SUCCESS
Write-Host "Backup size: $backupSizeFormatted" -ForegroundColor $COLOR_SUCCESS

Write-Host "`n=== Restore Instructions ===" -ForegroundColor $COLOR_INFO
Write-Host "To restore this backup:" -ForegroundColor $COLOR_INFO
Write-Host "1. Stop Redis container: docker-compose stop redis" -ForegroundColor $COLOR_WARNING
Write-Host "2. Extract backup: Expand-Archive -Path '$BACKUP_PATH.zip' -DestinationPath './temp_restore' -Force" -ForegroundColor $COLOR_WARNING
Write-Host "3. Copy to container: docker cp './temp_restore/$(Split-Path $BACKUP_PATH -Leaf).rdb' ${CONTAINER_NAME}:/data/dump.rdb" -ForegroundColor $COLOR_WARNING
Write-Host "4. Start Redis container: docker-compose start redis" -ForegroundColor $COLOR_WARNING
Write-Host "5. Verify data: docker exec $CONTAINER_NAME redis-cli DBSIZE" -ForegroundColor $COLOR_WARNING

Write-Host "`n=== Additional Commands ===" -ForegroundColor $COLOR_INFO
Write-Host "Check Redis info: docker exec $CONTAINER_NAME redis-cli INFO" -ForegroundColor $COLOR_INFO
Write-Host "Check database size: docker exec $CONTAINER_NAME redis-cli DBSIZE" -ForegroundColor $COLOR_INFO
Write-Host "List all keys: docker exec $CONTAINER_NAME redis-cli KEYS '*'" -ForegroundColor $COLOR_INFO

Write-Host "`nBackup script completed!`n" -ForegroundColor $COLOR_SUCCESS
