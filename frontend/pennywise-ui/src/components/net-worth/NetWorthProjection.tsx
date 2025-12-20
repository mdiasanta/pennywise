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
import { TooltipContent, TooltipTrigger, Tooltip as UITooltip } from '@/components/ui/tooltip';
import type { CustomProjectionItem, NetWorthProjection } from '@/lib/api';
import {
  Briefcase,
  CalendarClock,
  Car,
  DollarSign,
  HelpCircle,
  Home,
  Plus,
  RefreshCcw,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { ASSET_COLOR_PALETTE, formatChartDate, formatCurrency, type GroupBy } from './constants';

// Use Coral color from palette for hypothetical income line
const HYPOTHETICAL_LINE_COLOR = ASSET_COLOR_PALETTE[1]; // Coral (#FF6B6B)

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

  // Quick item form states
  const [homeDownPaymentAmount, setHomeDownPaymentAmount] = useState('50000');
  const [homeDownPaymentDate, setHomeDownPaymentDate] = useState('');
  const [carPurchaseAmount, setCarPurchaseAmount] = useState('30000');
  const [carPurchaseDate, setCarPurchaseDate] = useState('');

  // Hypothetical income comparison states
  const [hypotheticalIncomeEnabled, setHypotheticalIncomeEnabled] = useState(false);
  const [hypotheticalMonthlyIncome, setHypotheticalMonthlyIncome] = useState('');

  // Sync goalInput when currentGoal changes
  useEffect(() => {
    setGoalInput(currentGoal?.toString() || '');
  }, [currentGoal]);

  // Calculate minimum date (first day of next month)
  const getMinDate = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  };
  const minDate = getMinDate();

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
      // For non-recurring items with a date, validate it's at least next month
      if (!newItemIsRecurring && newItemDate && newItemDate < minDate) {
        return; // Don't add if date is before next month
      }
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

  const addQuickItem = (description: string, amount: number, date?: string) => {
    // Validate date is at least next month if provided
    if (date && date < minDate) {
      return;
    }
    const newItem: CustomProjectionItem = {
      description,
      amount,
      date: date || undefined,
      isRecurring: false,
    };
    onCustomItemsChange([...customItems, newItem]);
  };

  // Parse hypothetical monthly income
  const hypotheticalIncomeValue = parseFloat(hypotheticalMonthlyIncome);
  const hasValidHypotheticalIncome =
    hypotheticalIncomeEnabled &&
    !Number.isNaN(hypotheticalIncomeValue) &&
    hypotheticalIncomeValue > 0;

  // Calculate hypothetical projection and goal data using useMemo
  // This must be called before any early returns to follow Rules of Hooks
  const { chartData, hypotheticalGoalInfo } = useMemo(() => {
    // Return empty data if projection is null (will be handled by early return)
    if (!projection) {
      return { chartData: [], hypotheticalGoalInfo: null };
    }

    // Get projected points once for reuse
    const projectedPoints = projection.projectedHistory.filter((p) => !p.isHistorical);

    // Transform data for chart
    const data = projection.projectedHistory.map((point) => {
      const baseData: {
        date: string;
        historical: number | null;
        projected: number | null;
        hypothetical: number | null;
      } = {
        date: formatChartDate(point.date, 'month' as GroupBy),
        historical: point.isHistorical ? point.projectedNetWorth : null,
        projected: !point.isHistorical ? point.projectedNetWorth : null,
        hypothetical: null,
      };

      // Calculate hypothetical projection (adds extra monthly income to projected values)
      if (hasValidHypotheticalIncome && !point.isHistorical) {
        // Find how many months this point is into the projection using date only
        const monthIndex = projectedPoints.findIndex((p) => p.date === point.date);
        if (monthIndex >= 0) {
          // Calculate cumulative additional income at this point
          const additionalIncome = hypotheticalIncomeValue * (monthIndex + 1);
          baseData.hypothetical = point.projectedNetWorth + additionalIncome;
        }
      }

      return baseData;
    });

    // Add line continuity between historical and projected
    const firstProjectedIndex = data.findIndex((d) => d.projected !== null);
    if (firstProjectedIndex > 0) {
      const lastHistoricalValue = data[firstProjectedIndex - 1].historical;
      data[firstProjectedIndex - 1].projected = lastHistoricalValue;
      if (hasValidHypotheticalIncome) {
        data[firstProjectedIndex - 1].hypothetical = lastHistoricalValue;
      }
    }

    // Calculate hypothetical goal achievement
    let hypotheticalGoal: {
      monthsToGoal: number | null;
      estimatedGoalDate: string | null;
      isAchievable: boolean;
    } | null = null;

    if (hasValidHypotheticalIncome && currentGoal) {
      const currentNetWorth = projection.currentNetWorth;

      if (currentNetWorth >= currentGoal) {
        hypotheticalGoal = {
          monthsToGoal: 0,
          estimatedGoalDate: new Date().toISOString(),
          isAchievable: true,
        };
      } else {
        // Find when hypothetical projection reaches the goal
        const hypotheticalPoints = data.filter((d) => d.hypothetical !== null);
        for (let i = 0; i < hypotheticalPoints.length; i++) {
          const hypotheticalValue = hypotheticalPoints[i].hypothetical;
          if (hypotheticalValue !== null && hypotheticalValue >= currentGoal) {
            hypotheticalGoal = {
              monthsToGoal: i + 1,
              estimatedGoalDate: projectedPoints[i]?.date ?? null,
              isAchievable: true,
            };
            break;
          }
        }

        // If not reached within projection period but trending positive, estimate
        if (!hypotheticalGoal && projection.projectedMonthlyChange + hypotheticalIncomeValue > 0) {
          const lastHypotheticalPoint = hypotheticalPoints[hypotheticalPoints.length - 1];
          const lastHypotheticalValue = lastHypotheticalPoint?.hypothetical;
          if (lastHypotheticalValue !== null && lastHypotheticalValue !== undefined) {
            const remainingToGoal = currentGoal - lastHypotheticalValue;
            const monthlyChange = projection.projectedMonthlyChange + hypotheticalIncomeValue;
            const additionalMonthsNeeded = Math.ceil(remainingToGoal / monthlyChange);
            const lastProjectedPoint = projectedPoints[projectedPoints.length - 1];
            if (lastProjectedPoint) {
              const estimatedDate = new Date(lastProjectedPoint.date);
              estimatedDate.setMonth(estimatedDate.getMonth() + additionalMonthsNeeded);
              hypotheticalGoal = {
                monthsToGoal: hypotheticalPoints.length + additionalMonthsNeeded,
                estimatedGoalDate: estimatedDate.toISOString(),
                isAchievable: true,
              };
            }
          }
        }

        if (!hypotheticalGoal) {
          hypotheticalGoal = {
            monthsToGoal: null,
            estimatedGoalDate: null,
            isAchievable: false,
          };
        }
      }
    }

    return { chartData: data, hypotheticalGoalInfo: hypotheticalGoal };
  }, [projection, hasValidHypotheticalIncome, hypotheticalIncomeValue, currentGoal]);

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

        {/* Hypothetical Income Comparison */}
        <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="hypothetical-income-toggle" className="text-sm cursor-pointer">
                Compare with New Income
              </Label>
              <InfoTooltip content="See how a new job or additional income would affect your net worth projection. Enter the additional monthly income to see a comparison line on the chart." />
            </div>
            <Switch
              id="hypothetical-income-toggle"
              checked={hypotheticalIncomeEnabled}
              onCheckedChange={setHypotheticalIncomeEnabled}
            />
          </div>

          {hypotheticalIncomeEnabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="hypothetical-income" className="text-sm min-w-fit">
                  Additional Monthly Income
                </Label>
                <div className="relative flex-1 max-w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="hypothetical-income"
                    type="number"
                    placeholder="e.g., 1000"
                    value={hypotheticalMonthlyIncome}
                    onChange={(e) => setHypotheticalMonthlyIncome(e.target.value)}
                    className="border-border/60 bg-card/70 pl-7"
                  />
                </div>
              </div>
              {hasValidHypotheticalIncome && (
                <div className="text-xs text-muted-foreground">
                  This will add{' '}
                  <span className="font-medium text-success">
                    {formatCurrency(hypotheticalIncomeValue)}/month
                  </span>{' '}
                  to your projection, shown as a separate line on the chart below.
                </div>
              )}
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

          {/* Quick Add Items */}
          <div className="space-y-3">
            {/* Home Down Payment */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 min-w-[140px]">
                <Home className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Home Down Payment</span>
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={homeDownPaymentAmount}
                  onChange={(e) => setHomeDownPaymentAmount(e.target.value)}
                  className="w-28 border-border/60 bg-card/70 text-sm pl-5 h-8"
                />
              </div>
              <Input
                type="date"
                value={homeDownPaymentDate}
                onChange={(e) => setHomeDownPaymentDate(e.target.value)}
                min={minDate}
                className="w-36 border-border/60 bg-card/70 text-sm h-8"
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  const amount = parseFloat(homeDownPaymentAmount);
                  if (!Number.isNaN(amount) && amount > 0 && homeDownPaymentDate) {
                    addQuickItem('Home Down Payment', -amount, homeDownPaymentDate);
                  }
                }}
                disabled={!homeDownPaymentAmount || !homeDownPaymentDate}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>

            {/* Car Purchase */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 min-w-[140px]">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Car Purchase</span>
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={carPurchaseAmount}
                  onChange={(e) => setCarPurchaseAmount(e.target.value)}
                  className="w-28 border-border/60 bg-card/70 text-sm pl-5 h-8"
                />
              </div>
              <Input
                type="date"
                value={carPurchaseDate}
                onChange={(e) => setCarPurchaseDate(e.target.value)}
                min={minDate}
                className="w-36 border-border/60 bg-card/70 text-sm h-8"
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  const amount = parseFloat(carPurchaseAmount);
                  if (!Number.isNaN(amount) && amount > 0 && carPurchaseDate) {
                    addQuickItem('Car Purchase', -amount, carPurchaseDate);
                  }
                }}
                disabled={!carPurchaseAmount || !carPurchaseDate}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
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
                min={minDate}
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
                        (
                        {new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }).format(
                          new Date(item.date)
                        )}
                        )
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
            <div className="mt-4 space-y-3">
              {/* Current Projection Goal Status */}
              <div className="rounded-lg border border-border/40 bg-card/40 p-3">
                <div className="flex items-center gap-2">
                  <Target
                    className={`h-4 w-4 ${projection.goal.isAchievable ? 'text-success' : 'text-destructive'}`}
                  />
                  <span className="font-medium">
                    Goal: {formatCurrency(projection.goal.goalAmount)}
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Current Projection: </span>
                  {projection.goal.isAchievable ? (
                    projection.goal.monthsToGoal === 0 ? (
                      <span className="text-success">
                        🎉 Congratulations! You&apos;ve reached your goal!
                      </span>
                    ) : (
                      <span className="text-foreground">
                        <span className="font-medium">
                          {projection.goal.monthsToGoal}{' '}
                          {projection.goal.monthsToGoal === 1 ? 'month' : 'months'}
                        </span>
                        {projection.goal.estimatedGoalDate && (
                          <>
                            {' '}
                            (
                            {new Intl.DateTimeFormat('en-US', {
                              month: 'short',
                              year: 'numeric',
                              timeZone: 'UTC',
                            }).format(new Date(projection.goal.estimatedGoalDate))}
                            )
                          </>
                        )}
                      </span>
                    )
                  ) : (
                    <span className="text-destructive">Not achievable with current trajectory</span>
                  )}
                </div>

                {/* Hypothetical Goal Comparison */}
                {hasValidHypotheticalIncome && hypotheticalGoalInfo && (
                  <div className="mt-2 pt-2 border-t border-border/40">
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        With +{formatCurrency(hypotheticalIncomeValue)}/mo:{' '}
                      </span>
                      {hypotheticalGoalInfo.isAchievable ? (
                        hypotheticalGoalInfo.monthsToGoal === 0 ? (
                          <span className="text-success">Already achieved!</span>
                        ) : (
                          <span style={{ color: HYPOTHETICAL_LINE_COLOR }}>
                            <span className="font-medium">
                              {hypotheticalGoalInfo.monthsToGoal}{' '}
                              {hypotheticalGoalInfo.monthsToGoal === 1 ? 'month' : 'months'}
                            </span>
                            {hypotheticalGoalInfo.estimatedGoalDate && (
                              <>
                                {' '}
                                (
                                {new Intl.DateTimeFormat('en-US', {
                                  month: 'short',
                                  year: 'numeric',
                                  timeZone: 'UTC',
                                }).format(new Date(hypotheticalGoalInfo.estimatedGoalDate))}
                                )
                              </>
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-destructive">Still not achievable</span>
                      )}
                    </div>

                    {/* Show time savings */}
                    {(() => {
                      const currentMonths = projection.goal.monthsToGoal;
                      const hypotheticalMonths = hypotheticalGoalInfo.monthsToGoal;
                      if (
                        projection.goal.isAchievable &&
                        hypotheticalGoalInfo.isAchievable &&
                        currentMonths !== null &&
                        currentMonths !== undefined &&
                        currentMonths > 0 &&
                        hypotheticalMonths !== null &&
                        hypotheticalMonths > 0
                      ) {
                        const monthsSaved = currentMonths - hypotheticalMonths;
                        return (
                          <div className="mt-1 text-xs text-success">
                            ⚡ Saves {monthsSaved} {monthsSaved === 1 ? 'month' : 'months'}!
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Show if hypothetical makes goal achievable */}
                    {!projection.goal.isAchievable && hypotheticalGoalInfo.isAchievable && (
                      <div className="mt-1 text-xs text-success">
                        ✨ This income would make your goal achievable!
                      </div>
                    )}
                  </div>
                )}
              </div>
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

            {hasValidHypotheticalIncome && (
              <Line
                type="monotone"
                dataKey="hypothetical"
                name="With New Income"
                stroke={HYPOTHETICAL_LINE_COLOR}
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={false}
                activeDot={{ r: 6, fill: HYPOTHETICAL_LINE_COLOR }}
                connectNulls={false}
              />
            )}

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
