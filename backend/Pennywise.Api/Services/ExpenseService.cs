using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class ExpenseService : IExpenseService
{
    private readonly IExpenseRepository _expenseRepository;

    public ExpenseService(IExpenseRepository expenseRepository)
    {
        _expenseRepository = expenseRepository;
    }

    public async Task<IEnumerable<ExpenseDto>> GetAllExpensesAsync(int userId)
    {
        var expenses = await _expenseRepository.GetAllAsync(userId);
        return expenses.Select(MapToDto);
    }

    public async Task<ExpenseDto?> GetExpenseByIdAsync(int id, int userId)
    {
        var expense = await _expenseRepository.GetByIdAsync(id, userId);
        return expense != null ? MapToDto(expense) : null;
    }

    public async Task<ExpenseDto> CreateExpenseAsync(CreateExpenseDto createDto)
    {
        var expense = new Expense
        {
            Title = createDto.Title,
            Description = createDto.Description,
            Amount = createDto.Amount,
            Date = createDto.Date,
            UserId = createDto.UserId,
            CategoryId = createDto.CategoryId
        };

        var created = await _expenseRepository.CreateAsync(expense);
        return MapToDto(created);
    }

    public async Task<ExpenseDto?> UpdateExpenseAsync(int id, int userId, UpdateExpenseDto updateDto)
    {
        var existing = await _expenseRepository.GetByIdAsync(id, userId);
        if (existing == null)
            return null;

        if (updateDto.Title != null)
            existing.Title = updateDto.Title;
        if (updateDto.Description != null)
            existing.Description = updateDto.Description;
        if (updateDto.Amount.HasValue)
            existing.Amount = updateDto.Amount.Value;
        if (updateDto.Date.HasValue)
            existing.Date = updateDto.Date.Value;
        if (updateDto.CategoryId.HasValue)
            existing.CategoryId = updateDto.CategoryId.Value;

        var updated = await _expenseRepository.UpdateAsync(existing);
        return updated != null ? MapToDto(updated) : null;
    }

    public async Task<bool> DeleteExpenseAsync(int id, int userId)
    {
        return await _expenseRepository.DeleteAsync(id, userId);
    }

    public async Task<IEnumerable<ExpenseDto>> GetExpensesByDateRangeAsync(int userId, DateTime startDate, DateTime endDate)
    {
        var expenses = await _expenseRepository.GetByDateRangeAsync(userId, startDate, endDate);
        return expenses.Select(MapToDto);
    }

    public async Task<IEnumerable<ExpenseDto>> GetExpensesByCategoryAsync(int userId, int categoryId)
    {
        var expenses = await _expenseRepository.GetByCategoryAsync(userId, categoryId);
        return expenses.Select(MapToDto);
    }

    private static ExpenseDto MapToDto(Expense expense)
    {
        return new ExpenseDto
        {
            Id = expense.Id,
            Title = expense.Title,
            Description = expense.Description,
            Amount = expense.Amount,
            Date = expense.Date,
            CreatedAt = expense.CreatedAt,
            UpdatedAt = expense.UpdatedAt,
            UserId = expense.UserId,
            CategoryId = expense.CategoryId,
            CategoryName = expense.Category?.Name,
            CategoryColor = expense.Category?.Color
        };
    }
}
