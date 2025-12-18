using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface ICategoryService
{
    Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync(int userId);
    Task<CategoryDto?> GetCategoryByIdAsync(int id, int userId);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto createDto, int userId);
    Task<CategoryDto?> UpdateCategoryAsync(int id, UpdateCategoryDto updateDto, int userId);
    Task<(bool Success, string? ErrorMessage)> DeleteCategoryAsync(int id, int userId);
}
