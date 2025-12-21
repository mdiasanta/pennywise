import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { YearOverYearComparison as YearOverYearComparisonType } from '@/lib/api';
import { summaryApi } from '@/lib/api';
import { ArrowDownRight, ArrowUpRight, Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface YearOverYearComparisonProps {
  userId: number;
  availableYears: number[];
}

const COLORS = {
  current: '#0088FE',
  previous: '#82ca9d',
  increase: '#ef4444',
  decrease: '#22c55e',
};

// Display constants
const CATEGORY_NAME_MAX_LENGTH = 12;
const MAX_CHART_CATEGORIES = 8;
const MAX_CATEGORY_CHANGES = 6;

export function YearOverYearComparison({ userId, availableYears }: YearOverYearComparisonProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [selectedCurrentYear, setSelectedCurrentYear] = useState(currentYear);
  const [selectedCurrentMonth, setSelectedCurrentMonth] = useState(currentMonth);
  const [selectedPreviousYear, setSelectedPreviousYear] = useState(currentYear - 1);
  const [comparison, setComparison] = useState<YearOverYearComparisonType | null>(null);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getMonthName = (month: number): string => {
    const date = new Date(2000, month - 1, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
  };

  const loadComparison = useCallback(async () => {
    setLoading(true);
    try {
      const data = await summaryApi.getYearOverYearComparison(userId, {
        mode,
        currentYear: selectedCurrentYear,
        currentMonth: mode === 'month' ? selectedCurrentMonth : undefined,
        previousYear: selectedPreviousYear,
        previousMonth: mode === 'month' ? selectedCurrentMonth : undefined,
      });
      setComparison(data);
    } catch (error) {
      console.error('Error loading year-over-year comparison:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, mode, selectedCurrentYear, selectedCurrentMonth, selectedPreviousYear]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  // Get months available for selection (up to current month for current year)
  const getAvailableMonths = (year: number) => {
    const maxMonth = year === currentYear ? currentMonth : 12;
    return Array.from({ length: maxMonth }, (_, i) => i + 1);
  };

  if (loading) {
    return (
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Loading year-over-year comparison...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparison) {
    return null;
  }

  const { currentPeriod, previousPeriod, totalDifference, percentageChange, categoryComparisons } =
    comparison;

  // Prepare chart data for category comparison
  const categoryChartData = categoryComparisons.slice(0, MAX_CHART_CATEGORIES).map((cat) => ({
    name:
      cat.categoryName.length > CATEGORY_NAME_MAX_LENGTH
        ? cat.categoryName.slice(0, CATEGORY_NAME_MAX_LENGTH) + '...'
        : cat.categoryName,
    current: cat.currentAmount,
    previous: cat.previousAmount,
    fill: cat.categoryColor || COLORS.current,
  }));

  // Prepare monthly trend data for year mode
  const monthlyChartData = comparison.monthlyData.map((m) => ({
    name: m.monthName,
    [selectedCurrentYear]: m.currentYearAmount,
    [selectedPreviousYear]: m.previousYearAmount,
  }));

  const isSpendingDown = totalDifference < 0;

  return (
    <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Year-over-Year Comparison
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Compare spending across the same periods in different years
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Toggle */}
            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as 'month' | 'year')}
              className="w-auto"
            >
              <TabsList className="h-9">
                <TabsTrigger value="month" className="text-xs">
                  Month
                </TabsTrigger>
                <TabsTrigger value="year" className="text-xs">
                  Full Year
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Period Selectors */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Comparing:</span>
            {mode === 'month' && (
              <Select
                value={selectedCurrentMonth.toString()}
                onValueChange={(v) => setSelectedCurrentMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[120px] border-border/60 bg-card/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card">
                  {getAvailableMonths(selectedCurrentYear).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {getMonthName(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={selectedCurrentYear.toString()}
              onValueChange={(v) => setSelectedCurrentYear(parseInt(v))}
            >
              <SelectTrigger className="w-[100px] border-border/60 bg-card/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/60 bg-card">
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">vs</span>
            <Select
              value={selectedPreviousYear.toString()}
              onValueChange={(v) => setSelectedPreviousYear(parseInt(v))}
            >
              <SelectTrigger className="w-[100px] border-border/60 bg-card/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/60 bg-card">
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Current Period */}
          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="text-sm font-medium text-muted-foreground">{currentPeriod.label}</div>
            <div className="mt-1 text-2xl font-semibold">{formatCurrency(currentPeriod.total)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {currentPeriod.hasData
                ? `${currentPeriod.transactionCount} transactions`
                : 'No data for this period'}
            </div>
          </div>

          {/* Previous Period */}
          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="text-sm font-medium text-muted-foreground">{previousPeriod.label}</div>
            <div className="mt-1 text-2xl font-semibold">
              {formatCurrency(previousPeriod.total)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {previousPeriod.hasData
                ? `${previousPeriod.transactionCount} transactions`
                : 'No data for this period'}
            </div>
          </div>

          {/* Difference */}
          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="text-sm font-medium text-muted-foreground">Difference</div>
            <div
              className={`mt-1 flex items-center gap-2 text-2xl font-semibold ${
                isSpendingDown ? 'text-success-foreground' : 'text-destructive'
              }`}
            >
              {isSpendingDown ? (
                <TrendingDown className="h-5 w-5" />
              ) : (
                <TrendingUp className="h-5 w-5" />
              )}
              {formatCurrency(Math.abs(totalDifference))}
            </div>
            {previousPeriod.total > 0 && (
              <div
                className={`mt-1 flex items-center text-xs ${
                  isSpendingDown ? 'text-success-foreground' : 'text-destructive'
                }`}
              >
                {isSpendingDown ? (
                  <ArrowDownRight className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                )}
                {Math.abs(percentageChange).toFixed(1)}% {isSpendingDown ? 'decrease' : 'increase'}
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <Tabs defaultValue="categories" className="w-full">
          <TabsList>
            <TabsTrigger value="categories">By Category</TabsTrigger>
            {mode === 'year' && <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>}
          </TabsList>

          <TabsContent value="categories" className="mt-4">
            {categoryComparisons.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No category data available for comparison
              </div>
            ) : (
              <div className="space-y-4">
                {/* Category Bar Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: '#cbd5f5', fontSize: 12 }}
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
                      formatter={(value) => formatCurrency(Number(value))}
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
                    <Bar dataKey="current" name={currentPeriod.label} fill={COLORS.current} />
                    <Bar dataKey="previous" name={previousPeriod.label} fill={COLORS.previous} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Category Changes List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Biggest Changes</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {categoryComparisons.slice(0, MAX_CATEGORY_CHANGES).map((cat) => (
                      <div
                        key={cat.categoryId}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-card/30 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.categoryColor || COLORS.current }}
                          />
                          <span className="text-sm font-medium">{cat.categoryName}</span>
                          {cat.isNewCategory && (
                            <span className="rounded bg-info/20 px-1.5 py-0.5 text-xs text-info-foreground">
                              New
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div
                            className={`flex items-center text-sm font-semibold ${
                              cat.difference < 0 ? 'text-success-foreground' : 'text-destructive'
                            }`}
                          >
                            {cat.difference < 0 ? (
                              <ArrowDownRight className="mr-1 h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="mr-1 h-3 w-3" />
                            )}
                            {formatCurrency(Math.abs(cat.difference))}
                          </div>
                          {cat.previousAmount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {cat.percentageChange > 0 ? '+' : ''}
                              {cat.percentageChange.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {mode === 'year' && (
            <TabsContent value="monthly" className="mt-4">
              {comparison.monthlyData.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No monthly data available for comparison
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#cbd5f5', fontSize: 12 }}
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
                      formatter={(value) => formatCurrency(Number(value))}
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
                    <Bar
                      dataKey={selectedCurrentYear}
                      name={selectedCurrentYear.toString()}
                      fill={COLORS.current}
                    >
                      {monthlyChartData.map((_, index) => (
                        <Cell key={`cell-current-${index}`} fill={COLORS.current} />
                      ))}
                    </Bar>
                    <Bar
                      dataKey={selectedPreviousYear}
                      name={selectedPreviousYear.toString()}
                      fill={COLORS.previous}
                    >
                      {monthlyChartData.map((_, index) => (
                        <Cell key={`cell-previous-${index}`} fill={COLORS.previous} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
