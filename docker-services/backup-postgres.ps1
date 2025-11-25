# Configuration
$BackupDir = ".\backups\postgres"
$ContainerName = "luxaris-postgres"
$DbUser = "luxaris_user"
$DbName = "luxaris"
$RetentionDays = 7

# Create backup directory if not exists
if (!(Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Create backup filename with timestamp
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\backup_$Timestamp.dump"

# Check if container is running
$ContainerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}"
if (!$ContainerStatus) {
  Write-Host "ERROR: Container $ContainerName is not running!" -ForegroundColor Red
  exit 1
}

# Perform backup
Write-Host "Starting backup of $DbName database..." -ForegroundColor Cyan
docker exec $ContainerName pg_dump -U $DbUser -Fc $DbName > $BackupFile

if ($LASTEXITCODE -eq 0) {
  $BackupSize = (Get-Item $BackupFile).Length
  $SizeMB = [math]::Round($BackupSize / 1MB, 2)
  
  Write-Host "Backup completed successfully!" -ForegroundColor Green
  Write-Host "  File: $BackupFile" -ForegroundColor Gray
  Write-Host "  Size: $SizeMB MB" -ForegroundColor Gray
  
  # Warn if backup seems too small
  if ($BackupSize -lt 100KB) {
    Write-Host "  WARNING: Backup file seems unusually small!" -ForegroundColor Yellow
  }
  
  # Delete old backups
  $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
  $OldBackups = Get-ChildItem $BackupDir -Filter "backup_*.dump" | 
    Where-Object { $_.LastWriteTime -lt $CutoffDate }
  
  if ($OldBackups) {
    $OldBackups | Remove-Item -Force
    Write-Host "Cleaned up $($OldBackups.Count) old backup(s)" -ForegroundColor Green
  }
  
  Write-Host "Backup process completed (retention: $RetentionDays days)" -ForegroundColor Green
} else {
  Write-Host "Backup failed!" -ForegroundColor Red
  if (Test-Path $BackupFile) {
    Remove-Item $BackupFile -Force
  }
  exit 1
}
