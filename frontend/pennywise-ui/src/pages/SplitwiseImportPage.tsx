import { AppLayout } from '@/components/AppLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type {
  SplitwiseAutoImport,
  SplitwiseCurrentUser,
  SplitwiseExpensePreview,
  SplitwiseGroup,
  SplitwiseGroupMember,
  SplitwiseImportResponse,
} from '@/lib/api';
import { splitwiseApi } from '@/lib/api';
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function SplitwiseImportPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const getDefaultStartDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // Configuration status
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [splitwiseUser, setSplitwiseUser] = useState<SplitwiseCurrentUser | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Groups and members state
  const [groups, setGroups] = useState<SplitwiseGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [members, setMembers] = useState<SplitwiseGroupMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Date filter state
  const [startDate, setStartDate] = useState(() => getDefaultStartDate());
  const [endDate, setEndDate] = useState('');

  // Preview and import state
  const [preview, setPreview] = useState<SplitwiseImportResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<number>>(new Set());
  const [selectedCategoryByExpenseId, setSelectedCategoryByExpenseId] = useState<
    Record<number, number>
  >({});

  // Auto-import state
  const [autoImports, setAutoImports] = useState<SplitwiseAutoImport[]>([]);
  const [isLoadingAutoImports, setIsLoadingAutoImports] = useState(false);
  const [showAutoImportSetup, setShowAutoImportSetup] = useState(false);
  const [autoImportFrequency, setAutoImportFrequency] = useState<'Daily' | 'Weekly' | 'Monthly'>(
    'Daily'
  );
  const [autoImportStartDate, setAutoImportStartDate] = useState(() => getDefaultStartDate());
  const [isCreatingAutoImport, setIsCreatingAutoImport] = useState(false);
  const [runningAutoImportId, setRunningAutoImportId] = useState<number | null>(null);

  const loadAutoImports = useCallback(async () => {
    setIsLoadingAutoImports(true);
    try {
      const imports = await splitwiseApi.getAutoImports();
      setAutoImports(imports);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load auto-imports',
        description: error instanceof Error ? error.message : 'Could not fetch auto-imports.',
      });
    } finally {
      setIsLoadingAutoImports(false);
    }
  }, [toast]);

  const checkStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const status = await splitwiseApi.getStatus();
      setIsConfigured(status.isConfigured);
      setSplitwiseUser(status.user || null);

      if (status.isConfigured && status.user) {
        // Load groups and auto-imports automatically
        setIsLoadingGroups(true);
        try {
          const groupsResponse = await splitwiseApi.getGroups();
          setGroups(groupsResponse.groups);
        } finally {
          setIsLoadingGroups(false);
        }
        // Load auto-imports
        loadAutoImports();
      }
    } catch (error) {
      setIsConfigured(false);
      toast({
        variant: 'destructive',
        title: 'Connection error',
        description: error instanceof Error ? error.message : 'Could not check Splitwise status.',
      });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [toast, loadAutoImports]);

  useEffect(() => {
    if (isAuthenticated) {
      checkStatus();
    }
  }, [isAuthenticated, checkStatus]);

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedMemberId('');
    setMembers([]);
    setPreview(null);

    if (!groupId) return;

    setIsLoadingMembers(true);
    try {
      const groupMembers = await splitwiseApi.getGroupMembers(parseInt(groupId, 10));
      setMembers(groupMembers);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load members',
        description: error instanceof Error ? error.message : 'Could not fetch group members.',
      });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleCreateAutoImport = async () => {
    if (!selectedGroupId || !selectedMemberId) {
      toast({
        variant: 'destructive',
        title: 'Selection required',
        description: 'Please select a group and a member for auto-import.',
      });
      return;
    }

    setIsCreatingAutoImport(true);
    try {
      await splitwiseApi.createAutoImport({
        groupId: parseInt(selectedGroupId, 10),
        splitwiseUserId: parseInt(selectedMemberId, 10),
        startDate: autoImportStartDate,
        frequency: autoImportFrequency,
      });

      toast({
        title: 'Auto-import created!',
        description: `New expenses will be imported ${autoImportFrequency.toLowerCase()} from Splitwise.`,
      });

      setShowAutoImportSetup(false);
      loadAutoImports();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create auto-import',
        description: error instanceof Error ? error.message : 'Could not create auto-import.',
      });
    } finally {
      setIsCreatingAutoImport(false);
    }
  };

  const handleToggleAutoImport = async (autoImport: SplitwiseAutoImport) => {
    try {
      await splitwiseApi.updateAutoImport(autoImport.id, {
        isActive: !autoImport.isActive,
      });

      toast({
        title: autoImport.isActive ? 'Auto-import paused' : 'Auto-import resumed',
        description: autoImport.isActive
          ? 'The auto-import has been paused.'
          : 'The auto-import will run on schedule.',
      });

      loadAutoImports();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update auto-import',
        description: error instanceof Error ? error.message : 'Could not update auto-import.',
      });
    }
  };

  const handleDeleteAutoImport = async (id: number) => {
    try {
      await splitwiseApi.deleteAutoImport(id);

      toast({
        title: 'Auto-import deleted',
        description: 'The auto-import schedule has been removed.',
      });

      loadAutoImports();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete auto-import',
        description: error instanceof Error ? error.message : 'Could not delete auto-import.',
      });
    }
  };

  const handleRunAutoImportNow = async (id: number) => {
    setRunningAutoImportId(id);
    try {
      const result = await splitwiseApi.runAutoImportNow(id);

      if (result.success) {
        toast({
          title: 'Import completed!',
          description: `Imported ${result.importedCount} expense${result.importedCount !== 1 ? 's' : ''} (${result.duplicatesFound} duplicate${result.duplicatesFound !== 1 ? 's' : ''} skipped).`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Import failed',
          description: result.errorMessage || 'An error occurred during import.',
        });
      }

      loadAutoImports();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to run import',
        description: error instanceof Error ? error.message : 'Could not run import.',
      });
    } finally {
      setRunningAutoImportId(null);
    }
  };

  const handlePreview = async () => {
    if (!selectedGroupId || !selectedMemberId) {
      toast({
        variant: 'destructive',
        title: 'Selection required',
        description: 'Please select a group and a member.',
      });
      return;
    }

    setIsPreviewLoading(true);
    setPreview(null);
    setSelectedExpenseIds(new Set());
    setSelectedCategoryByExpenseId({});

    try {
      const result = await splitwiseApi.previewImport({
        groupId: parseInt(selectedGroupId, 10),
        splitwiseUserId: parseInt(selectedMemberId, 10),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setPreview(result);

      // Initialize mapped-category selection to the server-provided default mapping
      const initialCategorySelection: Record<number, number> = {};
      result.expenses.forEach((expense) => {
        initialCategorySelection[expense.id] = expense.mappedCategoryId;
      });
      setSelectedCategoryByExpenseId(initialCategorySelection);

      // Auto-select all importable expenses
      const importableIds = result.expenses.filter((e) => e.canImport).map((e) => e.id);
      setSelectedExpenseIds(new Set(importableIds));

      toast({
        title: 'Preview ready',
        description: `Found ${result.totalExpenses} expenses (${result.importableCount} can be imported).`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Preview failed',
        description: error instanceof Error ? error.message : 'Could not preview expenses.',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || selectedExpenseIds.size === 0) {
      toast({
        variant: 'destructive',
        title: 'No expenses selected',
        description: 'Please select at least one expense to import.',
      });
      return;
    }

    setIsImporting(true);
    try {
      const categoryOverrides = preview.expenses
        .filter((e) => selectedExpenseIds.has(e.id) && e.canImport)
        .map((e) => ({
          expenseId: e.id,
          categoryId: selectedCategoryByExpenseId[e.id] ?? e.mappedCategoryId,
        }))
        .filter((o) => {
          const expense = preview.expenses.find((e) => e.id === o.expenseId);
          return expense ? o.categoryId !== expense.mappedCategoryId : false;
        });

      const result = await splitwiseApi.importExpenses({
        groupId: parseInt(selectedGroupId, 10),
        splitwiseUserId: parseInt(selectedMemberId, 10),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedExpenseIds: Array.from(selectedExpenseIds),
        categoryOverrides: categoryOverrides.length > 0 ? categoryOverrides : undefined,
      });

      toast({
        title: 'Import successful!',
        description: `Imported ${result.importedCount} expenses totaling ${formatCurrency(result.totalAmount)}.`,
      });

      // Refresh preview to show updated duplicate status
      await handlePreview();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Could not import expenses.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const toggleExpenseSelection = (id: number, canImport: boolean) => {
    if (!canImport) return;

    const newSelection = new Set(selectedExpenseIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedExpenseIds(newSelection);
  };

  const setExpenseCategory = (expenseId: number, categoryId: number) => {
    setSelectedCategoryByExpenseId((prev) => ({
      ...prev,
      [expenseId]: categoryId,
    }));
  };

  const toggleSelectAll = () => {
    if (!preview) return;

    const importableIds = preview.expenses.filter((e) => e.canImport).map((e) => e.id);

    if (selectedExpenseIds.size === importableIds.length) {
      setSelectedExpenseIds(new Set());
    } else {
      setSelectedExpenseIds(new Set(importableIds));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (expense: SplitwiseExpensePreview) => {
    if (expense.isPayment) {
      return (
        <Badge
          variant="secondary"
          className="border-warning/60 bg-warning/10 text-warning-foreground"
        >
          <Ban className="mr-1 h-3 w-3" />
          Payment
        </Badge>
      );
    }
    if (expense.isDuplicate) {
      return (
        <Badge
          variant="secondary"
          className="border-muted-foreground/40 bg-muted/30 text-muted-foreground"
        >
          <Copy className="mr-1 h-3 w-3" />
          Duplicate
        </Badge>
      );
    }
    if (expense.canImport) {
      return (
        <Badge
          variant="secondary"
          className="border-success/60 bg-success/10 text-success-foreground"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Ready
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="border-muted-foreground/40 bg-muted/30 text-muted-foreground"
      >
        Skipped
      </Badge>
    );
  };

  // Show sign-in prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <AppLayout title="Splitwise Import" description="Import expenses from Splitwise">
        <div className="mx-auto max-w-2xl py-12">
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign in to import from Splitwise</CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your account to import expenses from your Splitwise groups.
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

  // Show loading state
  if (isCheckingStatus) {
    return (
      <AppLayout title="Splitwise Import" description="Import expenses from Splitwise">
        <div className="mx-auto max-w-2xl py-12">
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Checking Splitwise configuration...</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Show not configured state
  if (!isConfigured) {
    return (
      <AppLayout title="Splitwise Import" description="Import expenses from Splitwise">
        <div className="mx-auto max-w-2xl py-12">
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Splitwise Not Configured</CardTitle>
              <CardDescription className="text-muted-foreground">
                The Splitwise API key has not been configured on the server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-card/60 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <Settings className="h-4 w-4" />
                  Configuration Required
                </h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  To enable Splitwise import, ask your administrator to add the following
                  environment variable:
                </p>
                <code className="block rounded bg-muted/50 p-2 text-sm text-foreground">
                  Splitwise__ApiKey=your-splitwise-api-key
                </code>
                <p className="mt-3 text-sm text-muted-foreground">
                  Get an API key from{' '}
                  <a
                    href="https://secure.splitwise.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    secure.splitwise.com/apps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
              <Button
                onClick={checkStatus}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Retry Connection
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Splitwise Import" description="Import expenses from Splitwise">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Connection Status Card */}
        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success-foreground" />
              Connected to Splitwise
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your Splitwise account is connected and ready to import expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {splitwiseUser && (
              <div className="rounded-lg border border-success/60 bg-success/10 p-3">
                <p className="text-sm text-success-foreground">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  Logged in to Splitwise
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group and Member Selection Card */}
        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Group and Member
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Choose a Splitwise group and the member whose expenses you want to import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group" className="text-muted-foreground">
                  Group
                </Label>
                <Select
                  value={selectedGroupId}
                  onValueChange={handleGroupChange}
                  disabled={isLoadingGroups || groups.length === 0}
                >
                  <SelectTrigger className="border-border/60 bg-card text-foreground">
                    <SelectValue placeholder={isLoadingGroups ? 'Loading...' : 'Select a group'} />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card text-foreground">
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="member" className="text-muted-foreground">
                  Import expenses for
                </Label>
                <Select
                  value={selectedMemberId}
                  onValueChange={setSelectedMemberId}
                  disabled={!selectedGroupId || isLoadingMembers || members.length === 0}
                >
                  <SelectTrigger className="border-border/60 bg-card text-foreground">
                    <SelectValue
                      placeholder={
                        isLoadingMembers
                          ? 'Loading...'
                          : !selectedGroupId
                            ? 'Select a group first'
                            : 'Select a member'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card text-foreground">
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.displayName}
                        {member.email && (
                          <span className="ml-1 text-muted-foreground">({member.email})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Import Section */}
        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Automatic Import
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Set up scheduled imports to automatically sync new Splitwise expenses.
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowAutoImportSetup(!showAutoImportSetup)}
                variant="outline"
                size="sm"
                disabled={!selectedGroupId || !selectedMemberId}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Auto-Import
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Setup Form (conditionally shown) */}
            {showAutoImportSetup && (
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-4">
                <h4 className="font-semibold text-foreground">Configure New Auto-Import</h4>
                {!selectedGroupId || !selectedMemberId ? (
                  <p className="text-sm text-muted-foreground">
                    Please select a group and member above first.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Start Date</Label>
                        <Input
                          type="date"
                          value={autoImportStartDate}
                          onChange={(e) => setAutoImportStartDate(e.target.value)}
                          className="border-border/60 bg-card text-foreground"
                        />
                        <p className="text-xs text-muted-foreground">
                          Import expenses from this date onwards
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Frequency</Label>
                        <Select
                          value={autoImportFrequency}
                          onValueChange={(v) =>
                            setAutoImportFrequency(v as 'Daily' | 'Weekly' | 'Monthly')
                          }
                        >
                          <SelectTrigger className="border-border/60 bg-card text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-border/60 bg-card text-foreground">
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          How often to check for new expenses
                        </p>
                      </div>
                      <div className="flex items-end sm:col-span-2 md:col-span-1">
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            onClick={handleCreateAutoImport}
                            disabled={isCreatingAutoImport}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-none"
                          >
                            {isCreatingAutoImport ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Create
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowAutoImportSetup(false)}
                            className="flex-1 sm:flex-none"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Will import expenses for{' '}
                      <span className="font-semibold">
                        {members.find((m) => m.id.toString() === selectedMemberId)?.displayName}
                      </span>{' '}
                      from{' '}
                      <span className="font-semibold">
                        {groups.find((g) => g.id.toString() === selectedGroupId)?.name}
                      </span>
                    </p>
                  </>
                )}
              </div>
            )}

            {/* List of existing auto-imports */}
            {isLoadingAutoImports ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : autoImports.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-card/60 p-6 text-center">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  No auto-imports configured. Select a group and member above, then click "New
                  Auto-Import" to set up automatic syncing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {autoImports.map((ai) => (
                  <div
                    key={ai.id}
                    className={`rounded-lg border p-4 ${
                      ai.isActive
                        ? 'border-border/60 bg-card/60'
                        : 'border-muted/40 bg-muted/20 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                        <Switch
                          checked={ai.isActive}
                          onCheckedChange={() => handleToggleAutoImport(ai)}
                          className="mt-1 sm:mt-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground break-words">
                            {ai.groupName} → {ai.splitwiseMemberName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ai.frequency}
                            </span>
                            <span>Since {formatDate(ai.startDate)}</span>
                            {ai.lastRunAt && (
                              <span className="hidden sm:inline">
                                Last run: {formatDateTime(ai.lastRunAt)}
                              </span>
                            )}
                            {ai.lastRunImportedCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {ai.lastRunImportedCount} imported
                              </Badge>
                            )}
                          </div>
                          {ai.lastRunAt && (
                            <p className="text-xs text-muted-foreground mt-1 sm:hidden">
                              Last run: {formatDateTime(ai.lastRunAt)}
                            </p>
                          )}
                          {ai.lastRunError && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <XCircle className="h-3 w-3 flex-shrink-0" />
                              <span className="break-words">{ai.lastRunError}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunAutoImportNow(ai.id)}
                          disabled={runningAutoImportId === ai.id}
                        >
                          {runningAutoImportId === ai.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="mr-1 h-3 w-3" />
                              Run Now
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAutoImport(ai.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {ai.isActive && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Next scheduled run: {formatDateTime(ai.nextRunAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Import Card */}
        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Manual Import
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Preview and import expenses for a specific date range.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-muted-foreground">
                  Start Date (optional)
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-border/60 bg-card text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-muted-foreground">
                  End Date (optional)
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-border/60 bg-card text-foreground"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handlePreview}
                disabled={!selectedGroupId || !selectedMemberId || isPreviewLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Preview...
                  </>
                ) : (
                  'Preview Expenses'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        {preview && (
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader>
              <CardTitle>Import Preview</CardTitle>
              <CardDescription className="text-muted-foreground">
                Review the expenses below and select which ones to import. Payments are ignored
                automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary Stats */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                  <p className="text-xs text-muted-foreground">Group</p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">
                    {preview.groupName}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">
                    {preview.userName}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                  <p className="text-xs text-muted-foreground">Total Found</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {preview.totalExpenses}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                  <p className="text-xs text-muted-foreground">Can Import</p>
                  <p className="mt-1 text-xl font-semibold text-success-foreground">
                    {preview.importableCount}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                  <p className="text-xs text-muted-foreground">Selected Total</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {formatCurrency(
                      preview.expenses
                        .filter((e) => selectedExpenseIds.has(e.id))
                        .reduce((sum, e) => sum + e.userOwes, 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Warnings */}
              <div className="flex flex-wrap gap-4">
                {preview.paymentsIgnored > 0 && (
                  <div className="flex items-center gap-2 text-sm text-warning-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{preview.paymentsIgnored} payments will be ignored</span>
                  </div>
                )}
                {preview.duplicatesFound > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Copy className="h-4 w-4" />
                    <span>{preview.duplicatesFound} duplicates found (already imported)</span>
                  </div>
                )}
              </div>

              {/* Info about tag and category */}
              <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                <p className="text-sm text-muted-foreground">
                  Imported expenses will be tagged with{' '}
                  <Badge
                    variant="outline"
                    className="mx-1"
                    style={{
                      backgroundColor: '#1CC29F22',
                      color: '#1CC29F',
                      borderColor: '#1CC29F',
                    }}
                  >
                    splitwise
                  </Badge>{' '}
                  and categorized automatically based on the Splitwise category (falling back to{' '}
                  <span className="font-semibold">Other</span> when there isn’t a clear match). You
                  can adjust the category per expense below.
                </p>
              </div>

              {/* Expense Table */}
              {preview.expenses.length > 0 ? (
                <div className="overflow-auto rounded-xl border border-border/60">
                  <Table className="min-w-[800px] text-foreground">
                    <TableHeader className="[&_tr]:border-border/60">
                      <TableRow className="border-border/60">
                        <TableHead className="w-12 text-muted-foreground">
                          <Checkbox
                            checked={
                              selectedExpenseIds.size > 0 &&
                              selectedExpenseIds.size ===
                                preview.expenses.filter((e) => e.canImport).length
                            }
                            onCheckedChange={toggleSelectAll}
                            disabled={preview.importableCount === 0}
                          />
                        </TableHead>
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Description</TableHead>
                        <TableHead className="text-muted-foreground">Paid By</TableHead>
                        <TableHead className="text-muted-foreground">Category</TableHead>
                        <TableHead className="text-muted-foreground">Pennywise Category</TableHead>
                        <TableHead className="text-right text-muted-foreground">Total</TableHead>
                        <TableHead className="text-right text-muted-foreground">You Owe</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.expenses.map((expense) => (
                        <TableRow
                          key={expense.id}
                          className={`border-border/60 ${
                            expense.canImport ? 'cursor-pointer hover:bg-card/80' : 'opacity-60'
                          }`}
                          onClick={() => toggleExpenseSelection(expense.id, expense.canImport)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedExpenseIds.has(expense.id)}
                              disabled={!expense.canImport}
                              onCheckedChange={() =>
                                toggleExpenseSelection(expense.id, expense.canImport)
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {formatDate(expense.date)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-foreground">
                            {expense.description}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{expense.paidBy}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.splitwiseCategory || '-'}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={String(
                                selectedCategoryByExpenseId[expense.id] ?? expense.mappedCategoryId
                              )}
                              onValueChange={(value) =>
                                setExpenseCategory(expense.id, parseInt(value, 10))
                              }
                              disabled={!expense.canImport}
                            >
                              <SelectTrigger
                                className="border-border/60 bg-card text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SelectValue placeholder={expense.mappedCategoryName} />
                              </SelectTrigger>
                              <SelectContent className="border-border/60 bg-card text-foreground">
                                {preview.availableCategories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(expense.totalCost)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatCurrency(expense.userOwes)}
                          </TableCell>
                          <TableCell>{getStatusBadge(expense)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No expenses found for the selected criteria.
                </div>
              )}

              {/* Import Button */}
              {preview.importableCount > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-4">
                  <div>
                    <p className="font-medium text-foreground">
                      Ready to import {selectedExpenseIds.size} expense
                      {selectedExpenseIds.size !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total:{' '}
                      {formatCurrency(
                        preview.expenses
                          .filter((e) => selectedExpenseIds.has(e.id))
                          .reduce((sum, e) => sum + e.userOwes, 0)
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || selectedExpenseIds.size === 0}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Selected
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
