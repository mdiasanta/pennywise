import { AppLayout } from '@/components/AppLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAssetCategories } from '@/hooks/use-asset-categories';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type {
  Asset,
  AssetSnapshot,
  CreateAsset,
  CreateAssetSnapshot,
  CreateRecurringTransaction,
  NetWorthComparison,
  NetWorthSummary,
  RecurringTransaction,
  UpdateAsset,
} from '@/lib/api';
import { assetApi, assetSnapshotApi, netWorthApi, recurringTransactionApi } from '@/lib/api';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
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

type TimeRange = 'month' | 'quarter' | 'year' | 'all';
type GroupBy = 'day' | 'week' | 'month' | 'quarter' | 'year';

// Maximum years of history to show for "All Time" view
const ALL_TIME_LOOKBACK_YEARS = 5;

// Palette of visually distinct, accessible colors for assets
const ASSET_COLOR_PALETTE = [
  '#4ECDC4', // Teal
  '#FF6B6B', // Coral
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#FFEAA7', // Pale Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Mustard
  '#BB8FCE', // Lavender
  '#85C1E9', // Light Blue
  '#F8B500', // Golden Yellow
  '#16A085', // Dark Teal
  '#E74C3C', // Red
  '#3498DB', // Blue
  '#9B59B6', // Purple
  '#1ABC9C', // Turquoise
  '#F39C12', // Orange
  '#2ECC71', // Green
  '#E91E63', // Pink
  '#00BCD4', // Cyan
];

