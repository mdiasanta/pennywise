using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class ExportAuditService : IExportAuditService
{
    private readonly IExportAuditRepository _repository;

    public ExportAuditService(IExportAuditRepository repository)
    {
        _repository = repository;
    }

    public async Task<ExportAuditDto> RecordAsync(int userId, string format, string? filterParams, int? rowCount, string? clientIp)
    {
        var audit = new ExportAudit
        {
            UserId = userId,
            Format = format,
            FilterParams = filterParams,
            RowCount = rowCount,
            ClientIp = clientIp,
            Timestamp = DateTime.UtcNow
        };

        var saved = await _repository.AddAsync(audit);
        return MapToDto(saved);
    }

    public async Task<IEnumerable<ExportAuditDto>> GetRecentAsync(int? userId = null, int take = 100)
    {
        var audits = await _repository.GetRecentAsync(userId, take);
        return audits.Select(MapToDto);
    }

    private static ExportAuditDto MapToDto(ExportAudit audit) => new()
    {
        Id = audit.Id,
        UserId = audit.UserId,
        Timestamp = audit.Timestamp,
        Format = audit.Format,
        FilterParams = audit.FilterParams,
        RowCount = audit.RowCount,
        ClientIp = audit.ClientIp
    };
}
