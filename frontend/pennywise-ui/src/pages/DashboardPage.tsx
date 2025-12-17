import { AppLayout } from '@/components/AppLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import type { Expense, NetWorthSummary } from '@/lib/api';
import { expenseApi, netWorthApi } from '@/lib/api';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingDown,
  Wallet,
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

type TimeRange = 'day' | 'week' | 'month' | 'year';

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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [netWorthSummary, setNetWorthSummary] = useState<NetWorthSummary | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Only load data for authenticated users
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    const getDateRange = (range: TimeRange) => {
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

      const [expensesData, summaryData] = await Promise.all([
        expenseApi.getByDateRange(user.id, startDate, endDate),
        netWorthApi.getSummary(user.id),
      ]);

      setExpenses(expensesData);
      setNetWorthSummary(summaryData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, authLoading, isAuthenticated, user]);

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeRangeLabel = () => {
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
        {/* Time Range Selector */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-success px-3 py-1 font-medium text-success-foreground">
              Live sync
            </span>
            <span className="rounded-full bg-card/70 px-3 py-1">Audit-friendly exports</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[200px] border-border/60 bg-card/70 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/60 bg-card text-foreground">
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
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
              {netWorthSummary && netWorthSummary.changePercent !== 0 && (
                <div
                  className={`mt-1 flex items-center text-xs ${
                    netWorthSummary.changeFromLastPeriod >= 0
                      ? 'text-success-foreground'
                      : 'text-destructive'
                  }`}
                >
                  {netWorthSummary.changeFromLastPeriod >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {formatCurrency(Math.abs(netWorthSummary.changeFromLastPeriod))} (
                  {netWorthSummary.changePercent.toFixed(1)}%)
                </div>
              )}
              {(!netWorthSummary || netWorthSummary.changePercent === 0) && (
                <p className="mt-1 text-xs text-muted-foreground">Current balance</p>
              )}
            </CardContent>
          </Card>

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
              <Table className="text-foreground">
                <TableHeader className="[&_tr]:border-border/60">
                  <TableRow className="border-border/60">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Title</TableHead>
                    <TableHead className="text-muted-foreground">Category</TableHead>
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
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
