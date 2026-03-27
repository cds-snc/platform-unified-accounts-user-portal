---
description: 'Next.js + Tailwind development standards and instructions'
applyTo: '**/*.tsx, **/*.css, **/*.scss'
---

## Tailwind CSS Class Ordering

This project uses `prettier-plugin-tailwindcss` for Tailwind class ordering. Prettier, not ESLint, is the source of truth for class sorting.

## Tailwind CSS Configuration

This project uses Tailwind CSS v4 in CSS-first mode. Theme customization and source registration live in `styles/app.css` using `@theme`, `@custom-variant`, and `@source` directives.

### Recommended Workflow
1. **Auto-fix on save**: Configure your editor to run ESLint fix on save
2. **Pre-commit checks**: Run `pnpm lint` before committing
3. **Class sorting**: Run Prettier or format-on-save to normalize Tailwind class order
4. **Theme changes**: Add or update Tailwind theme tokens in `styles/app.css`, not a JS Tailwind config file

### Example
```tsx
// Prettier will reorder Tailwind classes automatically
<div className="text-white p-4 bg-blue-500 hover:bg-blue-600 rounded-lg">

// After formatting
<div className="rounded-lg bg-blue-500 p-4 text-white hover:bg-blue-600">
```

### Custom Classes (gc-* prefix)
This project uses custom `gc-*` class prefixes for GC Design System components. These are whitelisted in the ESLint config and won't trigger errors:
```tsx
// ✅ GOOD - Custom gc- classes are allowed
<div className="gc-button gc-button--primary">
```

## GC Design System (GCDS) Tokens

This project uses design tokens from [@gcds-core/tokens](https://github.com/cds-snc/gcds-tokens) integrated into the Tailwind theme defined in [styles/app.css](styles/app.css). These tokens ensure consistency with the Government of Canada Design System.

GCDS tokens are imported in [styles/app.css](styles/app.css):
```css
@import "@gcds-core/tokens/build/web/css/tokens.css";
@import "@gcds-core/tokens/build/web/css/global.css";
```

### Available Token Namespaces

The GCDS tokens are available under the `gcds` namespace in Tailwind:

#### Colors
- `gcds-grayscale-{50-900}` - Grayscale colors (50, 100, 150...900 in steps of 50)
- `gcds-blue-{50-900}` - Blue colors including `gcds-blue-muted` and `gcds-blue-vivid`
- `gcds-green-{50-900}` - Green colors
- `gcds-red-{50-900}` - Red colors
- `gcds-purple-{50-900}` - Purple colors
- `gcds-yellow-{50-900}` - Yellow colors

#### Spacing
GCDS spacing tokens are integrated into Tailwind's spacing scale and can be used with margin, padding, gap, etc.

### Usage Examples

```tsx
// ✅ GOOD - Using GCDS color tokens
<div className="bg-gcds-blue-900 text-gcds-grayscale-50">
  <p className="text-gcds-grayscale-700">Content with GCDS colors</p>
</div>

// ✅ GOOD - GCDS spacing in utility classes
<div className="p-400 m-200"> {/* Using GCDS spacing tokens */}
  Content
</div>
```

### Design System Reference
For more information about GCDS colors and design guidelines, see: [https://design-system.alpha.canada.ca/en/styles/colour/](https://design-system.alpha.canada.ca/en/styles/colour/)
