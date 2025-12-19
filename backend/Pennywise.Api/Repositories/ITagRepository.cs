using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface ITagRepository
{
    Task<IEnumerable<Tag>> GetAllByUserAsync(int userId);
    Task<Tag?> GetByIdAsync(int id, int userId);
    Task<Tag?> GetByNameAsync(string name, int userId);
    Task<Tag> CreateAsync(Tag tag);
    Task<Tag?> UpdateAsync(Tag tag);
    Task<bool> DeleteAsync(int id, int userId);
    Task<IEnumerable<Tag>> GetByIdsAsync(IEnumerable<int> ids, int userId);
}
