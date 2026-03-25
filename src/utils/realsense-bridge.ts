/**
 * RealSense Camera Bridge
 *
 * This utility provides a bridge between Intel RealSense depth cameras
 * and the browser. Since browsers don't directly support RealSense cameras,
 * we use various methods to access the data.
 *
 * Options:
 * 1. Use librealsense2 with node backend (for server-side processing)
 * 2. Use WebUSB to communicate with RealSense directly
 * 3. Fall back to standard webcam (MediaPipe works with standard RGB)
 *
 * For this web application, we primarily use the standard webcam
 * approach since MediaPipe's hand tracking works well with RGB input.
 * The depth data from RealSense would be a nice addition but isn't required
 * for basic hand tracking.
 */

/**
 * Depth frame data structure
 */
export interface DepthFrame {
  /** Raw depth values in meters */
  data: Float32Array
  /** Frame width in pixels */
  width: number
  /** Frame height in pixels */
  height: number
  /** Timestamp of frame capture */
  timestamp: number
}

/**
 * Depth camera configuration
 */
export interface DepthCameraConfig {
  /** Minimum depth range in meters */
  minDepth: number
  /** Maximum depth range in meters */
  maxDepth: number
  /** Depth accuracy (lower is better) */
  accuracy: 'low' | 'medium' | 'high'
  /** Enable temporal filtering */
  enableFiltering: boolean
}

/**
 * Processed depth information for a hand region
 */
export interface HandDepthInfo {
  /** Average depth of the hand in meters */
  averageDepth: number
  /** Minimum depth (closest point) in meters */
  minDepth: number
  /** Maximum depth (farthest point) in meters */
  maxDepth: number
  /** Depth variance (indicates hand curvature) */
  depthVariance: number
  /** Center point of hand in depth map coordinates */
  centerPoint: { x: number; y: number }
  /** Bounding box of hand in depth map coordinates */
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Check if a RealSense camera is available
 */
export async function checkRealSenseAvailable(): Promise<boolean> {
  try {
    // Check via MediaDevices API
    const devices = await navigator.mediaDevices.enumerateDevices()

    // Look for RealSense devices in video inputs
    const hasRealSense = devices.some(device =>
      device.kind === 'videoinput' && (
        device.label.toLowerCase().includes('realsense') ||
        device.label.toLowerCase().includes('intel') ||
        device.label.toLowerCase().includes('depth') ||
        device.label.toLowerCase().includes('rgb-d')
      )
    )

    if (hasRealSense) {
      console.log('RealSense camera detected')
      return true
    }

    // Also check via WebUSB
    if ('usb' in navigator) {
      const usb = (navigator as any).usb
      const devices = await usb.getDevices()
      const hasIntelDevice = devices.some((device: any) =>
        device.manufacturer?.toLowerCase().includes('intel') ||
        device.product?.toLowerCase().includes('realsense')
      )

      if (hasIntelDevice) {
        console.log('Intel USB device detected (may be RealSense)')
        return true
      }
    }

    return false
  } catch (error) {
    console.warn('Error checking for RealSense:', error)
    return false
  }
}

/**
 * Request access to a RealSense camera
 * Falls back to standard webcam if RealSense is not available
 */
export async function getCameraStream(
  preferredWidth: number = 640,
  preferredHeight: number = 480
): Promise<MediaStream> {
  try {
    // Check if RealSense is available
    const hasRealSense = await checkRealSenseAvailable()

    if (hasRealSense) {
      // Try to get RealSense stream
      const devices = await navigator.mediaDevices.enumerateDevices()
      const realSenseDevice = devices.find(device =>
        device.kind === 'videoinput' && (
          device.label.toLowerCase().includes('realsense') ||
          device.label.toLowerCase().includes('intel')
        )
      )

      if (realSenseDevice) {
        console.log('Using RealSense camera:', realSenseDevice.label)
        return await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: realSenseDevice.deviceId,
            width: { ideal: preferredWidth },
            height: { ideal: preferredHeight },
            facingMode: 'user'
          },
          audio: false
        })
      }
    }

    // Fall back to any available webcam
    console.log('Using standard webcam')
    return await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: preferredWidth },
        height: { ideal: preferredHeight },
        facingMode: 'user'
      },
      audio: false
    })
  } catch (error) {
    console.error('Error getting camera stream:', error)
    throw new Error('Could not access camera. Please ensure camera permissions are granted.')
  }
}

/**
 * Get list of available cameras
 */
export async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
  try {
    // First request permission to see device labels
    await navigator.mediaDevices.getUserMedia({ video: true })
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(device => device.kind === 'videoinput')
  } catch (error) {
    console.error('Error getting cameras:', error)
    return []
  }
}

/**
 * Default configuration for depth processing
 */
export const DEFAULT_DEPTH_CONFIG: DepthCameraConfig = {
  minDepth: 0.3,  // 30cm minimum
  maxDepth: 1.5,  // 1.5m maximum
  accuracy: 'medium',
  enableFiltering: true
}

/**
 * Depth frame processor for RealSense data
 * This can be used when a backend service provides depth data
 */
