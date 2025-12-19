namespace Pennywise.Api.DTOs;

public record AssetSnapshotImportRowResultDto
{
    public int RowNumber { get; init; }
    public string Status { get; init; } = "valid"; // valid, inserted, updated, skipped, error
    public string? Message { get; init; }
}

public record AssetSnapshotImportResponseDto
{
    public string FileName { get; init; } = string.Empty;
    public bool DryRun { get; init; }
    public string DuplicateStrategy { get; init; } = "skip";
    public string? Timezone { get; init; }
    public int TotalRows { get; init; }
    public int Inserted { get; init; }
    public int Updated { get; init; }
    public int Skipped { get; init; }
    public List<AssetSnapshotImportRowResultDto> Rows { get; init; } = new();
    public int Errors => Rows.Count(r =>
        string.Equals(r.Status, "error", StringComparison.OrdinalIgnoreCase));
}
