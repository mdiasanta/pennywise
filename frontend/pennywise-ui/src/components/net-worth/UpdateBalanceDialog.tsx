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
import { Textarea } from '@/components/ui/textarea';
import type { Asset } from '@/lib/api';

export interface BalanceFormData {
  balance: string;
  date: string;
  notes: string;
}

interface UpdateBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: BalanceFormData;
  onFormDataChange: (data: BalanceFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedAsset: Asset | null;
}

export function UpdateBalanceDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  selectedAsset,
}: UpdateBalanceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/60 bg-card text-foreground">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Update Balance</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedAsset
                ? `Update the balance for "${selectedAsset.name}"`
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
                value={formData.balance}
                onChange={(e) => onFormDataChange({ ...formData, balance: e.target.value })}
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
                onChange={(e) => onFormDataChange({ ...formData, date: e.target.value })}
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
                value={formData.notes}
                onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
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
              onClick={() => onOpenChange(false)}
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
  );
}
