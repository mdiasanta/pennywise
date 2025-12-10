using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface IImportAuditRepository
{
    Task RecordAsync(ImportAudit audit);
}
