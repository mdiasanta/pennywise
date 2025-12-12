using Pennywise.Api.Models;

namespace Pennywise.Api.Services;

public interface IImportAuditService
{
    Task RecordAsync(ImportAudit audit);
}
