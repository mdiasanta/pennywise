namespace Pennywise.Api.Models;

public class Tag
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Foreign key - tags belong to a user
    public int UserId { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<ExpenseTag> ExpenseTags { get; set; } = new List<ExpenseTag>();
}
