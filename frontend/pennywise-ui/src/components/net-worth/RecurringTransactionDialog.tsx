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
import { Switch } from '@/components/ui/switch';
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
  interestRate: string; // Annual rate as percentage
  isCompounding: boolean; // True = APY, False = APR
  isInterestBased: boolean; // True if using interest rate instead of fixed amount
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

            {/* Interest-based toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isInterestBased" className="text-foreground">
                  Interest-based (APR/APY)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Calculate interest based on account balance (e.g., high yield savings)
                </p>
              </div>
              <Switch
                id="isInterestBased"
                checked={formData.isInterestBased}
                onCheckedChange={(checked) =>
                  onFormDataChange({
                    ...formData,
                    isInterestBased: checked,
                    amount: checked ? '0' : formData.amount,
                  })
                }
              />
            </div>

            {/* Interest rate fields (shown when interest-based is enabled) */}
            {formData.isInterestBased && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="interestRate" className="text-muted-foreground">
                    Annual Interest Rate (%) *
                  </Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                    value={formData.interestRate}
                    onChange={(e) => onFormDataChange({ ...formData, interestRate: e.target.value })}
                    required
                    placeholder="e.g. 3.5"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="isCompounding" className="text-foreground">
                      APY (Compounding)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {formData.isCompounding
                        ? 'APY: Interest compounds on the growing balance'
                        : 'APR: Simple interest rate (no compounding)'}
                    </p>
                  </div>
                  <Switch
                    id="isCompounding"
                    checked={formData.isCompounding}
                    onCheckedChange={(checked) =>
                      onFormDataChange({ ...formData, isCompounding: checked })
                    }
                  />
                </div>
              </>
            )}

            {/* Fixed amount field (shown when NOT interest-based) */}
            {!formData.isInterestBased && (
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
            )}

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
                placeholder={formData.isInterestBased ? 'e.g. HYSA Interest' : 'e.g. Paycheck'}
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
