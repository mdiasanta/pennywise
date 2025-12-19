namespace Pennywise.Api.DTOs;

public class CreateTagDto
{
    public required string Name { get; set; }
    public string? Color { get; set; }
}

public class UpdateTagDto
{
    public string? Name { get; set; }
    public string? Color { get; set; }
}

public class TagDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int UserId { get; set; }
}
