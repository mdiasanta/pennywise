namespace Pennywise.Api.DTOs;

public class GoogleLoginDto
{
    public required string IdToken { get; set; }
}

public class CurrentUserDto
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string Name { get; set; }
    public string? PictureUrl { get; set; }
}
