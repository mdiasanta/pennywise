using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class ImportAuditRepository : IImportAuditRepository
{
    private readonly PennywiseDbContext _context;

    public ImportAuditRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task RecordAsync(ImportAudit audit)
    {
        audit.CreatedAt = DateTime.UtcNow;
        _context.ImportAudits.Add(audit);
        await _context.SaveChangesAsync();
    }
}
