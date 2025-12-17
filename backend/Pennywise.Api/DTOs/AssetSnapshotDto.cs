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

public class NetWorthProjectionDto
{
    public decimal CurrentNetWorth { get; set; }
    public decimal AverageMonthlyExpenses { get; set; }
    public decimal AverageMonthlyNetChange { get; set; }
    public decimal RecurringTransfersMonthlyTotal { get; set; }
    public decimal ProjectedMonthlyChange { get; set; }
    public bool IncludesRecurringTransfers { get; set; }
    public List<NetWorthProjectionPointDto> ProjectedHistory { get; set; } = new();
    public List<RecurringTransferSummaryDto> RecurringTransfers { get; set; } = new();
    public NetWorthGoalDto? Goal { get; set; }
    public ProjectionCalculationDescriptionDto CalculationDescriptions { get; set; } = new();
}

public class NetWorthProjectionPointDto
{
    public DateTime Date { get; set; }
    public decimal ProjectedNetWorth { get; set; }
    public bool IsHistorical { get; set; }
}

public class NetWorthGoalDto
{
    public decimal GoalAmount { get; set; }
    public DateTime? EstimatedGoalDate { get; set; }
    public int? MonthsToGoal { get; set; }
    public bool IsAchievable { get; set; }
}

public class RecurringTransferSummaryDto
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Frequency { get; set; } = string.Empty;
    public decimal MonthlyEquivalent { get; set; }
}

public class ProjectionCalculationDescriptionDto
{
    public string AverageMonthlyExpenses { get; set; } = string.Empty;
    public string AverageMonthlyNetChange { get; set; } = string.Empty;
    public string RecurringTransfersMonthlyTotal { get; set; } = string.Empty;
    public string ProjectedMonthlyChange { get; set; } = string.Empty;
    public string Projection { get; set; } = string.Empty;
}
