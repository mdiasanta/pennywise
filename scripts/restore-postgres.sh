#!/bin/bash
################################################################################
# PostgreSQL Restore Script for Pennywise
# 
# This script restores the PostgreSQL database from a backup file.
# It supports both .sql.gz (compressed) and .sql/.dump formats.
#
# Usage:
#   ./restore-postgres.sh [options] <backup_file>
#
# Options:
#   -d, --docker        Use Docker container (default)
#   -h, --host HOST     PostgreSQL host (for direct connection)
#   -p, --port PORT     PostgreSQL port (default: 5432)
#   -u, --user USER     PostgreSQL user (default: pennywise)
#   -n, --db-name NAME  Database name (default: pennywise)
#   -y, --yes           Skip confirmation prompt
#   --help              Show this help message
#
# Environment Variables:
#   POSTGRES_PASSWORD   PostgreSQL password (required)
#   PGPASSWORD          Alternative to POSTGRES_PASSWORD
#
# WARNING: This will DROP and recreate the database, destroying all existing data!
#
################################################################################

set -euo pipefail

# Default configuration
USE_DOCKER=true
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="pennywise"
PG_DATABASE="pennywise"
CONTAINER_NAME="pennywise-postgres"
SKIP_CONFIRMATION=false
BACKUP_FILE=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

# Show usage
show_help() {
    sed -n '/^# Usage:/,/^# WARNING:/p' "$0" | sed 's/^# \?//'
    exit 0
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--docker)
                USE_DOCKER=true
                shift
                ;;
            -h|--host)
                USE_DOCKER=false
                PG_HOST="$2"
                shift 2
                ;;
            -p|--port)
                PG_PORT="$2"
                shift 2
                ;;
            -u|--user)
                PG_USER="$2"
                shift 2
                ;;
            -n|--db-name)
                PG_DATABASE="$2"
                shift 2
                ;;
            -y|--yes)
                SKIP_CONFIRMATION=true
                shift
                ;;
            --help)
                show_help
                ;;
            -*)
                log_error "Unknown option: $1"
                show_help
                ;;
            *)
                BACKUP_FILE="$1"
                shift
                ;;
        esac
    done
}

# Check if backup file exists and is valid
check_backup_file() {
    if [[ -z "$BACKUP_FILE" ]]; then
        log_error "No backup file specified"
        show_help
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file does not exist: $BACKUP_FILE"
        return 1
    fi
    
    # Check file extension
    case "$BACKUP_FILE" in
        *.sql.gz)
            log_info "Detected compressed SQL backup (.sql.gz)"
            ;;
        *.sql)
            log_info "Detected SQL backup (.sql)"
            ;;
        *.dump)
            log_info "Detected custom dump format (.dump)"
            ;;
        *)
            log_warn "Unknown file format. Expected .sql.gz, .sql, or .dump"
            log_warn "Attempting to restore anyway..."
            ;;
    esac
    
    return 0
}

# Check if Docker container is running
check_docker_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Docker container '${CONTAINER_NAME}' is not running"
        log_info "Start the container with: docker compose --profile app up -d postgres"
        return 1
    fi
    return 0
}

# Check if psql/pg_restore is available (for direct connection)
check_pg_tools() {
    if ! command -v psql &> /dev/null; then
        log_error "psql command not found. Please install PostgreSQL client tools."
        return 1
    fi
    
    # Check for pg_restore if it's a .dump file
    if [[ "$BACKUP_FILE" == *.dump ]]; then
        if ! command -v pg_restore &> /dev/null; then
            log_error "pg_restore command not found. Please install PostgreSQL client tools."
            return 1
        fi
    fi
    
    return 0
}

# Check password
check_password() {
    if [[ -z "${POSTGRES_PASSWORD:-}" ]] && [[ -z "${PGPASSWORD:-}" ]]; then
        log_error "PostgreSQL password not set. Set POSTGRES_PASSWORD or PGPASSWORD environment variable."
        log_info "Example: export POSTGRES_PASSWORD=your_password"
        return 1
    fi
    
    # Use POSTGRES_PASSWORD if PGPASSWORD is not set
    if [[ -z "${PGPASSWORD:-}" ]] && [[ -n "${POSTGRES_PASSWORD:-}" ]]; then
        export PGPASSWORD="${POSTGRES_PASSWORD}"
    fi
    
    return 0
}

