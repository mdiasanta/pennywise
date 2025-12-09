using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class ExportAuditRepository : IExportAuditRepository
{
    private readonly PennywiseDbContext _context;

    public ExportAuditRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<ExportAudit> AddAsync(ExportAudit audit)
    {
        _context.ExportAudits.Add(audit);
        await _context.SaveChangesAsync();
        return audit;
    }

    public async Task<IEnumerable<ExportAudit>> GetRecentAsync(int? userId = null, int take = 100)
    {
        IQueryable<ExportAudit> query = _context.ExportAudits
            .AsNoTracking()
            .OrderByDescending(a => a.Timestamp);

        if (userId.HasValue)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }

        return await query.Take(take).ToListAsync();
    }
}
