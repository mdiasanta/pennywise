using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    private int? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetCategories()
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var categories = await _categoryService.GetAllCategoriesAsync(userId.Value);
        return Ok(categories);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetCategory(int id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var category = await _categoryService.GetCategoryByIdAsync(id, userId.Value);
        if (category == null)
            return NotFound();

        return Ok(category);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> CreateCategory(CreateCategoryDto createDto)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var category = await _categoryService.CreateCategoryAsync(createDto, userId.Value);
        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(int id, UpdateCategoryDto updateDto)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var category = await _categoryService.UpdateCategoryAsync(id, updateDto, userId.Value);
        if (category == null)
            return NotFound();

        return Ok(category);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var (success, errorMessage) = await _categoryService.DeleteCategoryAsync(id, userId.Value);
        if (!success)
        {
            if (errorMessage == "Category not found")
                return NotFound();
            return BadRequest(errorMessage);
        }

        return NoContent();
    }
}
