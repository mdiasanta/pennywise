using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface IAssetService
{
    Task<IEnumerable<AssetDto>> GetAllByUserAsync(int userId);
    Task<AssetDto?> GetByIdAsync(int id, int userId);
    Task<AssetDto> CreateAsync(CreateAssetDto createDto);
    Task<AssetDto?> UpdateAsync(int id, int userId, UpdateAssetDto updateDto);
    Task<bool> DeleteAsync(int id, int userId);
    Task<IEnumerable<AssetDto>> GetByCategoryAsync(int userId, int categoryId);
}
