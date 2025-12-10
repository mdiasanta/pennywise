using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class ImportAuditService : IImportAuditService
{
    private readonly IImportAuditRepository _repository;

    public ImportAuditService(IImportAuditRepository repository)
    {
        _repository = repository;
    }

    public Task RecordAsync(ImportAudit audit)
    {
        return _repository.RecordAsync(audit);
    }
}
