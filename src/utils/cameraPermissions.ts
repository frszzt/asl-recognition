/**
 * Camera permission handling utilities
 * Provides a clean API for requesting and checking camera permissions
 */

export type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export interface PermissionState {
  status: PermissionStatus
  error?: string
}

/**
 * Check if camera API is supported in this browser
 */
export function isCameraAPISupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

/**
 * Check current camera permission status
 * Uses the Permissions API when available, returns 'idle' otherwise
 */
export async function checkCameraPermission(): Promise<PermissionState> {
  try {
    if (!isCameraAPISupported()) {
      return {
        status: 'error',
        error: 'Camera API not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.'
      }
    }

    // Try to use the Permissions API
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName })

        if (permissionStatus.state === 'granted') {
          return { status: 'granted' }
        } else if (permissionStatus.state === 'denied') {
          return {
            status: 'denied',
            error: 'Camera permission denied. Please enable camera access in your browser settings.'
          }
        }

        // Listen for permission changes
        permissionStatus.addEventListener('change', () => {
          // This will trigger re-renders in components that use this hook
          window.dispatchEvent(new CustomEvent('camera-permission-change'))
        })
      } catch {
        // Permissions API might not support 'camera' name, fall through
      }
    }

    return { status: 'idle' }
  } catch (err) {
    return { status: 'idle' }
  }
}

/**
 * Request camera permission
 * Attempts to get a media stream to verify permission
 */
export async function requestCameraPermission(
  constraints?: MediaTrackConstraints
): Promise<PermissionState> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: constraints || { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    })

    // Stop the stream immediately - we just wanted to check permission
    stream.getTracks().forEach(track => track.stop())

    return { status: 'granted' }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'

    if (error.includes('Permission denied') || error.includes('NotAllowedError')) {
      return {
        status: 'denied',
        error: 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.'
      }
    }

    if (error.includes('NotFoundError') || error.includes('DeviceNotFound')) {
      return {
        status: 'error',
        error: 'No camera found on this device. Please connect a camera and try again.'
      }
    }

    if (error.includes('NotReadableError') || error.includes('Could not start')) {
      return {
        status: 'error',
        error: 'Camera is already in use by another application. Please close the other app and try again.'
      }
    }

    return {
      status: 'error',
      error: `Camera error: ${error}`
    }
  }
}

/**
 * Check if the device has any camera devices
 */
export async function hasCameraDevice(): Promise<boolean> {
  try {
    // First request permission to see device labels
    await navigator.mediaDevices.getUserMedia({ video: true })

    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.some(device => device.kind === 'videoinput')
  } catch {
    return false
  }
}

/**
 * Get list of available camera devices
 */
export async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  try {
    // First request permission to see device labels
    await navigator.mediaDevices.getUserMedia({ video: true })

    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(device => device.kind === 'videoinput')
  } catch {
    return []
  }
}

/**
 * Request a camera stream with proper error handling
 */
export async function getCameraStream(
  constraints?: MediaTrackConstraints
): Promise<{ stream: MediaStream | null; error?: string }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: constraints || { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    })

    return { stream }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    return { stream: null, error }
  }
}
