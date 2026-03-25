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
        device.label.toLowerCase().includes('intel')
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
        device.manufacturer?.toLowerCase().includes('intel')
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
 * For future implementation: Process depth data from RealSense
 * This would require a backend service running librealsense2
 */
export async function getDepthFrame(_stream: MediaStream): Promise<Float32Array | null> {
  // Placeholder for depth frame processing
  // In a full implementation, this would:
  // 1. Send the frame to a backend running librealsense2
  // 2. Process the depth stream
  // 3. Return the depth data array
  console.log('Depth frame processing not yet implemented')
  return null
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
  height: number
): { isValid: boolean; reason?: string } {
  // Check if hand is centered and at reasonable distance
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

  return { isValid: true }
}
