# PostgreSQL Backup and Restore Guide

## Automatic Backup Strategy

### 1. Create Backup Directory

```powershell
mkdir -p backups/postgres
```

### 2. Manual Backup

```powershell
# Full database backup
docker exec luxaris-postgres pg_dump -U luxaris_user -Fc luxaris > backups/postgres/backup_$(date +%Y%m%d_%H%M%S).dump

# SQL format backup
docker exec luxaris-postgres pg_dump -U luxaris_user luxaris > backups/postgres/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Automated Backup Script (PowerShell)

Save as `backup-postgres.ps1`:

```powershell
# Configuration
$BackupDir = ".\backups\postgres"
$ContainerName = "luxaris-postgres"
$DbUser = "luxaris_user"
$DbName = "luxaris"
$RetentionDays = 7

# Create backup directory if not exists
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir
}

# Create backup filename with timestamp
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\backup_$Timestamp.dump"

# Perform backup
Write-Host "Starting backup of $DbName database..."
docker exec $ContainerName pg_dump -U $DbUser -Fc $DbName > $BackupFile

if ($?) {
    Write-Host "Backup completed successfully: $BackupFile"
    
    # Delete old backups
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem $BackupDir -Filter "backup_*.dump" | 
        Where-Object { $_.LastWriteTime -lt $CutoffDate } | 
        Remove-Item -Force
    
    Write-Host "Old backups cleaned up (retention: $RetentionDays days)"
} else {
    Write-Host "Backup failed!" -ForegroundColor Red
    exit 1
}
```

Run it:
```powershell
.\backup-postgres.ps1
```

### 4. Schedule Automatic Backups (Windows Task Scheduler)

```powershell
# Create scheduled task (runs daily at 2 AM)
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\path\to\backup-postgres.ps1"
$Trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "LuxarisPostgresBackup" -Action $Action -Trigger $Trigger -Principal $Principal
```

## Restore Database

### From Custom Format (.dump)

```powershell
# Stop API and runner services first
docker-compose stop

# Restore database
docker exec -i luxaris-postgres pg_restore -U luxaris_user -d luxaris --clean --if-exists < backups/postgres/backup_20250125.dump

# Restart services
docker-compose start
```

### From SQL Format (.sql)

```powershell
# Drop and recreate database (if needed)
docker exec luxaris-postgres psql -U luxaris_user -d postgres -c "DROP DATABASE IF EXISTS luxaris;"
docker exec luxaris-postgres psql -U luxaris_user -d postgres -c "CREATE DATABASE luxaris;"

# Restore from SQL file
docker exec -i luxaris-postgres psql -U luxaris_user -d luxaris < backups/postgres/backup_20250125.sql
```

## Disaster Recovery

### Complete Volume Backup

```powershell
# Stop PostgreSQL container
docker-compose stop postgres

# Create volume backup
docker run --rm -v luxaris_postgres_data:/data -v ${PWD}/backups:/backup alpine tar czf /backup/postgres_volume_backup_$(date +%Y%m%d).tar.gz -C /data .

# Restart PostgreSQL
docker-compose start postgres
```

### Restore from Volume Backup

```powershell
# Stop and remove PostgreSQL container
docker-compose stop postgres
docker-compose rm -f postgres

# Remove old volume
docker volume rm luxaris_postgres_data

# Create new volume
docker volume create luxaris_postgres_data

# Restore volume data
docker run --rm -v luxaris_postgres_data:/data -v ${PWD}/backups:/backup alpine tar xzf /backup/postgres_volume_backup_20250125.tar.gz -C /data

# Start PostgreSQL
docker-compose up -d postgres
```

## Data Migration

### Export for Migration

```powershell
# Export all data and schema
docker exec luxaris-postgres pg_dumpall -U luxaris_user > backups/postgres/full_backup_$(date +%Y%m%d).sql
```

### Import to New Server

```powershell
# On new server
cat backups/postgres/full_backup_20250125.sql | docker exec -i luxaris-postgres psql -U luxaris_user -d postgres
```

## Best Practices

### 1. Backup Strategy (3-2-1 Rule)
- **3** copies of data
- **2** different media types
- **1** off-site copy

```powershell
# Local backups (already covered above)
# Cloud storage backup (example: AWS S3)
aws s3 sync ./backups/postgres s3://your-bucket/luxaris-backups/postgres/

# Or Azure Blob Storage
az storage blob upload-batch -d luxaris-backups -s ./backups/postgres --account-name youraccount
```

### 2. Backup Frequency
- **Development**: Daily backups, 7-day retention
- **Staging**: Daily backups, 14-day retention
- **Production**: 
  - Daily full backups, 30-day retention
  - Hourly incremental backups (if needed)
  - Weekly archives to cold storage

### 3. Test Restores Regularly

```powershell
# Monthly restore test (to separate container)
docker run --name test-restore -e POSTGRES_PASSWORD=test -d postgres:16-alpine
docker exec -i test-restore psql -U postgres < backups/postgres/backup_latest.sql
docker rm -f test-restore
```

### 4. Monitor Backup Success

```powershell
# Add to backup script
$BackupSize = (Get-Item $BackupFile).Length
if ($BackupSize -lt 1MB) {
    Write-Host "WARNING: Backup file seems too small!" -ForegroundColor Yellow
    # Send alert (email, Slack, etc.)
}
```

### 5. Encryption (Production)

```powershell
# Encrypt backup
docker exec luxaris-postgres pg_dump -U luxaris_user -Fc luxaris | gpg --encrypt --recipient your@email.com > backups/postgres/backup_encrypted.dump.gpg

# Decrypt and restore
gpg --decrypt backups/postgres/backup_encrypted.dump.gpg | docker exec -i luxaris-postgres pg_restore -U luxaris_user -d luxaris
```

## Monitoring Data Persistence

### Check Volume Status

```powershell
# List volumes
docker volume ls

# Inspect volume
docker volume inspect luxaris_postgres_data

# Check volume size
docker system df -v
```

### Verify Data After Reboot

```powershell
# After system reboot
docker-compose up -d

# Check if data persists
docker exec luxaris-postgres psql -U luxaris_user -d luxaris -c "SELECT COUNT(*) FROM users;"
```

## Troubleshooting

### Data Corruption

```powershell
# Check database integrity
docker exec luxaris-postgres pg_checksums --check -D /var/lib/postgresql/data/pgdata

# Repair (if possible)
docker exec luxaris-postgres vacuumdb -U luxaris_user --all --full --analyze
```

### Volume Permission Issues

```powershell
# Fix permissions
docker exec -u root luxaris-postgres chown -R postgres:postgres /var/lib/postgresql/data
```

### Out of Disk Space

```powershell
# Check database size
docker exec luxaris-postgres psql -U luxaris_user -d luxaris -c "SELECT pg_size_pretty(pg_database_size('luxaris'));"

# Clean old data
docker exec luxaris-postgres vacuumdb -U luxaris_user -d luxaris --full
```
