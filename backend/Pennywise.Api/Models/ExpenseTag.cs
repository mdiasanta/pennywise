namespace Pennywise.Api.Models;

public class ExpenseTag
{
    public int ExpenseId { get; set; }
    public int TagId { get; set; }

    // Navigation properties
    public Expense Expense { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