export class DepthFrameProcessor {
  private config: DepthCameraConfig
  private temporalBuffer: DepthFrame[] = []
  private readonly bufferSize = 3

  constructor(config: DepthCameraConfig = DEFAULT_DEPTH_CONFIG) {
    this.config = config
  }

  /**
   * Process a depth frame and extract hand region depth information
   */
  processDepthFrame(frame: DepthFrame, handRegion?: {
    x: number
    y: number
    width: number
    height: number
  }): HandDepthInfo | null {
    const { data, width, height } = frame

    if (!data || data.length === 0) {
      return null
    }

    // Define region of interest (full frame or hand region)
    const startX = handRegion ? Math.floor(handRegion.x * width) : 0
    const startY = handRegion ? Math.floor(handRegion.y * height) : 0
    const endX = handRegion ? Math.floor((handRegion.x + handRegion.width) * width) : width
    const endY = handRegion ? Math.floor((handRegion.y + handRegion.height) * height) : height

    // Extract depth values in region
    const depths: number[] = []
    let minDepth = Infinity
    let maxDepth = -Infinity
    let sumDepth = 0
    let count = 0

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = y * width + x
        const depth = data[idx]

        // Filter valid depth values
        if (depth > this.config.minDepth && depth < this.config.maxDepth) {
          depths.push(depth)
          minDepth = Math.min(minDepth, depth)
          maxDepth = Math.max(maxDepth, depth)
          sumDepth += depth
          count++
        }
      }
    }

    if (count === 0) {
      return null
    }

    const averageDepth = sumDepth / count

    // Calculate variance
    let varianceSum = 0
    for (const depth of depths) {
      varianceSum += Math.pow(depth - averageDepth, 2)
    }
    const depthVariance = varianceSum / count

    // Calculate center point
    const centerX = (startX + endX) / 2 / width
    const centerY = (startY + endY) / 2 / height

    return {
      averageDepth,
      minDepth,
      maxDepth,
      depthVariance,
      centerPoint: { x: centerX, y: centerY },
      boundingBox: {
        x: startX / width,
        y: startY / height,
        width: (endX - startX) / width,
        height: (endY - startY) / height
      }
    }
  }

  /**
   * Apply temporal filtering to depth frames for stability
   */
  filterDepth(frame: DepthFrame): DepthFrame {
    if (!this.config.enableFiltering) {
      return frame
    }

    this.temporalBuffer.push(frame)
    if (this.temporalBuffer.length > this.bufferSize) {
      this.temporalBuffer.shift()
    }

    if (this.temporalBuffer.length < 2) {
      return frame
    }

    // Average depth values across frames
    const filteredData = new Float32Array(frame.data.length)
    const { data, width, height } = frame

    for (let i = 0; i < data.length; i++) {
      let sum = 0
      let validCount = 0

      for (const bufferedFrame of this.temporalBuffer) {
        const value = bufferedFrame.data[i]
        if (value > this.config.minDepth && value < this.config.maxDepth) {
          sum += value
          validCount++
        }
      }

      filteredData[i] = validCount > 0 ? sum / validCount : data[i]
    }

    return {
      data: filteredData,
      width,
      height,
      timestamp: frame.timestamp
    }
  }

  /**
   * Clear temporal buffer
   */
  clearBuffer(): void {
    this.temporalBuffer = []
  }
}

/**
 * For future implementation: Process depth data from RealSense
 * This would require a backend service running librealsense2
 *
 * When RealSense hardware is available, set up a WebSocket connection
 * to a backend that runs librealsense2 and streams depth data.
 */
export async function getDepthFrame(_stream: MediaStream): Promise<DepthFrame | null> {
  // This is a placeholder for when RealSense is connected via backend
  //
  // To implement:
  // 1. Set up a Node.js backend with @realsense/sdk
  // 2. Establish WebSocket connection from frontend
  // 3. Stream depth frames from backend to frontend
  // 4. Parse and return as DepthFrame
  //
  // Example backend code:
  //   const rs2 = require('@realsense/sdk')
  //   const pipeline = new rs2.Pipeline()
  //   pipeline.start()
  //   const frames = pipeline.waitForFrames()
  //   const depth = frames.depthFrame
  //   // Send via WebSocket...

  console.log('Depth frame processing requires RealSense backend connection')
  return null
}

/**
 * Create a depth visualization canvas overlay
 * Useful for debugging depth data
 */
