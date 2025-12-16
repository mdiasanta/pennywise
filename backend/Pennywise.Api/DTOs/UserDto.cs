namespace Pennywise.Api.DTOs;

public class CreateUserDto
{
    public required string Username { get; set; }
    public required string Email { get; set; }
}

public class UpdateUserDto
{
    public string? Username { get; set; }
    public string? Email { get; set; }
}

public class UserDto
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string Email { get; set; }
    public string? PictureUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
