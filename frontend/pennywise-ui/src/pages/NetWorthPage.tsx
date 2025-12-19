import { AppLayout } from '@/components/AppLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import {
  AccountsTable,
  ALL_TIME_LOOKBACK_YEARS,
  ASSET_COLOR_PALETTE,
  type AssetFormData,
  AssetFormDialog,
  type BalanceFormData,
  BalanceHistoryDialog,
  type BulkBalanceFormData,
  BulkUpdateBalanceDialog,
  formatChartDate,
  getAvailableYears,
  getTimeRangeLabel,
  getYearFilterDateRange,
  type GroupBy,
  LiabilityPayoffEstimator,
  NetWorthCharts,
  NetWorthProjectionComponent,
  NetWorthSummaryCards,
  type RecurringFormData,
  RecurringTransactionDialog,
  RecurringTransactionsTable,
  type TimeRange,
  UpdateBalanceDialog,
} from '@/components/net-worth';
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
import { useAssetCategories } from '@/hooks/use-asset-categories';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type {
  Asset,
  AssetSnapshot,
  BulkCreateAssetSnapshot,
  CreateAsset,
  CreateAssetSnapshot,
  CreateRecurringTransaction,
  CustomProjectionItem,
  LiabilityPayoffEstimate,
  LiabilityPayoffSettings,
  NetWorthComparison,
  NetWorthProjection,
  NetWorthSummary,
  RecurringTransaction,
  UpdateAsset,
} from '@/lib/api';
import { assetApi, assetSnapshotApi, netWorthApi, recurringTransactionApi } from '@/lib/api';
import { Calendar } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

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
  const [isBulkUpdateBalanceDialogOpen, setIsBulkUpdateBalanceDialogOpen] = useState(false);
  const [isBalanceHistoryDialogOpen, setIsBalanceHistoryDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAssetForUpdate, setSelectedAssetForUpdate] = useState<Asset | null>(null);
  const [selectedAssetForBulkUpdate, setSelectedAssetForBulkUpdate] = useState<Asset | null>(null);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
  const [historySnapshots, setHistorySnapshots] = useState<AssetSnapshot[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form states
  const [assetFormData, setAssetFormData] = useState<AssetFormData>({
    name: '',
    description: '',
    categoryId: '',
    color: '#4ECDC4',
    initialBalance: '',
  });

  const [balanceFormData, setBalanceFormData] = useState<BalanceFormData>({
    balance: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [bulkBalanceFormData, setBulkBalanceFormData] = useState<BulkBalanceFormData>({
    entries: [{ balance: '', date: new Date().toISOString().split('T')[0], notes: '' }],
  });

  // Recurring transaction states
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isAddRecurringDialogOpen, setIsAddRecurringDialogOpen] = useState(false);

  // Projection states
  const [projection, setProjection] = useState<NetWorthProjection | null>(null);
  const [projectionLoading, setProjectionLoading] = useState(true);
  const [goalAmount, setGoalAmount] = useState<number | undefined>(undefined);
  const [includeRecurringTransfers, setIncludeRecurringTransfers] = useState(true);
  const [includeAverageExpenses, setIncludeAverageExpenses] = useState(false);
  const [customProjectionItems, setCustomProjectionItems] = useState<CustomProjectionItem[]>([]);
  const [projectionYears, setProjectionYears] = useState(1);

  // Liability payoff states
  const [liabilityPayoff, setLiabilityPayoff] = useState<LiabilityPayoffEstimate | null>(null);
  const [liabilityPayoffLoading, setLiabilityPayoffLoading] = useState(true);
  const [liabilityPayoffSettings, setLiabilityPayoffSettings] = useState<LiabilityPayoffSettings[]>(
    []
  );

  // Asset history for individual account chart
  const [assetSnapshots, setAssetSnapshots] = useState<Map<number, AssetSnapshot[]>>(new Map());
  const [recurringFormData, setRecurringFormData] = useState<RecurringFormData>({
    assetId: '',
    amount: '',
    description: '',
    frequency: 'Biweekly',
    dayOfWeek: 'Friday',
    dayOfMonth: '1',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const getDateRange = useCallback((range: TimeRange) => {
    // Handle specific year filter (e.g., 'year-2024')
    const yearRange = getYearFilterDateRange(range);
    if (yearRange) {
      return yearRange;
    }

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

  const loadProjection = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setProjectionLoading(false);
      return;
    }

    try {
      setProjectionLoading(true);
      const projectionData = await netWorthApi.getProjection(
        user.id,
        goalAmount,
        projectionYears * 12,
        includeRecurringTransfers,
        includeAverageExpenses,
        customProjectionItems.length > 0 ? customProjectionItems : undefined
      );
      setProjection(projectionData);
    } catch (error) {
      console.error('Error loading projection data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load projection data. Please try again.',
      });
    } finally {
      setProjectionLoading(false);
    }
  }, [
    authLoading,
    isAuthenticated,
    user,
    goalAmount,
    projectionYears,
    includeRecurringTransfers,
    includeAverageExpenses,
    customProjectionItems,
    toast,
  ]);

  const loadLiabilityPayoff = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setLiabilityPayoffLoading(false);
      return;
    }

    try {
      setLiabilityPayoffLoading(true);
      const payoffData = await netWorthApi.getLiabilityPayoff(
        user.id,
        liabilityPayoffSettings.length > 0 ? liabilityPayoffSettings : undefined
      );
      setLiabilityPayoff(payoffData);
    } catch (error) {
      console.error('Error loading liability payoff data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load liability payoff data. Please try again.',
      });
    } finally {
      setLiabilityPayoffLoading(false);
    }
  }, [authLoading, isAuthenticated, user, liabilityPayoffSettings, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadProjection();
  }, [loadProjection]);

  useEffect(() => {
    loadLiabilityPayoff();
  }, [loadLiabilityPayoff]);

  const handleGoalChange = useCallback((newGoal: number | undefined) => {
    setGoalAmount(newGoal);
  }, []);

  const handleRecurringToggle = useCallback((include: boolean) => {
    setIncludeRecurringTransfers(include);
  }, []);

  const handleAverageExpensesToggle = useCallback((include: boolean) => {
    setIncludeAverageExpenses(include);
  }, []);

  const handleCustomItemsChange = useCallback((items: CustomProjectionItem[]) => {
    setCustomProjectionItems(items);
  }, []);

  const handleProjectionYearsChange = useCallback((years: number) => {
    setProjectionYears(years);
  }, []);

  const handleLiabilityPayoffSettingsChange = useCallback((settings: LiabilityPayoffSettings[]) => {
    setLiabilityPayoffSettings(settings);
  }, []);

  const getRandomUnusedColor = useCallback(() => {
    const usedColors = new Set(assets.map((a) => a.color?.toLowerCase()));
    const availableColors = ASSET_COLOR_PALETTE.filter(
      (color) => !usedColors.has(color.toLowerCase())
    );

    if (availableColors.length > 0) {
      return availableColors[Math.floor(Math.random() * availableColors.length)];
    }
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

  const resetBulkBalanceForm = () => {
    setBulkBalanceFormData({
      entries: [{ balance: '', date: new Date().toISOString().split('T')[0], notes: '' }],
    });
    setSelectedAssetForBulkUpdate(null);
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

  // Event handlers
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

      if (recurringFormData.frequency === 'Weekly' || recurringFormData.frequency === 'Biweekly') {
        createData.dayOfWeek = recurringFormData.dayOfWeek;
      }

      if (
        recurringFormData.frequency === 'Monthly' ||
        recurringFormData.frequency === 'Quarterly'
      ) {
        createData.dayOfMonth = parseInt(recurringFormData.dayOfMonth, 10);
      }

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

  const handleBulkUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForBulkUpdate) return;

    // Validate all entries have valid balances
    const invalidEntries = bulkBalanceFormData.entries.filter(
      (entry) => !entry.balance.trim() || Number.isNaN(parseFloat(entry.balance))
    );
    if (invalidEntries.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid balance',
        description: 'Please enter valid numbers for all balance entries.',
      });
      return;
    }

    try {
      const bulkData: BulkCreateAssetSnapshot = {
        assetId: selectedAssetForBulkUpdate.id,
        entries: bulkBalanceFormData.entries.map((entry) => ({
          balance: parseFloat(entry.balance),
          date: new Date(entry.date).toISOString(),
          notes: entry.notes || undefined,
        })),
      };

      const result = await assetSnapshotApi.createBulk(bulkData);
      toast({
        title: 'Success',
        description: `${result.created} balance(s) created, ${result.updated} balance(s) updated.`,
      });

      setIsBulkUpdateBalanceDialogOpen(false);
      resetBulkBalanceForm();
      loadData();
    } catch (error) {
      console.error('Error bulk updating balances:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update balances. Please try again.',
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

  const handleOpenBulkUpdateBalance = (asset: Asset) => {
    setSelectedAssetForBulkUpdate(asset);
    setBulkBalanceFormData({
      entries: [{ balance: '', date: new Date().toISOString().split('T')[0], notes: '' }],
    });
    setIsBulkUpdateBalanceDialogOpen(true);
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

  const handleAddAccount = () => {
    resetAssetForm();
    setIsAddAssetDialogOpen(true);
  };

  const handleAddRecurring = () => {
    resetRecurringForm();
    setIsAddRecurringDialogOpen(true);
  };

  const handleViewHistory = async (asset: Asset) => {
    setSelectedAssetForHistory(asset);
    setHistoryLoading(true);
    setIsBalanceHistoryDialogOpen(true);

    try {
      // Load all snapshots for this asset (no date filter for full history)
      const snapshots = await assetSnapshotApi.getByAsset(asset.id);
      setHistorySnapshots(snapshots);
    } catch (error) {
      console.error('Error loading balance history:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load balance history. Please try again.',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshHistorySnapshots = async () => {
    if (selectedAssetForHistory) {
      const snapshots = await assetSnapshotApi.getByAsset(selectedAssetForHistory.id);
      setHistorySnapshots(snapshots);
    }
    loadData();
  };

  const handleUpdateSnapshot = async (
    id: number,
    balance: number,
    date: string,
    notes: string | undefined
  ) => {
    try {
      await assetSnapshotApi.update(id, { balance, date, notes });
      toast({
        title: 'Success',
        description: 'Balance entry updated successfully.',
      });
      await refreshHistorySnapshots();
    } catch (error) {
      console.error('Error updating snapshot:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update balance entry. Please try again.',
      });
    }
  };

  const handleDeleteSnapshot = async (id: number) => {
    try {
      await assetSnapshotApi.delete(id);
      toast({
        title: 'Success',
        description: 'Balance entry deleted successfully.',
      });
      await refreshHistorySnapshots();
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete balance entry. Please try again.',
      });
    }
  };

  // Derived data
  const assetCategories = categories.filter((c) => !c.isLiability);
  const liabilityCategories = categories.filter((c) => c.isLiability);

  const chartData =
    comparison?.netWorthHistory.map((point) => ({
      date: formatChartDate(point.date, groupBy),
      netWorth: point.netWorth,
      assets: point.totalAssets,
      liabilities: point.totalLiabilities,
      expenses: point.totalExpenses || 0,
    })) || [];

  // Transform asset snapshots into chart data for individual accounts
  const accountsChartData = (() => {
    if (assetSnapshots.size === 0) return [];

    const allDates = new Set<string>();
    assetSnapshots.forEach((snapshots) => {
      snapshots.forEach((snapshot) => {
        allDates.add(snapshot.date.split('T')[0]);
      });
    });

    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map((date) => {
      const dataPoint: { date: string; [assetName: string]: number | string } = {
        date: formatChartDate(date, groupBy),
      };

      assets.forEach((asset) => {
        const snapshots = assetSnapshots.get(asset.id) || [];
        const relevantSnapshots = snapshots.filter((s) => s.date.split('T')[0] <= date);
        if (relevantSnapshots.length > 0) {
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
              <SelectTrigger className="w-40 border-border/60 bg-card/70 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/60 bg-card text-foreground">
                <SelectGroup>
                  <SelectLabel className="text-muted-foreground">Relative</SelectLabel>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="year">Last 12 Months</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectGroup>
                <Separator className="my-1" />
                <SelectGroup>
                  <SelectLabel className="text-muted-foreground">By Year</SelectLabel>
                  {getAvailableYears().map((year) => (
                    <SelectItem key={year} value={`year-${year}`}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectGroup>
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
        <NetWorthSummaryCards summary={summary} assets={assets} loading={loading} />

        {/* Charts */}
        <NetWorthCharts
          chartData={chartData}
          accountsChartData={accountsChartData}
          assets={assets}
          loading={loading}
          timeRangeLabel={getTimeRangeLabel(timeRange)}
        />

        {/* Net Worth Projection - Project future net worth based on recurring transfers and custom items */}
        <NetWorthProjectionComponent
          projection={projection}
          loading={projectionLoading}
          onGoalChange={handleGoalChange}
          onRecurringToggle={handleRecurringToggle}
          onAverageExpensesToggle={handleAverageExpensesToggle}
          onCustomItemsChange={handleCustomItemsChange}
          onProjectionYearsChange={handleProjectionYearsChange}
          currentGoal={goalAmount}
          includeRecurringTransfers={includeRecurringTransfers}
          includeAverageExpenses={includeAverageExpenses}
          customItems={customProjectionItems}
          projectionYears={projectionYears}
        />

        {/* Liability Payoff Estimator */}
        <LiabilityPayoffEstimator
          estimate={liabilityPayoff}
          loading={liabilityPayoffLoading}
          onSettingsChange={handleLiabilityPayoffSettingsChange}
          currentSettings={liabilityPayoffSettings}
        />

        {/* Accounts Table */}
        <AccountsTable
          assets={assets}
          loading={loading}
          onAddAccount={handleAddAccount}
          onEditAccount={handleEditAsset}
          onUpdateBalance={handleOpenUpdateBalance}
          onBulkUpdateBalance={handleOpenBulkUpdateBalance}
          onViewHistory={handleViewHistory}
          onDeleteAccount={handleDeleteAsset}
        />

        {/* Recurring Transactions Table */}
        <RecurringTransactionsTable
          transactions={recurringTransactions}
          loading={loading}
          onAddRecurring={handleAddRecurring}
          onToggleActive={handleToggleRecurringActive}
          onDelete={handleDeleteRecurring}
        />

        {/* Dialogs */}
        <AssetFormDialog
          open={isAddAssetDialogOpen}
          onOpenChange={(open) => {
            setIsAddAssetDialogOpen(open);
            if (!open) resetAssetForm();
          }}
          formData={assetFormData}
          onFormDataChange={setAssetFormData}
          onSubmit={handleSubmitAsset}
          editingAsset={editingAsset}
          assetCategories={assetCategories}
          liabilityCategories={liabilityCategories}
          categoriesLoading={categoriesLoading}
        />

        <UpdateBalanceDialog
          open={isUpdateBalanceDialogOpen}
          onOpenChange={(open) => {
            setIsUpdateBalanceDialogOpen(open);
            if (!open) resetBalanceForm();
          }}
          formData={balanceFormData}
          onFormDataChange={setBalanceFormData}
          onSubmit={handleUpdateBalance}
          selectedAsset={selectedAssetForUpdate}
        />

        <BulkUpdateBalanceDialog
          open={isBulkUpdateBalanceDialogOpen}
          onOpenChange={(open) => {
            setIsBulkUpdateBalanceDialogOpen(open);
            if (!open) resetBulkBalanceForm();
          }}
          formData={bulkBalanceFormData}
          onFormDataChange={setBulkBalanceFormData}
          onSubmit={handleBulkUpdateBalance}
          selectedAsset={selectedAssetForBulkUpdate}
        />

        <RecurringTransactionDialog
          open={isAddRecurringDialogOpen}
          onOpenChange={(open) => {
            setIsAddRecurringDialogOpen(open);
            if (!open) resetRecurringForm();
          }}
          formData={recurringFormData}
          onFormDataChange={setRecurringFormData}
          onSubmit={handleSubmitRecurring}
          assets={assets}
        />

        <BalanceHistoryDialog
          open={isBalanceHistoryDialogOpen}
          onOpenChange={(open) => {
            setIsBalanceHistoryDialogOpen(open);
            if (!open) {
              setSelectedAssetForHistory(null);
              setHistorySnapshots([]);
            }
          }}
          asset={selectedAssetForHistory}
          snapshots={historySnapshots}
          loading={historyLoading}
          onUpdateSnapshot={handleUpdateSnapshot}
          onDeleteSnapshot={handleDeleteSnapshot}
        />
      </div>
    </AppLayout>
  );
}
