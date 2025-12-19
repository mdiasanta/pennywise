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
import type { Asset, AssetSnapshotImportResponse } from '@/lib/api';
import { assetSnapshotApi } from '@/lib/api';
import { AlertCircle, CheckCircle, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';

interface ImportBalancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAsset: Asset | null;
  userId: number;
  onImportComplete: () => void;
}

type ImportStep = 'upload' | 'preview' | 'complete';

export function ImportBalancesDialog({
  open,
  onOpenChange,
  selectedAsset,
  userId,
  onImportComplete,
}: ImportBalancesDialogProps) {
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
    if (!selectedAsset) return;

    setDownloadingTemplate(true);
    let url: string | null = null;
    let a: HTMLAnchorElement | null = null;
    try {
      const { blob, filename } = await assetSnapshotApi.downloadTemplate(
        format,
        selectedAsset.id,
        userId
      );
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
    if (!file || !selectedAsset) return;

    setLoading(true);
    setError(null);

    try {
      const result = await assetSnapshotApi.importBalances(selectedAsset.id, userId, file, {
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
    if (!file || !selectedAsset) return;

    setLoading(true);
    setError(null);

    try {
      const result = await assetSnapshotApi.importBalances(selectedAsset.id, userId, file, {
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
            Import Balances
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {selectedAsset
              ? `Import balance history for "${selectedAsset.name}" from a CSV or Excel file`
              : 'Import balance history from a CSV or Excel file'}
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
                Start with a template file that shows the expected format.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('csv')}
                  disabled={downloadingTemplate || !selectedAsset}
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
                  disabled={downloadingTemplate || !selectedAsset}
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
              <Label htmlFor="file-upload">Upload File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="border-border/60 bg-card text-foreground"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Duplicate Strategy */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-strategy">When a balance already exists for a date</Label>
              <Select
                value={duplicateStrategy}
                onValueChange={(value) => setDuplicateStrategy(value as 'skip' | 'update')}
              >
                <SelectTrigger
                  id="duplicate-strategy"
                  className="border-border/60 bg-card text-foreground"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card text-foreground">
                  <SelectItem value="skip">Skip (keep existing)</SelectItem>
                  <SelectItem value="update">Update (replace with new value)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 'preview' && previewResult && (
          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg bg-card/50 p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{previewResult.totalRows}</div>
                <div className="text-xs text-muted-foreground">Total Rows</div>
              </div>
              <div className="rounded-lg bg-green-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{previewResult.inserted}</div>
                <div className="text-xs text-muted-foreground">To Insert</div>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">{previewResult.updated}</div>
                <div className="text-xs text-muted-foreground">To Update</div>
              </div>
              <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {previewResult.skipped + previewResult.errors}
                </div>
                <div className="text-xs text-muted-foreground">Skipped/Errors</div>
              </div>
            </div>

            {/* Row Details */}
            {previewResult.rows.length > 0 && (
              <div className="rounded-lg border border-border/60">
                <div className="max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader className="[&_tr]:border-border/60">
                      <TableRow>
                        <TableHead className="w-20 text-muted-foreground">Row</TableHead>
                        <TableHead className="w-28 text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewResult.rows.map((row) => (
                        <TableRow key={row.rowNumber} className="border-border/60">
                          <TableCell className="font-mono text-foreground">
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
                          <TableCell className="text-sm text-muted-foreground">
                            {row.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {previewResult.errors > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {previewResult.errors} row(s) have errors and will not be imported.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'complete' && importResult && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-green-500/10 p-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Import Complete!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Successfully processed {importResult.totalRows} rows.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-green-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{importResult.inserted}</div>
                <div className="text-xs text-muted-foreground">Inserted</div>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">{importResult.updated}</div>
                <div className="text-xs text-muted-foreground">Updated</div>
              </div>
              <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-yellow-500">{importResult.skipped}</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
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
                    Validating...
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
                disabled={loading}
                className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  loading ||
                  (previewResult?.inserted === 0 && previewResult?.updated === 0)
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
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Import {(previewResult?.inserted ?? 0) + (previewResult?.updated ?? 0)} Balances
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
