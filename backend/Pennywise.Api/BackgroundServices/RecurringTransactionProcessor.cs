using Pennywise.Api.Services;

namespace Pennywise.Api.BackgroundServices;

public class RecurringTransactionProcessor : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RecurringTransactionProcessor> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1); // Check every hour

    public RecurringTransactionProcessor(
        IServiceProvider serviceProvider,
        ILogger<RecurringTransactionProcessor> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Recurring Transaction Processor starting");

        // Wait a bit on startup to let the application fully initialize
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessRecurringTransactionsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing recurring transactions");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("Recurring Transaction Processor stopping");
    }

    private async Task ProcessRecurringTransactionsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var recurringTransactionService = scope.ServiceProvider.GetRequiredService<IRecurringTransactionService>();

        var processedCount = await recurringTransactionService.ProcessPendingTransactionsAsync();

        if (processedCount > 0)
        {
            _logger.LogInformation("Processed {Count} recurring transactions", processedCount);
        }
    }
}
