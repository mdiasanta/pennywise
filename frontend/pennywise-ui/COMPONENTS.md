# shadcn/ui Components

This document lists all the shadcn/ui components available in this project.

## Available Components (30)

### Layout Components
- **Card** (`card.tsx`) - Card container with header, content, and footer
- **Separator** (`separator.tsx`) - Visual divider between content
- **Scroll Area** (`scroll-area.tsx`) - Customizable scrollable area
- **Aspect Ratio** (`aspect-ratio.tsx`) - Maintain aspect ratio for responsive content

### Navigation Components
- **Tabs** (`tabs.tsx`) - Tab navigation with content panels
- **Dropdown Menu** (`dropdown-menu.tsx`) - Contextual menu with items, separators, and shortcuts
- **Context Menu** (`context-menu.tsx`) - Right-click context menu
- **Hover Card** (`hover-card.tsx`) - Popover on hover

### Form Components
- **Button** (`button.tsx`) - Multiple variants and sizes
- **Input** (`input.tsx`) - Text input field
- **Textarea** (`textarea.tsx`) - Multi-line text input
- **Checkbox** (`checkbox.tsx`) - Checkbox input with indeterminate state
- **Radio Group** (`radio-group.tsx`) - Radio button group
- **Select** (`select.tsx`) - Custom select dropdown
- **Switch** (`switch.tsx`) - Toggle switch
- **Slider** (`slider.tsx`) - Range slider input
- **Label** (`label.tsx`) - Form label with accessibility

### Feedback Components
- **Alert** (`alert.tsx`) - Alert messages with variants (default, destructive)
- **Alert Dialog** (`alert-dialog.tsx`) - Modal dialog for important alerts
- **Dialog** (`dialog.tsx`) - Modal dialog
- **Tooltip** (`tooltip.tsx`) - Hover tooltip
- **Popover** (`popover.tsx`) - Popover with trigger
- **Progress** (`progress.tsx`) - Progress indicator

### Display Components
- **Avatar** (`avatar.tsx`) - User avatar with image and fallback
- **Badge** (`badge.tsx`) - Small status indicator
- **Table** (`table.tsx`) - Data table with header, body, and footer
- **Skeleton** (`skeleton.tsx`) - Loading placeholder

### Interactive Components
- **Accordion** (`accordion.tsx`) - Collapsible content sections
- **Collapsible** (`collapsible.tsx`) - Simple collapsible container
- **Toggle** (`toggle.tsx`) - Toggle button with variants

## Usage Example

```typescript
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Form</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>
          <Button>Submit</Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Component Variants

### Button Variants
- `default` - Primary button
- `destructive` - Destructive action
- `outline` - Outlined button
- `secondary` - Secondary button
- `ghost` - Ghost button (minimal)
- `link` - Link-styled button

### Button Sizes
- `default` - Standard size
- `sm` - Small
- `lg` - Large
- `icon` - Icon-only button

### Alert Variants
- `default` - Default alert
- `destructive` - Error/destructive alert

### Badge Variants
- `default` - Primary badge
- `secondary` - Secondary badge
- `destructive` - Destructive badge
- `outline` - Outlined badge

### Toggle Variants
- `default` - Default toggle
- `outline` - Outlined toggle

## Dependencies

All components are built on top of:
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **class-variance-authority** - Variant management
- **lucide-react** - Icon library

## Styling

Components use CSS variables for theming. Customize colors in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}
```

## Additional Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Documentation](https://www.radix-ui.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
