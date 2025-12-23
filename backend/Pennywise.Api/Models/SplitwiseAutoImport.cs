namespace Pennywise.Api.Models;

/// <summary>
/// Represents an auto-import schedule for Splitwise expenses
/// </summary>
public class SplitwiseAutoImport
{
    public int Id { get; set; }
    
    /// <summary>
    /// The Pennywise user ID who owns this auto-import
    /// </summary>
    public int UserId { get; set; }
    
    /// <summary>
    /// The Splitwise group ID to import from
    /// </summary>
    public long GroupId { get; set; }
    
    /// <summary>
    /// The Splitwise group name (for display)
    /// </summary>
    public string GroupName { get; set; } = string.Empty;
    
    /// <summary>
    /// The Splitwise user ID whose share to import
    /// </summary>
    public long SplitwiseUserId { get; set; }
    
    /// <summary>
    /// The Splitwise member name (for display)
    /// </summary>
    public string SplitwiseMemberName { get; set; } = string.Empty;
    
    /// <summary>
    /// The start date from which to import expenses (inclusive)
    /// </summary>
    public DateTime StartDate { get; set; }
    
    /// <summary>
    /// The frequency of auto-import (Daily, Weekly, Monthly)
    /// </summary>
    public AutoImportFrequency Frequency { get; set; }
    
    /// <summary>
    /// Whether this auto-import is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>
    /// The last time this auto-import was run
    /// </summary>
    public DateTime? LastRunAt { get; set; }
    
    /// <summary>
    /// The next scheduled run time
    /// </summary>
    public DateTime NextRunAt { get; set; }
    
    /// <summary>
    /// Number of expenses imported in the last run
    /// </summary>
    public int LastRunImportedCount { get; set; }
    
    /// <summary>
    /// Any error message from the last run
    /// </summary>
    public string? LastRunError { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
}

public enum AutoImportFrequency
{
    Daily,
    Weekly,
    Monthly
}
