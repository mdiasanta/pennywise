using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class SplitwiseAutoImportRepository : ISplitwiseAutoImportRepository
{
    private readonly PennywiseDbContext _context;

    public SplitwiseAutoImportRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<SplitwiseAutoImport>> GetAllByUserAsync(int userId)
    {
        return await _context.SplitwiseAutoImports
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }

    public async Task<SplitwiseAutoImport?> GetByIdAsync(int id, int userId)
    {
        return await _context.SplitwiseAutoImports
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
    }

    public async Task<SplitwiseAutoImport?> GetByGroupAndMemberAsync(int userId, long groupId, long splitwiseUserId)
    {
        return await _context.SplitwiseAutoImports
            .FirstOrDefaultAsync(a => a.UserId == userId && a.GroupId == groupId && a.SplitwiseUserId == splitwiseUserId);
    }

    public async Task<IEnumerable<SplitwiseAutoImport>> GetPendingImportsAsync(DateTime asOf)
    {
        return await _context.SplitwiseAutoImports
            .Where(a => a.IsActive && a.NextRunAt <= asOf)
            .OrderBy(a => a.NextRunAt)
            .ToListAsync();
    }

    public async Task<SplitwiseAutoImport> CreateAsync(SplitwiseAutoImport autoImport)
    {
        autoImport.CreatedAt = DateTime.UtcNow;
        autoImport.UpdatedAt = DateTime.UtcNow;
        
        _context.SplitwiseAutoImports.Add(autoImport);
        await _context.SaveChangesAsync();
        
        return autoImport;
    }

    public async Task<SplitwiseAutoImport?> UpdateAsync(SplitwiseAutoImport autoImport)
    {
        var existing = await _context.SplitwiseAutoImports
            .FirstOrDefaultAsync(a => a.Id == autoImport.Id);
            
        if (existing == null)
            return null;
            
        existing.GroupId = autoImport.GroupId;
        existing.GroupName = autoImport.GroupName;
        existing.SplitwiseUserId = autoImport.SplitwiseUserId;
        existing.SplitwiseMemberName = autoImport.SplitwiseMemberName;
        existing.StartDate = autoImport.StartDate;
        existing.Frequency = autoImport.Frequency;
        existing.IsActive = autoImport.IsActive;
        existing.NextRunAt = autoImport.NextRunAt;
        existing.LastRunAt = autoImport.LastRunAt;
        existing.LastRunImportedCount = autoImport.LastRunImportedCount;
        existing.LastRunError = autoImport.LastRunError;
        existing.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        return existing;
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var autoImport = await _context.SplitwiseAutoImports
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            
        if (autoImport == null)
            return false;
            
        _context.SplitwiseAutoImports.Remove(autoImport);
        await _context.SaveChangesAsync();
        
        return true;
    }
}
