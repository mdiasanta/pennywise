using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _expenseService;

    public ExpensesController(IExpenseService expenseService)
    {
        _expenseService = expenseService;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpenses(int userId)
    {
        var expenses = await _expenseService.GetAllExpensesAsync(userId);
        return Ok(expenses);
    }

    [HttpGet("{id}/user/{userId}")]
    public async Task<ActionResult<ExpenseDto>> GetExpense(int id, int userId)
    {
        var expense = await _expenseService.GetExpenseByIdAsync(id, userId);
        if (expense == null)
            return NotFound();

        return Ok(expense);
    }

    [HttpGet("user/{userId}/daterange")]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpensesByDateRange(
        int userId, 
        [FromQuery] DateTime startDate, 
        [FromQuery] DateTime endDate)
    {
        var expenses = await _expenseService.GetExpensesByDateRangeAsync(userId, startDate, endDate);
        return Ok(expenses);
    }

    [HttpGet("user/{userId}/category/{categoryId}")]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpensesByCategory(
        int userId, 
        int categoryId)
    {
        var expenses = await _expenseService.GetExpensesByCategoryAsync(userId, categoryId);
        return Ok(expenses);
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> CreateExpense(CreateExpenseDto createDto)
    {
        var expense = await _expenseService.CreateExpenseAsync(createDto);
        return CreatedAtAction(
            nameof(GetExpense), 
            new { id = expense.Id, userId = expense.UserId }, 
            expense);
    }

    [HttpPut("{id}/user/{userId}")]
    public async Task<ActionResult<ExpenseDto>> UpdateExpense(
        int id, 
        int userId, 
        UpdateExpenseDto updateDto)
    {
        var expense = await _expenseService.UpdateExpenseAsync(id, userId, updateDto);
        if (expense == null)
            return NotFound();

        return Ok(expense);
    }

    [HttpDelete("{id}/user/{userId}")]
    public async Task<IActionResult> DeleteExpense(int id, int userId)
    {
        var result = await _expenseService.DeleteExpenseAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
