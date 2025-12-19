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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Asset } from '@/lib/api';
import { Calendar, DollarSign, History, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from './constants';

interface AccountsTableProps {
  assets: Asset[];
  loading: boolean;
  onAddAccount: () => void;
  onEditAccount: (asset: Asset) => void;
  onUpdateBalance: (asset: Asset) => void;
  onBulkUpdateBalance: (asset: Asset) => void;
  onViewHistory: (asset: Asset) => void;
  onDeleteAccount: (asset: Asset) => void;
}

export function AccountsTable({
  assets,
  loading,
  onAddAccount,
  onEditAccount,
  onUpdateBalance,
  onBulkUpdateBalance,
  onViewHistory,
  onDeleteAccount,
}: AccountsTableProps) {
  return (
    <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Accounts</CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage your assets and liabilities
            </CardDescription>
          </div>
          <Button
            onClick={onAddAccount}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading accounts...</div>
        ) : assets.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No accounts found.</p>
            <p className="mt-2 text-sm">Click "Add Account" to start tracking your net worth.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[700px] text-foreground">
              <TableHeader className="[&_tr]:border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="text-muted-foreground">Account</TableHead>
                  <TableHead className="text-muted-foreground">Category</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-right text-muted-foreground">Balance</TableHead>
                  <TableHead className="text-muted-foreground">Last Updated</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id} className="border-border/60 hover:bg-card/80">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: asset.color || '#4ECDC4' }}
                        />
                        {asset.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="border-border/60 bg-card/70 text-foreground"
                      >
                        {asset.assetCategoryName || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          asset.isLiability
                            ? 'border-destructive/60 bg-destructive/10 text-destructive'
                            : 'border-success/60 bg-success/10 text-success-foreground'
                        }
                      >
                        {asset.isLiability ? 'Liability' : 'Asset'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {asset.currentBalance !== undefined
                        ? formatCurrency(asset.currentBalance)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.lastUpdated ? formatDate(asset.lastUpdated) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground hover:bg-card/70"
                          onClick={() => onUpdateBalance(asset)}
                          title="Update Balance"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground hover:bg-card/70"
                          onClick={() => onBulkUpdateBalance(asset)}
                          title="Bulk Update Balances"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground hover:bg-card/70"
                          onClick={() => onViewHistory(asset)}
                          title="View Balance History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground hover:bg-card/70"
                          onClick={() => onEditAccount(asset)}
                          title="Edit Account"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              title="Delete Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-border/60 bg-card text-foreground">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Account</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Are you sure you want to delete "{asset.name}"? This will also
                                delete all balance history for this account. This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border/60 bg-card/80 text-foreground hover:bg-card/70">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteAccount(asset)}
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
  );
}
