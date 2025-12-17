import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NetWorthProjection } from '@/lib/api';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatChartDate, type GroupBy } from './constants';

interface NetWorthProjectionProps {
  projection: NetWorthProjection | null;
  loading: boolean;
  onGoalChange: (goalAmount: number | undefined) => void;
  currentGoal?: number;
}

const chartTooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#e2e8f0',
};

export function NetWorthProjectionComponent({
  projection,
  loading,
  onGoalChange,
  currentGoal,
}: NetWorthProjectionProps) {
  const [goalInput, setGoalInput] = useState(currentGoal?.toString() || '');

  const handleSetGoal = () => {
    const goalValue = parseFloat(goalInput);
    if (!Number.isNaN(goalValue) && goalValue > 0) {
      onGoalChange(goalValue);
    }
  };

  const handleClearGoal = () => {
    setGoalInput('');
    onGoalChange(undefined);
  };

  if (loading) {
    return (
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading projection data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!projection) {
    return (
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p>No projection data available.</p>
            <p className="mt-2 text-sm">
              Add expense data and update account balances to see projections.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart - separate historical and projected values
  const chartData = projection.projectedHistory.map((point) => ({
    date: formatChartDate(point.date, 'month' as GroupBy),
    historical: point.isHistorical ? point.projectedNetWorth : null,
    projected: !point.isHistorical ? point.projectedNetWorth : null,
    // Add connection point: last historical point also appears in projected for continuity
    isLastHistorical:
      point.isHistorical &&
      projection.projectedHistory.findIndex((p) => !p.isHistorical) ===
        projection.projectedHistory.indexOf(point) + 1,
  }));

  // Add the last historical value to the first projected point for line continuity
  const lastHistoricalIndex = chartData.findIndex((d) => d.projected !== null) - 1;
  if (lastHistoricalIndex >= 0 && lastHistoricalIndex < chartData.length - 1) {
    chartData[lastHistoricalIndex + 1].projected =
      chartData[lastHistoricalIndex + 1].projected ?? chartData[lastHistoricalIndex].historical;
    // Also set the last historical point as the first projected point for continuity
    chartData[lastHistoricalIndex].projected = chartData[lastHistoricalIndex].historical;
  }

  return (
    <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Net Worth Projection
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Future net worth based on your expense trends from the last 12 months
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="text-sm text-muted-foreground">Avg Monthly Expenses</div>
            <div className="mt-1 text-xl font-semibold text-destructive">
              {formatCurrency(projection.averageMonthlyExpenses)}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="text-sm text-muted-foreground">Avg Monthly Net Change</div>
            <div
              className={`mt-1 flex items-center gap-1 text-xl font-semibold ${
                projection.averageMonthlyNetChange >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {projection.averageMonthlyNetChange >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {formatCurrency(Math.abs(projection.averageMonthlyNetChange))}
              {projection.averageMonthlyNetChange >= 0 ? '/mo' : '/mo loss'}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="text-sm text-muted-foreground">Current Net Worth</div>
            <div className="mt-1 text-xl font-semibold">
              {formatCurrency(projection.currentNetWorth)}
            </div>
          </div>
        </div>

        {/* Goal Input */}
        <div className="rounded-lg border border-border/60 bg-card/60 p-4">
          <Label htmlFor="goal-amount" className="text-sm font-medium">
            Set a Net Worth Goal
          </Label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="goal-amount"
                type="number"
                placeholder="Enter goal amount"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="border-border/60 bg-card/70 pl-7"
              />
            </div>
            <Button
              onClick={handleSetGoal}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Set Goal
            </Button>
            {currentGoal && (
              <Button variant="outline" onClick={handleClearGoal} className="border-border/60">
                Clear
              </Button>
            )}
          </div>

          {/* Goal Status */}
          {projection.goal && (
            <div className="mt-4 rounded-lg border border-border/40 bg-card/40 p-3">
              <div className="flex items-center gap-2">
                <Target
                  className={`h-4 w-4 ${projection.goal.isAchievable ? 'text-success' : 'text-destructive'}`}
                />
                <span className="font-medium">
                  Goal: {formatCurrency(projection.goal.goalAmount)}
                </span>
              </div>
              {projection.goal.isAchievable ? (
                <div className="mt-2 text-sm text-muted-foreground">
                  {projection.goal.monthsToGoal === 0 ? (
                    <span className="text-success">
                      🎉 Congratulations! You&apos;ve reached your goal!
                    </span>
                  ) : (
                    <>
                      Estimated to reach goal in{' '}
                      <span className="font-medium text-foreground">
                        {projection.goal.monthsToGoal}{' '}
                        {projection.goal.monthsToGoal === 1 ? 'month' : 'months'}
                      </span>
                      {projection.goal.estimatedGoalDate && (
                        <>
                          {' '}
                          (
                          {new Date(projection.goal.estimatedGoalDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                          )
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-sm text-destructive">
                  ⚠️ Based on current trends, this goal may not be achievable. Consider reducing
                  expenses or increasing income.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Projection Chart */}
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#cbd5f5' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              tick={{ fill: '#cbd5f5' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={chartTooltipStyle}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ color: '#cbd5f5' }} />

            {/* Historical net worth (solid line) */}
            <Line
              type="monotone"
              dataKey="historical"
              name="Historical"
              stroke="#8884d8"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#8884d8' }}
              connectNulls={false}
            />

            {/* Projected net worth (dashed line) */}
            <Line
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke="#8884d8"
              strokeWidth={3}
              strokeDasharray="8 4"
              dot={false}
              activeDot={{ r: 6, fill: '#8884d8' }}
              connectNulls={false}
            />

            {/* Goal reference line */}
            {projection.goal && (
              <ReferenceLine
                y={projection.goal.goalAmount}
                stroke="#00C49F"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Goal: ${formatCurrency(projection.goal.goalAmount)}`,
                  fill: '#00C49F',
                  fontSize: 12,
                  position: 'right',
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Chart Legend */}
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-8 bg-[#8884d8]" />
            <span>Historical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-8 border-b-2 border-dashed border-[#8884d8]" />
            <span>Projected</span>
          </div>
          {projection.goal && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-8 border-b-2 border-dashed border-[#00C49F]" />
              <span>Goal</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
