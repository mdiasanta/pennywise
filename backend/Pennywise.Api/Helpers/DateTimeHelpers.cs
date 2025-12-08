namespace Pennywise.Api.Helpers;

public static class DateTimeHelpers
{
    public static DateTime ToUtc(this DateTime dateTime)
    {
        return dateTime.Kind == DateTimeKind.Unspecified 
            ? DateTime.SpecifyKind(dateTime, DateTimeKind.Utc) 
            : dateTime.ToUniversalTime();
    }
}
