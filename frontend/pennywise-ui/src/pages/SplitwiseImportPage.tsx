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
  CheckCircle2,
  Copy,
  ExternalLink,
  Key,
  Loader2,
  Upload,
  Users,
} from 'lucide-react';
import { useState } from 'react';

export default function SplitwiseImportPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // API key and connection state
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [splitwiseUser, setSplitwiseUser] = useState<SplitwiseCurrentUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Groups and members state
  const [groups, setGroups] = useState<SplitwiseGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [members, setMembers] = useState<SplitwiseGroupMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Date filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Preview and import state
  const [preview, setPreview] = useState<SplitwiseImportResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<number>>(new Set());

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast({
        variant: 'destructive',
        title: 'API key required',
        description: 'Please enter your Splitwise API key.',
      });
      return;
    }

    setIsValidating(true);
    try {
      const swUser = await splitwiseApi.validateApiKey(apiKey);
      setSplitwiseUser(swUser);
      setIsConnected(true);

      // Load groups
      setIsLoadingGroups(true);
      const groupsResponse = await splitwiseApi.getGroups(apiKey);
      setGroups(groupsResponse.groups);

      toast({
        title: 'Connected to Splitwise',
        description: `Welcome, ${swUser.displayName}!`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Invalid API key.',
      });
      setIsConnected(false);
      setSplitwiseUser(null);
    } finally {
      setIsValidating(false);
      setIsLoadingGroups(false);
    }
  };

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedMemberId('');
    setMembers([]);
    setPreview(null);

    if (!groupId) return;

    setIsLoadingMembers(true);
    try {
      const groupMembers = await splitwiseApi.getGroupMembers(apiKey, parseInt(groupId, 10));
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

    try {
      const result = await splitwiseApi.previewImport({
        apiKey,
        groupId: parseInt(selectedGroupId, 10),
        splitwiseUserId: parseInt(selectedMemberId, 10),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setPreview(result);

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
      const result = await splitwiseApi.importExpenses({
        apiKey,
        groupId: parseInt(selectedGroupId, 10),
        splitwiseUserId: parseInt(selectedMemberId, 10),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedExpenseIds: Array.from(selectedExpenseIds),
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

  return (
    <AppLayout title="Splitwise Import" description="Import expenses from Splitwise">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Connection Card */}
        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Connect to Splitwise
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your Splitwise API key to connect. Get your API key from{' '}
              <a
                href="https://secure.splitwise.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                secure.splitwise.com/apps
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="apiKey" className="text-muted-foreground">
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Splitwise API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                  disabled={isConnected}
                />
              </div>
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={isValidating || !apiKey.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsConnected(false);
                    setSplitwiseUser(null);
                    setGroups([]);
                    setSelectedGroupId('');
                    setMembers([]);
                    setSelectedMemberId('');
                    setPreview(null);
                    setApiKey('');
                  }}
                  className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                >
                  Disconnect
                </Button>
              )}
            </div>

            {isConnected && splitwiseUser && (
              <div className="rounded-lg border border-success/60 bg-success/10 p-3">
                <p className="text-sm text-success-foreground">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  Connected as <span className="font-semibold">{splitwiseUser.displayName}</span>
                  {splitwiseUser.email && (
                    <span className="text-muted-foreground"> ({splitwiseUser.email})</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selection Card */}
        {isConnected && (
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                      <SelectValue
                        placeholder={isLoadingGroups ? 'Loading...' : 'Select a group'}
                      />
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
        )}

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
                  <p className="mt-1 text-sm font-semibold text-foreground truncate">
                    {preview.groupName}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="mt-1 text-sm font-semibold text-foreground truncate">
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
                  and categorized as <span className="font-semibold">Alcohol</span> by default.
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
                            expense.canImport ? 'hover:bg-card/80 cursor-pointer' : 'opacity-60'
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
                          <TableCell className="text-foreground max-w-xs truncate">
                            {expense.description}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{expense.paidBy}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.splitwiseCategory || '-'}
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
