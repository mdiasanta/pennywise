using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TagsController : ControllerBase
{
    private readonly ITagService _tagService;

    public TagsController(ITagService tagService)
    {
        _tagService = tagService;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<TagDto>>> GetTags(int userId)
    {
        var tags = await _tagService.GetAllByUserAsync(userId);
        return Ok(tags);
    }

    [HttpGet("{id}/user/{userId}")]
    public async Task<ActionResult<TagDto>> GetTag(int id, int userId)
    {
        var tag = await _tagService.GetByIdAsync(id, userId);
        if (tag == null)
            return NotFound();

        return Ok(tag);
    }

    [HttpPost("user/{userId}")]
    public async Task<ActionResult<TagDto>> CreateTag(int userId, CreateTagDto createDto)
    {
        var tag = await _tagService.CreateAsync(userId, createDto);
        return CreatedAtAction(
            nameof(GetTag),
            new { id = tag.Id, userId },
            tag);
    }

    [HttpPut("{id}/user/{userId}")]
    public async Task<ActionResult<TagDto>> UpdateTag(int id, int userId, UpdateTagDto updateDto)
    {
        var tag = await _tagService.UpdateAsync(id, userId, updateDto);
        if (tag == null)
            return NotFound();

        return Ok(tag);
    }

    [HttpDelete("{id}/user/{userId}")]
    public async Task<IActionResult> DeleteTag(int id, int userId)
    {
        var result = await _tagService.DeleteAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
