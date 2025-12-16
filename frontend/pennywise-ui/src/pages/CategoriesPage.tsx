import { AppLayout } from "@/components/AppLayout";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@/lib/api";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

const DEFAULT_COLOR = "#10b981";
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
    name: "",
    description: "",
    color: DEFAULT_COLOR,
  });

  const resetForm = () => {
    setFormValues({
      name: "",
      description: "",
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
      description: category.description || "",
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
      setValidationError("Name is required.");
      return;
    }

    if (!COLOR_PATTERN.test(trimmedColor)) {
      setValidationError("Color must be a valid hex code like #16a34a.");
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
          title: "Category updated",
          description: `${trimmedName} was updated successfully.`,
        });
      } else {
        await createCategory({
          name: trimmedName,
          description: formValues.description || undefined,
          color: trimmedColor,
        });
        toast({
          title: "Category created",
          description: `${trimmedName} is ready to use.`,
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description:
          err instanceof Error
            ? err.message
            : "Unable to save category right now.",
      });
    }
  };

  const handleDelete = async (category: Category) => {
    try {
      await deleteCategory(category.id);
      toast({
        title: "Category deleted",
        description: `${category.name} has been removed.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          err instanceof Error
            ? err.message
            : "Unable to delete the category right now.",
      });
    }
  };

  return (
    <AppLayout
      title="Categories"
      description="Create, edit, and manage expense categories"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Summary Cards and Add Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm shadow-black/10">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-semibold text-foreground">
                {categories.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm shadow-black/10">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-xl font-semibold text-foreground">
                {isLoading ? "Loading..." : isSaving ? "Saving..." : "Ready"}
              </p>
            </div>
            {error && (
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add category
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border/60 bg-card text-foreground">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {activeCategory ? "Edit category" : "Add category"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {activeCategory
                      ? "Update this category to keep your expenses organized."
                      : "Create a category with a clear name and color for quick recognition."}
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
                        setFormValues((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
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
                          setFormValues((prev) => ({
                            ...prev,
                            color: event.target.value,
                          }))
                        }
                        className="h-10 w-16 cursor-pointer border-border/60 bg-card"
                        required
                      />
                      <Input
                        value={formValues.color}
                        onChange={(event) =>
                          setFormValues((prev) => ({
                            ...prev,
                            color: event.target.value,
                          }))
                        }
                        pattern={COLOR_PATTERN.source}
                        className="flex-1 border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                        placeholder="#10b981"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pick a color that will show up alongside expenses in this
                      category.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-muted-foreground"
                    >
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={formValues.description}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                      placeholder="Add context or guidelines"
                    />
                  </div>

                  {validationError ? (
                    <p className="text-sm text-destructive">
                      {validationError}
                    </p>
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? "Saving..."
                      : activeCategory
                      ? "Update category"
                      : "Create category"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90"
                onClick={startCreate}
              >
                <Plus className="mr-2 h-4 w-4" />
                New category
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No categories yet.</p>
                <p className="mt-2 text-sm">
                  Create your first category to organize expenses.
                </p>
              </div>
            ) : (
              <Table className="text-foreground">
                <TableHeader className="[&_tr]:border-border/60">
                  <TableRow className="border-border/60">
                    <TableHead className="text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Description
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Color
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Updated
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Actions
                    </TableHead>
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
                        {category.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span
                            className="h-6 w-6 rounded-full border border-border/60"
                            style={{
                              backgroundColor: category.color || DEFAULT_COLOR,
                            }}
                            aria-label="Category color"
                          />
                          <Badge
                            variant="secondary"
                            className="border-border/60 bg-card/70 text-foreground"
                            style={
                              category.color
                                ? {
                                    backgroundColor: category.color + "22",
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
                        {new Date(
                          category.updatedAt || category.createdAt
                        ).toLocaleDateString()}
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
                                <AlertDialogTitle>
                                  Delete category
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  This will remove the category from your
                                  workspace. Expenses previously using it will
                                  lose the association.
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
                                  {deletingId === category.id
                                    ? "Deleting..."
                                    : "Delete"}
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
    </AppLayout>
  );
}
