using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;

namespace Pennywise.Api.Services;

public class GoogleTokenValidator : IGoogleTokenValidator
{
    private readonly string _clientId;
    private readonly ILogger<GoogleTokenValidator> _logger;
    private readonly HttpClient _httpClient;

    // Google's public keys endpoint
    private const string GoogleCertsUrl = "https://www.googleapis.com/oauth2/v3/certs";
    private const string GoogleIssuer1 = "https://accounts.google.com";
    private const string GoogleIssuer2 = "accounts.google.com";

    public GoogleTokenValidator(
        IConfiguration configuration,
        ILogger<GoogleTokenValidator> logger,
        IHttpClientFactory httpClientFactory)
    {
        _clientId = configuration["Authentication:Google:ClientId"]
            ?? throw new ArgumentException("GOOGLE_CLIENT_ID is not configured");
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("GoogleTokenValidator");
    }

    public async Task<GoogleUserInfo?> ValidateTokenAsync(string idToken)
    {
        try
        {
            // Fetch Google's public keys
            var jwks = await GetGoogleJwksAsync();
            if (jwks == null)
            {
                _logger.LogError("Failed to fetch Google JWKS");
                return null;
            }

            var tokenHandler = new JwtSecurityTokenHandler();

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuers = new[] { GoogleIssuer1, GoogleIssuer2 },
                ValidateAudience = true,
                ValidAudience = _clientId,
                ValidateLifetime = true,
                IssuerSigningKeys = jwks.GetSigningKeys(),
                ValidateIssuerSigningKey = true,
            };

            ClaimsPrincipal principal = tokenHandler.ValidateToken(idToken, validationParameters, out SecurityToken validatedToken);

            var jwtToken = (JwtSecurityToken)validatedToken;

            // Extract claims
            var subject = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? principal.FindFirst("sub")?.Value;
            var email = principal.FindFirst(ClaimTypes.Email)?.Value
                ?? principal.FindFirst("email")?.Value;
            var name = principal.FindFirst(ClaimTypes.Name)?.Value
                ?? principal.FindFirst("name")?.Value;
            var picture = principal.FindFirst("picture")?.Value;

            if (string.IsNullOrEmpty(subject) || string.IsNullOrEmpty(email))
            {
                _logger.LogWarning("Token missing required claims (sub or email)");
                return null;
            }

            return new GoogleUserInfo
            {
                Subject = subject,
                Email = email,
                Name = name,
                Picture = picture
            };
        }
        catch (SecurityTokenExpiredException ex)
        {
            _logger.LogWarning(ex, "Google ID token has expired");
            return null;
        }
        catch (SecurityTokenInvalidSignatureException ex)
        {
            _logger.LogWarning(ex, "Google ID token has invalid signature");
            return null;
        }
        catch (SecurityTokenInvalidAudienceException ex)
        {
            _logger.LogWarning(ex, "Google ID token has invalid audience");
            return null;
        }
        catch (SecurityTokenInvalidIssuerException ex)
        {
            _logger.LogWarning(ex, "Google ID token has invalid issuer");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating Google ID token");
            return null;
        }
    }

    private async Task<JsonWebKeySet?> GetGoogleJwksAsync()
    {
        try
        {
            var response = await _httpClient.GetStringAsync(GoogleCertsUrl);
            return new JsonWebKeySet(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch Google JWKS");
            return null;
        }
    }
}
