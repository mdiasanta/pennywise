using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface ISplitwiseAutoImportRepository
{
    Task<IEnumerable<SplitwiseAutoImport>> GetAllByUserAsync(int userId);
    Task<SplitwiseAutoImport?> GetByIdAsync(int id, int userId);
    Task<SplitwiseAutoImport?> GetByGroupAndMemberAsync(int userId, long groupId, long splitwiseUserId);
    Task<IEnumerable<SplitwiseAutoImport>> GetPendingImportsAsync(DateTime asOf);
    Task<SplitwiseAutoImport> CreateAsync(SplitwiseAutoImport autoImport);
    Task<SplitwiseAutoImport?> UpdateAsync(SplitwiseAutoImport autoImport);
    Task<bool> DeleteAsync(int id, int userId);
}
