import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CustomProjectionItem, NetWorthProjection } from '@/lib/api';
import {
  CalendarClock,
  DollarSign,
  HelpCircle,
  Home,
  Car,
  Plus,
  RefreshCcw,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
  onRecurringToggle: (includeRecurring: boolean) => void;
  onAverageExpensesToggle: (includeExpenses: boolean) => void;
  onCustomItemsChange: (items: CustomProjectionItem[]) => void;
  onProjectionYearsChange: (years: number) => void;
  currentGoal?: number;
  includeRecurringTransfers: boolean;
  includeAverageExpenses: boolean;
  customItems: CustomProjectionItem[];
  projectionYears: number;
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

export function NetWorthProjectionComponent({
  projection,
  loading,
  onGoalChange,
  onRecurringToggle,
  onAverageExpensesToggle,
  onCustomItemsChange,
  onProjectionYearsChange,
  currentGoal,
  includeRecurringTransfers,
  includeAverageExpenses,
  customItems,
  projectionYears,
}: NetWorthProjectionProps) {
  const [goalInput, setGoalInput] = useState(currentGoal?.toString() || '');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemDate, setNewItemDate] = useState('');
  const [newItemIsRecurring, setNewItemIsRecurring] = useState(false);
  const [newItemFrequency, setNewItemFrequency] = useState('Monthly');

  // Sync goalInput when currentGoal changes
  useEffect(() => {
    setGoalInput(currentGoal?.toString() || '');
  }, [currentGoal]);

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

  const handleAddCustomItem = () => {
    const amount = parseFloat(newItemAmount);
    if (newItemDescription && !Number.isNaN(amount)) {
      const newItem: CustomProjectionItem = {
        description: newItemDescription,
        amount: amount,
        date: newItemIsRecurring ? undefined : newItemDate || undefined,
        isRecurring: newItemIsRecurring,
        frequency: newItemIsRecurring ? newItemFrequency : undefined,
      };
      onCustomItemsChange([...customItems, newItem]);
      setNewItemDescription('');
      setNewItemAmount('');
      setNewItemDate('');
      setNewItemIsRecurring(false);
    }
  };

  const handleRemoveCustomItem = (index: number) => {
    const updatedItems = customItems.filter((_, i) => i !== index);
    onCustomItemsChange(updatedItems);
  };

  const addQuickItem = (description: string, amount: number) => {
    const newItem: CustomProjectionItem = {
      description,
      amount,
      isRecurring: false,
    };
    onCustomItemsChange([...customItems, newItem]);
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

  // Transform data for chart
  const chartData = projection.projectedHistory.map((point) => ({
    date: formatChartDate(point.date, 'month' as GroupBy),
    historical: point.isHistorical ? point.projectedNetWorth : null,
    projected: !point.isHistorical ? point.projectedNetWorth : null,
  }));

  // Add line continuity between historical and projected
  const firstProjectedIndex = chartData.findIndex((d) => d.projected !== null);
  if (firstProjectedIndex > 0) {
    const lastHistoricalValue = chartData[firstProjectedIndex - 1].historical;
    chartData[firstProjectedIndex - 1].projected = lastHistoricalValue;
  }

  return (
    <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Net Worth Projection
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Project your future net worth based on recurring transfers and planned expenses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Projection Settings */}
        <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-4">
          <div className="text-sm font-medium">Projection Settings</div>

          {/* Projection Years Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="projection-years" className="text-sm cursor-pointer">
                Projection Period
              </Label>
              <InfoTooltip content="Choose how far into the future you want to project your net worth. Longer periods give you a broader view but may be less accurate." />
            </div>
            <Select
              value={projectionYears.toString()}
              onValueChange={(value) => onProjectionYearsChange(parseInt(value, 10))}
            >
              <SelectTrigger id="projection-years" className="w-32 border-border/60 bg-card/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Year</SelectItem>
                <SelectItem value="2">2 Years</SelectItem>
                <SelectItem value="3">3 Years</SelectItem>
                <SelectItem value="5">5 Years</SelectItem>
                <SelectItem value="10">10 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Recurring Transfers Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="include-recurring" className="text-sm cursor-pointer">
                Include Recurring Transfers
              </Label>
              <InfoTooltip
                content={
                  projection.calculationDescriptions?.recurringTransfersMonthlyTotal ||
                  'Include your scheduled recurring transfers in the projection.'
                }
              />
            </div>
            <Switch
              id="include-recurring"
              checked={includeRecurringTransfers}
              onCheckedChange={onRecurringToggle}
            />
          </div>

          {/* Include Average Expenses Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="include-expenses" className="text-sm cursor-pointer">
                Subtract Average Monthly Expenses
              </Label>
              <InfoTooltip
                content={
                  projection.calculationDescriptions?.averageMonthlyExpenses ||
                  'Subtract your average monthly expenses from the projection to account for regular spending.'
                }
              />
            </div>
            <Switch
              id="include-expenses"
              checked={includeAverageExpenses}
              onCheckedChange={onAverageExpensesToggle}
            />
          </div>

          {/* Recurring Transfers Summary */}
          {includeRecurringTransfers &&
            projection.recurringTransfers &&
            projection.recurringTransfers.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Active Recurring Transfers ({projection.recurringTransfers.length})
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {projection.recurringTransfers.map((rt) => (
                    <div
                      key={rt.id}
                      className="flex items-center justify-between rounded bg-card/40 px-2 py-1 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-3 w-3 text-muted-foreground" />
                        <span>{rt.description || rt.assetName}</span>
                        <span className="text-muted-foreground">({rt.frequency})</span>
                      </div>
                      <span className={rt.amount >= 0 ? 'text-success' : 'text-destructive'}>
                        {formatCurrency(rt.monthlyEquivalent)}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Custom Projection Items */}
        <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Custom Projection Items</span>
              <InfoTooltip
                content={
                  projection.calculationDescriptions?.customItemsTotal ||
                  'Add custom items like major purchases (house, car) or expected income to see how they affect your projection.'
                }
              />
            </div>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => addQuickItem('Home Down Payment', -50000)}
            >
              <Home className="h-3 w-3 mr-1" />
              Home Down Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => addQuickItem('Car Purchase', -30000)}
            >
              <Car className="h-3 w-3 mr-1" />
              Car Purchase
            </Button>
          </div>

          {/* Add Custom Item Form */}
          <div className="grid gap-2 md:grid-cols-5">
            <Input
              placeholder="Description"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              className="border-border/60 bg-card/70 text-sm"
            />
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                placeholder="Amount"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                className="border-border/60 bg-card/70 text-sm pl-5"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="item-recurring"
                checked={newItemIsRecurring}
                onCheckedChange={setNewItemIsRecurring}
              />
              <Label htmlFor="item-recurring" className="text-xs cursor-pointer">
                Recurring
              </Label>
            </div>
            {newItemIsRecurring ? (
              <Select value={newItemFrequency} onValueChange={setNewItemFrequency}>
                <SelectTrigger className="border-border/60 bg-card/70 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="date"
                value={newItemDate}
                onChange={(e) => setNewItemDate(e.target.value)}
                className="border-border/60 bg-card/70 text-sm"
              />
            )}
            <Button onClick={handleAddCustomItem} size="sm" className="bg-brand hover:bg-brand/90">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Custom Items List */}
          {customItems.length > 0 && (
            <div className="space-y-1">
              {customItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded bg-card/40 px-2 py-1 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span>{item.description}</span>
                    {item.isRecurring ? (
                      <span className="text-muted-foreground">({item.frequency})</span>
                    ) : item.date ? (
                      <span className="text-muted-foreground">
                        ({new Date(item.date).toLocaleDateString()})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">(one-time)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={item.amount >= 0 ? 'text-success' : 'text-destructive'}>
                      {formatCurrency(item.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleRemoveCustomItem(index)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="text-sm text-muted-foreground">Current Net Worth</div>
            <div className="mt-1 text-xl font-semibold">
              {formatCurrency(projection.currentNetWorth)}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              Recurring Transfers
              <InfoTooltip
                content={projection.calculationDescriptions?.recurringTransfersMonthlyTotal || ''}
              />
            </div>
            <div
              className={`mt-1 text-xl font-semibold ${
                projection.recurringTransfersMonthlyTotal >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {formatCurrency(projection.recurringTransfersMonthlyTotal)}/mo
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              Projected Monthly Change
              <InfoTooltip
                content={projection.calculationDescriptions?.projectedMonthlyChange || ''}
              />
            </div>
            <div
              className={`mt-1 flex items-center gap-1 text-xl font-semibold ${
                projection.projectedMonthlyChange >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {projection.projectedMonthlyChange >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {formatCurrency(Math.abs(projection.projectedMonthlyChange))}/mo
            </div>
          </div>

          {includeAverageExpenses && (
            <div className="rounded-lg border border-border/60 bg-card/60 p-4">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                Avg Monthly Expenses
                <InfoTooltip
                  content={projection.calculationDescriptions?.averageMonthlyExpenses || ''}
                />
              </div>
              <div className="mt-1 text-xl font-semibold text-destructive">
                -{formatCurrency(projection.averageMonthlyExpenses)}/mo
              </div>
            </div>
          )}
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
                  ⚠️ Based on current projection, this goal may not be achievable. Add more
                  recurring deposits or reduce expenses.
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

            <Line
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke="#00C49F"
              strokeWidth={3}
              strokeDasharray="8 4"
              dot={false}
              activeDot={{ r: 6, fill: '#00C49F' }}
              connectNulls={false}
            />

            {projection.goal && (
              <ReferenceLine
                y={projection.goal.goalAmount}
                stroke="#FFBB28"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Goal: ${formatCurrency(projection.goal.goalAmount)}`,
                  fill: '#FFBB28',
                  fontSize: 12,
                  position: 'right',
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* How It's Calculated Section */}
        <div className="rounded-lg border border-border/60 bg-card/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HelpCircle className="h-4 w-4" />
            How the Projection is Calculated
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {projection.calculationDescriptions?.projection ||
              'The projection is calculated based on your recurring transfers and any custom items you add. Enable "Subtract Average Monthly Expenses" to account for your typical spending patterns.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
