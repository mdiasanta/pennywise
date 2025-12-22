namespace Pennywise.Api.DTOs;

/// <summary>
/// Capital One credit card types supported for import
/// </summary>
public enum CapitalOneCardType
{
    QuickSilver,
    VentureX
}

/// <summary>
/// Request to preview or import expenses from Capital One CSV
/// </summary>
public record CapitalOneImportRequest
{
    /// <summary>
    /// The type of Capital One card (QuickSilver or VentureX)
    /// </summary>
    public CapitalOneCardType CardType { get; init; }

    /// <summary>
    /// Pennywise user ID to associate expenses with
    /// </summary>
    public int UserId { get; init; }

    /// <summary>
    /// If true, only preview the import without saving
    /// </summary>
    public bool DryRun { get; init; } = true;

    /// <summary>
    /// List of row numbers to import (from preview selection)
    /// When empty and DryRun=false, import all valid expenses from preview
    /// </summary>
    public List<int>? SelectedRowNumbers { get; init; }

    /// <summary>
    /// Optional per-expense category overrides chosen by the user in the preview UI.
    /// If provided, the import will use the specified Pennywise CategoryId for that row.
    /// </summary>
    public List<CapitalOneExpenseCategoryOverrideDto>? CategoryOverrides { get; init; }

    /// <summary>
    /// Optional per-expense amount splits chosen by the user in the preview UI.
    /// If provided, the import will divide the amount by the specified value for that row.
    /// </summary>
    public List<CapitalOneExpenseAmountSplitDto>? AmountSplits { get; init; }
}

/// <summary>
/// Per-expense override of the mapped Pennywise category.
/// </summary>
public record CapitalOneExpenseCategoryOverrideDto
{
    public required int RowNumber { get; init; }
    public required int CategoryId { get; init; }
}

/// <summary>
/// Per-expense amount split divisor.
/// When provided, the imported amount will be divided by this value.
/// </summary>
public record CapitalOneExpenseAmountSplitDto
{
    public required int RowNumber { get; init; }
    public required int SplitBy { get; init; }
}

/// <summary>
/// Represents a Capital One expense for preview
/// </summary>
public record CapitalOneExpensePreviewDto
{
    /// <summary>
    /// Row number in the CSV (for identification)
    /// </summary>
    public int RowNumber { get; init; }

    /// <summary>
    /// Transaction date from CSV
    /// </summary>
    public DateTime TransactionDate { get; init; }

    /// <summary>
    /// Posted date from CSV
    /// </summary>
    public DateTime PostedDate { get; init; }

    /// <summary>
    /// Last 4 digits of card number
    /// </summary>
    public string CardNumber { get; init; } = string.Empty;

    /// <summary>
    /// Description from CSV
    /// </summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Original category from Capital One CSV
    /// </summary>
    public string CapitalOneCategory { get; init; } = string.Empty;

    /// <summary>
    /// Debit amount (expense) - what we'll import
    /// </summary>
    public decimal Amount { get; init; }

    /// <summary>
    /// Pennywise category that this expense would be imported into by default (mapped from Capital One).
    /// </summary>
    public int MappedCategoryId { get; init; }

    /// <summary>
    /// Pennywise category name that this expense would be imported into by default.
    /// </summary>
    public string MappedCategoryName { get; init; } = string.Empty;

    /// <summary>
    /// Whether this is a credit (payment/refund) - will be skipped
    /// </summary>
    public bool IsCredit { get; init; }

    /// <summary>
    /// Whether a duplicate exists in Pennywise
    /// </summary>
    public bool IsDuplicate { get; init; }

    /// <summary>
    /// Message explaining status (credit, duplicate, etc.)
    /// </summary>
    public string? StatusMessage { get; init; }

    /// <summary>
    /// Whether this expense can be imported
    /// </summary>
    public bool CanImport => !IsCredit && !IsDuplicate && Amount > 0;
}

/// <summary>
/// Response for Capital One import preview or import result
/// </summary>
public record CapitalOneImportResponseDto
{
    /// <summary>
    /// Whether this is a dry run preview
    /// </summary>
    public bool DryRun { get; init; }

    /// <summary>
    /// Card type being imported
    /// </summary>
    public string CardType { get; init; } = string.Empty;

    /// <summary>
    /// Name of the file being imported
    /// </summary>
    public string FileName { get; init; } = string.Empty;

    /// <summary>
    /// Total transactions found in the CSV
    /// </summary>
    public int TotalTransactions { get; init; }

    /// <summary>
    /// Credits/payments that will be skipped
    /// </summary>
    public int CreditsSkipped { get; init; }

    /// <summary>
    /// Duplicate transactions found
    /// </summary>
    public int DuplicatesFound { get; init; }

    /// <summary>
    /// Transactions that can be imported
    /// </summary>
    public int ImportableCount { get; init; }

    /// <summary>
    /// Number of transactions actually imported (0 if dry run)
    /// </summary>
    public int ImportedCount { get; init; }

    /// <summary>
    /// Total amount to be imported
    /// </summary>
    public decimal TotalAmount { get; init; }

    /// <summary>
    /// Preview list of expenses
    /// </summary>
    public List<CapitalOneExpensePreviewDto> Expenses { get; init; } = new();

    /// <summary>
    /// Available Pennywise categories for the user (including default categories).
    /// Used to populate the mapped-category dropdown in the preview UI.
    /// </summary>
    public List<CategoryDto> AvailableCategories { get; init; } = new();
}
