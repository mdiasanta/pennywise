namespace Pennywise.Api.Models;

public class RecurringTransaction
{
    public int Id { get; set; }
    public int AssetId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public RecurringFrequency Frequency { get; set; }
    public DayOfWeek? DayOfWeek { get; set; } // For weekly/biweekly - which day
    public int? DayOfMonth { get; set; } // For monthly - which day (1-31)
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; } // Optional end date
    public DateTime NextRunDate { get; set; }
    public DateTime? LastRunDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public virtual Asset Asset { get; set; } = null!;
}

public enum RecurringFrequency
{
    Weekly = 0,
    Biweekly = 1,
    Monthly = 2,
    Quarterly = 3,
    Yearly = 4
}
