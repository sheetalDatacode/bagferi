/**
 * Utility to communicate with Flutter InAppWebView JavaScript Handlers
 */

/**
 * Calls the Flutter 'openCamera' handler if available.
 * Returns the base64 image data or null if not in Flutter or cancelled.
 */
export const openFlutterCamera = async () => {
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        try {
            // The handler name 'openCamera' must match the Flutter side handler
            const result = await window.flutter_inappwebview.callHandler('openCamera');
            
            if (result && result.success && result.base64) {
                return {
                    data: `data:${result.mimeType || 'image/jpeg'};base64,${result.base64}`,
                    name: result.fileName || `camera_${Date.now()}.jpg`
                };
            }
        } catch (error) {
            console.error('[FlutterBridge] Error calling openCamera:', error);
        }
    }
    return null;
};

/**
 * Calls the Flutter 'openGallery' handler if available.
 * Returns the base64 image data or null if not in Flutter or cancelled.
 */
export const openFlutterGallery = async () => {
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        try {
            // The handler name 'openGallery' must match the Flutter side handler
            const result = await window.flutter_inappwebview.callHandler('openGallery');
            
            if (result && result.success && result.base64) {
                return {
                    data: `data:${result.mimeType || 'image/jpeg'};base64,${result.base64}`,
                    name: result.fileName || `gallery_${Date.now()}.jpg`
                };
            }
        } catch (error) {
            console.error('[FlutterBridge] Error calling openGallery:', error);
        }
    }
    return null;
};

/**
 * Calls the Flutter 'shareContent' handler if available.
 */
export const shareContentOnFlutter = async (shareData) => {
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        try {
            await window.flutter_inappwebview.callHandler('shareContent', shareData);
            return true;
        } catch (error) {
            console.error('[FlutterBridge] Error calling shareContent:', error);
        }
    }
    return false;
};

/**
 * Checks if the application is running inside the Flutter InAppWebView
 */
export const isFlutterApp = () => {
    return !!(window.flutter_inappwebview && window.flutter_inappwebview.callHandler);
};