export default function NetWorthPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { categories, isLoading: categoriesLoading } = useAssetCategories();
  const { toast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<NetWorthSummary | null>(null);
  const [comparison, setComparison] = useState<NetWorthComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('year');
  const [groupBy, setGroupBy] = useState<GroupBy>('month');

  // Dialog states
  const [isAddAssetDialogOpen, setIsAddAssetDialogOpen] = useState(false);
  const [isUpdateBalanceDialogOpen, setIsUpdateBalanceDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAssetForUpdate, setSelectedAssetForUpdate] = useState<Asset | null>(null);

  // Form states
  const [assetFormData, setAssetFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    color: '#4ECDC4',
    initialBalance: '',
  });

  const [balanceFormData, setBalanceFormData] = useState({
    balance: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Recurring transaction states
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isAddRecurringDialogOpen, setIsAddRecurringDialogOpen] = useState(false);

  // Asset history for individual account chart
  const [assetSnapshots, setAssetSnapshots] = useState<Map<number, AssetSnapshot[]>>(new Map());
  const [recurringFormData, setRecurringFormData] = useState({
    assetId: '',
    amount: '',
    description: '',
    frequency: 'Biweekly' as 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Yearly',
    dayOfWeek: 'Friday',
    dayOfMonth: '1',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const getDateRange = useCallback((range: TimeRange) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(startDate.getFullYear() - ALL_TIME_LOOKBACK_YEARS);
        break;
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, []);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(timeRange);

      const [assetsData, summaryData, comparisonData, recurringData] = await Promise.all([
        assetApi.getAll(user.id),
        netWorthApi.getSummary(user.id),
        netWorthApi.getComparison(user.id, startDate, endDate, groupBy),
        recurringTransactionApi.getByUser(user.id),
      ]);

      setAssets(assetsData);
      setSummary(summaryData);
      setComparison(comparisonData);
      setRecurringTransactions(recurringData);

      // Load individual asset snapshots for the chart
      const snapshotsMap = new Map<number, AssetSnapshot[]>();
      const snapshotPromises = assetsData.map(async (asset) => {
        const snapshots = await assetSnapshotApi.getByAsset(asset.id, startDate, endDate);
        return { assetId: asset.id, snapshots };
      });
      const snapshotResults = await Promise.all(snapshotPromises);
      snapshotResults.forEach(({ assetId, snapshots }) => {
        snapshotsMap.set(assetId, snapshots);
      });
      setAssetSnapshots(snapshotsMap);
    } catch (error) {
      console.error('Error loading net worth data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load net worth data. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user, timeRange, groupBy, getDateRange, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getRandomUnusedColor = useCallback(() => {
    const usedColors = new Set(assets.map((a) => a.color?.toLowerCase()));
    const availableColors = ASSET_COLOR_PALETTE.filter(
      (color) => !usedColors.has(color.toLowerCase())
    );

    if (availableColors.length > 0) {
      return availableColors[Math.floor(Math.random() * availableColors.length)];
    }
    // If all palette colors are used, return a random one from the palette
    return ASSET_COLOR_PALETTE[Math.floor(Math.random() * ASSET_COLOR_PALETTE.length)];
  }, [assets]);

  const resetAssetForm = useCallback(() => {
    setAssetFormData({
      name: '',
      description: '',
      categoryId: '',
      color: getRandomUnusedColor(),
      initialBalance: '',
    });
    setEditingAsset(null);
  }, [getRandomUnusedColor]);

  const resetBalanceForm = () => {
    setBalanceFormData({
      balance: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setSelectedAssetForUpdate(null);
  };

  const resetRecurringForm = () => {
    setRecurringFormData({
      assetId: '',
      amount: '',
      description: '',
      frequency: 'Biweekly',
      dayOfWeek: 'Friday',
      dayOfMonth: '1',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
  };

  const handleSubmitRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsedAssetId = parseInt(recurringFormData.assetId, 10);
    if (Number.isNaN(parsedAssetId)) {
      toast({
        variant: 'destructive',
        title: 'Missing account',
        description: 'Please select an account for this recurring transaction.',
      });
      return;
    }

    const parsedAmount = parseFloat(recurringFormData.amount);
    if (Number.isNaN(parsedAmount)) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Please enter a valid amount.',
      });
      return;
    }

    try {
      const createData: CreateRecurringTransaction = {
        assetId: parsedAssetId,
        amount: parsedAmount,
        description: recurringFormData.description,
        frequency: recurringFormData.frequency,
        startDate: new Date(recurringFormData.startDate).toISOString(),
      };

      // Add day of week for weekly/biweekly
      if (recurringFormData.frequency === 'Weekly' || recurringFormData.frequency === 'Biweekly') {
        createData.dayOfWeek = recurringFormData.dayOfWeek;
      }

      // Add day of month for monthly/quarterly
      if (
        recurringFormData.frequency === 'Monthly' ||
        recurringFormData.frequency === 'Quarterly'
      ) {
        createData.dayOfMonth = parseInt(recurringFormData.dayOfMonth, 10);
      }

      // Add end date if specified
      if (recurringFormData.endDate) {
        createData.endDate = new Date(recurringFormData.endDate).toISOString();
      }

      await recurringTransactionApi.create(user.id, createData);
      toast({
        title: 'Success',
        description: 'Recurring transaction created successfully.',
      });
      setIsAddRecurringDialogOpen(false);
      resetRecurringForm();
      loadData();
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create recurring transaction. Please try again.',
      });
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    if (!user) return;

    try {
      await recurringTransactionApi.delete(id, user.id);
      toast({
        title: 'Success',
        description: 'Recurring transaction deleted.',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete recurring transaction.',
      });
    }
  };

  const handleToggleRecurringActive = async (transaction: RecurringTransaction) => {
    if (!user) return;

    try {
      await recurringTransactionApi.update(transaction.id, user.id, {
        isActive: !transaction.isActive,
      });
      toast({
        title: 'Success',
        description: `Recurring transaction ${transaction.isActive ? 'paused' : 'resumed'}.`,
      });
      loadData();
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update recurring transaction.',
      });
    }
  };

  const handleSubmitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsedCategoryId = parseInt(assetFormData.categoryId, 10);
    if (Number.isNaN(parsedCategoryId)) {
      toast({
        variant: 'destructive',
        title: 'Missing category',
        description: 'Please select a category for this account.',
      });
      return;
    }

    try {
      if (editingAsset) {
        const updateData: UpdateAsset = {
          name: assetFormData.name,
          description: assetFormData.description || undefined,
          color: assetFormData.color,
          assetCategoryId: parsedCategoryId,
        };

        await assetApi.update(editingAsset.id, user.id, updateData);
        toast({
          title: 'Success',
          description: 'Account updated successfully.',
        });
      } else {
        const initialBalance = assetFormData.initialBalance
          ? parseFloat(assetFormData.initialBalance)
          : undefined;

        const createData: CreateAsset = {
          name: assetFormData.name,
          description: assetFormData.description || undefined,
          color: assetFormData.color,
          userId: user.id,
          assetCategoryId: parsedCategoryId,
          initialBalance,
        };

        await assetApi.create(createData);
        toast({
          title: 'Success',
          description: 'Account created successfully.',
        });
      }

      setIsAddAssetDialogOpen(false);
      resetAssetForm();
      loadData();
    } catch (error) {
      console.error('Error saving asset:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save account. Please try again.',
      });
    }
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForUpdate) return;

    const balance = parseFloat(balanceFormData.balance);
    if (Number.isNaN(balance)) {
      toast({
        variant: 'destructive',
        title: 'Invalid balance',
        description: 'Please enter a valid number for the balance.',
      });
      return;
    }

    try {
      const snapshotData: CreateAssetSnapshot = {
        assetId: selectedAssetForUpdate.id,
        balance,
        date: new Date(balanceFormData.date).toISOString(),
        notes: balanceFormData.notes || undefined,
      };

      await assetSnapshotApi.create(snapshotData);
      toast({
        title: 'Success',
        description: 'Balance updated successfully.',
      });

      setIsUpdateBalanceDialogOpen(false);
      resetBalanceForm();
      loadData();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update balance. Please try again.',
      });
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetFormData({
      name: asset.name,
      description: asset.description || '',
      categoryId: asset.assetCategoryId.toString(),
      color: asset.color || '#4ECDC4',
      initialBalance: '',
    });
    setIsAddAssetDialogOpen(true);
  };

  const handleOpenUpdateBalance = (asset: Asset) => {
    setSelectedAssetForUpdate(asset);
    setBalanceFormData({
      balance: asset.currentBalance?.toString() || '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsUpdateBalanceDialogOpen(true);
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!user) return;

    try {
      await assetApi.delete(asset.id, user.id);
      toast({
        title: 'Success',
        description: 'Account deleted successfully.',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatChartDate = (dateString: string) => {
    const date = new Date(dateString);
    if (groupBy === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (groupBy === 'week') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (groupBy === 'year') {
      return date.toLocaleDateString('en-US', { year: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'month':
        return 'Last 30 Days';
      case 'quarter':
        return 'Last 3 Months';
      case 'year':
        return 'Last 12 Months';
      case 'all':
        return 'All Time';
    }
  };

  const assetCategories = categories.filter((c) => !c.isLiability);
  const liabilityCategories = categories.filter((c) => c.isLiability);

  const chartData =
    comparison?.netWorthHistory.map((point) => ({
      date: formatChartDate(point.date),
      netWorth: point.netWorth,
      assets: point.totalAssets,
      liabilities: point.totalLiabilities,
      expenses: point.totalExpenses || 0,
    })) || [];

  // Transform asset snapshots into chart data for individual accounts
  const accountsChartData = (() => {
    if (assetSnapshots.size === 0) return [];

    // Collect all unique dates from all assets
    const allDates = new Set<string>();
    assetSnapshots.forEach((snapshots) => {
      snapshots.forEach((snapshot) => {
        allDates.add(snapshot.date.split('T')[0]);
      });
    });

    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort();

    // Build chart data with each asset's balance at each date
    return sortedDates.map((date) => {
      const dataPoint: Record<string, number | string> = {
        date: formatChartDate(date),
      };

      assets.forEach((asset) => {
        const snapshots = assetSnapshots.get(asset.id) || [];
        // Find the most recent snapshot on or before this date
        const relevantSnapshots = snapshots.filter((s) => s.date.split('T')[0] <= date);
        if (relevantSnapshots.length > 0) {
          // Get the latest one
          const latest = relevantSnapshots.reduce((a, b) => (a.date > b.date ? a : b));
          dataPoint[asset.name] = latest.balance;
        }
      });

      return dataPoint;
    });
  })();

  // Show sign-in prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <AppLayout
        title="Net Worth"
        description="Track your assets, liabilities, and net worth over time"
      >
        <div className="mx-auto max-w-2xl py-12">
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign in to track your net worth</CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your account to track your assets, liabilities, and monitor your financial
                growth.
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
      title="Net Worth"
      description="Track your assets, liabilities, and net worth over time"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Time Range Selector */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-success px-3 py-1 font-medium text-success-foreground">
              Track growth
            </span>
            <span className="rounded-full bg-card/70 px-3 py-1">Historical data</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[160px] border-border/60 bg-card/70 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/60 bg-card text-foreground">
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
                <SelectItem value="year">Last 12 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
              <SelectTrigger className="w-[120px] border-border/60 bg-card/70 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/60 bg-card text-foreground">
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
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
                {loading ? '...' : formatCurrency(summary?.netWorth || 0)}
              </div>
              {summary && summary.changePercent !== 0 && (
                <div
                  className={`mt-1 flex items-center text-xs ${
                    summary.changeFromLastPeriod >= 0
                      ? 'text-success-foreground'
                      : 'text-destructive'
                  }`}
                >
                  {summary.changeFromLastPeriod >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {formatCurrency(Math.abs(summary.changeFromLastPeriod))} (
                  {summary.changePercent.toFixed(1)}%)
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success text-success-foreground">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {loading ? '...' : formatCurrency(summary?.totalAssets || 0)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {assets.filter((a) => !a.isLiability).length} accounts
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Liabilities
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
                <TrendingDown className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {loading ? '...' : formatCurrency(summary?.totalLiabilities || 0)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {assets.filter((a) => a.isLiability).length} accounts
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Change</CardTitle>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  (summary?.changeFromLastPeriod || 0) >= 0
                    ? 'bg-success text-success-foreground'
                    : 'bg-destructive text-destructive-foreground'
                }`}
              >
                {(summary?.changeFromLastPeriod || 0) >= 0 ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {loading ? '...' : formatCurrency(Math.abs(summary?.changeFromLastPeriod || 0))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">vs 30 days ago</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {loading ? (
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">Loading net worth data...</div>
            </CardContent>
          </Card>
        ) : chartData.length === 0 ? (
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p>No historical data found for the selected time period.</p>
                <p className="mt-2 text-sm">
                  Add accounts and update their balances to see trends.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader>
              <CardTitle>Net Worth Over Time</CardTitle>
              <CardDescription className="text-muted-foreground">
                Track your financial progress - {getTimeRangeLabel()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="networth" className="w-full">
                <TabsList className="mb-4 bg-card/60 text-foreground">
                  <TabsTrigger
                    value="networth"
                    className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
                  >
                    Net Worth
                  </TabsTrigger>
                  <TabsTrigger
                    value="breakdown"
                    className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
                  >
                    Assets vs Liabilities
                  </TabsTrigger>
                  <TabsTrigger
                    value="accounts"
                    className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
                  >
                    Accounts
                  </TabsTrigger>
                  <TabsTrigger
                    value="comparison"
                    className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
                  >
                    vs Expenses
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="networth">
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
                        dataKey="netWorth"
                        name="Net Worth"
                        stroke="#8884d8"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: '#8884d8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="breakdown">
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
                        dataKey="assets"
                        name="Assets"
                        stroke="#00C49F"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="liabilities"
                        name="Liabilities"
                        stroke="#FF6B6B"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="accounts">
                  {accountsChartData.length === 0 ? (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                      <p>
                        No account history data available. Update account balances to see trends.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={accountsChartData}>
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
                        {assets.map((asset) => (
                          <Line
                            key={asset.id}
                            type="monotone"
                            dataKey={asset.name}
                            name={asset.name}
                            stroke={
                              asset.color ||
                              ASSET_COLOR_PALETTE[
                                assets.indexOf(asset) % ASSET_COLOR_PALETTE.length
                              ]
                            }
                            strokeWidth={2}
                            dot={false}
                            strokeDasharray={asset.isLiability ? '5 5' : undefined}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </TabsContent>

                <TabsContent value="comparison">
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
                        dataKey="netWorth"
                        name="Net Worth"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#FFBB28"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Accounts Section */}
        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Accounts</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage your assets and liabilities
                </CardDescription>
              </div>
              <Dialog
                open={isAddAssetDialogOpen}
                onOpenChange={(open) => {
                  setIsAddAssetDialogOpen(open);
                  if (!open) resetAssetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-border/60 bg-card text-foreground">
                  <form onSubmit={handleSubmitAsset}>
                    <DialogHeader>
                      <DialogTitle>{editingAsset ? 'Edit Account' : 'Add New Account'}</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        {editingAsset
                          ? 'Update the account details below.'
                          : 'Add a new asset or liability to track.'}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-muted-foreground">
                          Account Name *
                        </Label>
                        <Input
                          id="name"
                          className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                          value={assetFormData.name}
                          onChange={(e) =>
                            setAssetFormData({ ...assetFormData, name: e.target.value })
                          }
                          required
                          placeholder="e.g., Chase Checking, Vanguard 401k"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-muted-foreground">
                          Category *
                        </Label>
                        <Select
                          value={assetFormData.categoryId}
                          onValueChange={(value) =>
                            setAssetFormData({ ...assetFormData, categoryId: value })
                          }
                          disabled={categoriesLoading}
                        >
                          <SelectTrigger className="border-border/60 bg-card text-foreground">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent className="border-border/60 bg-card text-foreground">
                            <SelectItem value="__header_assets__" disabled>
                              -- Assets --
                            </SelectItem>
                            {assetCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="__header_liabilities__" disabled>
                              -- Liabilities --
                            </SelectItem>
                            {liabilityCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {!editingAsset && (
                        <div className="space-y-2">
                          <Label htmlFor="initialBalance" className="text-muted-foreground">
                            Initial Balance
                          </Label>
                          <Input
                            id="initialBalance"
                            type="number"
                            step="0.01"
                            className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                            value={assetFormData.initialBalance}
                            onChange={(e) =>
                              setAssetFormData({ ...assetFormData, initialBalance: e.target.value })
                            }
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-muted-foreground">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                          value={assetFormData.description}
                          onChange={(e) =>
                            setAssetFormData({ ...assetFormData, description: e.target.value })
                          }
                          placeholder="Add any notes about this account..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="color" className="text-muted-foreground">
                          Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="color"
                            type="color"
                            className="h-10 w-14 cursor-pointer border-border/60 p-1"
                            value={assetFormData.color}
                            onChange={(e) =>
                              setAssetFormData({ ...assetFormData, color: e.target.value })
                            }
                          />
                          <Input
                            type="text"
                            className="border-border/60 bg-card text-foreground"
                            value={assetFormData.color}
                            onChange={(e) =>
                              setAssetFormData({ ...assetFormData, color: e.target.value })
                            }
                            placeholder="#4ECDC4"
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                        onClick={() => {
                          setIsAddAssetDialogOpen(false);
                          resetAssetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {editingAsset ? 'Update' : 'Create'} Account
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading accounts...</div>
            ) : assets.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No accounts found.</p>
                <p className="mt-2 text-sm">
                  Click "Add Account" to start tracking your net worth.
                </p>
              </div>
            ) : (
              <Table className="text-foreground">
                <TableHeader className="[&_tr]:border-border/60">
                  <TableRow className="border-border/60">
                    <TableHead className="text-muted-foreground">Account</TableHead>
                    <TableHead className="text-muted-foreground">Category</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-right text-muted-foreground">Balance</TableHead>
                    <TableHead className="text-muted-foreground">Last Updated</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id} className="border-border/60 hover:bg-card/80">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: asset.color || '#4ECDC4' }}
                          />
                          {asset.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="border-border/60 bg-card/70 text-foreground"
                        >
                          {asset.assetCategoryName || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            asset.isLiability
                              ? 'border-destructive/60 bg-destructive/10 text-destructive'
                              : 'border-success/60 bg-success/10 text-success-foreground'
                          }
                        >
                          {asset.isLiability ? 'Liability' : 'Asset'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {asset.currentBalance !== undefined
                          ? formatCurrency(asset.currentBalance)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {asset.lastUpdated ? formatDate(asset.lastUpdated) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-foreground hover:bg-card/70"
                            onClick={() => handleOpenUpdateBalance(asset)}
                            title="Update Balance"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-foreground hover:bg-card/70"
                            onClick={() => handleEditAsset(asset)}
                            title="Edit Account"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                title="Delete Account"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-border/60 bg-card text-foreground">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Are you sure you want to delete "{asset.name}"? This will also
                                  delete all balance history for this account. This action cannot be
                                  undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border/60 bg-card/80 text-foreground hover:bg-card/70">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAsset(asset)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recurring Transactions Section */}
        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Recurring Transactions
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Set up automatic recurring additions like paychecks
                </CardDescription>
              </div>
              <Dialog
                open={isAddRecurringDialogOpen}
                onOpenChange={(open) => {
                  setIsAddRecurringDialogOpen(open);
                  if (!open) resetRecurringForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Recurring
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-border/60 bg-card text-foreground">
                  <form onSubmit={handleSubmitRecurring}>
                    <DialogHeader>
                      <DialogTitle>Add Recurring Transaction</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Set up an automatic recurring deposit or withdrawal
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="recurringAsset" className="text-muted-foreground">
                          Account *
                        </Label>
                        <Select
                          value={recurringFormData.assetId}
                          onValueChange={(value) =>
                            setRecurringFormData({ ...recurringFormData, assetId: value })
                          }
                        >
                          <SelectTrigger className="border-border/60 bg-card text-foreground">
                            <SelectValue placeholder="Select an account" />
                          </SelectTrigger>
                          <SelectContent className="border-border/60 bg-card text-foreground">
                            {assets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id.toString()}>
                                {asset.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="recurringAmount" className="text-muted-foreground">
                          Amount * (positive to add, negative to subtract)
                        </Label>
                        <Input
                          id="recurringAmount"
                          type="number"
                          step="0.01"
                          className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                          value={recurringFormData.amount}
                          onChange={(e) =>
                            setRecurringFormData({ ...recurringFormData, amount: e.target.value })
                          }
                          required
                          placeholder="e.g. 2500.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="recurringDescription" className="text-muted-foreground">
                          Description *
                        </Label>
                        <Input
                          id="recurringDescription"
                          className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                          value={recurringFormData.description}
                          onChange={(e) =>
                            setRecurringFormData({
                              ...recurringFormData,
                              description: e.target.value,
                            })
                          }
                          required
                          placeholder="e.g. Paycheck"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="recurringFrequency" className="text-muted-foreground">
                          Frequency *
                        </Label>
                        <Select
                          value={recurringFormData.frequency}
                          onValueChange={(value) =>
                            setRecurringFormData({
                              ...recurringFormData,
                              frequency: value as typeof recurringFormData.frequency,
                            })
                          }
                        >
                          <SelectTrigger className="border-border/60 bg-card text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-border/60 bg-card text-foreground">
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Biweekly">Every 2 Weeks</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                            <SelectItem value="Yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(recurringFormData.frequency === 'Weekly' ||
                        recurringFormData.frequency === 'Biweekly') && (
                        <div className="space-y-2">
                          <Label htmlFor="recurringDayOfWeek" className="text-muted-foreground">
                            Day of Week
                          </Label>
                          <Select
                            value={recurringFormData.dayOfWeek}
                            onValueChange={(value) =>
                              setRecurringFormData({ ...recurringFormData, dayOfWeek: value })
                            }
                          >
                            <SelectTrigger className="border-border/60 bg-card text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border/60 bg-card text-foreground">
                              <SelectItem value="Sunday">Sunday</SelectItem>
                              <SelectItem value="Monday">Monday</SelectItem>
                              <SelectItem value="Tuesday">Tuesday</SelectItem>
                              <SelectItem value="Wednesday">Wednesday</SelectItem>
                              <SelectItem value="Thursday">Thursday</SelectItem>
                              <SelectItem value="Friday">Friday</SelectItem>
                              <SelectItem value="Saturday">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {(recurringFormData.frequency === 'Monthly' ||
                        recurringFormData.frequency === 'Quarterly') && (
                        <div className="space-y-2">
                          <Label htmlFor="recurringDayOfMonth" className="text-muted-foreground">
                            Day of Month
                          </Label>
                          <Input
                            id="recurringDayOfMonth"
                            type="number"
                            min="1"
                            max="31"
                            className="border-border/60 bg-card text-foreground"
                            value={recurringFormData.dayOfMonth}
                            onChange={(e) =>
                              setRecurringFormData({
                                ...recurringFormData,
                                dayOfMonth: e.target.value,
                              })
                            }
                            placeholder="1-31"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="recurringStartDate" className="text-muted-foreground">
                          Start Date *
                        </Label>
                        <Input
                          id="recurringStartDate"
                          type="date"
                          className="border-border/60 bg-card text-foreground"
                          value={recurringFormData.startDate}
                          onChange={(e) =>
                            setRecurringFormData({
                              ...recurringFormData,
                              startDate: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="recurringEndDate" className="text-muted-foreground">
                          End Date (optional)
                        </Label>
                        <Input
                          id="recurringEndDate"
                          type="date"
                          className="border-border/60 bg-card text-foreground"
                          value={recurringFormData.endDate}
                          onChange={(e) =>
                            setRecurringFormData({ ...recurringFormData, endDate: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                        onClick={() => {
                          setIsAddRecurringDialogOpen(false);
                          resetRecurringForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Create Recurring
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading recurring transactions...
              </div>
            ) : recurringTransactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No recurring transactions set up.</p>
                <p className="mt-2 text-sm">
                  Click "Add Recurring" to automate deposits like paychecks.
                </p>
              </div>
            ) : (
              <Table className="text-foreground">
                <TableHeader className="[&_tr]:border-border/60">
                  <TableRow className="border-border/60">
                    <TableHead className="text-muted-foreground">Description</TableHead>
                    <TableHead className="text-muted-foreground">Account</TableHead>
                    <TableHead className="text-muted-foreground">Frequency</TableHead>
                    <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-muted-foreground">Next Run</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringTransactions.map((rt) => (
                    <TableRow key={rt.id} className="border-border/60 hover:bg-card/80">
                      <TableCell className="font-medium text-foreground">
                        {rt.description}
                      </TableCell>
                      <TableCell className="text-foreground">{rt.assetName}</TableCell>
                      <TableCell className="text-foreground">
                        {rt.frequency}
                        {rt.dayOfWeek && ` (${rt.dayOfWeek})`}
                        {rt.dayOfMonth && ` (Day ${rt.dayOfMonth})`}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${rt.amount >= 0 ? 'text-success-foreground' : 'text-destructive'}`}
                      >
                        {rt.amount >= 0 ? '+' : ''}
                        {formatCurrency(rt.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(rt.nextRunDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            rt.isActive
                              ? 'border-success/60 bg-success/10 text-success-foreground'
                              : 'border-muted bg-muted/10 text-muted-foreground'
                          }
                        >
                          {rt.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-foreground hover:bg-card/70"
                            onClick={() => handleToggleRecurringActive(rt)}
                            title={rt.isActive ? 'Pause' : 'Resume'}
                          >
                            {rt.isActive ? (
                              <Minus className="h-4 w-4" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-border/60 bg-card text-foreground">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Recurring Transaction</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Are you sure you want to delete "{rt.description}"? This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border/60 bg-card/80 text-foreground hover:bg-card/70">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRecurring(rt.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Update Balance Dialog */}
        <Dialog
          open={isUpdateBalanceDialogOpen}
          onOpenChange={(open) => {
            setIsUpdateBalanceDialogOpen(open);
            if (!open) resetBalanceForm();
          }}
        >
          <DialogContent className="border-border/60 bg-card text-foreground">
            <form onSubmit={handleUpdateBalance}>
              <DialogHeader>
                <DialogTitle>Update Balance</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {selectedAssetForUpdate
                    ? `Update the balance for "${selectedAssetForUpdate.name}"`
                    : 'Update account balance'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="balance" className="text-muted-foreground">
                    Current Balance *
                  </Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                    value={balanceFormData.balance}
                    onChange={(e) =>
                      setBalanceFormData({ ...balanceFormData, balance: e.target.value })
                    }
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-muted-foreground">
                    Date *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    className="border-border/60 bg-card text-foreground"
                    value={balanceFormData.date}
                    onChange={(e) =>
                      setBalanceFormData({ ...balanceFormData, date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-muted-foreground">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                    value={balanceFormData.notes}
                    onChange={(e) =>
                      setBalanceFormData({ ...balanceFormData, notes: e.target.value })
                    }
                    placeholder="Optional notes about this update..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                  onClick={() => {
                    setIsUpdateBalanceDialogOpen(false);
                    resetBalanceForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Update Balance
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
