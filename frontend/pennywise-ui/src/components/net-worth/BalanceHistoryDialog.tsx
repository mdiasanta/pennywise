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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { Asset, AssetSnapshot } from '@/lib/api';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, formatDate } from './constants';

export interface EditingSnapshot {
  id: number;
  balance: string;
  date: string;
  notes: string;
  error?: string;
}

interface BalanceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  snapshots: AssetSnapshot[];
  loading: boolean;
  onUpdateSnapshot: (id: number, balance: number, date: string, notes: string | undefined) => void;
  onDeleteSnapshot: (id: number) => void;
}

export function BalanceHistoryDialog({
  open,
  onOpenChange,
  asset,
  snapshots,
  loading,
  onUpdateSnapshot,
  onDeleteSnapshot,
}: BalanceHistoryDialogProps) {
  const [editingSnapshot, setEditingSnapshot] = useState<EditingSnapshot | null>(null);

  const handleStartEdit = (snapshot: AssetSnapshot) => {
    setEditingSnapshot({
      id: snapshot.id,
      balance: snapshot.balance.toString(),
      date: snapshot.date.split('T')[0],
      notes: snapshot.notes || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingSnapshot(null);
  };

  const handleSaveEdit = () => {
    if (!editingSnapshot) return;

    const balance = parseFloat(editingSnapshot.balance);
    if (isNaN(balance)) {
      setEditingSnapshot({ ...editingSnapshot, error: 'Please enter a valid number' });
      return;
    }

    onUpdateSnapshot(
      editingSnapshot.id,
      balance,
      new Date(editingSnapshot.date).toISOString(),
      editingSnapshot.notes || undefined
    );
    setEditingSnapshot(null);
  };

  const handleEditChange = (field: keyof EditingSnapshot, value: string) => {
    if (!editingSnapshot) return;
    setEditingSnapshot({ ...editingSnapshot, [field]: value, error: undefined });
  };

  // Reset editing state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingSnapshot(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border/60 bg-card text-foreground sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Balance History</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {asset ? `View and manage balance entries for "${asset.name}"` : 'Balance history'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading balance history...</div>
          ) : snapshots.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No balance history found for this account.</p>
              <p className="mt-2 text-sm">Use "Update Balance" to add new balance entries.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[500px] text-foreground">
                <TableHeader className="[&_tr]:border-border/60">
                  <TableRow className="border-border/60">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-right text-muted-foreground">Balance</TableHead>
                    <TableHead className="text-muted-foreground">Notes</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snapshot) => (
                    <TableRow key={snapshot.id} className="border-border/60 hover:bg-card/80">
                      {editingSnapshot?.id === snapshot.id ? (
                        <>
                          <TableCell>
                            <Input
                              type="date"
                              className="w-36 border-border/60 bg-card text-foreground"
                              value={editingSnapshot.date}
                              onChange={(e) => handleEditChange('date', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <Input
                                type="number"
                                step="0.01"
                                className={`w-32 border-border/60 bg-card text-right text-foreground ${editingSnapshot.error ? 'border-destructive' : ''}`}
                                value={editingSnapshot.balance}
                                onChange={(e) => handleEditChange('balance', e.target.value)}
                              />
                              {editingSnapshot.error && (
                                <span className="mt-1 text-xs text-destructive">
                                  {editingSnapshot.error}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Textarea
                              className="min-h-[36px] border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                              value={editingSnapshot.notes}
                              onChange={(e) => handleEditChange('notes', e.target.value)}
                              placeholder="Notes..."
                              rows={1}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-success-foreground hover:bg-success/10"
                                onClick={handleSaveEdit}
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-card/70"
                                onClick={handleCancelEdit}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-foreground">
                            {formatDate(snapshot.date)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatCurrency(snapshot.balance)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {snapshot.notes || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-foreground hover:bg-card/70"
                                onClick={() => handleStartEdit(snapshot)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="border-border/60 bg-card text-foreground">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Balance Entry</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Are you sure you want to delete the balance entry from{' '}
                                      {formatDate(snapshot.date)}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-border/60 bg-card/80 text-foreground hover:bg-card/70">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => onDeleteSnapshot(snapshot.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4">
            <Label className="text-xs text-muted-foreground">
              {snapshots.length} {snapshots.length === 1 ? 'entry' : 'entries'} total
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
            onClick={() => handleOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
