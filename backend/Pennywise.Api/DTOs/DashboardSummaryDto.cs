namespace Pennywise.Api.DTOs;

public class DashboardSummaryDto
{
    public decimal TotalTracked { get; set; }
    public decimal MonthTracked { get; set; }
    public decimal MonthChangePercent { get; set; }
    public decimal AverageTicket { get; set; }
    public int ActiveCategories { get; set; }
    public decimal SpentThisMonth { get; set; }
    public decimal RemainingThisMonth { get; set; }
    public IEnumerable<TransactionSummaryDto> RecentTransactions { get; set; } = Enumerable.Empty<TransactionSummaryDto>();
}

public class TransactionSummaryDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string? Category { get; set; }
    public string? CategoryColor { get; set; }
}
