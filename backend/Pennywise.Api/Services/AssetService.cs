using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class AssetService : IAssetService
{
    private readonly IAssetRepository _assetRepository;
    private readonly IAssetSnapshotRepository _snapshotRepository;

    public AssetService(IAssetRepository assetRepository, IAssetSnapshotRepository snapshotRepository)
    {
        _assetRepository = assetRepository;
        _snapshotRepository = snapshotRepository;
    }

    public async Task<IEnumerable<AssetDto>> GetAllByUserAsync(int userId)
    {
        var assets = await _assetRepository.GetAllByUserAsync(userId);
        return assets.Select(MapToDto);
    }

    public async Task<AssetDto?> GetByIdAsync(int id, int userId)
    {
        var asset = await _assetRepository.GetByIdAsync(id, userId);
        return asset != null ? MapToDto(asset) : null;
    }

    public async Task<AssetDto> CreateAsync(CreateAssetDto createDto)
    {
        var asset = new Asset
        {
            Name = createDto.Name,
            Description = createDto.Description,
            Color = createDto.Color,
            UserId = createDto.UserId,
            AssetCategoryId = createDto.AssetCategoryId
        };

        var created = await _assetRepository.CreateAsync(asset);

        // If an initial balance is provided, create an initial snapshot
        if (createDto.InitialBalance.HasValue)
        {
            var snapshot = new AssetSnapshot
            {
                AssetId = created.Id,
                Balance = createDto.InitialBalance.Value,
                Date = DateTime.UtcNow,
                Notes = "Initial balance"
            };
            await _snapshotRepository.CreateAsync(snapshot);

            // Reload the asset to include the snapshot
            var reloaded = await _assetRepository.GetByIdAsync(created.Id, createDto.UserId);
            if (reloaded != null)
                return MapToDto(reloaded);
        }

        return MapToDto(created);
    }

    public async Task<AssetDto?> UpdateAsync(int id, int userId, UpdateAssetDto updateDto)
    {
        var existing = await _assetRepository.GetByIdAsync(id, userId);
        if (existing == null)
            return null;

        if (updateDto.Name != null)
            existing.Name = updateDto.Name;
        if (updateDto.Description != null)
            existing.Description = updateDto.Description;
        if (updateDto.Color != null)
            existing.Color = updateDto.Color;
        if (updateDto.AssetCategoryId.HasValue)
            existing.AssetCategoryId = updateDto.AssetCategoryId.Value;

        var updated = await _assetRepository.UpdateAsync(existing);
        return updated != null ? MapToDto(updated) : null;
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        return await _assetRepository.DeleteAsync(id, userId);
    }

    public async Task<IEnumerable<AssetDto>> GetByCategoryAsync(int userId, int categoryId)
    {
        var assets = await _assetRepository.GetByCategoryAsync(userId, categoryId);
        return assets.Select(MapToDto);
    }

    private static AssetDto MapToDto(Asset asset)
    {
        var latestSnapshot = asset.Snapshots?.OrderByDescending(s => s.Date).FirstOrDefault();
        
        return new AssetDto
        {
            Id = asset.Id,
            Name = asset.Name,
            Description = asset.Description,
            Color = asset.Color,
            CreatedAt = asset.CreatedAt,
            UpdatedAt = asset.UpdatedAt,
            UserId = asset.UserId,
            AssetCategoryId = asset.AssetCategoryId,
            AssetCategoryName = asset.AssetCategory?.Name,
            IsLiability = asset.AssetCategory?.IsLiability ?? false,
            CurrentBalance = latestSnapshot?.Balance,
            LastUpdated = latestSnapshot?.Date
        };
    }
}
