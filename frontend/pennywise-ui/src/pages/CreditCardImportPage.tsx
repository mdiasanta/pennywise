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
  CapitalOneCardType,
  CapitalOneExpensePreview,
  CapitalOneImportResponse,
} from '@/lib/api';
import { capitalOneApi } from '@/lib/api';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Copy,
  CreditCard,
  FileUp,
  Loader2,
  Upload,
} from 'lucide-react';
import { useCallback, useState } from 'react';

export default function CreditCardImportPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // File and card type state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cardType, setCardType] = useState<CapitalOneCardType>('QuickSilver');

  // Preview and import state
  const [preview, setPreview] = useState<CapitalOneImportResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<Set<number>>(new Set());
  const [selectedCategoryByRowNumber, setSelectedCategoryByRowNumber] = useState<
    Record<number, number>
  >({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(null);
      setSelectedRowNumbers(new Set());
      setSelectedCategoryByRowNumber({});
    }
  };

  const handlePreview = useCallback(async () => {
    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a CSV file to import.',
      });
      return;
    }

    setIsPreviewLoading(true);
    setPreview(null);
    setSelectedRowNumbers(new Set());
    setSelectedCategoryByRowNumber({});

    try {
      const result = await capitalOneApi.previewImport(selectedFile, cardType);
      setPreview(result);

      // Initialize mapped-category selection to the server-provided default mapping
      const initialCategorySelection: Record<number, number> = {};
      result.expenses.forEach((expense) => {
        initialCategorySelection[expense.rowNumber] = expense.mappedCategoryId;
      });
      setSelectedCategoryByRowNumber(initialCategorySelection);

      // Auto-select all importable expenses
      const importableRowNumbers = result.expenses.filter((e) => e.canImport).map((e) => e.rowNumber);
      setSelectedRowNumbers(new Set(importableRowNumbers));

      toast({
        title: 'Preview ready',
        description: `Found ${result.totalTransactions} transactions (${result.importableCount} can be imported).`,
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
  }, [selectedFile, cardType, toast]);

  const handleImport = useCallback(async () => {
    if (!preview || !selectedFile || selectedRowNumbers.size === 0) {
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
        .filter((e) => selectedRowNumbers.has(e.rowNumber) && e.canImport)
        .map((e) => ({
          rowNumber: e.rowNumber,
          categoryId: selectedCategoryByRowNumber[e.rowNumber] ?? e.mappedCategoryId,
        }))
        .filter((o) => {
          const expense = preview.expenses.find((e) => e.rowNumber === o.rowNumber);
          return expense ? o.categoryId !== expense.mappedCategoryId : false;
        });

      const result = await capitalOneApi.importExpenses(
        selectedFile,
        cardType,
        Array.from(selectedRowNumbers),
        categoryOverrides.length > 0 ? categoryOverrides : undefined
      );

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
  }, [preview, selectedFile, cardType, selectedRowNumbers, selectedCategoryByRowNumber, toast, handlePreview]);

  const toggleExpenseSelection = (rowNumber: number, canImport: boolean) => {
    if (!canImport) return;

    const newSelection = new Set(selectedRowNumbers);
    if (newSelection.has(rowNumber)) {
      newSelection.delete(rowNumber);
    } else {
      newSelection.add(rowNumber);
    }
    setSelectedRowNumbers(newSelection);
  };

  const setExpenseCategory = (rowNumber: number, categoryId: number) => {
    setSelectedCategoryByRowNumber((prev) => ({
      ...prev,
      [rowNumber]: categoryId,
    }));
  };

  const toggleSelectAll = () => {
    if (!preview) return;

    const importableRowNumbers = preview.expenses.filter((e) => e.canImport).map((e) => e.rowNumber);

    if (selectedRowNumbers.size === importableRowNumbers.length) {
      setSelectedRowNumbers(new Set());
    } else {
      setSelectedRowNumbers(new Set(importableRowNumbers));
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

  const getStatusBadge = (expense: CapitalOneExpensePreview) => {
    if (expense.isCredit) {
      return (
        <Badge
          variant="secondary"
          className="border-warning/60 bg-warning/10 text-warning-foreground"
        >
          <Ban className="mr-1 h-3 w-3" />
          Credit
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

  const getCardTypeBadgeColor = (type: CapitalOneCardType) => {
    return type === 'QuickSilver'
      ? { backgroundColor: '#4169E122', color: '#4169E1', borderColor: '#4169E1' }
      : { backgroundColor: '#8B000022', color: '#8B0000', borderColor: '#8B0000' };
  };

  // Show sign-in prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <AppLayout title="Credit Card Import" description="Import expenses from Capital One">
        <div className="mx-auto max-w-2xl py-12">
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign in to import from Capital One</CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your account to import expenses from your Capital One credit card statements.
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
    <AppLayout title="Credit Card Import" description="Import expenses from Capital One">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* File Upload Card */}
        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Import Capital One Transactions
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Upload a CSV file exported from your Capital One credit card account. Credits and
              payments will be automatically excluded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cardType" className="text-muted-foreground">
                  Card Type
                </Label>
                <Select
                  value={cardType}
                  onValueChange={(value: CapitalOneCardType) => setCardType(value)}
                >
                  <SelectTrigger className="border-border/60 bg-card text-foreground">
                    <SelectValue placeholder="Select card type" />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card text-foreground">
                    <SelectItem value="QuickSilver">QuickSilver</SelectItem>
                    <SelectItem value="VentureX">VentureX</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Imported expenses will be tagged with the card name for easy filtering.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="csvFile" className="text-muted-foreground">
                  CSV File
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="border-border/60 bg-card text-foreground"
                  />
                </div>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>

            {/* Expected format info */}
            <div className="rounded-lg border border-border/60 bg-card/60 p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Expected CSV format:</strong> Transaction Date, Posted Date, Card No.,
                Description, Category, Debit, Credit
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Example: 2024-12-21,2024-12-22,9121,COFFEE SHOP,Dining,5.50,.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handlePreview}
                disabled={!selectedFile || isPreviewLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Preview...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Preview Import
                  </>
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
                Review the transactions below and select which ones to import. Credits and payments
                are automatically skipped.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary Stats */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                  <p className="text-xs text-muted-foreground">File</p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">
                    {preview.fileName}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                  <p className="text-xs text-muted-foreground">Card</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{preview.cardType}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                  <p className="text-xs text-muted-foreground">Total Found</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {preview.totalTransactions}
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
                        .filter((e) => selectedRowNumbers.has(e.rowNumber))
                        .reduce((sum, e) => sum + e.amount, 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Warnings */}
              <div className="flex flex-wrap gap-4">
                {preview.creditsSkipped > 0 && (
                  <div className="flex items-center gap-2 text-sm text-warning-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{preview.creditsSkipped} credits/payments will be skipped</span>
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
                  <Badge variant="outline" className="mx-1" style={getCardTypeBadgeColor(cardType)}>
                    {cardType}
                  </Badge>{' '}
                  and categorized automatically based on the Capital One category (falling back to{' '}
                  <span className="font-semibold">Other</span> when there isn&apos;t a clear match).
                  You can adjust the category per expense below.
                </p>
              </div>

              {/* Expense Table */}
              {preview.expenses.length > 0 ? (
                <div className="overflow-auto rounded-xl border border-border/60">
                  <Table className="min-w-[900px] text-foreground">
                    <TableHeader className="[&_tr]:border-border/60">
                      <TableRow className="border-border/60">
                        <TableHead className="w-12 text-muted-foreground">
                          <Checkbox
                            checked={
                              selectedRowNumbers.size > 0 &&
                              selectedRowNumbers.size ===
                                preview.expenses.filter((e) => e.canImport).length
                            }
                            onCheckedChange={toggleSelectAll}
                            disabled={preview.importableCount === 0}
                          />
                        </TableHead>
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Description</TableHead>
                        <TableHead className="text-muted-foreground">Card</TableHead>
                        <TableHead className="text-muted-foreground">C1 Category</TableHead>
                        <TableHead className="text-muted-foreground">Pennywise Category</TableHead>
                        <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.expenses.map((expense) => (
                        <TableRow
                          key={expense.rowNumber}
                          className={`border-border/60 ${
                            expense.canImport ? 'cursor-pointer hover:bg-card/80' : 'opacity-60'
                          }`}
                          onClick={() =>
                            toggleExpenseSelection(expense.rowNumber, expense.canImport)
                          }
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedRowNumbers.has(expense.rowNumber)}
                              disabled={!expense.canImport}
                              onCheckedChange={() =>
                                toggleExpenseSelection(expense.rowNumber, expense.canImport)
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {formatDate(expense.transactionDate)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-foreground">
                            {expense.description}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            ...{expense.cardNumber}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.capitalOneCategory || '-'}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={String(
                                selectedCategoryByRowNumber[expense.rowNumber] ??
                                  expense.mappedCategoryId
                              )}
                              onValueChange={(value) =>
                                setExpenseCategory(expense.rowNumber, parseInt(value, 10))
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
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(expense)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No transactions found in the CSV file.
                </div>
              )}

              {/* Import Button */}
              {preview.importableCount > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-4">
                  <div>
                    <p className="font-medium text-foreground">
                      Ready to import {selectedRowNumbers.size} expense
                      {selectedRowNumbers.size !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total:{' '}
                      {formatCurrency(
                        preview.expenses
                          .filter((e) => selectedRowNumbers.has(e.rowNumber))
                          .reduce((sum, e) => sum + e.amount, 0)
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || selectedRowNumbers.size === 0}
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
