using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetsController : ControllerBase
{
    private readonly IAssetService _assetService;

    public AssetsController(IAssetService assetService)
    {
        _assetService = assetService;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<AssetDto>>> GetByUser(int userId)
    {
        var assets = await _assetService.GetAllByUserAsync(userId);
        return Ok(assets);
    }

    [HttpGet("{id}/user/{userId}")]
    public async Task<ActionResult<AssetDto>> GetById(int id, int userId)
    {
        var asset = await _assetService.GetByIdAsync(id, userId);
        if (asset == null)
            return NotFound();

        return Ok(asset);
    }

    [HttpGet("user/{userId}/category/{categoryId}")]
    public async Task<ActionResult<IEnumerable<AssetDto>>> GetByCategory(int userId, int categoryId)
    {
        var assets = await _assetService.GetByCategoryAsync(userId, categoryId);
        return Ok(assets);
    }

    [HttpPost]
    public async Task<ActionResult<AssetDto>> Create(CreateAssetDto createDto)
    {
        var asset = await _assetService.CreateAsync(createDto);
        return CreatedAtAction(nameof(GetById), new { id = asset.Id, userId = asset.UserId }, asset);
    }

    [HttpPut("{id}/user/{userId}")]
    public async Task<ActionResult<AssetDto>> Update(int id, int userId, UpdateAssetDto updateDto)
    {
        var asset = await _assetService.UpdateAsync(id, userId, updateDto);
        if (asset == null)
            return NotFound();

        return Ok(asset);
    }

    [HttpDelete("{id}/user/{userId}")]
    public async Task<IActionResult> Delete(int id, int userId)
    {
        var result = await _assetService.DeleteAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
