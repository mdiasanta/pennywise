using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class AssetCategoryService : IAssetCategoryService
{
    private readonly IAssetCategoryRepository _assetCategoryRepository;

    public AssetCategoryService(IAssetCategoryRepository assetCategoryRepository)
    {
        _assetCategoryRepository = assetCategoryRepository;
    }

    public async Task<IEnumerable<AssetCategoryDto>> GetAllAsync()
    {
        var categories = await _assetCategoryRepository.GetAllAsync();
        return categories.Select(MapToDto);
    }

    public async Task<AssetCategoryDto?> GetByIdAsync(int id)
    {
        var category = await _assetCategoryRepository.GetByIdAsync(id);
        return category != null ? MapToDto(category) : null;
    }

    public async Task<AssetCategoryDto> CreateAsync(CreateAssetCategoryDto createDto)
    {
        var assetCategory = new AssetCategory
        {
            Name = createDto.Name,
            Description = createDto.Description,
            Color = createDto.Color,
            IsLiability = createDto.IsLiability,
            SortOrder = createDto.SortOrder
        };

        var created = await _assetCategoryRepository.CreateAsync(assetCategory);
        return MapToDto(created);
    }

    public async Task<AssetCategoryDto?> UpdateAsync(int id, UpdateAssetCategoryDto updateDto)
    {
        var existing = await _assetCategoryRepository.GetByIdAsync(id);
        if (existing == null)
            return null;

        if (updateDto.Name != null)
            existing.Name = updateDto.Name;
        if (updateDto.Description != null)
            existing.Description = updateDto.Description;
        if (updateDto.Color != null)
            existing.Color = updateDto.Color;
        if (updateDto.IsLiability.HasValue)
            existing.IsLiability = updateDto.IsLiability.Value;
        if (updateDto.SortOrder.HasValue)
            existing.SortOrder = updateDto.SortOrder.Value;

        var updated = await _assetCategoryRepository.UpdateAsync(existing);
        return updated != null ? MapToDto(updated) : null;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        return await _assetCategoryRepository.DeleteAsync(id);
    }

    private static AssetCategoryDto MapToDto(AssetCategory category)
    {
        return new AssetCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            Color = category.Color,
            IsLiability = category.IsLiability,
            SortOrder = category.SortOrder,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        };
    }
}
