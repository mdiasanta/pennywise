namespace Pennywise.Api.DTOs;

public class AssetCategoryDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public bool IsLiability { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateAssetCategoryDto
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public bool IsLiability { get; set; }
    public int SortOrder { get; set; }
}

public class UpdateAssetCategoryDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public bool? IsLiability { get; set; }
    public int? SortOrder { get; set; }
}
