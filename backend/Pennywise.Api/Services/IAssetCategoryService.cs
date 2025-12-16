using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface IAssetCategoryService
{
    Task<IEnumerable<AssetCategoryDto>> GetAllAsync();
    Task<AssetCategoryDto?> GetByIdAsync(int id);
    Task<AssetCategoryDto> CreateAsync(CreateAssetCategoryDto createDto);
    Task<AssetCategoryDto?> UpdateAsync(int id, UpdateAssetCategoryDto updateDto);
    Task<bool> DeleteAsync(int id);
}
