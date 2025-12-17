using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface IAssetSnapshotService
{
    Task<IEnumerable<AssetSnapshotDto>> GetByAssetAsync(int assetId, DateTime? startDate = null, DateTime? endDate = null);
    Task<AssetSnapshotDto?> GetByIdAsync(int id);
    Task<AssetSnapshotDto?> GetLatestByAssetAsync(int assetId);
    Task<AssetSnapshotDto> CreateAsync(CreateAssetSnapshotDto createDto);
    Task<AssetSnapshotDto?> UpdateAsync(int id, UpdateAssetSnapshotDto updateDto);
    Task<bool> DeleteAsync(int id);
}
