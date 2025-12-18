namespace Pennywise.Api.DTOs;

public class CreateCategoryDto
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
}

public class UpdateCategoryDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
}

public class CategoryDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsDefault { get; set; }
}
