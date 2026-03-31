# Sidebar Page Responsive Layout Template

All pages that use the **Sidebar** component should follow this template to ensure proper responsiveness across 13-14 inch laptops and all other screen sizes.

## Standard Sidebar Page Layout

```jsx
import React from 'react';
import Sidebar from '../../components/Sidebar';

const MyPage = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Sidebar - Visible on desktop, hamburger on mobile */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-5 space-y-2 sm:space-y-3 md:space-y-4">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-slate-900">
              Page Title
            </h1>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
              Subtitle
            </p>
          </div>

          {/* Right-side controls - stays on right on all screens */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Buttons, filters, etc. */}
          </div>
        </div>

        {/* Content Area - Ensures proper scrolling and sizing */}
        <div className="min-h-0 flex-1 rounded-lg sm:rounded-2xl md:rounded-4xl border border-slate-200/60 bg-slate-50/50 p-1.5 sm:p-2 md:p-3 lg:p-4 overflow-hidden flex flex-col">
          {/* Your content here */}
        </div>

        {/* Modals/Popups - Use modal-responsive class */}
        {showModal && (
          <div className="modal-responsive" onClick={closeModal}>
            <div className="modal-responsive-content" onClick={(e) => e.stopPropagation()}>
              {/* Modal content */}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPage;
```

## Key Responsive Classes

### Main Container Padding
```jsx
// Adjusts padding based on screen size
px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-5
```

### Title Sizing
```jsx
// Font size dynamically adjusts for screen width
text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl
```

### Gap/Spacing
```jsx
// Gaps between elements
gap-2 md:gap-3 lg:gap-4
space-y-2 sm:space-y-3 md:space-y-4
```

### Content Container
```jsx
// Ensures proper scrolling on small screens
min-h-0 flex-1 overflow-hidden flex flex-col
```

### Modal/Popup Layout
```jsx
// Pre-configured responsive modal
<div className="modal-responsive" onClick={closeModal}>
  <div className="modal-responsive-content" onClick={(e) => e.stopPropagation()}>
    {/* Content auto-scales for all screens */}
  </div>
</div>
```

## Critical Points for 13-14 Inch Screens

### 1. **Prevent Content Wrapping**
Use flex layout with proper gap sizing:
```jsx
<div className="flex items-center justify-between gap-2 md:gap-3">
  {/* Will stack on mobile, row on desktop */}
</div>
```

### 2. **Use `min-w-0` to Allow Shrinking**
```jsx
<main className="flex min-w-0 flex-1 ..."> {/* min-w-0 is important! */}
```

### 3. **Truncate Long Text**
```jsx
<p className="truncate">Very long text that might overflow</p>
<p className="line-clamp-2">Text limited to 2 lines</p>
```

### 4. **Flexible Sizing Over Fixed**
```jsx
// GOOD - Responsive sizing
<div className="max-w-[clamp(280px, 90vw, 800px)]">

// BAD - Fixed width that doesn't scale
<div className="max-w-[800px]">
```

### 5. **Tables Need Horizontal Scroll**
```jsx
<div className="responsive-table-wrapper">
  <table className="w-full">
    {/* Content */}
  </table>
</div>
```

## Sidebar-Specific Considerations

### The Sidebar Takes Space
- **Desktop (md+)**: Sidebar is 250px (expanded) or 80px (collapsed)
- **Mobile**: Hamburger menu, full-width content
- **13-14" screens**: Everything still fits because:
  - Sidebar width is fixed
  - Main content uses `flex-1` to fill remaining space
  - Responsive padding adjusts for tighter constraints

### Make Content Flex-Friendly
Always ensure main content area can shrink:
```jsx
<main className="flex min-w-0 flex-1 ..."> {/* min-w-0 is critical! */}
  <div className="max-w-[clamp(280px, 95vw, 1200px)] mx-auto"> {/* Scales nicely */}
```

## Modal/Popup Best Practices

### Use the `.modal-responsive` Class
```jsx
{showModal && (
  <div className="modal-responsive">
    <div className="modal-responsive-content">
      {/* Modal automatically:
          - Centers on screen
          - Scales for viewport size
          - Respects sidebar (when using fixed positioning)
          - Handles overflow with scrolling
      */}
    </div>
  </div>
)}
```

### For Scrollable Content Inside Modal
```jsx
<div className="modal-responsive-content flex flex-col">
  <div className="flex-shrink-0">
    {/* Header - doesn't scroll */}
  </div>
  <div className="modal-scrollable flex-1 min-h-0">
    {/* Content area - scrolls if needed */}
  </div>
</div>
```

## Common Responsive Patterns

### Header with Title + Controls
```jsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3">
  <div className="min-w-0">
    <h1 className="text-xl sm:text-2xl md:text-3xl truncate">Title</h1>
  </div>
  <div className="flex-shrink-0">
    {/* Controls always visible and not shrunk */}
  </div>
</div>
```

### Responsive Grid
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
  {/* Items auto-layout based on screen size */}
</div>
```

### Responsive Buttons
```jsx
<button className="px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 text-xs sm:text-sm md:text-base">
  Responsive Button
</button>
```

## Testing on Target Screens

### 13-14 Inch Laptop (1200-1440px)
- Viewport width: ~1200-1440px
- Sidebar width: 250px (expanded)
- Available content width: ~950-1190px
- **Test that**: Content fits without horizontal scroll, popups are visible, text is readable

### Small Laptop (1024-1200px)
- Viewport width: ~1024-1200px
- Sidebar width: 200px (adjusted)
- Available content width: ~800-950px
- **Test that**: Grid items stack appropriately, modals fit with padding

### Tablet (768-1024px)
- Viewport width: ~768-1024px
- Sidebar: Hamburger menu, full-width content
- **Test that**: All content fits without horizontal scroll

### Mobile (320-640px)
- Viewport width: ~320-640px
- Sidebar: Hamburger menu overlay
- **Test that**: Text is readable, buttons are touchable (44px min), no horizontal scroll

## Checklist for Sidebar Pages

- [ ] Uses proper template with `h-screen w-screen flex overflow-hidden`
- [ ] Sidebar component included
- [ ] Main area has `flex min-w-0 flex-1 flex-col overflow-hidden`
- [ ] Proper responsive spacing: `px-2 sm:px-3 md:px-4 lg:px-6`
- [ ] Title uses responsive sizing: `text-xl sm:text-2xl md:text-3xl`
- [ ] Modals use `modal-responsive` class
- [ ] Long text is truncated or line-clamped
- [ ] No fixed widths on main containers
- [ ] All modals and popups tested on 13-14" screens
- [ ] Tested on mobile, tablet, laptop, and extra-wide screens

## CSS Utilities Available

See `index.css` for:
- `.responsive-container` - Flexible padding
- `.responsive-table-wrapper` - Scrollable tables
- `.responsive-grid` - Responsive gap grid
- `.modal-responsive` - Full-screen modal
- `.modal-responsive-content` - Modal content box
- `.modal-scrollable` - Scrollable area in modal
- `.text-responsive-lg/md/sm` - Dynamic text sizing
- `.btn-responsive` - Responsive button sizing
- `.hidden-mobile` - Hide on mobile

---

**Updated**: March 31, 2026
**Target Screens**: 13-14" laptops, all laptops (old & new), tablets, mobile phones
