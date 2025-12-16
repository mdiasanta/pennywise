namespace Pennywise.Api.Models;

public class AssetCategory
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public bool IsLiability { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation property
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
}
