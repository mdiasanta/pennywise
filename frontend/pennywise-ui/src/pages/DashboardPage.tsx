import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Wallet,
  Home,
  TrendingDown,
  ArrowLeft,
  Calendar,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { expenseApi } from '@/lib/api';
import type { Expense } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

// For demo purposes, using userId = 1
const DEMO_USER_ID = 1;

type TimeRange = 'day' | 'week' | 'month' | 'year';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(timeRange);
      
      const expensesData = await expenseApi.getByDateRange(DEMO_USER_ID, startDate, endDate);
      
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="ghost"
                size="icon"
                className="border border-border/60 text-foreground hover:bg-card/70"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <Wallet className="h-5 w-5 text-emerald-200" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pennywise</p>
                <p className="text-lg font-semibold text-foreground">Expense cockpit</p>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-card/70">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link to="/expenses">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-card/70">
                <TrendingDown className="mr-2 h-4 w-4" />
                Expenses
              </Button>
            </Link>
            <ThemeToggle />
            <Link to="/expenses">
              <Button size="sm" className="bg-emerald-500 text-primary-foreground shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 hover:bg-emerald-400">
                Add expense
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-xl shadow-black/20 backdrop-blur md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
                <h1 className="text-3xl font-semibold md:text-4xl">Clarity on every dollar</h1>
                <p className="max-w-2xl text-muted-foreground">
                  Track velocity, catch outliers, and keep your envelopes healthy with a cockpit built for focus.
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-100">Live sync</span>
                  <span className="rounded-full bg-card/70 px-3 py-1">Audit-friendly exports</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
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
                <p className="text-sm text-muted-foreground">Range: {getTimeRangeLabel()}</p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-200">
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-200">
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15 text-amber-100">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{categoryData.length}</div>
                <p className="mt-1 text-xs text-muted-foreground">Active categories</p>
              </CardContent>
            </Card>
          </div>

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
                    <Button className="mt-4 bg-emerald-500 text-foreground shadow-emerald-500/30 hover:bg-emerald-400">
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
                          backgroundColor: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12,
                          color: "#e2e8f0",
                        }}
                        labelStyle={{ color: "#e2e8f0" }}
                        itemStyle={{ color: "#e2e8f0" }}
                      />
                      <Legend wrapperStyle={{ color: "#cbd5f5" }} />
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
                        tick={{ fill: "#cbd5f5" }}
                        axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(value) => `$${value}`}
                        tick={{ fill: "#cbd5f5" }}
                        axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12,
                          color: "#e2e8f0",
                        }}
                        labelStyle={{ color: "#e2e8f0" }}
                        itemStyle={{ color: "#e2e8f0" }}
                      />
                      <Legend wrapperStyle={{ color: "#cbd5f5" }} />
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
                      <TableRow
                        key={expense.id}
                        className="border-border/60 hover:bg-card/80"
                      >
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
                                    backgroundColor: expense.categoryColor + "22",
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
      </main>
    </div>
  );
}
