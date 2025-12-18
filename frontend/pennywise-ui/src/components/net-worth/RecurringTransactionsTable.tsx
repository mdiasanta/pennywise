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
import type { RecurringTransaction } from '@/lib/api';
import { Minus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from './constants';

interface RecurringTransactionsTableProps {
  transactions: RecurringTransaction[];
  loading: boolean;
  onAddRecurring: () => void;
  onToggleActive: (transaction: RecurringTransaction) => void;
  onDelete: (id: number) => void;
}

export function RecurringTransactionsTable({
  transactions,
  loading,
  onAddRecurring,
  onToggleActive,
  onDelete,
}: RecurringTransactionsTableProps) {
  return (
    <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recurring Transactions
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Set up automatic recurring additions like paychecks
            </CardDescription>
          </div>
          <Button
            onClick={onAddRecurring}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Recurring
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading recurring transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No recurring transactions set up.</p>
            <p className="mt-2 text-sm">
              Click "Add Recurring" to automate deposits like paychecks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[800px] text-foreground">
              <TableHeader className="[&_tr]:border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Account</TableHead>
                  <TableHead className="text-muted-foreground">Frequency</TableHead>
                  <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Next Run</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((rt) => (
                  <TableRow key={rt.id} className="border-border/60 hover:bg-card/80">
                    <TableCell className="font-medium text-foreground">{rt.description}</TableCell>
                    <TableCell className="text-foreground">{rt.assetName}</TableCell>
                    <TableCell className="text-foreground">
                      {rt.frequency}
                      {rt.dayOfWeek && ` (${rt.dayOfWeek})`}
                      {rt.dayOfMonth && ` (Day ${rt.dayOfMonth})`}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${rt.amount >= 0 ? 'text-success-foreground' : 'text-destructive'}`}
                    >
                      {rt.amount >= 0 ? '+' : ''}
                      {formatCurrency(rt.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(rt.nextRunDate)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          rt.isActive
                            ? 'border-success/60 bg-success/10 text-success-foreground'
                            : 'border-muted bg-muted/10 text-muted-foreground'
                        }
                      >
                        {rt.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground hover:bg-card/70"
                          onClick={() => onToggleActive(rt)}
                          title={rt.isActive ? 'Pause' : 'Resume'}
                        >
                          {rt.isActive ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-border/60 bg-card text-foreground">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Recurring Transaction</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Are you sure you want to delete "{rt.description}"? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border/60 bg-card/80 text-foreground hover:bg-card/70">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(rt.id)}
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