# Confirm restoration with user
confirm_restore() {
    if [[ "$SKIP_CONFIRMATION" == true ]]; then
        return 0
    fi
    
    log_warn "=========================================="
    log_warn "WARNING: DATABASE RESTORATION"
    log_warn "=========================================="
    log_warn "This will:"
    log_warn "  1. Terminate all active connections to database '$PG_DATABASE'"
    log_warn "  2. DROP the database '$PG_DATABASE' (ALL DATA WILL BE LOST)"
    log_warn "  3. Recreate the database"
    log_warn "  4. Restore from: $BACKUP_FILE"
    log_warn ""
    log_warn "This action CANNOT be undone!"
    log_warn "=========================================="
    
    read -p "Are you sure you want to continue? (type 'yes' to proceed): " -r
    echo
    
    if [[ ! $REPLY =~ ^yes$ ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
    
    return 0
}

# Restore using Docker
restore_with_docker() {
    log_info "Starting Docker-based restore from: $BACKUP_FILE"
    
    # Step 1: Terminate active connections
    log_info "Terminating active connections..."
    docker exec "$CONTAINER_NAME" psql -U "$PG_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$PG_DATABASE' AND pid <> pg_backend_pid();" \
        || log_warn "No active connections to terminate"
    
    # Step 2: Drop database
    log_info "Dropping database '$PG_DATABASE'..."
    if ! docker exec "$CONTAINER_NAME" psql -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS $PG_DATABASE;"; then
        log_error "Failed to drop database"
        return 1
    fi
    
    # Step 3: Create database
    log_info "Creating database '$PG_DATABASE'..."
    if ! docker exec "$CONTAINER_NAME" psql -U "$PG_USER" -d postgres -c "CREATE DATABASE $PG_DATABASE;"; then
        log_error "Failed to create database"
        return 1
    fi
    
    # Step 4: Restore from backup
    # Note: stdout/stderr are redirected to /dev/null to keep output clean.
    # If restore fails, the error message will be logged by our log_error function.
    # For detailed debugging, remove "> /dev/null 2>&1" from the commands below.
    log_info "Restoring from backup..."
    case "$BACKUP_FILE" in
        *.sql.gz)
            if gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$PG_USER" "$PG_DATABASE" > /dev/null 2>&1; then
                log_info "Restore completed successfully"
                return 0
            else
                log_error "Restore failed"
                return 1
            fi
            ;;
        *.sql)
            if docker exec -i "$CONTAINER_NAME" psql -U "$PG_USER" "$PG_DATABASE" < "$BACKUP_FILE" > /dev/null 2>&1; then
                log_info "Restore completed successfully"
                return 0
            else
                log_error "Restore failed"
                return 1
            fi
            ;;
        *.dump)
            # For .dump files, we need to copy the file into the container first
            log_info "Copying dump file to container..."
            if docker cp "$BACKUP_FILE" "$CONTAINER_NAME:/tmp/restore.dump"; then
                if docker exec "$CONTAINER_NAME" pg_restore -U "$PG_USER" -d "$PG_DATABASE" /tmp/restore.dump > /dev/null 2>&1; then
                    docker exec "$CONTAINER_NAME" rm -f /tmp/restore.dump
                    log_info "Restore completed successfully"
                    return 0
                else
                    docker exec "$CONTAINER_NAME" rm -f /tmp/restore.dump
                    log_error "Restore failed"
                    return 1
                fi
            else
                log_error "Failed to copy dump file to container"
                return 1
            fi
            ;;
        *)
            log_error "Unsupported backup format"
            return 1
            ;;
    esac
}

# Restore using direct connection
restore_direct() {
    log_info "Starting direct restore from: $BACKUP_FILE"
    
    # Step 1: Terminate active connections
    log_info "Terminating active connections..."
    PGPASSWORD="$PGPASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$PG_DATABASE' AND pid <> pg_backend_pid();" \
        || log_warn "No active connections to terminate"
    
    # Step 2: Drop database
    log_info "Dropping database '$PG_DATABASE'..."
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS $PG_DATABASE;"; then
        log_error "Failed to drop database"
        return 1
    fi
    
    # Step 3: Create database
    log_info "Creating database '$PG_DATABASE'..."
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "CREATE DATABASE $PG_DATABASE;"; then
        log_error "Failed to create database"
        return 1
    fi
    
    # Step 4: Restore from backup
    # Note: stdout/stderr are redirected to /dev/null to keep output clean.
    # If restore fails, the error message will be logged by our log_error function.
    # For detailed debugging, remove "> /dev/null 2>&1" from the commands below.
    log_info "Restoring from backup..."
    case "$BACKUP_FILE" in
        *.sql.gz)
            if gunzip -c "$BACKUP_FILE" | PGPASSWORD="$PGPASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DATABASE" > /dev/null 2>&1; then
                log_info "Restore completed successfully"
                return 0
            else
                log_error "Restore failed"
                return 1
            fi
            ;;
        *.sql)
            if PGPASSWORD="$PGPASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DATABASE" < "$BACKUP_FILE" > /dev/null 2>&1; then
                log_info "Restore completed successfully"
                return 0
            else
                log_error "Restore failed"
                return 1
            fi
            ;;
        *.dump)
            if PGPASSWORD="$PGPASSWORD" pg_restore -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" "$BACKUP_FILE" > /dev/null 2>&1; then
                log_info "Restore completed successfully"
                return 0
            else
                log_error "Restore failed"
                return 1
            fi
            ;;
        *)
            log_error "Unsupported backup format"
            return 1
            ;;
    esac
}

# Main execution
main() {
    log_info "=== PostgreSQL Restore Script for Pennywise ==="
    
    # Parse arguments
    parse_args "$@"
    
    # Check backup file
    if ! check_backup_file; then
        exit 1
    fi
    
    # Check password
    if ! check_password; then
        exit 1
    fi
    
    # Confirm with user
    confirm_restore
    
    # Perform restore
    local restore_result=0
    if [[ "$USE_DOCKER" == true ]]; then
        if ! check_docker_container; then
            exit 1
        fi
        restore_with_docker || restore_result=$?
    else
        if ! check_pg_tools; then
            exit 1
        fi
        restore_direct || restore_result=$?
    fi
    
    # Check restore result
    if [[ $restore_result -ne 0 ]]; then
        exit 1
    fi
    
    log_info "=== Restore process completed successfully ==="
    exit 0
}

# Run main function with all arguments
main "$@"
