namespace Pennywise.Api.DTOs;

public class RecurringTransactionDto
{
    public int Id { get; set; }
    public int AssetId { get; set; }
    public string AssetName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string? DayOfWeek { get; set; }
    public int? DayOfMonth { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime NextRunDate { get; set; }
    public DateTime? LastRunDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateRecurringTransactionDto
{
    public int AssetId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Frequency { get; set; } = "Biweekly"; // Weekly, Biweekly, Monthly, Quarterly, Yearly
    public string? DayOfWeek { get; set; } // Sunday, Monday, ..., Saturday
    public int? DayOfMonth { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class UpdateRecurringTransactionDto
{
    public decimal? Amount { get; set; }
    public string? Description { get; set; }
    public string? Frequency { get; set; }
    public string? DayOfWeek { get; set; }
    public int? DayOfMonth { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? IsActive { get; set; }
}
