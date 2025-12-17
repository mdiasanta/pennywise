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
import { Textarea } from '@/components/ui/textarea';
import type { Asset, AssetCategory } from '@/lib/api';

export interface AssetFormData {
  name: string;
  description: string;
  categoryId: string;
  color: string;
  initialBalance: string;
}

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: AssetFormData;
  onFormDataChange: (data: AssetFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  editingAsset: Asset | null;
  assetCategories: AssetCategory[];
  liabilityCategories: AssetCategory[];
  categoriesLoading: boolean;
}

export function AssetFormDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  editingAsset,
  assetCategories,
  liabilityCategories,
  categoriesLoading,
}: AssetFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/60 bg-card text-foreground">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingAsset
                ? 'Update the account details below.'
                : 'Add a new asset or liability to track.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground">
                Account Name *
              </Label>
              <Input
                id="name"
                className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Chase Checking, Vanguard 401k"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-muted-foreground">
                Category *
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => onFormDataChange({ ...formData, categoryId: value })}
                disabled={categoriesLoading}
              >
                <SelectTrigger className="border-border/60 bg-card text-foreground">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card text-foreground">
                  <SelectItem value="__header_assets__" disabled>
                    -- Assets --
                  </SelectItem>
                  {assetCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__header_liabilities__" disabled>
                    -- Liabilities --
                  </SelectItem>
                  {liabilityCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editingAsset && (
              <div className="space-y-2">
                <Label htmlFor="initialBalance" className="text-muted-foreground">
                  Initial Balance
                </Label>
                <Input
                  id="initialBalance"
                  type="number"
                  step="0.01"
                  className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                  value={formData.initialBalance}
                  onChange={(e) =>
                    onFormDataChange({ ...formData, initialBalance: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description" className="text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                value={formData.description}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                placeholder="Add any notes about this account..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color" className="text-muted-foreground">
                Color
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  className="h-10 w-14 cursor-pointer border-border/60 p-1"
                  value={formData.color}
                  onChange={(e) => onFormDataChange({ ...formData, color: e.target.value })}
                />
                <Input
                  type="text"
                  className="border-border/60 bg-card text-foreground"
                  value={formData.color}
                  onChange={(e) => onFormDataChange({ ...formData, color: e.target.value })}
                  placeholder="#4ECDC4"
                />
              </div>
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
              {editingAsset ? 'Update' : 'Create'} Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
