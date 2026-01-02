# Database Backup and Restore Guide

This guide covers backup and restore operations for the Pennywise PostgreSQL database.

## Table of Contents

- [Overview](#overview)
- [Manual Backups](#manual-backups)
- [Automated Backups](#automated-backups)
- [Restoring from Backup](#restoring-from-backup)
- [Backup Retention Policy](#backup-retention-policy)
- [Production Best Practices](#production-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Pennywise uses PostgreSQL 16 as its database. The backup solution provides:

- **Compressed backups** using gzip to save storage space
- **Timestamped files** for easy identification (e.g., `pennywise_20260102_143000.sql.gz`)
- **Automatic cleanup** of old backups based on retention policy
- **Multiple backup methods**: Docker-based, direct connection, or automated service
- **Flexible restore** supporting both compressed and uncompressed formats

## Manual Backups

### Using the Backup Script

The recommended way to create backups is using the provided script:

```bash
# Basic usage (Docker-based, default settings)
export POSTGRES_PASSWORD=pennywise_password
./scripts/backup-postgres.sh

# Specify custom output directory
./scripts/backup-postgres.sh --output /path/to/backups

# Change retention period (default: 7 days)
./scripts/backup-postgres.sh --retention 14

# Direct PostgreSQL connection (non-Docker)
./scripts/backup-postgres.sh --host localhost --port 5432
```

**Script Features:**
- Creates compressed `.sql.gz` backups
- Automatically cleans up old backups
- Provides colored console output with timestamps
- Error handling and validation
- Support for both Docker and direct connections

**Available Options:**
```
-d, --docker        Use Docker container (default)
-h, --host HOST     PostgreSQL host (for direct connection)
-p, --port PORT     PostgreSQL port (default: 5432)
-u, --user USER     PostgreSQL user (default: pennywise)
-n, --db-name NAME  Database name (default: pennywise)
-o, --output DIR    Output directory (default: ./backups)
-r, --retention N   Retention days (default: 7)
--help              Show help message
```

### Manual Docker-Based Backup

If you prefer to run backups manually without the script:

```bash
# Create backups directory
mkdir -p backups

# Simple backup
docker compose exec postgres pg_dump -U pennywise pennywise > backups/backup.sql

# Compressed backup with timestamp
docker compose exec postgres pg_dump -U pennywise pennywise | \
  gzip > backups/pennywise_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Backup from Host (Direct Connection)

If PostgreSQL is running locally or accessible from your host:

```bash
# Set password to avoid prompts
export PGPASSWORD=pennywise_password

# Create backup
pg_dump -h localhost -p 5432 -U pennywise pennywise | \
  gzip > backups/pennywise_$(date +%Y%m%d_%H%M%S).sql.gz
```

## Automated Backups

### Docker Compose Backup Service

The Docker Compose setup includes an optional backup service that runs automated daily backups.

#### Enable Automated Backups

```bash
# Start the backup service along with the application
docker compose --profile app --profile backup up -d

# Or start only the backup service (if postgres is already running)
docker compose --profile backup up -d
```

#### Configure Backup Service

The backup service:
- Runs daily (every 24 hours)
- Stores backups in `./backups` directory
- Automatically removes backups older than 7 days
- Uses environment variables from `.env` file
- Restarts automatically if it fails

#### Check Backup Service Status

```bash
# View backup service logs
docker compose logs backup

# Follow logs in real-time
docker compose logs -f backup

# Check if backup service is running
docker compose ps backup
```

#### Stop Automated Backups

```bash
# Stop the backup service
docker compose --profile backup down
```

### GitHub Actions Automated Backups

For production deployments, you can use GitHub Actions to create scheduled backups and store them as artifacts.

See the [GitHub Actions Workflow](#github-actions-workflow) section below for details.

## Restoring from Backup

### Using the Restore Script

The restore script provides a safe way to restore your database:

```bash
# Basic usage with confirmation prompt
export POSTGRES_PASSWORD=pennywise_password
./scripts/restore-postgres.sh backups/pennywise_20260102_143000.sql.gz

# Skip confirmation (use with caution!)
./scripts/restore-postgres.sh --yes backups/pennywise_20260102_143000.sql.gz

# Direct PostgreSQL connection
./scripts/restore-postgres.sh --host localhost backups/backup.sql
```

**Script Features:**
- Safety confirmation prompt (can be skipped with `--yes`)
- Validates backup file exists
- Supports `.sql.gz`, `.sql`, and `.dump` formats
- Automatically terminates active connections
- Drops and recreates the database
- Provides detailed progress information

**Available Options:**
```
-d, --docker        Use Docker container (default)
-h, --host HOST     PostgreSQL host (for direct connection)
-p, --port PORT     PostgreSQL port (default: 5432)
-u, --user USER     PostgreSQL user (default: pennywise)
-n, --db-name NAME  Database name (default: pennywise)
-y, --yes           Skip confirmation prompt
--help              Show help message
```

⚠️ **WARNING**: Restore operations will DROP the existing database and all its data!

### Manual Docker-Based Restore

If you prefer to restore manually:

```bash
# From compressed backup
gunzip -c backups/pennywise_20260102_143000.sql.gz | \
  docker compose exec -T postgres psql -U pennywise pennywise

# From uncompressed backup
docker compose exec -T postgres psql -U pennywise pennywise < backups/backup.sql
```

**Note**: You may need to terminate active connections and recreate the database first:

```bash
# Terminate connections and recreate database
docker compose exec postgres psql -U pennywise -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'pennywise' AND pid <> pg_backend_pid();"

docker compose exec postgres psql -U pennywise -d postgres -c "DROP DATABASE IF EXISTS pennywise;"
docker compose exec postgres psql -U pennywise -d postgres -c "CREATE DATABASE pennywise;"

# Then restore
gunzip -c backups/backup.sql.gz | docker compose exec -T postgres psql -U pennywise pennywise
```

## Backup Retention Policy

### Default Retention

By default, backups are retained for **7 days**. This applies to:
- Manual backups using the `backup-postgres.sh` script
- Automated backups via the Docker Compose backup service

### Customizing Retention

**For manual backups:**
```bash
# Keep backups for 14 days
./scripts/backup-postgres.sh --retention 14

# Keep backups for 30 days
./scripts/backup-postgres.sh --retention 30
```

**For Docker Compose backup service:**

Edit `compose.yml` and change the `find` command in the backup service:

```yaml
# Change from 7 days to 14 days
find /backups -name '$${POSTGRES_DB}_*.sql.gz' -type f -mtime +14 -delete;
```

### Manual Cleanup

To manually clean up old backups:

```bash
# Remove backups older than 7 days
find backups/ -name "pennywise_*.sql.gz" -type f -mtime +7 -delete

# Remove backups older than 30 days
find backups/ -name "pennywise_*.sql.gz" -type f -mtime +30 -delete

# List backups by age
ls -lht backups/
```

## Production Best Practices

### 1. Store Backups Offsite

**Don't rely solely on local backups.** Consider:

- **Cloud Storage**: Upload backups to AWS S3, Google Cloud Storage, or Azure Blob Storage
- **Remote Servers**: Copy backups to a remote backup server
- **Version Control**: For small databases, consider storing encrypted backups in a private repository

**Example: Upload to AWS S3**
```bash
# Create backup and save the filename
export POSTGRES_PASSWORD=pennywise_password
./scripts/backup-postgres.sh

# Get the most recent backup file
LATEST_BACKUP=$(ls -t backups/pennywise_*.sql.gz | head -1)

# Upload to S3
aws s3 cp "$LATEST_BACKUP" s3://your-backup-bucket/pennywise/
```

### 2. Test Your Backups Regularly

**Create a restore testing schedule:**

```bash
# Monthly restore test workflow
1. Create a test environment
2. Restore latest backup
3. Verify data integrity
4. Test application functionality
5. Document results
```

### 3. Encrypt Sensitive Backups

For production data, encrypt backups before storage:

```bash
# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 backups/pennywise_20260102_143000.sql.gz

# Decrypt when needed
gpg --decrypt backups/pennywise_20260102_143000.sql.gz.gpg > backup.sql.gz
```

### 4. Monitor Backup Success

**Set up monitoring:**
- Check backup service logs regularly: `docker compose logs backup`
- Set up alerts for backup failures
- Monitor backup file sizes for anomalies
- Track backup duration trends

### 5. Document Your Backup Strategy

**Maintain documentation of:**
- Backup schedule (frequency and timing)
- Retention policies
- Storage locations
- Restoration procedures
- Contact information for backup access

### 6. Use Multiple Backup Methods

**Implement a 3-2-1 backup strategy:**
- **3** copies of your data
- **2** different storage types
- **1** copy offsite

Example:
1. Production database (primary)
2. Local automated backups (Docker service)
3. Cloud storage backups (S3/GCS/Azure)

### 7. Secure Your Backups

**Best practices:**
- Restrict access to backup files (use proper file permissions)
- Encrypt backups containing sensitive data
- Use secure transfer protocols (SFTP, HTTPS)
- Regularly rotate encryption keys
- Audit backup access logs

### 8. Plan for Disaster Recovery

**Create a disaster recovery plan:**
1. Define Recovery Time Objective (RTO)
2. Define Recovery Point Objective (RPO)
3. Document step-by-step restoration procedures
4. Maintain emergency contact list
5. Test DR plan quarterly

## GitHub Actions Workflow

For automated backups via GitHub Actions, create `.github/workflows/db-backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:  # Allow manual triggers

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Setup PostgreSQL Client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client
      
      - name: Create Backup
        env:
          PGPASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
        run: |
          pg_dump -h ${{ secrets.PG_HOST }} \
                  -p ${{ secrets.PG_PORT }} \
                  -U ${{ secrets.PG_USER }} \
                  ${{ secrets.PG_DATABASE }} | \
          gzip > pennywise_$(date +%Y%m%d_%H%M%S).sql.gz
      
      - name: Upload Backup Artifact
        uses: actions/upload-artifact@v4
        with:
          name: database-backup-${{ github.run_number }}
          path: pennywise_*.sql.gz
          retention-days: 30
```

**Required Secrets:**
- `POSTGRES_PASSWORD`: Database password
- `PG_HOST`: Database host
- `PG_PORT`: Database port (default: 5432)
- `PG_USER`: Database user
- `PG_DATABASE`: Database name

## Troubleshooting

### Backup Script Issues

**Problem**: Permission denied
```bash
# Solution: Make script executable
chmod +x scripts/backup-postgres.sh
```

**Problem**: Docker container not running
```bash
# Solution: Start PostgreSQL container
docker compose --profile app up -d postgres
```

**Problem**: Password not set
```bash
# Solution: Set password environment variable
export POSTGRES_PASSWORD=your_password
```

### Restore Script Issues

**Problem**: Active connections preventing database drop
```bash
# Solution: The restore script handles this automatically
# Or manually terminate connections:
docker compose exec postgres psql -U pennywise -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'pennywise' AND pid <> pg_backend_pid();"
```

**Problem**: Backup file corrupted
```bash
# Solution: Test backup file integrity
gunzip -t backups/pennywise_20260102_143000.sql.gz

# If corrupted, use an earlier backup
ls -lt backups/
```

### Docker Compose Backup Service Issues

**Problem**: Backup service not starting
```bash
# Check service status and logs
docker compose ps backup
docker compose logs backup

# Ensure profile is enabled
docker compose --profile backup up -d
```

**Problem**: Backups not being created
```bash
# Check volume mount
docker compose exec backup ls -la /backups

# Check PostgreSQL connection
docker compose exec backup pg_isready -h postgres -U pennywise
```

### General Issues

**Problem**: Out of disk space
```bash
# Check disk usage
df -h

# Clean up old backups
find backups/ -name "pennywise_*.sql.gz" -type f -mtime +7 -delete
```

**Problem**: Slow backup/restore
```bash
# For large databases, consider:
# 1. Use custom format with pg_dump -Fc (faster restore)
# 2. Adjust compression level: gzip -1 (faster, larger) vs gzip -9 (slower, smaller)
# 3. Exclude unnecessary tables with --exclude-table
```

### Getting Help

If you encounter issues not covered here:

1. Check the [main README](../README.md) for general setup information
2. Review the Docker Compose logs: `docker compose logs`
3. Ensure all environment variables are properly set in `.env`
4. Verify PostgreSQL is healthy: `docker compose ps postgres`

## Additional Resources

- [PostgreSQL Documentation - pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html)
- [PostgreSQL Documentation - pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
