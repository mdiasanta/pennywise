using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface IExportAuditRepository
{
    Task<ExportAudit> AddAsync(ExportAudit audit);
    Task<IEnumerable<ExportAudit>> GetRecentAsync(int? userId = null, int take = 100);
}
