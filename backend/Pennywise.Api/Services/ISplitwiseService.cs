using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface ISplitwiseService
{
    /// <summary>
    /// Validates the Splitwise API key and returns the current user
    /// </summary>
    Task<SplitwiseCurrentUserDto?> ValidateApiKeyAsync(string apiKey);
    
    /// <summary>
    /// Gets all groups for the authenticated user
    /// </summary>
    Task<List<SplitwiseGroupDto>> GetGroupsAsync(string apiKey);
    
    /// <summary>
    /// Gets members of a specific group
    /// </summary>
    Task<List<SplitwiseGroupMemberDto>> GetGroupMembersAsync(string apiKey, long groupId);
    
    /// <summary>
    /// Previews or imports expenses from Splitwise
    /// </summary>
    Task<SplitwiseImportResponseDto> ImportExpensesAsync(SplitwiseImportRequest request);
}
