import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { AssetSnapshotImportResponse } from '@/lib/api';
import { assetSnapshotApi } from '@/lib/api';
import { AlertCircle, CheckCircle, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';

interface BulkImportBalancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  onImportComplete: () => void;
}

type ImportStep = 'upload' | 'preview' | 'complete';

export function BulkImportBalancesDialog({
  open,
  onOpenChange,
  userId,
  onImportComplete,
}: BulkImportBalancesDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [previewResult, setPreviewResult] = useState<AssetSnapshotImportResponse | null>(null);
  const [importResult, setImportResult] = useState<AssetSnapshotImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetDialog = useCallback(() => {
    setStep('upload');
    setFile(null);
    setDuplicateStrategy('skip');
    setLoading(false);
    setPreviewResult(null);
    setImportResult(null);
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetDialog();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetDialog]
  );

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
    setDownloadingTemplate(true);
    let url: string | null = null;
    let a: HTMLAnchorElement | null = null;
    try {
      const { blob, filename } = await assetSnapshotApi.downloadBulkTemplate(format, userId);
      url = URL.createObjectURL(blob);
      a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download template');
    } finally {
      if (a && document.body.contains(a)) {
        document.body.removeChild(a);
      }
      if (url) {
        URL.revokeObjectURL(url);
      }
      setDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await assetSnapshotApi.bulkImportBalances(userId, file, {
        duplicateStrategy,
        dryRun: true,
      });
      setPreviewResult(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview import');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await assetSnapshotApi.bulkImportBalances(userId, file, {
        duplicateStrategy,
        dryRun: false,
      });
      setImportResult(result);
      setStep('complete');
      onImportComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import balances');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
      case 'inserted':
      case 'updated':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'valid':
      case 'inserted':
      case 'updated':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border/60 bg-card text-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Import Balances
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Import balance history for all accounts from a single CSV or Excel file
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            {/* Template Download */}
            <div className="rounded-lg border border-border/60 bg-card/50 p-4">
              <Label className="text-sm font-medium">Download Template</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Start with a template file that includes your existing accounts and the expected
                format.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('csv')}
                  disabled={downloadingTemplate}
                  className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                >
                  {downloadingTemplate ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  CSV Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  disabled={downloadingTemplate}
                  className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                >
                  {downloadingTemplate ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Excel Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="bulk-file">Select File</Label>
              <Input
                id="bulk-file"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="cursor-pointer border-border/60 bg-card text-foreground file:border-0 file:bg-primary file:text-primary-foreground file:hover:bg-primary/90"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Duplicate Strategy */}
            <div className="space-y-2">
              <Label>Duplicate Handling</Label>
              <Select
                value={duplicateStrategy}
                onValueChange={(value) => setDuplicateStrategy(value as 'skip' | 'update')}
              >
                <SelectTrigger className="border-border/60 bg-card text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card text-foreground">
                  <SelectItem value="skip">Skip duplicates</SelectItem>
                  <SelectItem value="update">Update existing</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {duplicateStrategy === 'skip'
                  ? 'If a balance already exists for the same account and date, it will be skipped.'
                  : 'If a balance already exists for the same account and date, it will be updated with the new value.'}
              </p>
            </div>

            {/* Format Info */}
            <div className="rounded-lg border border-border/60 bg-card/50 p-4">
              <Label className="text-sm font-medium">Expected Format</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Your file should have these columns:
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                <li>
                  <strong>Account</strong> - Exact account name (required)
                </li>
                <li>
                  <strong>Date</strong> - Date in YYYY-MM-DD format (required)
                </li>
                <li>
                  <strong>Balance</strong> - Balance amount as a number (required)
                </li>
                <li>
                  <strong>Notes</strong> - Optional notes
                </li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && previewResult && (
          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-card/50 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{previewResult.totalRows}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {previewResult.inserted}
                </p>
                <p className="text-xs text-muted-foreground">To Insert</p>
              </div>
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {previewResult.updated}
                </p>
                <p className="text-xs text-muted-foreground">To Update</p>
              </div>
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {previewResult.skipped}
                </p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>

            {/* Row Details */}
            {previewResult.rows.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/60">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow className="border-border/60">
                      <TableHead className="text-muted-foreground">Row</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewResult.rows.map((row, index) => (
                      <TableRow key={index} className="border-border/60">
                        <TableCell className="font-medium text-foreground">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(row.status)}`}
                          >
                            {getStatusIcon(row.status)}
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {previewResult.rows.some((r) => r.status === 'error') && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some rows have errors. Fix them in your file and try again, or proceed to import
                  only the valid rows.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'complete' && importResult && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">Import Complete!</h3>
                <p className="text-muted-foreground">
                  Successfully imported {importResult.inserted} new balances
                  {importResult.updated > 0 && `, updated ${importResult.updated}`}
                  {importResult.skipped > 0 && `, skipped ${importResult.skipped}`}.
                </p>
              </div>
            </div>

            {/* Final Summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-card/50 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{importResult.totalRows}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importResult.inserted}
                </p>
                <p className="text-xs text-muted-foreground">Inserted</p>
              </div>
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {importResult.updated}
                </p>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {importResult.skipped}
                </p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!file || loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Preview Import
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  loading || (previewResult?.inserted === 0 && previewResult?.updated === 0)
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import {(previewResult?.inserted || 0) + (previewResult?.updated || 0)} Balances
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button
              onClick={() => handleOpenChange(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
