using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class AssetSnapshotRepository : IAssetSnapshotRepository
{
    private readonly PennywiseDbContext _context;

    public AssetSnapshotRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AssetSnapshot>> GetByAssetAsync(int assetId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.AssetSnapshots
            .AsNoTracking()
            .Include(s => s.Asset)
            .Where(s => s.AssetId == assetId);

        if (startDate.HasValue)
        {
            query = query.Where(s => s.Date >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(s => s.Date <= endDate.Value);
        }

        return await query
            .OrderByDescending(s => s.Date)
            .ToListAsync();
    }

    public async Task<AssetSnapshot?> GetByIdAsync(int id)
    {
        return await _context.AssetSnapshots
            .AsNoTracking()
            .Include(s => s.Asset)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<AssetSnapshot?> GetLatestByAssetAsync(int assetId)
    {
        return await _context.AssetSnapshots
            .AsNoTracking()
            .Include(s => s.Asset)
            .Where(s => s.AssetId == assetId)
            .OrderByDescending(s => s.Date)
            .FirstOrDefaultAsync();
    }

    public async Task<AssetSnapshot> CreateAsync(AssetSnapshot snapshot)
    {
        snapshot.CreatedAt = DateTime.UtcNow;
        snapshot.UpdatedAt = DateTime.UtcNow;
        _context.AssetSnapshots.Add(snapshot);
        await _context.SaveChangesAsync();
        
        // Load the asset for the created snapshot
        await _context.Entry(snapshot).Reference(s => s.Asset).LoadAsync();
        
        return snapshot;
    }

    public async Task<AssetSnapshot?> UpdateAsync(AssetSnapshot snapshot)
    {
        var existing = await _context.AssetSnapshots.FindAsync(snapshot.Id);
        if (existing == null)
            return null;

        existing.Balance = snapshot.Balance;
        existing.Date = snapshot.Date;
        existing.Notes = snapshot.Notes;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        
        // Load the asset for the updated snapshot
        await _context.Entry(existing).Reference(s => s.Asset).LoadAsync();
        
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var snapshot = await _context.AssetSnapshots.FindAsync(id);
        if (snapshot == null)
            return false;

        _context.AssetSnapshots.Remove(snapshot);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<AssetSnapshot>> GetByUserAsync(int userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.AssetSnapshots
            .AsNoTracking()
            .Include(s => s.Asset)
            .ThenInclude(a => a.AssetCategory)
            .Where(s => s.Asset.UserId == userId);

        if (startDate.HasValue)
        {
            query = query.Where(s => s.Date >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(s => s.Date <= endDate.Value);
        }

        return await query
            .OrderByDescending(s => s.Date)
            .ToListAsync();
    }

    public async Task<AssetSnapshot?> GetByAssetAndDateAsync(int assetId, DateTime date)
    {
        // Find snapshot on the exact date
        var dateOnly = date.Date;
        return await _context.AssetSnapshots
            .AsNoTracking()
            .Include(s => s.Asset)
            .Where(s => s.AssetId == assetId && s.Date.Date == dateOnly)
            .FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<AssetSnapshot>> GetByAssetAndDatesAsync(int assetId, IEnumerable<DateTime> dates)
    {
        var dateOnlyList = dates.Select(d => d.Date).ToList();
        return await _context.AssetSnapshots
            .Include(s => s.Asset)
            .Where(s => s.AssetId == assetId && dateOnlyList.Contains(s.Date.Date))
            .ToListAsync();
    }
}
