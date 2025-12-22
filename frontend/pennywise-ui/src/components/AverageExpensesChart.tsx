import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AverageExpenses } from '@/lib/api';
import { summaryApi } from '@/lib/api';
import { BarChart3, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AverageExpensesChartProps {
  userId: number;
  availableYears: number[];
}

// Generate distinct colors for each year
const YEAR_COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#FF6B9D',
];

const AVERAGE_LINE_COLOR = '#ef4444';

// Display constants
const MAX_CHART_CATEGORIES = 10;
const CATEGORY_NAME_MAX_LENGTH = 12;

export function AverageExpensesChart({ userId, availableYears }: AverageExpensesChartProps) {
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'category' | 'year'>('month');
  const [averageData, setAverageData] = useState<AverageExpenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Set default years only once when availableYears first becomes available
  // Don't re-select if user manually deselects all years
  useEffect(() => {
    if (availableYears.length > 0 && !hasInitialized) {
      // availableYears is in descending order (newest first), so slice(0, 3) gets the most recent
      const defaultYears = availableYears.slice(0, 3);
      setSelectedYears(defaultYears.sort((a, b) => a - b));
      setHasInitialized(true);
    }
  }, [availableYears, hasInitialized]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const loadAverageExpenses = useCallback(async () => {
    if (selectedYears.length === 0) {
      setAverageData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 'year' view uses 'month' API mode since it only needs yearly totals which are always included
      const apiViewMode = viewMode === 'year' ? 'month' : viewMode;
      const data = await summaryApi.getAverageExpenses(userId, {
        viewMode: apiViewMode,
        years: selectedYears,
      });
      setAverageData(data);
    } catch (error) {
      console.error('Error loading average expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, viewMode, selectedYears]);

  useEffect(() => {
    loadAverageExpenses();
  }, [loadAverageExpenses]);

  const toggleYear = (year: number) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year);
      } else {
        return [...prev, year].sort((a, b) => a - b);
      }
    });
  };

  if (loading) {
    return (
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading average expenses data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!averageData || selectedYears.length === 0) {
    return (
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Average Expenses
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Select years to view average spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            {availableYears.map((year) => (
              <div key={year} className="flex items-center space-x-2">
                <Checkbox
                  id={`year-${year}`}
                  checked={selectedYears.includes(year)}
                  onCheckedChange={() => toggleYear(year)}
                />
                <Label
                  htmlFor={`year-${year}`}
                  className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {year}
                </Label>
              </div>
            ))}
          </div>
          <div className="py-8 text-center text-muted-foreground">
            Please select at least one year to view average expenses
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data for monthly view
  const monthlyChartData = averageData.monthlyAverages.map((m) => {
    const dataPoint: Record<string, string | number> = {
      name: m.monthName,
      Average: m.average,
    };

    // Add individual year data
    averageData.yearlyData.forEach((yearData) => {
      const monthData = yearData.monthlyData.find((md) => md.month === m.month);
      dataPoint[yearData.year.toString()] = monthData?.amount || 0;
    });

    return dataPoint;
  });

  // Prepare chart data for category view
  const categoriesToShow = showAllCategories
    ? averageData.categoryAverages
    : averageData.categoryAverages.slice(0, MAX_CHART_CATEGORIES);
  const hasMoreCategories = averageData.categoryAverages.length > MAX_CHART_CATEGORIES;

  const categoryChartData = categoriesToShow.map((c) => {
    const dataPoint: Record<string, string | number> = {
      name:
        c.categoryName.length > CATEGORY_NAME_MAX_LENGTH
          ? c.categoryName.slice(0, CATEGORY_NAME_MAX_LENGTH) + '...'
          : c.categoryName,
      Average: c.average,
    };

    // Add individual year data
    averageData.yearlyData.forEach((yearData) => {
      const catData = yearData.categoryData.find((cd) => cd.categoryId === c.categoryId);
      dataPoint[yearData.year.toString()] = catData?.amount || 0;
    });

    return dataPoint;
  });

  // Prepare chart data for yearly view - shows yearly totals as a trend
  const yearlyChartData = averageData.yearlyData
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((y) => ({
      name: y.year.toString(),
      Total: y.total,
    }));

  return (
    <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 shrink-0" />
              <span className="truncate">Average Expenses</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Compare spending across multiple years with averages
            </CardDescription>
          </div>
          {/* View Mode Toggle */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'month' | 'category' | 'year')}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-9 w-full sm:w-auto">
              <TabsTrigger value="month" className="flex-1 text-xs sm:flex-none">
                By Month
              </TabsTrigger>
              <TabsTrigger value="category" className="flex-1 text-xs sm:flex-none">
                By Category
              </TabsTrigger>
              <TabsTrigger value="year" className="flex-1 text-xs sm:flex-none">
                By Year
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Year Selectors */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <span className="text-sm text-muted-foreground">Select years:</span>
          <div className="flex flex-wrap gap-3">
            {availableYears.map((year, index) => (
              <div key={year} className="flex items-center space-x-2">
                <Checkbox
                  id={`year-select-${year}`}
                  checked={selectedYears.includes(year)}
                  onCheckedChange={() => toggleYear(year)}
                />
                <Label
                  htmlFor={`year-select-${year}`}
                  className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  style={{ color: YEAR_COLORS[index % YEAR_COLORS.length] }}
                >
                  {year}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-2">
            <div className="text-xs text-muted-foreground">Average Total</div>
            <div className="text-lg font-semibold">{formatCurrency(averageData.totalAverage)}</div>
            <div className="text-xs text-muted-foreground">per year</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Selected:</span>
            {selectedYears.map((year) => (
              <Badge
                key={year}
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: YEAR_COLORS[availableYears.indexOf(year) % YEAR_COLORS.length],
                  color: YEAR_COLORS[availableYears.indexOf(year) % YEAR_COLORS.length],
                }}
              >
                {year}
              </Badge>
            ))}
          </div>
        </div>

        {/* Charts */}
        <Tabs defaultValue="line" className="w-full">
          <TabsList>
            <TabsTrigger value="line">Line Chart</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="line" className="mt-4">
            {viewMode === 'month' ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyChartData}>
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
                  {/* Individual year lines */}
                  {averageData.yearlyData.map((yearData) => (
                    <Line
                      key={yearData.year}
                      type="monotone"
                      dataKey={yearData.year.toString()}
                      name={yearData.year.toString()}
                      stroke={
                        YEAR_COLORS[availableYears.indexOf(yearData.year) % YEAR_COLORS.length]
                      }
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                  {/* Average line */}
                  <Line
                    type="monotone"
                    dataKey="Average"
                    name="Average"
                    stroke={AVERAGE_LINE_COLOR}
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: AVERAGE_LINE_COLOR }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : viewMode === 'year' ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={yearlyChartData}>
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
                  <Line
                    type="monotone"
                    dataKey="Total"
                    name="Yearly Total"
                    stroke={YEAR_COLORS[0]}
                    strokeWidth={3}
                    dot={{ r: 6, fill: YEAR_COLORS[0] }}
                    activeDot={{ r: 8 }}
                  />
                  {/* Average line */}
                  <Line
                    type="monotone"
                    dataKey={() => averageData.totalAverage}
                    name="Average"
                    stroke={AVERAGE_LINE_COLOR}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <>
                {/* Show All Toggle for Category View */}
                {hasMoreCategories && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showAllCategories ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Show top {MAX_CHART_CATEGORIES}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Show all {averageData.categoryAverages.length} categories
                        </>
                      )}
                    </button>
                  </div>
                )}
                <ResponsiveContainer
                  width="100%"
                  height={showAllCategories ? Math.max(350, categoriesToShow.length * 35) : 350}
                >
                  <LineChart data={categoryChartData}>
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
                    {/* Individual year lines */}
                    {averageData.yearlyData.map((yearData) => (
                      <Line
                        key={yearData.year}
                        type="monotone"
                        dataKey={yearData.year.toString()}
                        name={yearData.year.toString()}
                        stroke={
                          YEAR_COLORS[availableYears.indexOf(yearData.year) % YEAR_COLORS.length]
                        }
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                    {/* Average line */}
                    <Line
                      type="monotone"
                      dataKey="Average"
                      name="Average"
                      stroke={AVERAGE_LINE_COLOR}
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: AVERAGE_LINE_COLOR }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            {viewMode === 'month' ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Monthly Averages</h4>
                <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                  {averageData.monthlyAverages.map((m) => (
                    <div
                      key={m.month}
                      className="rounded-lg border border-border/60 bg-card/30 p-3"
                    >
                      <div className="text-sm font-medium">{m.monthName}</div>
                      <div className="mt-1 text-lg font-semibold">{formatCurrency(m.average)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Range: {formatCurrency(m.min)} - {formatCurrency(m.max)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : viewMode === 'year' ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Yearly Totals</h4>
                <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                  {averageData.yearlyData
                    .slice()
                    .sort((a, b) => b.year - a.year)
                    .map((y, index) => (
                      <div
                        key={y.year}
                        className="rounded-lg border border-border/60 bg-card/30 p-3"
                      >
                        <div
                          className="text-sm font-medium"
                          style={{
                            color: YEAR_COLORS[availableYears.indexOf(y.year) % YEAR_COLORS.length],
                          }}
                        >
                          {y.year}
                        </div>
                        <div className="mt-1 text-lg font-semibold">{formatCurrency(y.total)}</div>
                        {index < averageData.yearlyData.length - 1 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {(() => {
                              const sortedData = averageData.yearlyData
                                .slice()
                                .sort((a, b) => b.year - a.year);
                              const prevYear = sortedData[index + 1];
                              if (prevYear && prevYear.total > 0) {
                                const diff = y.total - prevYear.total;
                                const pctChange = (diff / prevYear.total) * 100;
                                return (
                                  <span className={diff < 0 ? 'text-green-400' : 'text-red-400'}>
                                    {diff > 0 ? '+' : ''}
                                    {pctChange.toFixed(1)}% vs {prevYear.year}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Category Averages</h4>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {averageData.categoryAverages.map((c) => (
                    <div
                      key={c.categoryId}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-card/30 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.categoryColor || '#0088FE' }}
                        />
                        <span className="text-sm font-medium">{c.categoryName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(c.average)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(c.min)} - {formatCurrency(c.max)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
