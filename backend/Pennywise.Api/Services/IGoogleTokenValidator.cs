namespace Pennywise.Api.Services;

public class GoogleUserInfo
{
    public required string Subject { get; set; }
    public required string Email { get; set; }
    public string? Name { get; set; }
    public string? Picture { get; set; }
}

public interface IGoogleTokenValidator
{
    Task<GoogleUserInfo?> ValidateTokenAsync(string idToken);
}