export function createDepthVisualization(
  depthFrame: DepthFrame,
  canvas: HTMLCanvasElement,
  colormap: 'grayscale' | 'rainbow' | 'jet' = 'rainbow'
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { data, width, height } = depthFrame

  // Set canvas size
  canvas.width = width
  canvas.height = height

  const imageData = ctx.createImageData(width, height)

  // Find min/max for normalization
  let minDepth = Infinity
  let maxDepth = -Infinity

  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0 && data[i] < 10) { // Valid range
      minDepth = Math.min(minDepth, data[i])
      maxDepth = Math.max(maxDepth, data[i])
    }
  }

  // Normalize and colorize
  for (let i = 0; i < data.length; i++) {
    const depth = data[i]
    const pixelIndex = i * 4

    if (depth > 0 && depth < 10) {
      const normalized = (depth - minDepth) / (maxDepth - minDepth)
      const color = getDepthColor(normalized, colormap)

      imageData.data[pixelIndex] = color.r
      imageData.data[pixelIndex + 1] = color.g
      imageData.data[pixelIndex + 2] = color.b
      imageData.data[pixelIndex + 3] = 255
    } else {
      // Invalid depth - black
      imageData.data[pixelIndex] = 0
      imageData.data[pixelIndex + 1] = 0
      imageData.data[pixelIndex + 2] = 0
      imageData.data[pixelIndex + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Get color for depth visualization
 */
function getDepthColor(
  normalizedDepth: number,
  colormap: 'grayscale' | 'rainbow' | 'jet'
): { r: number; g: number; b: number } {
  const value = Math.max(0, Math.min(1, normalizedDepth))

  switch (colormap) {
    case 'grayscale':
      const gray = Math.floor(value * 255)
      return { r: gray, g: gray, b: gray }

    case 'rainbow':
      // HSV to RGB conversion for rainbow effect
      const hue = (1 - value) * 240 // Blue (far) to Red (near)
      return hsvToRgb(hue, 1, 1)

    case 'jet':
      // Jet colormap (blue-cyan-yellow-red)
      if (value < 0.125) return { r: 0, g: 0, b: Math.floor(value / 0.125 * 128) + 127 }
      if (value < 0.375) return { r: 0, g: Math.floor((value - 0.125) / 0.25 * 255), b: 255 }
      if (value < 0.625) return { r: Math.floor((value - 0.375) / 0.25 * 255), g: 255, b: Math.floor((0.625 - value) / 0.25 * 255) }
      if (value < 0.875) return { r: 255, g: Math.floor((0.875 - value) / 0.25 * 255), b: 0 }
      return { r: Math.floor((1 - value) / 0.125 * 255) + 127, g: 0, b: 0 }

    default:
      return { r: 255, g: 255, b: 255 }
  }
}

/**
 * HSV to RGB conversion
 */
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c

  let r = 0, g = 0, b = 0

  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return {
    r: Math.floor((r + m) * 255),
    g: Math.floor((g + m) * 255),
    b: Math.floor((b + m) * 255)
  }
}

/**
 * Convert RealSense depth data to useful information
 */
export function processDepthData(depth: Float32Array, width: number, height: number) {
  // Calculate hand distance from camera
  const centerIndex = Math.floor((width / 2) + (height / 2) * width)
  const distance = depth[centerIndex]

  return {
    distance: distance, // in meters
    isValid: distance > 0 && distance < 5 // valid range: 0-5 meters
  }
}

/**
 * Utility for detecting if hand is in optimal position
 * (would use depth data for better accuracy)
 */
export function isHandOptimalPosition(
  landmarks: { x: number; y: number }[],
  width: number,
  height: number,
  depthInfo?: HandDepthInfo
): { isValid: boolean; reason?: string } {
  // Check if hand is centered
  const handCenterX = landmarks.reduce((sum, l) => sum + l.x, 0) / landmarks.length
  const handCenterY = landmarks.reduce((sum, l) => sum + l.y, 0) / landmarks.length

  const normalizedX = handCenterX * width
  const normalizedY = handCenterY * height

  const centerX = width / 2
  const centerY = height / 2
  const tolerance = width / 4

  if (Math.abs(normalizedX - centerX) > tolerance) {
    return { isValid: false, reason: 'Move your hand to center' }
  }

  if (Math.abs(normalizedY - centerY) > tolerance) {
    return { isValid: false, reason: 'Adjust your hand position' }
  }

  // Check depth if available
  if (depthInfo) {
    const { averageDepth, minDepth, maxDepth } = depthInfo

    // Check if hand is within optimal depth range
    if (averageDepth < 0.3) {
      return { isValid: false, reason: 'Move your hand farther away' }
    }
    if (averageDepth > 1.5) {
      return { isValid: false, reason: 'Move your hand closer' }
    }

    // Check if depth variance is reasonable (hand should be somewhat flat or clearly curved)
    if (maxDepth - minDepth > 0.3) {
      return { isValid: false, reason: 'Keep your hand facing the camera' }
    }
  }

  return { isValid: true }
}

/**
 * Estimate if MediaPipe z-coordinates can be used as pseudo-depth
 * This helps determine if depth-based features will work without RealSense
 */
export function hasPseudoDepthSupport(landmarks: { z?: number }[]): boolean {
  if (!landmarks || landmarks.length === 0) return false

  // Check if z-values are present and vary
  const zValues = landmarks.map(l => l.z || 0).filter(z => z !== 0)

  if (zValues.length === 0) return false

  const minZ = Math.min(...zValues)
  const maxZ = Math.max(...zValues)

  // If there's meaningful variance in z-values, pseudo-depth is available
  return (maxZ - minZ) > 0.01
}
