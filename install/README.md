# Luxaris Installation Scripts

Quick-start installation scripts for deploying Luxaris on Windows and Linux systems.

---

## Overview

This directory contains automated installation scripts that set up the complete Luxaris platform (API, Dashboard, Runner, and infrastructure services) with minimal manual configuration.

## Available Scripts

### Windows Installation
**File:** `install-windows.ps1`

Automated PowerShell script for Windows 10/11 and Windows Server:
- Checks system prerequisites (Node.js, Docker, PostgreSQL)
- Clones or updates repository
- Sets up Docker services (PostgreSQL, Memcached, RabbitMQ)
- Configures environment variables
- Installs NPM dependencies
- Runs database migrations
- Starts all services
- Performs health checks

**Usage:**
```powershell
.\install-windows.ps1
```

---

### Linux Installation
**File:** `install-linux.sh`

Automated Bash script for Ubuntu/Debian and RHEL/CentOS:
- Detects Linux distribution
- Installs required packages (Node.js, Docker, PostgreSQL client)
- Sets up Docker services
- Configures environment variables
- Installs NPM dependencies
- Runs database migrations
- Starts all services with systemd
- Performs health checks

**Usage:**
```bash
chmod +x install-linux.sh
sudo ./install-linux.sh
```

---

## What Gets Installed

1. **Infrastructure Services** (via Docker Compose)
   - PostgreSQL 16 (database)
   - Memcached 1.6 (caching/sessions)
   - RabbitMQ 3.12 (message queue)

2. **Luxaris Services**
   - luxaris-api (REST API backend)
   - luxaris-dashboard (web interface)
   - luxaris-runner (publishing workers)

3. **Database Setup**
   - Schema migrations executed
   - Initial data seeded (if configured)

4. **Configuration**
   - Environment variables configured
   - Service ports assigned
   - Log directories created

---

## Prerequisites

**Windows:**
- Windows 10/11 or Windows Server 2019+
- PowerShell 5.1 or higher
- Administrator privileges

**Linux:**
- Ubuntu 20.04+ / Debian 11+ / RHEL 8+ / CentOS 8+
- Bash shell
- Root or sudo access

**Both Platforms:**
- Minimum 4GB RAM
- 10GB free disk space
- Internet connection for downloading dependencies

---

## Post-Installation

After successful installation:

1. **Access the Dashboard**
   - URL: `http://localhost:3000`
   - Register the first user (becomes root administrator)

2. **API Endpoint**
   - URL: `http://localhost:3001`
   - Documentation: `http://localhost:3001/api/docs`

3. **Infrastructure Services**
   - PostgreSQL: `localhost:5432`
   - Memcached: `localhost:11211`
   - RabbitMQ Management: `http://localhost:15672`

4. **Service Management**
   - Windows: Services are managed via PowerShell or Task Scheduler
   - Linux: Services managed via systemd (`systemctl`)

---

## Configuration

Default configuration can be customized by editing `.env` files before installation or by running the configuration script:

**Windows:**
```powershell
.\configure.ps1
```

**Linux:**
```bash
./configure.sh
```

Configuration options:
- Database connection settings
- Service ports
- OAuth credentials (Google, etc.)
- Email service settings
- Log levels and retention
- Feature flags

---

## Troubleshooting

**Installation Logs:**
- Windows: `C:\ProgramData\Luxaris\logs\install.log`
- Linux: `/var/log/luxaris/install.log`

**Common Issues:**
- Port conflicts: Change ports in `.env` file
- Permission errors: Run with administrator/sudo privileges
- Docker not running: Ensure Docker service is started
- Network issues: Check firewall settings

---

## Uninstallation

**Windows:**
```powershell
.\uninstall-windows.ps1
```

**Linux:**
```bash
sudo ./uninstall-linux.sh
```

This removes all Luxaris services while preserving database data by default. Use `--purge` flag to remove all data.

---

## Status

🚧 **Future Development** - Installation scripts will be created after the platform reaches stable release to enable easy deployment.
