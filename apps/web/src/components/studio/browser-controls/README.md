# Browser Navigation Controls for Studio Preview

This document explains the browser-like navigation system implemented for the Studio preview.

## Overview

The preview now behaves like a real browser with the following features:
- **Navigation controls**: Back, forward, refresh, and home buttons
- **Address bar**: Shows current page URL and allows direct navigation
- **Internal navigation only**: Users can navigate between pages within the website being edited, but cannot leave the site
- **Link interception**: All link clicks are intercepted and handled internally
- **Navigation history**: Full browser-style history with back/forward support
- **Keyboard shortcuts**: Standard browser shortcuts (Alt+←, Alt+→, Ctrl+R, etc.)

## Components

### BrowserToolbar

Visual toolbar with navigation controls and address bar.

**Features:**
- Back/Forward buttons (disabled when not applicable)
- Refresh button (with loading animation)
- Home button (navigates to `/`)
- Address bar with URL input (press Enter to navigate)
- Loading indicator
- Keyboard shortcuts display in tooltips

### useNavigation Hook

Manages navigation state and history.

**Features:**
- Navigation history stack
- URL normalization (ensures all URLs are relative to the site)
- External URL blocking
- Keyboard shortcut handling
- Loading states

**Methods:**
- `navigate(url)`: Navigate to a new page
- `goBack()`: Go back in history
- `goForward()`: Go forward in history
- `refresh()`: Reload current page
- `goHome()`: Navigate to home page

### usePreviewLinkInterceptor Hook

Intercepts link clicks in the preview iframe and handles them internally.

**Features:**
- Prevents external navigation
- Handles internal links
- Supports anchor links (smooth scroll to elements)
- Blocks external links with console warning

### BrowserPreview Component

Complete preview system with device frames and browser controls.

**Props:**
- `websiteSlug`: Slug of the website being edited (required)
- `initialPage`: Initial page to load (default: `/`)
- `onPageChange`: Callback when page changes
- `defaultDevice`: Initial device type (default: `desktop`)
- `defaultZoom`: Initial zoom level (default: `1`)

## Usage Example

```tsx
import { BrowserPreview } from '@/components/studio/device-preview'
import PreviewFrame from '@/components/studio/studio-page/components/preview-frame'

function StudioPreview() {
  const [currentPage, setCurrentPage] = useState('/')

  return (
    <BrowserPreview
      websiteSlug="my-website"
      initialPage={currentPage}
      onPageChange={setCurrentPage}
      defaultDevice="desktop"
      defaultZoom={1}
    >
      <PreviewFrame
        websiteId="123"
        elements={elements}
        pageId={currentPage}
        previewTheme="light"
      />
    </BrowserPreview>
  )
}
```

## Navigation Flow

1. User clicks a link in the preview
2. `usePreviewLinkInterceptor` intercepts the click
3. URL is validated (internal vs external)
4. If internal: `navigation.navigate(url)` is called
5. URL is normalized and added to history
6. `onPageChange` callback is triggered
7. Preview re-renders with new page content

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + ←` | Go back |
| `Alt + →` | Go forward |
| `Ctrl/Cmd + R` | Refresh page |
| `Alt + Home` | Go to home page |

## URL Normalization

All URLs are automatically normalized:
- Protocol and domain are removed: `https://example.com/about` → `/about`
- Trailing slashes are removed (except root): `/about/` → `/about`
- URLs always start with `/`: `about` → `/about`

## External Link Blocking

External links are automatically blocked to prevent users from leaving the site:
- External links: `https://google.com` (blocked)
- Internal links: `/about`, `/contact` (allowed)
- Anchor links: `#section` (allowed, triggers smooth scroll)

## Implementation Notes

### For Multi-Page Websites

The preview system supports multi-page navigation. To implement:

1. Pass the current page to the PreviewFrame via `pageId` or `currentUrl` prop
2. Update your data fetching to load content for the current page
3. Handle the `onPageChange` callback to update application state

### For Single-Page Websites

For single-page websites with sections:
- Navigation can be used to scroll to different sections
- Use anchor links (`#section-id`)
- The link interceptor will handle smooth scrolling

### Storage & Persistence

Navigation state is NOT persisted across page reloads by design. This ensures:
- Users always start from the home page
- No confusion from returning to arbitrary pages
- Fresh state for each editing session

Device selection and zoom level ARE persisted to localStorage.

## Future Enhancements

Potential future improvements:
- Session storage for navigation history (persist across hot reloads)
- Page load progress indicator
- Bookmark/favorite pages
- Recently viewed pages
- Navigation breadcrumbs
- Page title in browser toolbar
- Tab system (multiple pages open)
