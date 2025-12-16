using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class AssetCategoryRepository : IAssetCategoryRepository
{
    private readonly PennywiseDbContext _context;

    public AssetCategoryRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AssetCategory>> GetAllAsync()
    {
        return await _context.AssetCategories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<AssetCategory?> GetByIdAsync(int id)
    {
        return await _context.AssetCategories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<AssetCategory> CreateAsync(AssetCategory assetCategory)
    {
        assetCategory.CreatedAt = DateTime.UtcNow;
        assetCategory.UpdatedAt = DateTime.UtcNow;
        _context.AssetCategories.Add(assetCategory);
        await _context.SaveChangesAsync();
        return assetCategory;
    }

    public async Task<AssetCategory?> UpdateAsync(AssetCategory assetCategory)
    {
        var existing = await _context.AssetCategories.FindAsync(assetCategory.Id);
        if (existing == null)
            return null;

        existing.Name = assetCategory.Name;
        existing.Description = assetCategory.Description;
        existing.Color = assetCategory.Color;
        existing.IsLiability = assetCategory.IsLiability;
        existing.SortOrder = assetCategory.SortOrder;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var assetCategory = await _context.AssetCategories.FindAsync(id);
        if (assetCategory == null)
            return false;

        _context.AssetCategories.Remove(assetCategory);
        await _context.SaveChangesAsync();
        return true;
    }
}
