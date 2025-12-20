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
        string? search = null,
        IEnumerable<int>? tagIds = null)
    {
        return await BuildQuery(userId, startDate, endDate, categoryId, search, tagIds).ToListAsync();
    }

    public IAsyncEnumerable<Expense> StreamAllAsync(
        int userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? categoryId = null,
        string? search = null,
        IEnumerable<int>? tagIds = null)
    {
        return BuildQuery(userId, startDate, endDate, categoryId, search, tagIds).AsAsyncEnumerable();
    }

    public async Task<Expense?> GetByIdAsync(int id, int userId)
    {
        return await _context.Expenses
            .AsNoTracking()
            .Include(e => e.Category)
            .Include(e => e.ExpenseTags)
                .ThenInclude(et => et.Tag)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
    }

    public async Task<Expense> CreateAsync(Expense expense, IEnumerable<int>? tagIds = null)
    {
        expense.CreatedAt = DateTime.UtcNow;
        expense.UpdatedAt = DateTime.UtcNow;
        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        // Add tags if provided
        if (tagIds != null && tagIds.Any())
        {
            foreach (var tagId in tagIds)
            {
                _context.ExpenseTags.Add(new ExpenseTag
                {
                    ExpenseId = expense.Id,
                    TagId = tagId
                });
            }
            await _context.SaveChangesAsync();
        }

        // Load the category and tags for the created expense
        await _context.Entry(expense).Reference(e => e.Category).LoadAsync();
        await _context.Entry(expense).Collection(e => e.ExpenseTags).LoadAsync();
        foreach (var et in expense.ExpenseTags)
        {
            await _context.Entry(et).Reference(e => e.Tag).LoadAsync();
        }

        return expense;
    }

    public async Task<Expense?> UpdateAsync(Expense expense, IEnumerable<int>? tagIds = null)
    {
        var existing = await _context.Expenses
            .Include(e => e.ExpenseTags)
            .FirstOrDefaultAsync(e => e.Id == expense.Id);

        if (existing == null)
            return null;

        existing.Title = expense.Title;
        existing.Description = expense.Description;
        existing.Amount = expense.Amount;
        existing.Date = expense.Date;
        existing.CategoryId = expense.CategoryId;
        existing.UpdatedAt = DateTime.UtcNow;

        // Update tags if provided
        if (tagIds != null)
        {
            // Remove existing tags
            _context.ExpenseTags.RemoveRange(existing.ExpenseTags);

            // Add new tags
            foreach (var tagId in tagIds)
            {
                _context.ExpenseTags.Add(new ExpenseTag
                {
                    ExpenseId = existing.Id,
                    TagId = tagId
                });
            }
        }

        await _context.SaveChangesAsync();

        // Load the category and tags for the updated expense
        await _context.Entry(existing).Reference(e => e.Category).LoadAsync();
        await _context.Entry(existing).Collection(e => e.ExpenseTags).LoadAsync();
        foreach (var et in existing.ExpenseTags)
        {
            await _context.Entry(et).Reference(e => e.Tag).LoadAsync();
        }

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
        return await BuildQuery(userId, startDate, endDate, null, null, null).ToListAsync();
    }

    public async Task<IEnumerable<Expense>> GetByCategoryAsync(int userId, int categoryId)
    {
        return await BuildQuery(userId, null, null, categoryId, null, null).ToListAsync();
    }

    public async Task<DateTime?> GetEarliestDateByUserAsync(int userId)
    {
        return await _context.Expenses
            .AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderBy(e => e.Date)
            .Select(e => (DateTime?)e.Date)
            .FirstOrDefaultAsync();
    }

    private IQueryable<Expense> BuildQuery(
        int userId,
        DateTime? startDate,
        DateTime? endDate,
        int? categoryId,
        string? search,
        IEnumerable<int>? tagIds)
    {
        var query = _context.Expenses
            .AsNoTracking()
            .Include(e => e.Category)
            .Include(e => e.ExpenseTags)
                .ThenInclude(et => et.Tag)
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
            var term = search.Trim();
            var pattern = $"%{term}%";
            query = query.Where(e =>
                EF.Functions.ILike(e.Title, pattern) ||
                (e.Description != null && EF.Functions.ILike(e.Description, pattern)));
        }

        if (tagIds != null && tagIds.Any())
        {
            var tagIdList = tagIds.ToList();
            query = query.Where(e => e.ExpenseTags.Any(et => tagIdList.Contains(et.TagId)));
        }

        return query.OrderByDescending(e => e.Date);
    }
}

