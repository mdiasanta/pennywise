import { AppLayout } from '@/components/AppLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import {
  AccountsTable,
  ALL_TIME_LOOKBACK_YEARS,
  ASSET_COLOR_PALETTE,
  type AssetFormData,
  AssetFormDialog,
  type BalanceFormData,
  formatChartDate,
  getTimeRangeLabel,
  type GroupBy,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAssetForUpdate, setSelectedAssetForUpdate] = useState<Asset | null>(null);

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

  // Recurring transaction states
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isAddRecurringDialogOpen, setIsAddRecurringDialogOpen] = useState(false);

  // Projection states
  const [projection, setProjection] = useState<NetWorthProjection | null>(null);
  const [projectionLoading, setProjectionLoading] = useState(true);
  const [goalAmount, setGoalAmount] = useState<number | undefined>(undefined);
  const [includeRecurringTransfers, setIncludeRecurringTransfers] = useState(false);

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
        12,
        includeRecurringTransfers
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
  }, [authLoading, isAuthenticated, user, goalAmount, includeRecurringTransfers, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadProjection();
  }, [loadProjection]);

  const handleGoalChange = useCallback((newGoal: number | undefined) => {
    setGoalAmount(newGoal);
  }, []);

  const handleRecurringToggle = useCallback((include: boolean) => {
    setIncludeRecurringTransfers(include);
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

  const handleAddAccount = () => {
    resetAssetForm();
    setIsAddAssetDialogOpen(true);
  };

  const handleAddRecurring = () => {
    resetRecurringForm();
    setIsAddRecurringDialogOpen(true);
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
        <NetWorthSummaryCards summary={summary} assets={assets} loading={loading} />

        {/* Charts */}
        <NetWorthCharts
          chartData={chartData}
          accountsChartData={accountsChartData}
          assets={assets}
          loading={loading}
          timeRangeLabel={getTimeRangeLabel(timeRange)}
        />

        {/* Net Worth Projection */}
        <NetWorthProjectionComponent
          projection={projection}
          loading={projectionLoading}
          onGoalChange={handleGoalChange}
          onRecurringToggle={handleRecurringToggle}
          currentGoal={goalAmount}
          includeRecurringTransfers={includeRecurringTransfers}
        />

        {/* Accounts Table */}
        <AccountsTable
          assets={assets}
          loading={loading}
          onAddAccount={handleAddAccount}
          onEditAccount={handleEditAsset}
          onUpdateBalance={handleOpenUpdateBalance}
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
      </div>
    </AppLayout>
  );
}
