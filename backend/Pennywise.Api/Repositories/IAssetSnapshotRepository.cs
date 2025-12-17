using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface IAssetSnapshotRepository
{
    Task<IEnumerable<AssetSnapshot>> GetByAssetAsync(int assetId, DateTime? startDate = null, DateTime? endDate = null);
    Task<AssetSnapshot?> GetByIdAsync(int id);
    Task<AssetSnapshot?> GetLatestByAssetAsync(int assetId);
    Task<AssetSnapshot> CreateAsync(AssetSnapshot snapshot);
    Task<AssetSnapshot?> UpdateAsync(AssetSnapshot snapshot);
    Task<bool> DeleteAsync(int id);
    Task<IEnumerable<AssetSnapshot>> GetByUserAsync(int userId, DateTime? startDate = null, DateTime? endDate = null);
    Task<AssetSnapshot?> GetByAssetAndDateAsync(int assetId, DateTime date);
    Task<IEnumerable<AssetSnapshot>> GetByAssetAndDatesAsync(int assetId, IEnumerable<DateTime> dates);
}
