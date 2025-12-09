using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class ExpenseRepository : IExpenseRepository
{
    private readonly PennywiseDbContext _context;

    public ExpenseRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Expense>> GetAllAsync(
        int userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? categoryId = null,
        string? search = null)
    {
        return await BuildQuery(userId, startDate, endDate, categoryId, search).ToListAsync();
    }

    public IAsyncEnumerable<Expense> StreamAllAsync(
        int userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? categoryId = null,
        string? search = null)
    {
        return BuildQuery(userId, startDate, endDate, categoryId, search).AsAsyncEnumerable();
    }

    public async Task<Expense?> GetByIdAsync(int id, int userId)
    {
        return await _context.Expenses
            .AsNoTracking()
            .Include(e => e.Category)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
    }

    public async Task<Expense> CreateAsync(Expense expense)
    {
        expense.CreatedAt = DateTime.UtcNow;
        expense.UpdatedAt = DateTime.UtcNow;
        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();
        
        // Load the category for the created expense
        await _context.Entry(expense).Reference(e => e.Category).LoadAsync();
        
        return expense;
    }

    public async Task<Expense?> UpdateAsync(Expense expense)
    {
        var existing = await _context.Expenses.FindAsync(expense.Id);
        if (existing == null)
            return null;

        existing.Title = expense.Title;
        existing.Description = expense.Description;
        existing.Amount = expense.Amount;
        existing.Date = expense.Date;
        existing.CategoryId = expense.CategoryId;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        
        // Load the category for the updated expense
        await _context.Entry(existing).Reference(e => e.Category).LoadAsync();
        
        return existing;
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var expense = await _context.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        
        if (expense == null)
            return false;

        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Expense>> GetByDateRangeAsync(int userId, DateTime startDate, DateTime endDate)
    {
        return await BuildQuery(userId, startDate, endDate, null, null).ToListAsync();
    }

    public async Task<IEnumerable<Expense>> GetByCategoryAsync(int userId, int categoryId)
    {
        return await BuildQuery(userId, null, null, categoryId, null).ToListAsync();
    }

    private IQueryable<Expense> BuildQuery(
        int userId,
        DateTime? startDate,
        DateTime? endDate,
        int? categoryId,
        string? search)
    {
        var query = _context.Expenses
            .AsNoTracking()
            .Include(e => e.Category)
            .Where(e => e.UserId == userId);

        if (startDate.HasValue)
        {
            query = query.Where(e => e.Date >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(e => e.Date <= endDate.Value);
        }

        if (categoryId.HasValue)
        {
            query = query.Where(e => e.CategoryId == categoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(e =>
                EF.Functions.ILike(e.Title, pattern) ||
                (e.Description != null && EF.Functions.ILike(e.Description, pattern)));
        }

        return query.OrderByDescending(e => e.Date);
    }
}
