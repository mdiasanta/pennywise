using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface IExportAuditService
{
    /// <summary>
    /// Records an export audit entry for compliance and tracking purposes.
    /// </summary>
    /// <param name="userId">The ID of the user performing the export.</param>
    /// <param name="format">The export format (csv or xlsx).</param>
    /// <param name="filterParams">JSON-serialized filter parameters applied to the export.</param>
    /// <param name="rowCount">The number of rows exported.</param>
    /// <param name="clientIp">The client's IP address.</param>
    /// <returns>The created audit entry.</returns>
    Task<ExportAuditDto> RecordAsync(int userId, string format, string? filterParams, int? rowCount, string? clientIp);

    /// <summary>
    /// Retrieves recent export audit entries, optionally filtered by user.
    /// </summary>
    /// <param name="userId">Optional user ID to filter audit entries.</param>
    /// <param name="take">Maximum number of entries to return (default 100).</param>
    /// <returns>A collection of export audit entries.</returns>
    Task<IEnumerable<ExportAuditDto>> GetRecentAsync(int? userId = null, int take = 100);
}
