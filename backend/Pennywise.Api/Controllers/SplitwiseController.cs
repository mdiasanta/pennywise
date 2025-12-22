using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SplitwiseController : ControllerBase
{
    private readonly ISplitwiseService _splitwiseService;

    public SplitwiseController(ISplitwiseService splitwiseService)
    {
        _splitwiseService = splitwiseService;
    }

    private int? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    /// <summary>
    /// Checks if Splitwise is configured and returns status with user info
    /// </summary>
    [HttpGet("status")]
    public async Task<ActionResult<SplitwiseStatusDto>> GetStatus()
    {
        if (!_splitwiseService.IsConfigured)
        {
            return Ok(new SplitwiseStatusDto { IsConfigured = false, User = null });
        }

        try
        {
            var user = await _splitwiseService.ValidateApiKeyAsync();
            return Ok(new SplitwiseStatusDto { IsConfigured = true, User = user });
        }
        catch (Exception)
        {
            return Ok(new SplitwiseStatusDto { IsConfigured = true, User = null });
        }
    }

    /// <summary>
    /// Gets all Splitwise groups for the authenticated user
    /// </summary>
    [HttpGet("groups")]
    public async Task<ActionResult<SplitwiseGroupsResponseDto>> GetGroups()
    {
        if (!_splitwiseService.IsConfigured)
        {
            return BadRequest("Splitwise is not configured. Please set the Splitwise:ApiKey environment variable.");
        }

        try
        {
            var groups = await _splitwiseService.GetGroupsAsync();
            return Ok(new SplitwiseGroupsResponseDto { Groups = groups });
        }
        catch (HttpRequestException ex)
        {
            return Unauthorized($"Failed to fetch groups: {ex.Message}");
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, 
                "Failed to fetch Splitwise groups. Please try again.");
        }
    }

    /// <summary>
    /// Gets members of a specific Splitwise group
    /// </summary>
    [HttpGet("groups/{groupId}/members")]
    public async Task<ActionResult<List<SplitwiseGroupMemberDto>>> GetGroupMembers(long groupId)
    {
        if (!_splitwiseService.IsConfigured)
        {
            return BadRequest("Splitwise is not configured. Please set the Splitwise:ApiKey environment variable.");
        }

        if (groupId <= 0)
        {
            return BadRequest("Invalid group ID");
        }

        try
        {
            var members = await _splitwiseService.GetGroupMembersAsync(groupId);
            return Ok(members);
        }
        catch (HttpRequestException ex)
        {
            return Unauthorized($"Failed to fetch group members: {ex.Message}");
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, 
                "Failed to fetch group members. Please try again.");
        }
    }

    /// <summary>
    /// Previews expenses that would be imported from Splitwise (dry run)
    /// </summary>
    [HttpPost("preview")]
    public async Task<ActionResult<SplitwiseImportResponseDto>> PreviewImport([FromBody] SplitwiseImportRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        if (!_splitwiseService.IsConfigured)
        {
            return BadRequest("Splitwise is not configured. Please set the Splitwise:ApiKey environment variable.");
        }

        if (request.GroupId <= 0)
        {
            return BadRequest("Group ID is required");
        }

        if (request.SplitwiseUserId <= 0)
        {
            return BadRequest("Splitwise user ID is required");
        }

        try
        {
            // Force dry run for preview
            var previewRequest = request with { DryRun = true, UserId = userId.Value };
            var result = await _splitwiseService.ImportExpensesAsync(previewRequest);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            return Unauthorized($"Failed to fetch expenses: {ex.Message}");
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, 
                "Failed to preview Splitwise import. Please try again.");
        }
    }

    /// <summary>
    /// Imports expenses from Splitwise
    /// </summary>
    [HttpPost("import")]
    public async Task<ActionResult<SplitwiseImportResponseDto>> ImportExpenses([FromBody] SplitwiseImportRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        if (!_splitwiseService.IsConfigured)
        {
            return BadRequest("Splitwise is not configured. Please set the Splitwise:ApiKey environment variable.");
        }

        if (request.GroupId <= 0)
        {
            return BadRequest("Group ID is required");
        }

        if (request.SplitwiseUserId <= 0)
        {
            return BadRequest("Splitwise user ID is required");
        }

        try
        {
            // Force actual import (no dry run)
            var importRequest = request with { DryRun = false, UserId = userId.Value };
            var result = await _splitwiseService.ImportExpensesAsync(importRequest);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            return Unauthorized($"Failed to import expenses: {ex.Message}");
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, 
                "Failed to import from Splitwise. Please try again.");
        }
    }
}
