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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useCategories } from '@/hooks/use-categories';
import { useToast } from '@/hooks/use-toast';
import type { CreateExpense, Expense, ExpenseImportResponse, UpdateExpense } from '@/lib/api';
import { expenseApi } from '@/lib/api';
import { CheckCircle2, Download, FileWarning, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const US_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Detroit',
  'America/Indiana/Indianapolis',
  'America/Puerto_Rico',
];

export default function ExpensesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: 'all',
    search: '',
  });
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exporting, setExporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ExpenseImportResponse | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [applyingImport, setApplyingImport] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const resolvedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const initialTz = US_TIMEZONES.includes(resolvedTz) ? resolvedTz : US_TIMEZONES[0];
  const [timezone, setTimezone] = useState(initialTz);
  const [showImportErrorsOnly, setShowImportErrorsOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
  });

  const buildFilterPayload = useCallback(
    (state = filters) => ({
      startDate: state.startDate || undefined,
      endDate: state.endDate || undefined,
      categoryId:
        state.categoryId && state.categoryId !== 'all' ? parseInt(state.categoryId, 10) : undefined,
      search: state.search.trim() ? state.search.trim() : undefined,
    }),
    [filters]
  );

  const clearImportState = () => {
    setImportPreview(null);
    setImportFile(null);
    setShowImportErrorsOnly(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadData = useCallback(
    async (overrideFilters = filters) => {
      // Wait for auth to finish loading
      if (authLoading) return;

      // Only load data for authenticated users
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const expensesData = await expenseApi.getAll(user.id, buildFilterPayload(overrideFilters));
        setExpenses(expensesData);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load data. Please try again.',
        });
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    },
    [authLoading, isAuthenticated, user, buildFilterPayload, filters]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
    });
    setEditingExpense(null);
  };

  const handleApplyFilters = () => {
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        toast({
          variant: 'destructive',
          title: 'Invalid date format',
          description: 'Please enter valid dates.',
        });
        return;
      }

      if (start.getTime() > end.getTime()) {
        toast({
          variant: 'destructive',
          title: 'Invalid date range',
          description: 'Start date must be before or equal to end date.',
        });
        return;
      }
    }
    loadData(filters);
  };

  const handleClearFilters = () => {
    const cleared = {
      startDate: '',
      endDate: '',
      categoryId: 'all',
      search: '',
    };
    setFilters(cleared);
    loadData(cleared);
  };

  const handleExport = async () => {
    if (!user) return;

    try {
      setExporting(true);
      const { blob, filename } = await expenseApi.export(
        user.id,
        exportFormat,
        buildFilterPayload(filters)
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: 'Export ready',
        description: `Downloaded ${exportFormat.toUpperCase()} export.`,
      });
    } catch (error) {
      let message = 'Could not export expenses. Please try again.';
      // Try to extract more specific error information
      if (error && typeof error === 'object') {
        // Axios-style error
        if ('response' in error && error.response) {
          // Try to get message from response data
          const data = (error as any).response.data;
          if (data && typeof data === 'object' && 'message' in data) {
            message = data.message;
          } else if (typeof data === 'string') {
            message = data;
          } else if ((error as any).response.status) {
            message = `Server error (${(error as any).response.status}) during export.`;
          }
        } else if ('message' in error && typeof (error as any).message === 'string') {
          message = (error as any).message;
        }
      }
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: message,
      });
      console.error('Error exporting expenses:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      const { blob, filename } = await expenseApi.downloadTemplate(format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast({
        title: 'Template downloaded',
        description: `Downloaded ${format.toUpperCase()} template with categories.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Template download failed',
        description: error instanceof Error ? error.message : 'Could not download template.',
      });
    }
  };

  const handleImportPreview = async (file: File) => {
    if (!user) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || (extension !== 'csv' && extension !== 'xlsx')) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file',
        description: 'Please upload a CSV or Excel (.xlsx) file.',
      });
      return;
    }

    try {
      setPreviewingImport(true);
      setImportFile(file);
      const preview = await expenseApi.importExpenses(user.id, file, {
        duplicateStrategy,
        timezone,
        dryRun: true,
      });
      setImportPreview(preview);
      setShowImportErrorsOnly(false);
      toast({
        title: 'Validation complete',
        description: `Found ${preview.totalRows} rows (${preview.errors} errors).`,
      });
    } catch (error) {
      setImportPreview(null);
      toast({
        variant: 'destructive',
        title: 'Import validation failed',
        description: error instanceof Error ? error.message : 'Could not validate file.',
      });
    } finally {
      setPreviewingImport(false);
    }
  };

  const handleApplyImport = async () => {
    if (!importFile || !user) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Upload and validate a CSV or Excel file first.',
      });
      return;
    }

    try {
      setApplyingImport(true);
      const result = await expenseApi.importExpenses(user.id, importFile, {
        duplicateStrategy,
        timezone,
        dryRun: false,
      });
      setImportPreview(result);
      toast({
        title: 'Import applied',
        description: `Inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}.`,
      });
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Could not apply import.',
      });
    } finally {
      setApplyingImport(false);
    }
  };

  const handleExportErrors = () => {
    if (!importPreview) return;
    const errorRows = importPreview.rows.filter((row) => row.status === 'error');
    if (errorRows.length === 0) {
      toast({
        title: 'No errors to export',
        description: 'All rows are valid.',
      });
      return;
    }

    const header = 'Row,Status,Message';
    const lines = errorRows.map(
      (row) => `${row.rowNumber},${row.status},"${(row.message ?? '').replace(/"/g, '""')}"`
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import-errors.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    toast({
      title: 'Exported errors',
      description: 'Downloaded import errors as CSV.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoriesLoading) {
      toast({
        variant: 'destructive',
        title: 'Please wait',
        description: 'Categories are still loading. Try again in a moment.',
      });
      return;
    }

    if (categories.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Add a category first',
        description: 'Create a category before saving an expense.',
      });
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    const parsedCategoryId = parseInt(formData.categoryId, 10);

    if (Number.isNaN(parsedAmount) || Number.isNaN(parsedCategoryId)) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter an amount and choose a category before saving.',
      });
      return;
    }

    if (!user) return;

    try {
      if (editingExpense) {
        // Update existing expense
        // Append T00:00:00Z to treat the date as UTC midnight (prevents timezone shift)
        const updateData: UpdateExpense = {
          title: formData.title,
          description: formData.description || undefined,
          amount: parsedAmount,
          date: `${formData.date}T00:00:00Z`,
          categoryId: parsedCategoryId,
        };

        await expenseApi.update(editingExpense.id, user.id, updateData);
        toast({
          title: 'Success',
          description: 'Expense updated successfully.',
        });
      } else {
        // Create new expense
        // Append T00:00:00Z to treat the date as UTC midnight (prevents timezone shift)
        const createData: CreateExpense = {
          title: formData.title,
          description: formData.description || undefined,
          amount: parsedAmount,
          date: `${formData.date}T00:00:00Z`,
          userId: user.id,
          categoryId: parsedCategoryId,
        };

        await expenseApi.create(createData);
        toast({
          title: 'Success',
          description: 'Expense created successfully.',
        });
      }

      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save expense. Please try again.',
      });
      console.error('Error saving expense:', error);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    // Extract date portion directly from ISO string to avoid timezone shifts
    const datePart = expense.date.split('T')[0];
    setFormData({
      title: expense.title,
      description: expense.description || '',
      amount: expense.amount.toString(),
      date: datePart,
      categoryId: expense.categoryId.toString(),
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!user) return;

    try {
      await expenseApi.delete(id, user.id);
      toast({
        title: 'Success',
        description: 'Expense deleted successfully.',
      });
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete expense. Please try again.',
      });
      console.error('Error deleting expense:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    // Parse as UTC to avoid timezone shift, then format
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const filteredImportRows =
    importPreview?.rows.filter((row) => (showImportErrorsOnly ? row.status === 'error' : true)) ??
    [];
  const importErrorCount = importPreview?.errors ?? 0;

  // Show sign-in prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <AppLayout title="Expenses" description="Capture, edit, and audit expenses">
        <div className="mx-auto max-w-2xl py-12">
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign in to manage expenses</CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your account to add, edit, import, and export your expense records.
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
    <AppLayout title="Expenses" description="Capture, edit, and audit expenses">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Summary Cards */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/10">
              <p className="text-xs text-muted-foreground">Total spend</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/10">
              <p className="text-xs text-muted-foreground">Entries</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{expenses.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/10">
              <p className="text-xs text-muted-foreground">Categories</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{categories.length}</p>
            </div>
          </div>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add expense
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border/60 bg-card text-foreground">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {editingExpense
                      ? 'Update the expense details below.'
                      : 'Fill in the details to create a new expense record.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-muted-foreground">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="e.g., Grocery shopping"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-muted-foreground">
                      Amount *
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-muted-foreground">
                      Category *
                    </Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                      required
                      disabled={categoriesLoading || categories.length === 0}
                    >
                      <SelectTrigger className="border-border/60 bg-card text-foreground">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="border-border/60 bg-card text-foreground">
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {categoriesLoading ? (
                      <p className="text-sm text-muted-foreground">Loading categories...</p>
                    ) : null}
                    {categoriesError && !categoriesLoading ? (
                      <p className="text-sm text-destructive">
                        Unable to load categories. Try again or manage them from the Categories
                        page.
                      </p>
                    ) : null}
                    {!categoriesLoading && categories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No categories found. Create one from the Categories page to start tagging
                        expenses.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-muted-foreground">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Add any additional details..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {editingExpense ? 'Update' : 'Create'} Expense
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle>Import expenses</CardTitle>
            <CardDescription className="text-muted-foreground">
              Download a guided template, validate your file, and apply imports with duplicate
              handling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Download template</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                    onClick={() => handleDownloadTemplate('csv')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                    onClick={() => handleDownloadTemplate('xlsx')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Duplicate handling</Label>
                <Select
                  value={duplicateStrategy}
                  onValueChange={(value) => setDuplicateStrategy(value as 'skip' | 'update')}
                >
                  <SelectTrigger className="border-border/60 bg-card text-foreground">
                    <SelectValue placeholder="Strategy" />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card text-foreground">
                    <SelectItem value="skip">Skip duplicates</SelectItem>
                    <SelectItem value="update">Update duplicates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-muted-foreground">
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={(value) => setTimezone(value)}>
                  <SelectTrigger id="timezone" className="border-border/60 bg-card text-foreground">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card text-foreground">
                    {US_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="importFile" className="text-muted-foreground">
                  Upload CSV or Excel
                </Label>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <Input
                    id="importFile"
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="border-border/60 bg-card text-foreground"
                    disabled={previewingImport}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImportPreview(file);
                      }
                    }}
                    ref={fileInputRef}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                      disabled={!importPreview || previewingImport}
                      onClick={clearImportState}
                    >
                      Clear preview
                    </Button>
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={!importPreview || applyingImport || previewingImport}
                      onClick={handleApplyImport}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {applyingImport ? 'Applying...' : 'Apply import'}
                    </Button>
                  </div>
                </div>
                {importFile && (
                  <p className="text-sm text-muted-foreground">
                    Ready to import:{' '}
                    <span className="font-medium text-foreground">{importFile.name}</span>
                  </p>
                )}
                {previewingImport && (
                  <p className="text-sm text-muted-foreground">Validating file...</p>
                )}
              </div>
            </div>

            {importPreview && (
              <div className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                    <p className="text-xs text-muted-foreground">Rows</p>
                    <p className="text-xl font-semibold text-foreground">
                      {importPreview.totalRows}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                    <p className="text-xs text-muted-foreground">Inserted</p>
                    <p className="flex items-center gap-2 text-xl font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                      {importPreview.inserted}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                    <p className="text-xs text-muted-foreground">Updated / Skipped</p>
                    <p className="text-xl font-semibold text-foreground">
                      {importPreview.updated} / {importPreview.skipped}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/80 p-3">
                    <p className="text-xs text-muted-foreground">Errors</p>
                    <p className="flex items-center gap-2 text-xl font-semibold text-foreground">
                      <FileWarning className="h-4 w-4 text-warning" />
                      {importErrorCount}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="errorsOnly"
                      checked={showImportErrorsOnly}
                      onCheckedChange={(checked) => setShowImportErrorsOnly(Boolean(checked))}
                    />
                    <Label htmlFor="errorsOnly" className="text-muted-foreground">
                      Show errors only
                    </Label>
                  </div>
                  <Button
                    variant="outline"
                    className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                    onClick={handleExportErrors}
                    disabled={importErrorCount === 0}
                  >
                    Export errors
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Strategy:{' '}
                    <span className="font-medium text-foreground uppercase">
                      {importPreview.duplicateStrategy}
                    </span>{' '}
                    · Timezone: {importPreview.timezone || 'UTC'} ·{' '}
                    {importPreview.dryRun ? 'Dry run preview' : 'Applied'}
                  </div>
                </div>

                <div className="overflow-auto rounded-xl border border-border/60">
                  <Table className="min-w-[480px] text-foreground">
                    <TableHeader className="[&_tr]:border-border/60">
                      <TableRow className="border-border/60">
                        <TableHead className="w-24 text-muted-foreground">Row</TableHead>
                        <TableHead className="w-32 text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredImportRows.map((row) => (
                        <TableRow key={row.rowNumber} className="border-border/60">
                          <TableCell className="font-medium">{row.rowNumber}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                row.status === 'error'
                                  ? 'border-destructive/60 bg-destructive/10 text-destructive'
                                  : row.status === 'updated'
                                    ? 'border-warning/60 bg-warning/10 text-warning-foreground'
                                    : row.status === 'skipped'
                                      ? 'border-muted-foreground/40 bg-muted/30 text-muted-foreground'
                                      : 'border-success/60 bg-success/10 text-success-foreground'
                              }
                            >
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.message || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredImportRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No rows to display.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
            <CardDescription className="text-muted-foreground">
              A complete list of all your expense records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-4 rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-muted-foreground">
                    Search
                  </Label>
                  <Input
                    id="search"
                    placeholder="Search title or description"
                    className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDateFilter" className="text-muted-foreground">
                    Start date
                  </Label>
                  <Input
                    id="startDateFilter"
                    type="date"
                    className="border-border/60 bg-card text-foreground"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDateFilter" className="text-muted-foreground">
                    End date
                  </Label>
                  <Input
                    id="endDateFilter"
                    type="date"
                    className="border-border/60 bg-card text-foreground"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryFilter" className="text-muted-foreground">
                    Category
                  </Label>
                  <Select
                    value={filters.categoryId}
                    onValueChange={(value) => setFilters({ ...filters, categoryId: value })}
                    disabled={categoriesLoading || categories.length === 0}
                  >
                    <SelectTrigger
                      id="categoryFilter"
                      className="border-border/60 bg-card text-foreground"
                    >
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="border-border/60 bg-card text-foreground">
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                    onClick={handleApplyFilters}
                    disabled={loading}
                  >
                    Apply filters
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-foreground hover:bg-card/70"
                    onClick={handleClearFilters}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={exportFormat}
                    onValueChange={(value) => setExportFormat(value as 'csv' | 'xlsx')}
                  >
                    <SelectTrigger className="w-[140px] border-border/60 bg-card text-foreground">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent className="border-border/60 bg-card text-foreground">
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleExport}
                    disabled={exporting || expenses.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exporting ? 'Exporting...' : 'Export'}
                  </Button>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No expenses found.</p>
                <p className="mt-2 text-sm">
                  Click "Add expense" to create your first expense record.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[700px] text-foreground">
                <TableHeader className="[&_tr]:border-border/60">
                  <TableRow className="border-border/60">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Title</TableHead>
                    <TableHead className="text-muted-foreground">Category</TableHead>
                    <TableHead className="text-muted-foreground">Description</TableHead>
                    <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} className="border-border/60 hover:bg-card/80">
                      <TableCell className="font-medium text-foreground">
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell className="text-foreground">{expense.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="border-border/60 bg-card/70 text-foreground"
                          style={
                            expense.categoryColor
                              ? {
                                  backgroundColor: expense.categoryColor + '22',
                                  color: expense.categoryColor,
                                  borderColor: expense.categoryColor,
                                }
                              : undefined
                          }
                        >
                          {expense.categoryName || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {expense.description || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-foreground hover:bg-card/70"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-border/60 bg-card text-foreground">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Are you sure you want to delete this expense? This action cannot
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border/60 bg-card/80 text-foreground hover:bg-card/70">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(expense.id)}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
