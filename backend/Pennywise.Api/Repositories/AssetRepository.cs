using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class AssetRepository : IAssetRepository
{
    private readonly PennywiseDbContext _context;

    public AssetRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Asset>> GetAllByUserAsync(int userId)
    {
        return await _context.Assets
            .AsNoTracking()
            .Include(a => a.AssetCategory)
            .Include(a => a.Snapshots.OrderByDescending(s => s.Date).Take(1))
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.AssetCategory.SortOrder)
            .ThenBy(a => a.Name)
            .ToListAsync();
    }

    public async Task<Asset?> GetByIdAsync(int id, int userId)
    {
        return await _context.Assets
            .AsNoTracking()
            .Include(a => a.AssetCategory)
            .Include(a => a.Snapshots.OrderByDescending(s => s.Date).Take(1))
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
    }

    public async Task<Asset> CreateAsync(Asset asset)
    {
        asset.CreatedAt = DateTime.UtcNow;
        asset.UpdatedAt = DateTime.UtcNow;
        _context.Assets.Add(asset);
        await _context.SaveChangesAsync();
        
        // Load the category for the created asset
        await _context.Entry(asset).Reference(a => a.AssetCategory).LoadAsync();
        
        return asset;
    }

    public async Task<Asset?> UpdateAsync(Asset asset)
    {
        var existing = await _context.Assets.FindAsync(asset.Id);
        if (existing == null)
            return null;

        existing.Name = asset.Name;
        existing.Description = asset.Description;
        existing.Color = asset.Color;
        existing.AssetCategoryId = asset.AssetCategoryId;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        
        // Load the category for the updated asset
        await _context.Entry(existing).Reference(a => a.AssetCategory).LoadAsync();
        
        return existing;
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var asset = await _context.Assets
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        
        if (asset == null)
            return false;

        _context.Assets.Remove(asset);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Asset>> GetByCategoryAsync(int userId, int categoryId)
    {
        return await _context.Assets
            .AsNoTracking()
            .Include(a => a.AssetCategory)
            .Include(a => a.Snapshots.OrderByDescending(s => s.Date).Take(1))
            .Where(a => a.UserId == userId && a.AssetCategoryId == categoryId)
            .OrderBy(a => a.Name)
            .ToListAsync();
    }
}
