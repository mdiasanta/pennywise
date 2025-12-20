using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public class AssetSnapshotImportRequest
{
    public required Stream FileStream { get; init; }
    public required string FileName { get; init; }
    public int AssetId { get; init; }
    public int UserId { get; init; }
    public string DuplicateStrategy { get; init; } = "skip";
    public string? Timezone { get; init; }
    public bool DryRun { get; init; } = true;
}

public class BulkAssetSnapshotImportRequest
{
    public required Stream FileStream { get; init; }
    public required string FileName { get; init; }
    public int UserId { get; init; }
    public string DuplicateStrategy { get; init; } = "skip";
    public string? Timezone { get; init; }
    public bool DryRun { get; init; } = true;
}

public interface IAssetSnapshotImportService
{
    Task<(byte[] Content, string ContentType, string FileName)> GenerateTemplateAsync(string format, int assetId, int userId);
    Task<(byte[] Content, string ContentType, string FileName)> GenerateBulkTemplateAsync(string format, int userId);
    Task<AssetSnapshotImportResponseDto> ImportAsync(AssetSnapshotImportRequest request);
    Task<AssetSnapshotImportResponseDto> BulkImportAsync(BulkAssetSnapshotImportRequest request);
}
