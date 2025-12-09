import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '@/hooks/use-categories';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Palette, Plus, Pencil, Trash2, Home, TrendingDown, ArrowLeft, RefreshCw, BarChart3 } from 'lucide-react';
import type { Category } from '@/lib/api';

const DEFAULT_COLOR = '#10b981';
const COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

export default function CategoriesPage() {
  const {
    categories,
    isLoading,
    isSaving,
    deletingId,
    error,
    refresh,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLOR,
  });

  const resetForm = () => {
    setFormValues({
      name: '',
      description: '',
      color: DEFAULT_COLOR,
    });
    setActiveCategory(null);
    setValidationError(null);
  };

  const startCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const startEdit = (category: Category) => {
    setFormValues({
      name: category.name,
      description: category.description || '',
      color: category.color || DEFAULT_COLOR,
    });
    setActiveCategory(category);
    setValidationError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = formValues.name.trim();
    const trimmedColor = formValues.color.trim();

    if (!trimmedName) {
      setValidationError('Name is required.');
      return;
    }

    if (!COLOR_PATTERN.test(trimmedColor)) {
      setValidationError('Color must be a valid hex code like #16a34a.');
      return;
    }

    try {
      if (activeCategory) {
        await updateCategory(activeCategory.id, {
          name: trimmedName,
          description: formValues.description || undefined,
          color: trimmedColor,
        });
        toast({
          title: 'Category updated',
          description: `${trimmedName} was updated successfully.`,
        });
      } else {
        await createCategory({
          name: trimmedName,
          description: formValues.description || undefined,
          color: trimmedColor,
        });
        toast({
          title: 'Category created',
          description: `${trimmedName} is ready to use.`,
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description:
          err instanceof Error ? err.message : 'Unable to save category right now.',
      });
    }
  };

  const handleDelete = async (category: Category) => {
    try {
      await deleteCategory(category.id);
      toast({
        title: 'Category deleted',
        description: `${category.name} has been removed.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          err instanceof Error ? err.message : 'Unable to delete the category right now.',
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="ghost"
                size="icon"
                className="border border-border/60 text-foreground hover:bg-card/70"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <Palette className="h-5 w-5 text-emerald-200" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Pennywise
                </p>
                <p className="text-lg font-semibold text-foreground">Category manager</p>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-card/70">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-card/70">
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/expenses">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-card/70">
                <TrendingDown className="mr-2 h-4 w-4" />
                Expenses
              </Button>
            </Link>
            <ThemeToggle />
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 text-primary-foreground shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 hover:bg-emerald-400">
                  <Plus className="mr-2 h-4 w-4" />
                  Add category
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border/60 bg-card text-foreground">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{activeCategory ? 'Edit category' : 'Add category'}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {activeCategory
                        ? 'Update this category to keep your expenses organized.'
                        : 'Create a category with a clear name and color for quick recognition.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-muted-foreground">
                        Name *
                      </Label>
                      <Input
                        id="name"
                        value={formValues.name}
                        onChange={(event) =>
                          setFormValues((prev) => ({ ...prev, name: event.target.value }))
                        }
                        required
                        className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                        placeholder="e.g., Groceries"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color" className="text-muted-foreground">
                        Color *
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="color"
                          type="color"
                          value={formValues.color}
                          onChange={(event) =>
                            setFormValues((prev) => ({ ...prev, color: event.target.value }))
                          }
                          className="h-10 w-16 cursor-pointer border-border/60 bg-card"
                          required
                        />
                        <Input
                          value={formValues.color}
                          onChange={(event) =>
                            setFormValues((prev) => ({ ...prev, color: event.target.value }))
                          }
                          pattern={COLOR_PATTERN.source}
                          className="flex-1 border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                          placeholder="#10b981"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Pick a color that will show up alongside expenses in this category.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-muted-foreground">
                        Description
                      </Label>
                      <Input
                        id="description"
                        value={formValues.description}
                        onChange={(event) =>
                          setFormValues((prev) => ({ ...prev, description: event.target.value }))
                        }
                        className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                        placeholder="Add context or guidelines"
                      />
                    </div>

                    {validationError ? (
                      <p className="text-sm text-destructive">{validationError}</p>
                    ) : null}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-emerald-500 text-primary-foreground hover:bg-emerald-400"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : activeCategory ? 'Update category' : 'Create category'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </nav>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-xl shadow-black/20 backdrop-blur md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Categories</p>
                <h1 className="text-3xl font-semibold md:text-4xl">Keep your spend organized</h1>
                <p className="max-w-2xl text-muted-foreground">
                  Create, edit, or delete categories. Updates appear instantly anywhere you pick a category for an expense.
                </p>
                {error ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/10">
                  <p className="text-xs text-muted-foreground">Categories</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{categories.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/10">
                  <p className="text-xs text-muted-foreground">Saving</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {isSaving ? 'In progress' : 'Idle'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/10">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {isLoading ? 'Loading...' : 'Up to date'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>All categories</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage category names, descriptions, and colors.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                  onClick={() => refresh()}
                  disabled={isLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500 text-primary-foreground shadow-emerald-500/30 hover:bg-emerald-400"
                  onClick={startCreate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading categories...</div>
              ) : categories.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No categories yet.</p>
                  <p className="mt-2 text-sm">Create your first category to organize expenses.</p>
                </div>
              ) : (
                <Table className="text-foreground">
                  <TableHeader className="[&_tr]:border-border/60">
                    <TableRow className="border-border/60">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Description</TableHead>
                      <TableHead className="text-muted-foreground">Color</TableHead>
                      <TableHead className="text-muted-foreground">Updated</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow
                        key={category.id}
                        className="border-border/60 hover:bg-card/80"
                      >
                        <TableCell className="font-semibold text-foreground">
                          {category.name}
                        </TableCell>
                        <TableCell className="max-w-md truncate text-muted-foreground">
                          {category.description || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span
                              className="h-6 w-6 rounded-full border border-border/60"
                              style={{ backgroundColor: category.color || DEFAULT_COLOR }}
                              aria-label="Category color"
                            />
                            <Badge
                              variant="secondary"
                              className="border-border/60 bg-card/70 text-foreground"
                              style={
                                category.color
                                  ? {
                                      backgroundColor: category.color + '22',
                                      color: category.color,
                                      borderColor: category.color,
                                    }
                                  : undefined
                              }
                            >
                              {category.color || DEFAULT_COLOR}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(category.updatedAt || category.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-foreground hover:bg-card/70"
                              onClick={() => startEdit(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="border-border/60 bg-card text-foreground">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete category</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">
                                    This will remove the category from your workspace. Expenses previously using it will lose the association.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-border/60 bg-card/80 text-foreground hover:bg-card/70">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleDelete(category)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={deletingId === category.id}
                                  >
                                    {deletingId === category.id ? 'Deleting...' : 'Delete'}
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
