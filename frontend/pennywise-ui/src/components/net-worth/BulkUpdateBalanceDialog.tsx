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
import type { Asset } from '@/lib/api';
import { Minus, Plus } from 'lucide-react';

export interface BulkBalanceEntry {
  balance: string;
  date: string;
  notes: string;
}

export interface BulkBalanceFormData {
  entries: BulkBalanceEntry[];
}

interface BulkUpdateBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: BulkBalanceFormData;
  onFormDataChange: (data: BulkBalanceFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedAsset: Asset | null;
}

const createEmptyEntry = (): BulkBalanceEntry => ({
  balance: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
});

export function BulkUpdateBalanceDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  selectedAsset,
}: BulkUpdateBalanceDialogProps) {
  const handleEntryChange = (index: number, field: keyof BulkBalanceEntry, value: string) => {
    const newEntries = [...formData.entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    onFormDataChange({ entries: newEntries });
  };

  const handleAddEntry = () => {
    onFormDataChange({
      entries: [...formData.entries, createEmptyEntry()],
    });
  };

  const handleRemoveEntry = (index: number) => {
    if (formData.entries.length <= 1) return;
    const newEntries = formData.entries.filter((_, i) => i !== index);
    onFormDataChange({ entries: newEntries });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border/60 bg-card text-foreground sm:max-w-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Bulk Update Balances</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedAsset
                ? `Add multiple balance entries for "${selectedAsset.name}"`
                : 'Add multiple balance entries'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-muted-foreground">Balance Entries</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEntry}
                className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Entry
              </Button>
            </div>

            <div className="space-y-4">
              {formData.entries.map((entry, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border/60 bg-card/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Entry {index + 1}
                    </span>
                    {formData.entries.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEntry(index)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`date-${index}`}
                        className="text-sm text-muted-foreground"
                      >
                        Date *
                      </Label>
                      <Input
                        id={`date-${index}`}
                        type="date"
                        className="border-border/60 bg-card text-foreground"
                        value={entry.date}
                        onChange={(e) => handleEntryChange(index, 'date', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor={`balance-${index}`}
                        className="text-sm text-muted-foreground"
                      >
                        Balance *
                      </Label>
                      <Input
                        id={`balance-${index}`}
                        type="number"
                        step="0.01"
                        className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                        value={entry.balance}
                        onChange={(e) => handleEntryChange(index, 'balance', e.target.value)}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`notes-${index}`}
                      className="text-sm text-muted-foreground"
                    >
                      Notes (optional)
                    </Label>
                    <Input
                      id={`notes-${index}`}
                      type="text"
                      className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                      value={entry.notes}
                      onChange={(e) => handleEntryChange(index, 'notes', e.target.value)}
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {formData.entries.length} {formData.entries.length === 1 ? 'entry' : 'entries'} will be
              added. If a balance already exists for a date, it will be updated.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Update {formData.entries.length}{' '}
              {formData.entries.length === 1 ? 'Balance' : 'Balances'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
