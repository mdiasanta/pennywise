namespace Pennywise.Api.DTOs;

// Request DTOs

/// <summary>
/// Request to preview or import expenses from Splitwise
/// </summary>
public record SplitwiseImportRequest
{
    /// <summary>
    /// Splitwise group ID to import from
    /// </summary>
    public required long GroupId { get; init; }

    /// <summary>
    /// Splitwise user ID whose share of expenses to import
    /// </summary>
    public required long SplitwiseUserId { get; init; }

    /// <summary>
    /// Start date for filtering expenses (inclusive)
    /// </summary>
    public DateTime? StartDate { get; init; }

    /// <summary>
    /// End date for filtering expenses (inclusive)
    /// </summary>
    public DateTime? EndDate { get; init; }

    /// <summary>
    /// Pennywise user ID to associate expenses with
    /// </summary>
    public int UserId { get; init; }

    /// <summary>
    /// If true, only preview the import without saving
    /// </summary>
    public bool DryRun { get; init; } = true;

    /// <summary>
    /// List of expense IDs to import (from preview selection)
    /// When empty and DryRun=false, import all valid expenses from preview
    /// </summary>
    public List<long>? SelectedExpenseIds { get; init; }

    /// <summary>
    /// Optional per-expense category overrides chosen by the user in the preview UI.
    /// If provided, the import will use the specified Pennywise CategoryId for that Splitwise expense.
    /// </summary>
    public List<SplitwiseExpenseCategoryOverrideDto>? CategoryOverrides { get; init; }
}

/// <summary>
/// Per-expense override of the mapped Pennywise category.
/// </summary>
public record SplitwiseExpenseCategoryOverrideDto
{
    public required long ExpenseId { get; init; }
    public required int CategoryId { get; init; }
}

// Response DTOs - Splitwise API responses

/// <summary>
/// Response indicating whether Splitwise is configured
/// </summary>
public record SplitwiseStatusDto
{
    public bool IsConfigured { get; init; }
    public SplitwiseCurrentUserDto? User { get; init; }
}

/// <summary>
/// Represents a Splitwise group
/// </summary>
public record SplitwiseGroupDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateTime? CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public List<SplitwiseGroupMemberDto> Members { get; init; } = new();
}

/// <summary>
/// Represents a member of a Splitwise group
/// </summary>
public record SplitwiseGroupMemberDto
{
    public long Id { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string? LastName { get; init; }
    public string? Email { get; init; }

    public string DisplayName => string.IsNullOrWhiteSpace(LastName)
        ? FirstName
        : $"{FirstName} {LastName}";
}

/// <summary>
/// Represents a Splitwise expense for preview
/// </summary>
public record SplitwiseExpensePreviewDto
{
    /// <summary>
    /// Splitwise expense ID
    /// </summary>
    public long Id { get; init; }

    /// <summary>
    /// Expense description/title
    /// </summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Total expense cost
    /// </summary>
    public decimal TotalCost { get; init; }

    /// <summary>
    /// Amount the selected user owes
    /// </summary>
    public decimal UserOwes { get; init; }

    /// <summary>
    /// Expense date
    /// </summary>
    public DateTime Date { get; init; }

    /// <summary>
    /// Category from Splitwise (for reference)
    /// </summary>
    public string? SplitwiseCategory { get; init; }

    /// <summary>
    /// Pennywise category that this expense would be imported into by default (mapped from Splitwise).
    /// </summary>
    public int MappedCategoryId { get; init; }

    /// <summary>
    /// Pennywise category name that this expense would be imported into by default.
    /// </summary>
    public string MappedCategoryName { get; init; } = string.Empty;

    /// <summary>
    /// Name of user who paid
    /// </summary>
    public string? PaidBy { get; init; }

    /// <summary>
    /// Whether this expense is a payment (to be ignored)
    /// </summary>
    public bool IsPayment { get; init; }

    /// <summary>
    /// Whether a duplicate exists in Pennywise
    /// </summary>
    public bool IsDuplicate { get; init; }

    /// <summary>
    /// Message explaining duplicate detection or other status
    /// </summary>
    public string? StatusMessage { get; init; }

    /// <summary>
    /// Whether this expense can be imported
    /// </summary>
    public bool CanImport => !IsPayment && !IsDuplicate && UserOwes > 0;
}

/// <summary>
/// Response for Splitwise import preview or import result
/// </summary>
public record SplitwiseImportResponseDto
{
    /// <summary>
    /// Whether this is a dry run preview
    /// </summary>
    public bool DryRun { get; init; }

    /// <summary>
    /// Group name for display
    /// </summary>
    public string GroupName { get; init; } = string.Empty;

    /// <summary>
    /// Selected user's name
    /// </summary>
    public string UserName { get; init; } = string.Empty;

    /// <summary>
    /// Date range start
    /// </summary>
    public DateTime? StartDate { get; init; }

    /// <summary>
    /// Date range end
    /// </summary>
    public DateTime? EndDate { get; init; }

    /// <summary>
    /// Total expenses found
    /// </summary>
    public int TotalExpenses { get; init; }

    /// <summary>
    /// Expenses that are payments (ignored)
    /// </summary>
    public int PaymentsIgnored { get; init; }

    /// <summary>
    /// Duplicate expenses found
    /// </summary>
    public int DuplicatesFound { get; init; }

    /// <summary>
    /// Expenses that can be imported
    /// </summary>
    public int ImportableCount { get; init; }

    /// <summary>
    /// Number of expenses actually imported (0 if dry run)
    /// </summary>
    public int ImportedCount { get; init; }

    /// <summary>
    /// Total amount to be imported
    /// </summary>
    public decimal TotalAmount { get; init; }

    /// <summary>
    /// Preview list of expenses
    /// </summary>
    public List<SplitwiseExpensePreviewDto> Expenses { get; init; } = new();

    /// <summary>
    /// Available Pennywise categories for the user (including default categories).
    /// Used to populate the mapped-category dropdown in the preview UI.
    /// </summary>
    public List<CategoryDto> AvailableCategories { get; init; } = new();
}

/// <summary>
/// Response for listing Splitwise groups
/// </summary>
public record SplitwiseGroupsResponseDto
{
    public List<SplitwiseGroupDto> Groups { get; init; } = new();
}

/// <summary>
/// Response for current Splitwise user
/// </summary>
public record SplitwiseCurrentUserDto
{
    public long Id { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string? LastName { get; init; }
    public string? Email { get; init; }

    public string DisplayName => string.IsNullOrWhiteSpace(LastName)
        ? FirstName
        : $"{FirstName} {LastName}";
}
