using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly PennywiseDbContext _context;

    public CategoryRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Category>> GetAllAsync(int userId)
    {
        // Return categories that belong to the user OR are default (UserId is null)
        return await _context.Categories
            .Where(c => c.UserId == userId || c.UserId == null)
            .OrderBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<Category?> GetByIdAsync(int id, int userId)
    {
        // Return category if it belongs to the user OR is a default category
        return await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == id && (c.UserId == userId || c.UserId == null));
    }

    public async Task<Category> CreateAsync(Category category)
    {
        category.CreatedAt = DateTime.UtcNow;
        category.UpdatedAt = DateTime.UtcNow;
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return category;
    }

    public async Task<Category?> UpdateAsync(Category category, int userId)
    {
        // Only allow updating categories owned by the user (not default categories)
        var existing = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == category.Id && c.UserId == userId);
        if (existing == null)
            return null;

        existing.Name = category.Name;
        existing.Description = category.Description;
        existing.Color = category.Color;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        // Only allow deleting categories owned by the user (not default categories)
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (category == null)
            return false;

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HasExpensesAsync(int categoryId)
    {
        return await _context.Expenses.AnyAsync(e => e.CategoryId == categoryId);
    }
}
