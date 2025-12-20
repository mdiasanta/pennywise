import { AppLayout } from '@/components/AppLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import {
  getAvailableYearsFromDate,
  getMonthName,
  getMonthsForYear,
  getMonthYearFilterDateRange,
  getMonthYearFromFilter,
  getYearFilterDateRange,
  getYearFromFilter,
  isMonthYearFilter,
  isYearFilter,
} from '@/components/net-worth/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useTags } from '@/hooks/use-tags';
import type { Expense, NetWorthComparison, NetWorthSummary } from '@/lib/api';
import { expenseApi, netWorthApi } from '@/lib/api';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CreditCard,
  DollarSign,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
type TimeRange = 'day' | 'week' | 'month' | 'year' | `year-${number}` | `month-${number}-${string}`;

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#FF6B9D',
];

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { tags, isLoading: tagsLoading } = useTags();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [netWorthSummary, setNetWorthSummary] = useState<NetWorthSummary | null>(null);
  const [netWorthComparison, setNetWorthComparison] = useState<NetWorthComparison | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [earliestDate, setEarliestDate] = useState<string | null>(null);

  // Fetch earliest date for filtering
  useEffect(() => {
    const fetchEarliestDate = async () => {
      if (authLoading || !isAuthenticated || !user) return;
      try {
        const date = await expenseApi.getEarliestDate(user.id);
        setEarliestDate(date);
      } catch (error) {
        console.error('Error fetching earliest expense date:', error);
      }
    };
    fetchEarliestDate();
  }, [authLoading, isAuthenticated, user]);

  const loadData = useCallback(async () => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Only load data for authenticated users
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    const getDateRange = (range: TimeRange) => {
      // Handle specific month-year filter (e.g., 'month-2024-01')
      const monthYearRange = getMonthYearFilterDateRange(range);
      if (monthYearRange) {
        return monthYearRange;
      }

      // Handle specific year filter (e.g., 'year-2024')
      const yearRange = getYearFilterDateRange(range);
      if (yearRange) {
        return yearRange;
      }

      const endDate = new Date();
      const startDate = new Date();

      switch (range) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    };

    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(timeRange);

      // Determine groupBy based on time range
      const groupBy =
        timeRange === 'day'
          ? 'day'
          : timeRange === 'week'
            ? 'day'
            : isMonthYearFilter(timeRange)
              ? 'day'
              : 'month';

      const [expensesData, summaryData, comparisonData] = await Promise.all([
        expenseApi.getAll(user.id, {
          startDate,
          endDate,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        }),
        netWorthApi.getSummary(user.id),
        netWorthApi.getComparison(user.id, startDate, endDate, groupBy),
      ]);

      setExpenses(expensesData);
      setNetWorthSummary(summaryData);
      setNetWorthComparison(comparisonData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedTagIds, authLoading, isAuthenticated, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getExpensesByCategory = () => {
    const categoryMap = new Map<number, { name: string; total: number; color?: string }>();

    expenses.forEach((expense) => {
      const existing = categoryMap.get(expense.categoryId);
      if (existing) {
        existing.total += expense.amount;
      } else {
        categoryMap.set(expense.categoryId, {
          name: expense.categoryName || 'Uncategorized',
          total: expense.amount,
          color: expense.categoryColor,
        });
      }
    });

    return Array.from(categoryMap.values())
      .map((item, index) => ({
        ...item,
        fill: item.color || COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.total - a.total);
  };

  const getRecentExpenses = () => {
    return [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(dateString));
  };

  const getTimeRangeLabel = () => {
    if (isMonthYearFilter(timeRange)) {
      const monthYear = getMonthYearFromFilter(timeRange);
      if (monthYear) {
        return `${getMonthName(monthYear.month)} ${monthYear.year}`;
      }
      return 'Custom Month';
    }
    if (isYearFilter(timeRange)) {
      const year = getYearFromFilter(timeRange);
      return year?.toString() || 'Custom Year';
    }
    switch (timeRange) {
      case 'day':
        return 'Today';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 30 Days';
      case 'year':
        return 'Last 12 Months';
    }
  };

  // Get period-specific net worth metrics from comparison data
  const getPeriodNetWorthMetrics = () => {
    if (!netWorthComparison?.netWorthHistory || netWorthComparison.netWorthHistory.length === 0) {
      return {
        startNetWorth: 0,
        endNetWorth: netWorthSummary?.netWorth || 0,
        change: 0,
        changePercent: 0,
        startAssets: 0,
        endAssets: netWorthSummary?.totalAssets || 0,
        startLiabilities: 0,
        endLiabilities: netWorthSummary?.totalLiabilities || 0,
      };
    }

    const history = netWorthComparison.netWorthHistory;
    const firstPoint = history[0];
    const lastPoint = history[history.length - 1];

    const startNetWorth = firstPoint.netWorth;
    const endNetWorth = lastPoint.netWorth;
    const change = endNetWorth - startNetWorth;
    const changePercent = startNetWorth !== 0 ? (change / Math.abs(startNetWorth)) * 100 : 0;

    return {
      startNetWorth,
      endNetWorth,
      change,
      changePercent,
      startAssets: firstPoint.totalAssets,
      endAssets: lastPoint.totalAssets,
      startLiabilities: firstPoint.totalLiabilities,
      endLiabilities: lastPoint.totalLiabilities,
    };
  };

  const periodMetrics = getPeriodNetWorthMetrics();
  const categoryData = getExpensesByCategory();
  const recentExpenses = getRecentExpenses();
  const totalExpenses = getTotalExpenses();

  // Show sign-in prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <AppLayout
        title="Dashboard"
        description="Track velocity, catch outliers, and keep your envelopes healthy"
      >
        <div className="mx-auto max-w-2xl py-12">
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign in to view your dashboard</CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your account to track expenses, view insights, and manage your finances.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <GoogleSignInButton />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Dashboard"
      description="Track velocity, catch outliers, and keep your envelopes healthy"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Time Range and Tag Filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-success px-3 py-1 font-medium text-success-foreground">
              Live sync
            </span>
            <span className="rounded-full bg-card/70 px-3 py-1">Audit-friendly exports</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Tag Filter */}
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <Select
                value=""
                onValueChange={(value) => {
                  const tagId = parseInt(value, 10);
                  if (!selectedTagIds.includes(tagId)) {
                    setSelectedTagIds((prev) => [...prev, tagId]);
                  }
                }}
                disabled={tagsLoading || tags.length === 0}
              >
                <SelectTrigger className="w-[160px] border-border/60 bg-card/70 text-foreground">
                  <SelectValue placeholder="Filter by tag..." />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card text-foreground">
                  {tags
                    .filter((t) => !selectedTagIds.includes(t.id))
                    .map((tag) => (
                      <SelectItem key={tag.id} value={tag.id.toString()}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  {tags.filter((t) => !selectedTagIds.includes(t.id)).length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {tags.length === 0 ? 'No tags created yet' : 'All tags selected'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger className="w-[200px] border-border/60 bg-card/70 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[400px] border-border/60 bg-card text-foreground">
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground">Relative</SelectLabel>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="year">Last 12 Months</SelectItem>
                  </SelectGroup>
                  <Separator className="my-1" />
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground">By Year</SelectLabel>
                    {getAvailableYearsFromDate(earliestDate).map((year) => (
                      <SelectItem key={year} value={`year-${year}`}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <Separator className="my-1" />
                  {getAvailableYearsFromDate(earliestDate).map((year) => (
                    <SelectGroup key={`month-group-${year}`}>
                      <SelectLabel className="text-muted-foreground">{year} - By Month</SelectLabel>
                      {getMonthsForYear(year).map((monthOption) => (
                        <SelectItem key={monthOption.value} value={monthOption.value}>
                          {monthOption.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Selected Tags Display */}
        {selectedTagIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtering by tags:</span>
            {selectedTagIds.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              return tag ? (
                <Badge
                  key={tagId}
                  variant="secondary"
                  className="border-border/60 bg-card/70 text-foreground"
                  style={
                    tag.color
                      ? {
                          backgroundColor: tag.color + '22',
                          color: tag.color,
                          borderColor: tag.color,
                        }
                      : undefined
                  }
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => setSelectedTagIds((prev) => prev.filter((id) => id !== tagId))}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null;
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTagIds([])}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Net Worth Card - Shows current net worth */}
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                <Wallet className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {loading ? '...' : formatCurrency(netWorthSummary?.netWorth || 0)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Current balance</p>
            </CardContent>
          </Card>

          {/* Net Worth Change Card - Shows change during selected period */}
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Worth Change
              </CardTitle>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  periodMetrics.change >= 0
                    ? 'bg-success text-success-foreground'
                    : 'bg-destructive text-destructive-foreground'
                }`}
              >
                {periodMetrics.change >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-semibold ${
                  periodMetrics.change >= 0 ? 'text-success-foreground' : 'text-destructive'
                }`}
              >
                {loading
                  ? '...'
                  : `${periodMetrics.change >= 0 ? '+' : ''}${formatCurrency(periodMetrics.change)}`}
              </div>
              {!loading && periodMetrics.changePercent !== 0 && (
                <div
                  className={`mt-1 flex items-center text-xs ${
                    periodMetrics.change >= 0 ? 'text-success-foreground' : 'text-destructive'
                  }`}
                >
                  {periodMetrics.change >= 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(periodMetrics.changePercent).toFixed(1)}% {getTimeRangeLabel()}
                </div>
              )}
              {!loading && periodMetrics.changePercent === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{getTimeRangeLabel()}</p>
              )}
            </CardContent>
          </Card>

          {/* Total Assets Card */}
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success text-success-foreground">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {loading ? '...' : formatCurrency(netWorthSummary?.totalAssets || 0)}
              </div>
              {!loading && periodMetrics.endAssets - periodMetrics.startAssets !== 0 && (
                <div
                  className={`mt-1 flex items-center text-xs ${
                    periodMetrics.endAssets - periodMetrics.startAssets >= 0
                      ? 'text-success-foreground'
                      : 'text-destructive'
                  }`}
                >
                  {periodMetrics.endAssets - periodMetrics.startAssets >= 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                  )}
                  {formatCurrency(Math.abs(periodMetrics.endAssets - periodMetrics.startAssets))}{' '}
                  {getTimeRangeLabel()}
                </div>
              )}
              {!loading && periodMetrics.endAssets - periodMetrics.startAssets === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Current value</p>
              )}
            </CardContent>
          </Card>

          {/* Total Liabilities Card */}
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Liabilities
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {loading ? '...' : formatCurrency(netWorthSummary?.totalLiabilities || 0)}
              </div>
              {!loading && periodMetrics.endLiabilities - periodMetrics.startLiabilities !== 0 && (
                <div
                  className={`mt-1 flex items-center text-xs ${
                    periodMetrics.endLiabilities - periodMetrics.startLiabilities <= 0
                      ? 'text-success-foreground'
                      : 'text-destructive'
                  }`}
                >
                  {periodMetrics.endLiabilities - periodMetrics.startLiabilities <= 0 ? (
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                  )}
                  {formatCurrency(
                    Math.abs(periodMetrics.endLiabilities - periodMetrics.startLiabilities)
                  )}{' '}
                  {getTimeRangeLabel()}
                </div>
              )}
              {!loading && periodMetrics.endLiabilities - periodMetrics.startLiabilities === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Current debt</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expense Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{formatCurrency(totalExpenses)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{getTimeRangeLabel()}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transactions
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info text-info-foreground">
                <CreditCard className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{expenses.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">{getTimeRangeLabel()}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categories
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning text-warning-foreground">
                <TrendingDown className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{categoryData.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">Active categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {loading ? (
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">Loading dashboard data...</div>
            </CardContent>
          </Card>
        ) : expenses.length === 0 ? (
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p>No expenses found for the selected time period.</p>
                <Link to="/expenses">
                  <Button className="mt-4 bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90">
                    Add your first expense
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Distribution of spending across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      dataKey="total"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: '#e2e8f0',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Amount spent per category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={categoryData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: '#cbd5f5' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${value}`}
                      tick={{ fill: '#cbd5f5' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: '#e2e8f0',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                    <Bar dataKey="total">
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Expenses Table */}
        {recentExpenses.length > 0 && (
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Your latest expense transactions
                  </CardDescription>
                </div>
                <Link to="/expenses">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                  >
                    View all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-[600px] text-foreground">
                  <TableHeader className="[&_tr]:border-border/60">
                    <TableRow className="border-border/60">
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Title</TableHead>
                      <TableHead className="text-muted-foreground">Category</TableHead>
                      <TableHead className="text-muted-foreground">Tags</TableHead>
                      <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentExpenses.map((expense) => (
                      <TableRow key={expense.id} className="border-border/60 hover:bg-card/80">
                        <TableCell className="font-medium text-foreground">
                          {formatDate(expense.date)}
                        </TableCell>
                        <TableCell className="text-foreground">{expense.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="border-border/60 bg-card/70 text-foreground"
                            style={
                              expense.categoryColor
                                ? {
                                    backgroundColor: expense.categoryColor + '22',
                                    color: expense.categoryColor,
                                    borderColor: expense.categoryColor,
                                  }
                                : undefined
                            }
                          >
                            {expense.categoryName || 'Uncategorized'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {expense.tags && expense.tags.length > 0 ? (
                              expense.tags.map((tag) => (
                                <Badge
                                  key={tag.id}
                                  variant="outline"
                                  className="text-xs"
                                  style={
                                    tag.color
                                      ? {
                                          backgroundColor: tag.color + '22',
                                          color: tag.color,
                                          borderColor: tag.color,
                                        }
                                      : undefined
                                  }
                                >
                                  {tag.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
