namespace Pennywise.Api.Models;

public class Asset
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Foreign keys
    public int UserId { get; set; }
    public int AssetCategoryId { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public AssetCategory AssetCategory { get; set; } = null!;
    public ICollection<AssetSnapshot> Snapshots { get; set; } = new List<AssetSnapshot>();
}
