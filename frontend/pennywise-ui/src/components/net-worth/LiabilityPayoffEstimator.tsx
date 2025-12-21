import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TooltipContent, TooltipTrigger, Tooltip as UITooltip } from '@/components/ui/tooltip';
import type { LiabilityPayoffEstimate, LiabilityPayoffSettings } from '@/lib/api';
import {
  Calculator,
  CalendarCheck,
  CreditCard,
  DollarSign,
  HelpCircle,
  TrendingDown,
} from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatChartDate, formatCurrency, type GroupBy } from './constants';

interface LiabilityPayoffEstimatorProps {
  estimate: LiabilityPayoffEstimate | null;
  loading: boolean;
  onSettingsChange: (settings: LiabilityPayoffSettings[]) => void;
  currentSettings: LiabilityPayoffSettings[];
}

const chartTooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#e2e8f0',
};

function InfoTooltip({ content }: { content: string }) {
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground hover:text-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm" side="top">
        {content}
      </TooltipContent>
    </UITooltip>
  );
}

function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  }
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
}

export function LiabilityPayoffEstimator({
  estimate,
  loading,
  onSettingsChange,
}: LiabilityPayoffEstimatorProps) {
  const [localSettings, setLocalSettings] = useState<
    Record<number, { monthlyPayment: string; interestRate: string }>
  >({});

  const handleSettingChange = (
    assetId: number,
    field: 'monthlyPayment' | 'interestRate',
    value: string
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: value,
      },
    }));
  };

  const handleApplySettings = () => {
    const newSettings: LiabilityPayoffSettings[] = Object.entries(localSettings).map(
      ([assetId, values]) => ({
        assetId: parseInt(assetId, 10),
        monthlyPayment: values.monthlyPayment ? parseFloat(values.monthlyPayment) : undefined,
        interestRate: values.interestRate ? parseFloat(values.interestRate) : undefined,
      })
    );
    onSettingsChange(newSettings);
  };

  if (loading) {
    return (
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading liability payoff data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!estimate || estimate.liabilities.length === 0) {
    return (
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Liability Payoff Estimator
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Track when your debts will be paid off
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <CreditCard className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p>No liabilities found.</p>
            <p className="mt-2 text-sm">
              Add liability accounts (like credit cards, loans, or mortgages) to see payoff
              estimates.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data - combine all liability payoff schedules
  const chartData: { date: string; [key: string]: number | string }[] = [];
  const allDates = new Set<string>();

  estimate.liabilities.forEach((liability) => {
    liability.payoffSchedule.forEach((point) => {
      allDates.add(point.date);
    });
  });

  const sortedDates = Array.from(allDates).sort();

  sortedDates.forEach((date) => {
    const dataPoint: { date: string; [key: string]: number | string } = {
      date: formatChartDate(date, 'month' as GroupBy),
    };

    let totalBalance = 0;
    estimate.liabilities.forEach((liability) => {
      const point = liability.payoffSchedule.find((p) => p.date === date);
      if (point) {
        dataPoint[liability.name] = point.balance;
        totalBalance += point.balance;
      } else {
        // Find the most recent balance before this date
        const prevPoints = liability.payoffSchedule.filter((p) => p.date < date);
        if (prevPoints.length > 0) {
          const lastPoint = prevPoints[prevPoints.length - 1];
          dataPoint[liability.name] = lastPoint.balance;
          totalBalance += lastPoint.balance;
        }
      }
    });
    dataPoint['Total'] = totalBalance;

    chartData.push(dataPoint);
  });

  // Generate colors for each liability
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#F8B500',
    '#9B59B6',
  ];

  return (
    <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Liability Payoff Estimator
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Track when your debts will be paid off based on current payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Total Liabilities
            </div>
            <div className="mt-1 text-xl font-semibold text-destructive">
              {formatCurrency(estimate.totalLiabilities)}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Monthly Payments
            </div>
            <div className="mt-1 text-xl font-semibold">
              {formatCurrency(estimate.totalMonthlyPayment)}/mo
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarCheck className="h-4 w-4" />
              Debt-Free Date
            </div>
            <div className="mt-1 text-xl font-semibold text-success">
              {estimate.overallPayoffDate
                ? new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC',
                  }).format(new Date(estimate.overallPayoffDate))
                : 'N/A'}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              Time to Payoff
            </div>
            <div className="mt-1 text-xl font-semibold">
              {estimate.monthsToPayoff ? formatMonths(estimate.monthsToPayoff) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Payoff Chart */}
        {chartData.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <h3 className="mb-4 text-sm font-medium">Payoff Timeline</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#cbd5f5' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#cbd5f5' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend wrapperStyle={{ color: '#cbd5f5' }} />

                {estimate.liabilities.map((liability, index) => (
                  <Area
                    key={liability.assetId}
                    type="monotone"
                    dataKey={liability.name}
                    stackId="1"
                    stroke={liability.color || colors[index % colors.length]}
                    fill={liability.color || colors[index % colors.length]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Individual Liability Settings */}
        <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Liability Details</h3>
              <InfoTooltip content="Customize monthly payment amounts and interest rates to see how they affect your payoff timeline. Leave blank to use detected recurring payments." />
            </div>
            <Button variant="outline" size="sm" onClick={handleApplySettings} className="text-xs">
              Recalculate
            </Button>
          </div>

          <div className="space-y-4">
            {estimate.liabilities.map((liability, index) => {
              const settings = localSettings[liability.assetId] || {
                monthlyPayment:
                  liability.monthlyPayment > 0 ? liability.monthlyPayment.toString() : '',
                interestRate: liability.interestRate?.toString() || '',
              };

              return (
                <div
                  key={liability.assetId}
                  className="rounded-lg border border-border/40 bg-card/40 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: liability.color || colors[index % colors.length],
                        }}
                      />
                      <span className="font-medium">{liability.name}</span>
                      {liability.hasRecurringPayment && (
                        <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded">
                          Auto-detected payment
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-semibold text-destructive">
                      {formatCurrency(liability.currentBalance)}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Monthly Payment</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          placeholder={
                            liability.monthlyPayment > 0 ? liability.monthlyPayment.toString() : '0'
                          }
                          value={settings.monthlyPayment}
                          onChange={(e) =>
                            handleSettingChange(liability.assetId, 'monthlyPayment', e.target.value)
                          }
                          className="h-8 border-border/60 bg-card/70 text-sm pl-5"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Interest Rate (APR)</Label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder={liability.interestRate?.toString() || '0'}
                          value={settings.interestRate}
                          onChange={(e) =>
                            handleSettingChange(liability.assetId, 'interestRate', e.target.value)
                          }
                          className="h-8 border-border/60 bg-card/70 text-sm pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Payoff Date</Label>
                      <div className="mt-1 h-8 flex items-center text-sm">
                        {liability.estimatedPayoffDate
                          ? new Intl.DateTimeFormat('en-US', {
                              month: 'short',
                              year: 'numeric',
                              timeZone: 'UTC',
                            }).format(new Date(liability.estimatedPayoffDate))
                          : liability.monthlyPayment > 0
                            ? 'Calculating...'
                            : 'No payment set'}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Total Interest</Label>
                      <div className="mt-1 h-8 flex items-center text-sm text-destructive">
                        {liability.totalInterestPaid > 0
                          ? formatCurrency(liability.totalInterestPaid)
                          : '$0.00'}
                      </div>
                    </div>
                  </div>

                  {liability.monthsToPayoff && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Estimated payoff in {formatMonths(liability.monthsToPayoff)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tips Section */}
        <div className="rounded-lg border border-border/60 bg-card/60 p-4">
          <h3 className="text-sm font-medium mb-2">💡 Payoff Tips</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Pay more than the minimum to reduce total interest paid</li>
            <li>• Consider the avalanche method: pay off highest interest rate debt first</li>
            <li>• Or use the snowball method: pay off smallest balance first for quick wins</li>
            <li>• Set up recurring payments to ensure you never miss a payment</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
