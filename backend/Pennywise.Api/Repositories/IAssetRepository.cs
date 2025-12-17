using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface IAssetRepository
{
    Task<IEnumerable<Asset>> GetAllByUserAsync(int userId);
    Task<Asset?> GetByIdAsync(int id, int userId);
    Task<Asset> CreateAsync(Asset asset);
    Task<Asset?> UpdateAsync(Asset asset);
    Task<bool> DeleteAsync(int id, int userId);
    Task<IEnumerable<Asset>> GetByCategoryAsync(int userId, int categoryId);
}
