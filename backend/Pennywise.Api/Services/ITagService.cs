using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface ITagService
{
    Task<IEnumerable<TagDto>> GetAllByUserAsync(int userId);
    Task<TagDto?> GetByIdAsync(int id, int userId);
    Task<TagDto> CreateAsync(int userId, CreateTagDto createDto);
    Task<TagDto?> UpdateAsync(int id, int userId, UpdateTagDto updateDto);
    Task<bool> DeleteAsync(int id, int userId);
}
