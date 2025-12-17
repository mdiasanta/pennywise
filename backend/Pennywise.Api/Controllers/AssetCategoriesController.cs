using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetCategoriesController : ControllerBase
{
    private readonly IAssetCategoryService _assetCategoryService;

    public AssetCategoriesController(IAssetCategoryService assetCategoryService)
    {
        _assetCategoryService = assetCategoryService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AssetCategoryDto>>> GetAll()
    {
        var categories = await _assetCategoryService.GetAllAsync();
        return Ok(categories);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AssetCategoryDto>> GetById(int id)
    {
        var category = await _assetCategoryService.GetByIdAsync(id);
        if (category == null)
            return NotFound();

        return Ok(category);
    }

    [HttpPost]
    public async Task<ActionResult<AssetCategoryDto>> Create(CreateAssetCategoryDto createDto)
    {
        var category = await _assetCategoryService.CreateAsync(createDto);
        return CreatedAtAction(nameof(GetById), new { id = category.Id }, category);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AssetCategoryDto>> Update(int id, UpdateAssetCategoryDto updateDto)
    {
        var category = await _assetCategoryService.UpdateAsync(id, updateDto);
        if (category == null)
            return NotFound();

        return Ok(category);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _assetCategoryService.DeleteAsync(id);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
