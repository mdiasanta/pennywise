namespace Pennywise.Api.Models;

public class AssetSnapshot
{
    public int Id { get; set; }
    public decimal Balance { get; set; }
    public DateTime Date { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Foreign keys
    public int AssetId { get; set; }

    // Navigation properties
    public Asset Asset { get; set; } = null!;
}
