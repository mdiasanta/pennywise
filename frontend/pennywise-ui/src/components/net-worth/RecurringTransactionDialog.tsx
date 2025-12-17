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
import type { Asset } from '@/lib/api';

export type RecurringFrequency = 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Yearly';

export interface RecurringFormData {
  assetId: string;
  amount: string;
  description: string;
  frequency: RecurringFrequency;
  dayOfWeek: string;
  dayOfMonth: string;
  startDate: string;
  endDate: string;
}

interface RecurringTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: RecurringFormData;
  onFormDataChange: (data: RecurringFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  assets: Asset[];
}

export function RecurringTransactionDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  assets,
}: RecurringTransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/60 bg-card text-foreground">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Recurring Transaction</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set up an automatic recurring deposit or withdrawal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recurringAsset" className="text-muted-foreground">
                Account *
              </Label>
              <Select
                value={formData.assetId}
                onValueChange={(value) => onFormDataChange({ ...formData, assetId: value })}
              >
                <SelectTrigger className="border-border/60 bg-card text-foreground">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card text-foreground">
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurringAmount" className="text-muted-foreground">
                Amount * (positive to add, negative to subtract)
              </Label>
              <Input
                id="recurringAmount"
                type="number"
                step="0.01"
                className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                value={formData.amount}
                onChange={(e) => onFormDataChange({ ...formData, amount: e.target.value })}
                required
                placeholder="e.g. 2500.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurringDescription" className="text-muted-foreground">
                Description *
              </Label>
              <Input
                id="recurringDescription"
                className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                value={formData.description}
                onChange={(e) =>
                  onFormDataChange({
                    ...formData,
                    description: e.target.value,
                  })
                }
                required
                placeholder="e.g. Paycheck"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurringFrequency" className="text-muted-foreground">
                Frequency *
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  onFormDataChange({
                    ...formData,
                    frequency: value as RecurringFrequency,
                  })
                }
              >
                <SelectTrigger className="border-border/60 bg-card text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card text-foreground">
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.frequency === 'Weekly' || formData.frequency === 'Biweekly') && (
              <div className="space-y-2">
                <Label htmlFor="recurringDayOfWeek" className="text-muted-foreground">
                  Day of Week
                </Label>
                <Select
                  value={formData.dayOfWeek}
                  onValueChange={(value) => onFormDataChange({ ...formData, dayOfWeek: value })}
                >
                  <SelectTrigger className="border-border/60 bg-card text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card text-foreground">
                    <SelectItem value="Sunday">Sunday</SelectItem>
                    <SelectItem value="Monday">Monday</SelectItem>
                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                    <SelectItem value="Thursday">Thursday</SelectItem>
                    <SelectItem value="Friday">Friday</SelectItem>
                    <SelectItem value="Saturday">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.frequency === 'Monthly' || formData.frequency === 'Quarterly') && (
              <div className="space-y-2">
                <Label htmlFor="recurringDayOfMonth" className="text-muted-foreground">
                  Day of Month
                </Label>
                <Input
                  id="recurringDayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  className="border-border/60 bg-card text-foreground"
                  value={formData.dayOfMonth}
                  onChange={(e) =>
                    onFormDataChange({
                      ...formData,
                      dayOfMonth: e.target.value,
                    })
                  }
                  placeholder="1-31"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recurringStartDate" className="text-muted-foreground">
                Start Date *
              </Label>
              <Input
                id="recurringStartDate"
                type="date"
                className="border-border/60 bg-card text-foreground"
                value={formData.startDate}
                onChange={(e) =>
                  onFormDataChange({
                    ...formData,
                    startDate: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurringEndDate" className="text-muted-foreground">
                End Date (optional)
              </Label>
              <Input
                id="recurringEndDate"
                type="date"
                className="border-border/60 bg-card text-foreground"
                value={formData.endDate}
                onChange={(e) => onFormDataChange({ ...formData, endDate: e.target.value })}
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
              Create Recurring
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
