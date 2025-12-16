using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface IAssetCategoryRepository
{
    Task<IEnumerable<AssetCategory>> GetAllAsync();
    Task<AssetCategory?> GetByIdAsync(int id);
    Task<AssetCategory> CreateAsync(AssetCategory assetCategory);
    Task<AssetCategory?> UpdateAsync(AssetCategory assetCategory);
    Task<bool> DeleteAsync(int id);
}
