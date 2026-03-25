/**
 * Frame rate throttling utility for performance optimization
 * Limits MediaPipe processing to target FPS to reduce CPU usage
 */

/**
 * Simple frame throttler that limits processing to a target FPS
 */
export class FrameThrottler {
  private lastFrameTime: number = 0
  private targetFPS: number
  private frameInterval: number

  constructor(targetFPS: number = 20) {
    this.targetFPS = targetFPS
    this.frameInterval = 1000 / targetFPS
  }

  /**
   * Check if a new frame should be processed based on elapsed time
   * @returns true if the frame should be processed, false otherwise
   */
  shouldProcess(): boolean {
    const now = performance.now()
    const elapsed = now - this.lastFrameTime

    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = now - (elapsed % this.frameInterval)
      return true
    }

    return false
  }

  /**
   * Update the target FPS
   * @param fps - New target FPS
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps
    this.frameInterval = 1000 / fps
  }

  /**
   * Get the current target FPS
   */
  getTargetFPS(): number {
    return this.targetFPS
  }

  /**
   * Reset the throttler state
   */
  reset(): void {
    this.lastFrameTime = 0
  }
}

/**
 * Adaptive frame rate controller that adjusts FPS based on performance
 * Increases FPS when processing is fast, decreases when slow
 */
export class AdaptiveFrameController {
  private throttler: FrameThrottler
  private currentFPS: number
  private frameTimes: number[] = []
  private lastAdjustment: number = 0
  private minFPS: number
  private maxFPS: number

  constructor(initialFPS: number = 20, minFPS: number = 15, maxFPS: number = 30) {
    this.throttler = new FrameThrottler(initialFPS)
    this.currentFPS = initialFPS
    this.minFPS = minFPS
    this.maxFPS = maxFPS
  }

  /**
   * Check if a new frame should be processed
   * @returns true if the frame should be processed
   */
  shouldProcess(): boolean {
    return this.throttler.shouldProcess()
  }

  /**
   * Record the time taken to process a frame
   * Used for adaptive FPS adjustments
   * @param duration - Processing time in milliseconds
   */
  recordFrameTime(duration: number): void {
    this.frameTimes.push(duration)
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift()
    }

    const now = performance.now()
    if (now - this.lastAdjustment > 2000) {
      this.adjustFrameRate()
      this.lastAdjustment = now
    }
  }

  /**
   * Adjust FPS based on recent frame processing times
   */
  private adjustFrameRate(): void {
    if (this.frameTimes.length < 10) return

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length

    if (avgFrameTime > 50 && this.currentFPS > this.minFPS) {
      // Processing is slow, reduce FPS
      this.currentFPS = Math.max(this.minFPS, this.currentFPS - 5)
      this.throttler.setTargetFPS(this.currentFPS)
    } else if (avgFrameTime < 20 && this.currentFPS < this.maxFPS) {
      // Processing is fast, can increase FPS
      this.currentFPS = Math.min(this.maxFPS, this.currentFPS + 5)
      this.throttler.setTargetFPS(this.currentFPS)
    }
  }

  /**
   * Get the current FPS setting
   */
  getCurrentFPS(): number {
    return this.currentFPS
  }

  /**
   * Get the average frame processing time
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
  }

  /**
   * Update the target FPS
   * @param fps - New target FPS
   */
  setTargetFPS(fps: number): void {
    this.throttler.setTargetFPS(fps)
    this.currentFPS = fps
  }

  /**
   * Reset the controller state
   */
  reset(): void {
    this.throttler.reset()
    this.frameTimes = []
    this.currentFPS = this.throttler.getTargetFPS()
  }
}

/**
 * Create a throttled version of a callback function
 * @param callback - Function to throttle
 * @param fps - Target FPS
 * @returns Throttled function
 */
export function createThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  fps: number = 20
): T {
  const throttler = new FrameThrottler(fps)

  return ((...args: Parameters<T>) => {
    if (throttler.shouldProcess()) {
      callback(...args)
    }
  }) as T
}
