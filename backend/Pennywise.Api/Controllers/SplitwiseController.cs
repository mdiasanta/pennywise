using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.BackgroundServices;
using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SplitwiseController : ControllerBase
{
    private readonly ISplitwiseService _splitwiseService;
    private readonly ISplitwiseAutoImportRepository _autoImportRepository;

    public SplitwiseController(
        ISplitwiseService splitwiseService,
        ISplitwiseAutoImportRepository autoImportRepository)
    {
        _splitwiseService = splitwiseService;
        _autoImportRepository = autoImportRepository;
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

    // Auto-Import Endpoints

    /// <summary>
    /// Gets all auto-imports for the current user
    /// </summary>
    [HttpGet("auto-imports")]
    public async Task<ActionResult<List<SplitwiseAutoImportDto>>> GetAutoImports()
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var autoImports = await _autoImportRepository.GetAllByUserAsync(userId.Value);
        return Ok(autoImports.Select(MapToDto).ToList());
    }

    /// <summary>
    /// Gets a specific auto-import by ID
    /// </summary>
    [HttpGet("auto-imports/{id}")]
    public async Task<ActionResult<SplitwiseAutoImportDto>> GetAutoImport(int id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var autoImport = await _autoImportRepository.GetByIdAsync(id, userId.Value);
        if (autoImport == null)
            return NotFound();

        return Ok(MapToDto(autoImport));
    }

    /// <summary>
    /// Creates a new auto-import schedule
    /// </summary>
    [HttpPost("auto-imports")]
    public async Task<ActionResult<SplitwiseAutoImportDto>> CreateAutoImport([FromBody] CreateSplitwiseAutoImportRequest request)
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

        // Check if an auto-import already exists for this group/member combination
        var existing = await _autoImportRepository.GetByGroupAndMemberAsync(
            userId.Value, request.GroupId, request.SplitwiseUserId);
        if (existing != null)
        {
            return BadRequest("An auto-import already exists for this group and member. You can update or delete the existing one.");
        }

        // Parse frequency
        if (!Enum.TryParse<AutoImportFrequency>(request.Frequency, true, out var frequency))
        {
            return BadRequest("Invalid frequency. Must be Daily, Weekly, or Monthly.");
        }

        try
        {
            // Get group and member info from Splitwise
            var groups = await _splitwiseService.GetGroupsAsync();
            var group = groups.FirstOrDefault(g => g.Id == request.GroupId);
            if (group == null)
            {
                return BadRequest("Group not found in Splitwise");
            }

            var members = await _splitwiseService.GetGroupMembersAsync(request.GroupId);
            var member = members.FirstOrDefault(m => m.Id == request.SplitwiseUserId);
            if (member == null)
            {
                return BadRequest("Member not found in the specified group");
            }

            var autoImport = new SplitwiseAutoImport
            {
                UserId = userId.Value,
                GroupId = request.GroupId,
                GroupName = group.Name,
                SplitwiseUserId = request.SplitwiseUserId,
                SplitwiseMemberName = member.DisplayName,
                StartDate = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc),
                Frequency = frequency,
                IsActive = true,
                NextRunAt = DateTime.UtcNow // Run immediately on first check
            };

            var created = await _autoImportRepository.CreateAsync(autoImport);
            return CreatedAtAction(nameof(GetAutoImport), new { id = created.Id }, MapToDto(created));
        }
        catch (HttpRequestException ex)
        {
            return Unauthorized($"Failed to verify Splitwise data: {ex.Message}");
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                "Failed to create auto-import. Please try again.");
        }
    }

    /// <summary>
    /// Updates an existing auto-import schedule
    /// </summary>
    [HttpPut("auto-imports/{id}")]
    public async Task<ActionResult<SplitwiseAutoImportDto>> UpdateAutoImport(int id, [FromBody] UpdateSplitwiseAutoImportRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var existing = await _autoImportRepository.GetByIdAsync(id, userId.Value);
        if (existing == null)
            return NotFound();

        // Update fields if provided
        if (request.IsActive.HasValue)
            existing.IsActive = request.IsActive.Value;

        if (request.StartDate.HasValue)
            existing.StartDate = DateTime.SpecifyKind(request.StartDate.Value.Date, DateTimeKind.Utc);

        if (!string.IsNullOrWhiteSpace(request.Frequency))
        {
            if (!Enum.TryParse<AutoImportFrequency>(request.Frequency, true, out var frequency))
            {
                return BadRequest("Invalid frequency. Must be Daily, Weekly, or Monthly.");
            }
            existing.Frequency = frequency;
        }

        var updated = await _autoImportRepository.UpdateAsync(existing);
        return Ok(MapToDto(updated!));
    }

    /// <summary>
    /// Deletes an auto-import schedule
    /// </summary>
    [HttpDelete("auto-imports/{id}")]
    public async Task<IActionResult> DeleteAutoImport(int id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var deleted = await _autoImportRepository.DeleteAsync(id, userId.Value);
        if (!deleted)
            return NotFound();

        return NoContent();
    }

    /// <summary>
    /// Manually triggers an auto-import to run now
    /// </summary>
    [HttpPost("auto-imports/{id}/run")]
    public async Task<ActionResult<SplitwiseAutoImportRunResult>> RunAutoImportNow(int id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var autoImport = await _autoImportRepository.GetByIdAsync(id, userId.Value);
        if (autoImport == null)
            return NotFound();

        try
        {
            var dto = MapToDto(autoImport);
            var result = await _splitwiseService.RunAutoImportAsync(dto);

            // Update the auto-import record
            autoImport.LastRunAt = DateTime.UtcNow;
            autoImport.LastRunImportedCount = result.ImportedCount;
            autoImport.LastRunError = result.Success ? null : result.ErrorMessage;
            autoImport.NextRunAt = SplitwiseAutoImportProcessor.CalculateNextRunAt(autoImport.Frequency, DateTime.UtcNow);

            await _autoImportRepository.UpdateAsync(autoImport);

            return Ok(result);
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                "Failed to run auto-import. Please try again.");
        }
    }

    private static SplitwiseAutoImportDto MapToDto(SplitwiseAutoImport autoImport)
    {
        return new SplitwiseAutoImportDto
        {
            Id = autoImport.Id,
            UserId = autoImport.UserId,
            GroupId = autoImport.GroupId,
            GroupName = autoImport.GroupName,
            SplitwiseUserId = autoImport.SplitwiseUserId,
            SplitwiseMemberName = autoImport.SplitwiseMemberName,
            StartDate = autoImport.StartDate,
            Frequency = autoImport.Frequency.ToString(),
            IsActive = autoImport.IsActive,
            LastRunAt = autoImport.LastRunAt,
            NextRunAt = autoImport.NextRunAt,
            LastRunImportedCount = autoImport.LastRunImportedCount,
            LastRunError = autoImport.LastRunError,
            CreatedAt = autoImport.CreatedAt,
            UpdatedAt = autoImport.UpdatedAt
        };
    }
}
