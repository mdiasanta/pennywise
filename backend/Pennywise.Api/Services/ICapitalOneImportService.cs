using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface ICapitalOneImportService
{
    /// <summary>
    /// Process a Capital One CSV file for preview or import
    /// </summary>
    /// <param name="fileStream">The CSV file stream</param>
    /// <param name="fileName">Original file name</param>
    /// <param name="request">Import configuration</param>
    /// <returns>Import preview/result response</returns>
    Task<CapitalOneImportResponseDto> ImportAsync(Stream fileStream, string fileName, CapitalOneImportRequest request);
}
