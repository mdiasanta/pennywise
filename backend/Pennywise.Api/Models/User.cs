namespace Pennywise.Api.Models;

public class User
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string Email { get; set; }
    public string? GoogleSubjectId { get; set; }
    public string? PictureUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
}
