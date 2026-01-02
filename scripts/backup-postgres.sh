#!/bin/bash
################################################################################
# PostgreSQL Backup Script for Pennywise
# 
# This script creates compressed backups of the PostgreSQL database.
# It supports both Docker-based and direct PostgreSQL connections.
#
# Usage:
#   ./backup-postgres.sh [options]
#
# Options:
#   -d, --docker        Use Docker container (default)
#   -h, --host HOST     PostgreSQL host (for direct connection)
#   -p, --port PORT     PostgreSQL port (default: 5432)
#   -u, --user USER     PostgreSQL user (default: pennywise)
#   -n, --db-name NAME  Database name (default: pennywise)
#   -o, --output DIR    Output directory (default: ./backups)
#   -r, --retention N   Retention days (default: 7)
#   --help              Show this help message
#
# Environment Variables:
#   POSTGRES_PASSWORD   PostgreSQL password (required)
#   PGPASSWORD          Alternative to POSTGRES_PASSWORD
#
################################################################################

set -euo pipefail

# Default configuration
USE_DOCKER=true
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="pennywise"
PG_DATABASE="pennywise"
BACKUP_DIR="./backups"
RETENTION_DAYS=7
CONTAINER_NAME="pennywise-postgres"

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
    sed -n '/^# Usage:/,/^$/p' "$0" | sed 's/^# \?//'
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
            -o|--output)
                BACKUP_DIR="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            --help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done
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

# Check if pg_dump is available (for direct connection)
check_pg_dump() {
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump command not found. Please install PostgreSQL client tools."
        return 1
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

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR" || {
            log_error "Failed to create backup directory: $BACKUP_DIR"
            return 1
        }
    fi
    return 0
}

# Generate backup filename with timestamp
generate_backup_filename() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    echo "${PG_DATABASE}_${timestamp}.sql.gz"
}

# Perform backup using Docker
backup_with_docker() {
    local backup_file="$1"
    local backup_path="${BACKUP_DIR}/${backup_file}"
    
    log_info "Starting Docker-based backup to: ${backup_path}"
    
    if docker exec "$CONTAINER_NAME" pg_dump -U "$PG_USER" "$PG_DATABASE" | gzip > "$backup_path"; then
        log_info "Backup completed successfully"
        return 0
    else
        log_error "Backup failed"
        return 1
    fi
}

# Perform backup using direct connection
backup_direct() {
    local backup_file="$1"
    local backup_path="${BACKUP_DIR}/${backup_file}"
    
    log_info "Starting direct backup to: ${backup_path}"
    
    if PGPASSWORD="$PGPASSWORD" pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DATABASE" | gzip > "$backup_path"; then
        log_info "Backup completed successfully"
        return 0
    else
        log_error "Backup failed"
        return 1
    fi
}

# Get file size in human-readable format
get_file_size() {
    local file="$1"
    if [[ -f "$file" ]]; then
        # Use du -h for better portability
        du -h "$file" | cut -f1
    else
        echo "0"
    fi
}

# Clean up old backups based on retention policy
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days"
    
    local count=0
    while IFS= read -r -d '' file; do
        log_info "Removing old backup: $(basename "$file")"
        rm -f "$file"
        ((count++))
    done < <(find "$BACKUP_DIR" -name "${PG_DATABASE}_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -print0 2>/dev/null)
    
    if [[ $count -eq 0 ]]; then
        log_info "No old backups to remove"
    else
        log_info "Removed $count old backup(s)"
    fi
}

# Main execution
main() {
    log_info "=== PostgreSQL Backup Script for Pennywise ==="
    
    # Parse arguments
    parse_args "$@"
    
    # Check password
    if ! check_password; then
        exit 1
    fi
    
    # Create backup directory
    if ! create_backup_dir; then
        exit 1
    fi
    
    # Generate backup filename
    local backup_file=$(generate_backup_filename)
    
    # Perform backup
    local backup_result=0
    if [[ "$USE_DOCKER" == true ]]; then
        if ! check_docker_container; then
            exit 1
        fi
        backup_with_docker "$backup_file" || backup_result=$?
    else
        if ! check_pg_dump; then
            exit 1
        fi
        backup_direct "$backup_file" || backup_result=$?
    fi
    
    # Check backup result
    if [[ $backup_result -ne 0 ]]; then
        exit 1
    fi
    
    # Display backup info
    local backup_path="${BACKUP_DIR}/${backup_file}"
    local file_size=$(get_file_size "$backup_path")
    log_info "Backup file: ${backup_path}"
    log_info "Backup size: ${file_size}"
    
    # Cleanup old backups
    cleanup_old_backups
    
    log_info "=== Backup process completed successfully ==="
    exit 0
}

# Run main function with all arguments
main "$@"
