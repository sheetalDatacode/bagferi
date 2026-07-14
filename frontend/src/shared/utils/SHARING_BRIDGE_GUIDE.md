# Sharing & Flutter Bridge Documentation

This document outlines the implementation and usage of the **Cross-Platform Sharing Utility** and the **Flutter JavaScript Bridge** used in the Dealing India application.

## 1. Overview

The sharing system is designed to provide a seamless experience across all platforms:
- **Mobile App (Flutter):** Uses native system share sheets via a JavaScript bridge.
- **Modern Browsers:** Uses the `navigator.share` API (Web Share API).
- **Legacy Browsers/Desktop:** Automatically falls back to copying the link to the clipboard.

## 2. The Flutter Bridge (`flutterBridge.js`)

The `flutterBridge.js` utility acts as the communication layer between the React frontend and the Flutter mobile app. It detects if the app is running inside a `flutter_inappwebview` and calls registered handlers.

### Key Functions

- **`isFlutterApp()`**: Returns `true` if the app is running inside the Flutter container.
- **`shareContentOnFlutter(data)`**: Triggers the `shareContent` handler in Flutter.
- **`openFlutterCamera()`**: Triggers the `openCamera` handler in Flutter (returns Base64 image).
- **`openFlutterGallery()`**: Triggers the `openGallery` handler in Flutter (returns Base64 image).

## 3. The Sharing Utility (`share.js`)

The `handleShare` function is the primary entry point for sharing content. It handles the priority logic and fallbacks automatically.

### Usage

```javascript
import { handleShare } from '@/shared/utils/share';

const onShareClick = () => {
  handleShare({
    title: 'Check out this Property',
    text: 'Found an amazing deal on Dealing India!',
    url: 'https://dealingindia.com/property/123'
  });
};
```

### Logic Flow

1. **Check for Flutter:** If `isFlutterApp()` is true, it attempts to use `shareContentOnFlutter`.
2. **Web Share API:** If not in Flutter (or if bridge fails), it attempts to use `navigator.share`.
3. **Clipboard Fallback:** If both fail (e.g., on Desktop Chrome/Firefox), it copies the URL to the clipboard and shows a toast notification.

## 4. Implementation Details

### Sharing Logic
```javascript
export const handleShare = async ({ title, text, url }) => {
  // 1. Try Flutter Native Bridge first
  if (isFlutterApp()) {
    const success = await shareContentOnFlutter({ title, text, url });
    if (success) return; 
  }

  // 2. Try Web Share API (Mobile Browsers)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }

  // 3. Desktop Fallback (Copy Link)
  await copyToClipboard(url);
  toast.success('Link copied to clipboard');
};
```

## 5. Flutter Side Requirements

For the bridge to work, the Flutter app must have the following handlers registered in the `InAppWebView` controller:

1. `shareContent`: Should take a map with `title`, `text`, and `url` and invoke the `share` plugin.
2. `openCamera`: Should open the camera and return a map: `{ success: true, base64: "...", mimeType: "image/jpeg" }`.
3. `openGallery`: Should open the gallery and return a map: `{ success: true, base64: "...", mimeType: "image/jpeg" }`.

---

**Note:** Always ensure the `url` provided is a full absolute URL (e.g., `https://dealingindia.com/...`) for maximum compatibility across platforms.
