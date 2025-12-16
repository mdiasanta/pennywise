namespace Pennywise.Api.DTOs;

public class AssetDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int UserId { get; set; }
    public int AssetCategoryId { get; set; }
    public string? AssetCategoryName { get; set; }
    public bool IsLiability { get; set; }
    public decimal? CurrentBalance { get; set; }
    public DateTime? LastUpdated { get; set; }
}

public class CreateAssetDto
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public int UserId { get; set; }
    public int AssetCategoryId { get; set; }
    public decimal? InitialBalance { get; set; }
}

public class UpdateAssetDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public int? AssetCategoryId { get; set; }
}
