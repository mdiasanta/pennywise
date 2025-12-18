using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface ICategoryRepository
{
    Task<IEnumerable<Category>> GetAllAsync(int userId);
    Task<Category?> GetByIdAsync(int id, int userId);
    Task<Category> CreateAsync(Category category);
    Task<Category?> UpdateAsync(Category category, int userId);
    Task<bool> DeleteAsync(int id, int userId);
    Task<bool> HasExpensesAsync(int categoryId);
}
