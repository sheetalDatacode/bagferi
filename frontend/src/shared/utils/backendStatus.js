/**
 * Backend Status Tracker
 * Tracks backend availability and prevents duplicate error notifications
 */

class BackendStatusTracker {
  constructor() {
    this.isBackendDown = false;
    this.lastErrorTime = null;
    this.errorNotificationShown = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
  }

  /**
   * Check if backend is down
   */
  getBackendDown() {
    return this.isBackendDown;
  }

  /**
   * Mark backend as down
   */
  markBackendDown() {
    const now = Date.now();
    
    // If backend was already marked as down recently, don't update
    if (this.isBackendDown && this.lastErrorTime && (now - this.lastErrorTime) < 5000) {
      return false; // Already marked as down recently
    }

    this.isBackendDown = true;
    this.lastErrorTime = now;
    this.retryCount = 0;
    return true; // Newly marked as down
  }

  /**
   * Mark backend as up
   */
  markBackendUp() {
    if (this.isBackendDown) {
      this.isBackendDown = false;
      this.errorNotificationShown = false;
      this.retryCount = 0;
      this.retryDelay = 1000;
    }
  }

  /**
   * Check if error notification should be shown
   */
  shouldShowErrorNotification() {
    // If notification already shown and backend is still down, don't show again
    if (this.errorNotificationShown && this.isBackendDown) {
      return false;
    }

    // Show notification if backend is newly down
    if (this.isBackendDown && !this.errorNotificationShown) {
      this.errorNotificationShown = true;
      return true;
    }

    return false;
  }

  /**
   * Reset error notification flag (for retry)
   */
  resetErrorNotification() {
    this.errorNotificationShown = false;
  }

  /**
   * Get retry delay with exponential backoff
   */
  getRetryDelay() {
    const delay = this.retryDelay * Math.pow(2, this.retryCount);
    this.retryCount++;
    return Math.min(delay, 10000); // Max 10 seconds
  }

  /**
   * Check if should retry
   */
  shouldRetry() {
    return this.retryCount < this.maxRetries;
  }

  /**
   * Reset retry state
   */
  resetRetry() {
    this.retryCount = 0;
    this.retryDelay = 1000;
  }
}

// Singleton instance
export const backendStatus = new BackendStatusTracker();

/**
 * Check backend health
 */
export const checkBackendHealth = async (apiBaseURL) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${apiBaseURL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      backendStatus.markBackendUp();
      return true;
    }

    backendStatus.markBackendDown();
    return false;
  } catch (error) {
    backendStatus.markBackendDown();
    return false;
  }
};

