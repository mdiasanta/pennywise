namespace Pennywise.Api.DTOs;

public class AssetSnapshotDto
{
    public int Id { get; set; }
    public decimal Balance { get; set; }
    public DateTime Date { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int AssetId { get; set; }
    public string? AssetName { get; set; }
}

public class CreateAssetSnapshotDto
{
    public decimal Balance { get; set; }
    public DateTime Date { get; set; }
    public string? Notes { get; set; }
    public int AssetId { get; set; }
}

public class UpdateAssetSnapshotDto
{
    public decimal? Balance { get; set; }
    public DateTime? Date { get; set; }
    public string? Notes { get; set; }
}

public class NetWorthSummaryDto
{
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal NetWorth { get; set; }
    public decimal ChangeFromLastPeriod { get; set; }
    public decimal ChangePercent { get; set; }
    public List<AssetCategorySummaryDto> AssetsByCategory { get; set; } = new();
    public List<NetWorthHistoryPointDto> History { get; set; } = new();
}

public class AssetCategorySummaryDto
{
    public int CategoryId { get; set; }
    public required string CategoryName { get; set; }
    public string? Color { get; set; }
    public bool IsLiability { get; set; }
    public decimal TotalBalance { get; set; }
    public List<AssetSummaryDto> Assets { get; set; } = new();
}

public class AssetSummaryDto
{
    public int AssetId { get; set; }
    public required string AssetName { get; set; }
    public string? Color { get; set; }
    public decimal Balance { get; set; }
    public DateTime? LastUpdated { get; set; }
}

public class NetWorthHistoryPointDto
{
    public DateTime Date { get; set; }
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal NetWorth { get; set; }
    public decimal? TotalExpenses { get; set; }
}

public class NetWorthComparisonDto
{
    public List<NetWorthHistoryPointDto> NetWorthHistory { get; set; } = new();
    public List<ExpenseHistoryPointDto> ExpenseHistory { get; set; } = new();
}

public class ExpenseHistoryPointDto
{
    public DateTime Date { get; set; }
    public decimal TotalExpenses { get; set; }
}
