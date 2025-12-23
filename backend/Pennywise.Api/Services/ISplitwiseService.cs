using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface ISplitwiseService
{
    /// <summary>
    /// Checks if Splitwise API is configured with a valid API key
    /// </summary>
    bool IsConfigured { get; }
    
    /// <summary>
    /// Validates the configured Splitwise API key and returns the current user
    /// </summary>
    Task<SplitwiseCurrentUserDto?> ValidateApiKeyAsync();
    
    /// <summary>
    /// Gets all groups for the authenticated user
    /// </summary>
    Task<List<SplitwiseGroupDto>> GetGroupsAsync();
    
    /// <summary>
    /// Gets members of a specific group
    /// </summary>
    Task<List<SplitwiseGroupMemberDto>> GetGroupMembersAsync(long groupId);
    
    /// <summary>
    /// Previews or imports expenses from Splitwise
    /// </summary>
    Task<SplitwiseImportResponseDto> ImportExpensesAsync(SplitwiseImportRequest request);
    
    /// <summary>
    /// Runs an auto-import for the given configuration
    /// </summary>
    Task<SplitwiseAutoImportRunResult> RunAutoImportAsync(SplitwiseAutoImportDto autoImport);
}
