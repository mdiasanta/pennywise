using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecurringTransactionsController : ControllerBase
{
    private readonly IRecurringTransactionService _recurringTransactionService;

    public RecurringTransactionsController(IRecurringTransactionService recurringTransactionService)
    {
        _recurringTransactionService = recurringTransactionService;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<RecurringTransactionDto>>> GetByUser(int userId)
    {
        var transactions = await _recurringTransactionService.GetByUserAsync(userId);
        return Ok(transactions);
    }

    [HttpGet("asset/{assetId}/user/{userId}")]
    public async Task<ActionResult<IEnumerable<RecurringTransactionDto>>> GetByAsset(int assetId, int userId)
    {
        var transactions = await _recurringTransactionService.GetByAssetAsync(assetId, userId);
        return Ok(transactions);
    }

    [HttpGet("{id}/user/{userId}")]
    public async Task<ActionResult<RecurringTransactionDto>> GetById(int id, int userId)
    {
        var transaction = await _recurringTransactionService.GetByIdAsync(id, userId);
        if (transaction == null)
            return NotFound();

        return Ok(transaction);
    }

    [HttpPost("user/{userId}")]
    public async Task<ActionResult<RecurringTransactionDto>> Create(int userId, CreateRecurringTransactionDto createDto)
    {
        try
        {
            var transaction = await _recurringTransactionService.CreateAsync(createDto, userId);
            return CreatedAtAction(nameof(GetById), new { id = transaction.Id, userId }, transaction);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}/user/{userId}")]
    public async Task<ActionResult<RecurringTransactionDto>> Update(int id, int userId, UpdateRecurringTransactionDto updateDto)
    {
        var transaction = await _recurringTransactionService.UpdateAsync(id, updateDto, userId);
        if (transaction == null)
            return NotFound();

        return Ok(transaction);
    }

    [HttpDelete("{id}/user/{userId}")]
    public async Task<IActionResult> Delete(int id, int userId)
    {
        var result = await _recurringTransactionService.DeleteAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpPost("process")]
    public async Task<ActionResult<object>> ProcessPending()
    {
        var count = await _recurringTransactionService.ProcessPendingTransactionsAsync();
        return Ok(new { ProcessedCount = count });
    }
}
