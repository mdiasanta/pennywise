using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface IExportAuditService
{
    Task<ExportAuditDto> RecordAsync(int userId, string format, string? filterParams, int? rowCount, string? clientIp);
    Task<IEnumerable<ExportAuditDto>> GetRecentAsync(int? userId = null, int take = 100);
}
