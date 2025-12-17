using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class AssetSnapshotService : IAssetSnapshotService
{
    private readonly IAssetSnapshotRepository _snapshotRepository;

    public AssetSnapshotService(IAssetSnapshotRepository snapshotRepository)
    {
        _snapshotRepository = snapshotRepository;
    }

    public async Task<IEnumerable<AssetSnapshotDto>> GetByAssetAsync(int assetId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var snapshots = await _snapshotRepository.GetByAssetAsync(assetId, startDate, endDate);
        return snapshots.Select(MapToDto);
    }

    public async Task<AssetSnapshotDto?> GetByIdAsync(int id)
    {
        var snapshot = await _snapshotRepository.GetByIdAsync(id);
        return snapshot != null ? MapToDto(snapshot) : null;
    }

    public async Task<AssetSnapshotDto?> GetLatestByAssetAsync(int assetId)
    {
        var snapshot = await _snapshotRepository.GetLatestByAssetAsync(assetId);
        return snapshot != null ? MapToDto(snapshot) : null;
    }

    public async Task<AssetSnapshotDto> CreateAsync(CreateAssetSnapshotDto createDto)
    {
        // Check if there's already a snapshot for this asset on this date
        var existingSnapshot = await _snapshotRepository.GetByAssetAndDateAsync(createDto.AssetId, createDto.Date);
        
        if (existingSnapshot != null)
        {
            // Update the existing snapshot instead of creating a new one
            existingSnapshot.Balance = createDto.Balance;
            existingSnapshot.Notes = createDto.Notes;
            var updated = await _snapshotRepository.UpdateAsync(existingSnapshot);
            return MapToDto(updated!);
        }

        var snapshot = new AssetSnapshot
        {
            AssetId = createDto.AssetId,
            Balance = createDto.Balance,
            Date = createDto.Date,
            Notes = createDto.Notes
        };

        var created = await _snapshotRepository.CreateAsync(snapshot);
        return MapToDto(created);
    }

    public async Task<BulkCreateAssetSnapshotResultDto> CreateBulkAsync(BulkCreateAssetSnapshotDto bulkCreateDto)
    {
        var result = new BulkCreateAssetSnapshotResultDto();
        var snapshots = new List<AssetSnapshotDto>();

        // Fetch all existing snapshots for the given dates in a single query
        var entryDates = bulkCreateDto.Entries.Select(e => e.Date).ToList();
        var existingSnapshots = await _snapshotRepository.GetByAssetAndDatesAsync(bulkCreateDto.AssetId, entryDates);
        var existingByDate = existingSnapshots.ToDictionary(s => s.Date.Date);

        foreach (var entry in bulkCreateDto.Entries)
        {
            if (existingByDate.TryGetValue(entry.Date.Date, out var existingSnapshot))
            {
                // Update the existing snapshot
                existingSnapshot.Balance = entry.Balance;
                existingSnapshot.Notes = entry.Notes;
                var updated = await _snapshotRepository.UpdateAsync(existingSnapshot);
                snapshots.Add(MapToDto(updated!));
                result.Updated++;
            }
            else
            {
                // Create a new snapshot
                var snapshot = new AssetSnapshot
                {
                    AssetId = bulkCreateDto.AssetId,
                    Balance = entry.Balance,
                    Date = entry.Date,
                    Notes = entry.Notes
                };

                var created = await _snapshotRepository.CreateAsync(snapshot);
                snapshots.Add(MapToDto(created));
                result.Created++;
            }
        }

        result.Snapshots = snapshots;
        return result;
    }

    public async Task<AssetSnapshotDto?> UpdateAsync(int id, UpdateAssetSnapshotDto updateDto)
    {
        var existing = await _snapshotRepository.GetByIdAsync(id);
        if (existing == null)
            return null;

        if (updateDto.Balance.HasValue)
            existing.Balance = updateDto.Balance.Value;
        if (updateDto.Date.HasValue)
            existing.Date = updateDto.Date.Value;
        if (updateDto.Notes != null)
            existing.Notes = updateDto.Notes;

        var updated = await _snapshotRepository.UpdateAsync(existing);
        return updated != null ? MapToDto(updated) : null;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        return await _snapshotRepository.DeleteAsync(id);
    }

    private static AssetSnapshotDto MapToDto(AssetSnapshot snapshot)
    {
        return new AssetSnapshotDto
        {
            Id = snapshot.Id,
            Balance = snapshot.Balance,
            Date = snapshot.Date,
            Notes = snapshot.Notes,
            CreatedAt = snapshot.CreatedAt,
            UpdatedAt = snapshot.UpdatedAt,
            AssetId = snapshot.AssetId,
            AssetName = snapshot.Asset?.Name
        };
    }
}
