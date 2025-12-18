using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;

    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync(int userId)
    {
        var categories = await _categoryRepository.GetAllAsync(userId);
        return categories.Select(MapToDto);
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(int id, int userId)
    {
        var category = await _categoryRepository.GetByIdAsync(id, userId);
        return category != null ? MapToDto(category) : null;
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto createDto, int userId)
    {
        var category = new Category
        {
            Name = createDto.Name,
            Description = createDto.Description,
            Color = createDto.Color,
            UserId = userId
        };

        var created = await _categoryRepository.CreateAsync(category);
        return MapToDto(created);
    }

    public async Task<CategoryDto?> UpdateCategoryAsync(int id, UpdateCategoryDto updateDto, int userId)
    {
        var existing = await _categoryRepository.GetByIdAsync(id, userId);
        if (existing == null)
            return null;

        // Don't allow updating default categories (UserId is null)
        if (existing.UserId == null)
            return null;

        if (updateDto.Name != null)
            existing.Name = updateDto.Name;
        if (updateDto.Description != null)
            existing.Description = updateDto.Description;
        if (updateDto.Color != null)
            existing.Color = updateDto.Color;

        var updated = await _categoryRepository.UpdateAsync(existing, userId);
        return updated != null ? MapToDto(updated) : null;
    }

    public async Task<(bool Success, string? ErrorMessage)> DeleteCategoryAsync(int id, int userId)
    {
        // Check if the category exists and belongs to the user
        var category = await _categoryRepository.GetByIdAsync(id, userId);
        if (category == null)
            return (false, "Category not found");

        // Don't allow deleting default categories (UserId is null)
        if (category.UserId == null)
            return (false, "Cannot delete default categories");

        // Check if the category has any expenses
        var hasExpenses = await _categoryRepository.HasExpensesAsync(id);
        if (hasExpenses)
            return (false, "Cannot delete category that has expenses assigned to it. Please reassign or delete the expenses first.");

        var result = await _categoryRepository.DeleteAsync(id, userId);
        return result ? (true, null) : (false, "Failed to delete category");
    }

    private static CategoryDto MapToDto(Category category)
    {
        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            Color = category.Color,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt,
            IsDefault = category.UserId == null
        };
    }
}
