/**
 * Hand Pose Mapping for ASL Signs
 * Converts ASL sign data into visual finger poses for the HandGesture component
 */

interface FingerPose {
  extended: number  // 0-1, how extended the finger is
  bend: number      // 0-180 degrees, how much the finger is bent
  spread: number    // -30 to 30, finger spread angle
}

interface HandPoseData {
  thumb: FingerPose
  index: FingerPose
  middle: FingerPose
  ring: FingerPose
  pinky: FingerPose
  wristRotation: number
  handRotation: number
  specialPose?: string
}

/**
 * Get the hand pose for a given ASL sign
 */
export function getSignPose(sign: string): HandPoseData | null {
  const poses: Record<string, HandPoseData> = {
    // Alphabet
    'A': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'B': {
      thumb: { extended: 0.3, bend: 90, spread: 0 },
      index: { extended: 1, bend: 0, spread: 2 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 1, bend: 0, spread: 0 },
      pinky: { extended: 1, bend: 0, spread: -2 },
      wristRotation: 0,
      handRotation: 0
    },
    'C': {
      thumb: { extended: 0.5, bend: 90, spread: 0 },
      index: { extended: 0.3, bend: 90, spread: 0 },
      middle: { extended: 0.3, bend: 90, spread: 0 },
      ring: { extended: 0.3, bend: 90, spread: 0 },
      pinky: { extended: 0.3, bend: 90, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'D': {
      thumb: { extended: 0.7, bend: 30, spread: 0 },
      index: { extended: 1, bend: 0, spread: 0 },
      middle: { extended: 0.2, bend: 90, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'E': {
      thumb: { extended: 0.2, bend: 90, spread: 0 },
      index: { extended: 0.2, bend: 150, spread: 0 },
      middle: { extended: 0.2, bend: 150, spread: 0 },
      ring: { extended: 0.2, bend: 150, spread: 0 },
      pinky: { extended: 0.2, bend: 150, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'F': {
      thumb: { extended: 0.4, bend: 20, spread: 0 },
      index: { extended: 0.5, bend: 90, spread: 0 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 1, bend: 0, spread: 0 },
      pinky: { extended: 1, bend: 0, spread: 0 },
      wristRotation: 0,
      handRotation: 0,
      specialPose: 'OK'
    },
    'G': {
      thumb: { extended: 0.8, bend: 0, spread: 0 },
      index: { extended: 1, bend: 0, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: -90
    },
    'H': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 1, bend: 0, spread: 5 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: -90
    },
    'I': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 1, bend: 0, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'J': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 1, bend: 0, spread: 0 },
      wristRotation: 0,
      handRotation: 0,
      specialPose: 'motion'
    },
    'K': {
      thumb: { extended: 0.6, bend: 0, spread: 0 },
      index: { extended: 1, bend: 0, spread: 15 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0,
      specialPose: 'split'
    },
    'L': {
      thumb: { extended: 1, bend: 0, spread: 0 },
      index: { extended: 1, bend: 0, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0,
      specialPose: 'L-shape'
    },
    'M': {
      thumb: { extended: 0.1, bend: 90, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'N': {
      thumb: { extended: 0.1, bend: 90, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'O': {
      thumb: { extended: 0.4, bend: 100, spread: 0 },
      index: { extended: 0.3, bend: 100, spread: 0 },
      middle: { extended: 0.3, bend: 100, spread: 0 },
      ring: { extended: 0.3, bend: 100, spread: 0 },
      pinky: { extended: 0.3, bend: 100, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'P': {
      thumb: { extended: 0.6, bend: 0, spread: 0 },
      index: { extended: 1, bend: 0, spread: 15 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: -90,
      specialPose: 'split'
    },
    'Q': {
      thumb: { extended: 0.8, bend: 0, spread: 0 },
      index: { extended: 1, bend: 0, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: -90
    },
    'R': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 1, bend: 0, spread: 10 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0,
      specialPose: 'crossed'
    },
    'S': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'T': {
      thumb: { extended: 0.1, bend: 90, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'U': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 1, bend: 0, spread: 3 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'V': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 1, bend: 0, spread: 20 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'W': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 1, bend: 0, spread: 5 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 1, bend: 0, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'X': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 0.2, bend: 150, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0,
      specialPose: 'hooked'
    },
    'Y': {
      thumb: { extended: 1, bend: 0, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 1, bend: 0, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    'Z': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 1, bend: 0, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0,
      specialPose: 'motion'
    },

    // Numbers
    '0': {
      thumb: { extended: 0.3, bend: 90, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    '1': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 1, bend: 0, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    '2': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 1, bend: 0, spread: 5 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    '3': {
      thumb: { extended: 0.2, bend: 60, spread: 0 },
      index: { extended: 1, bend: 0, spread: 3 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 1, bend: 0, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    '4': {
      thumb: { extended: 0.2, bend: 90, spread: 0 },
      index: { extended: 1, bend: 0, spread: 5 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 1, bend: 0, spread: 0 },
      pinky: { extended: 1, bend: 0, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    '5': {
      thumb: { extended: 1, bend: 0, spread: 0 },
      index: { extended: 1, bend: 0, spread: 10 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 1, bend: 0, spread: 0 },
      pinky: { extended: 1, bend: 0, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    '6': {
      thumb: { extended: 1, bend: 0, spread: 0 },
      index: { extended: 0.1, bend: 120, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 1, bend: 0, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    '7': {
      thumb: { extended: 0.5, bend: 90, spread: 0 },
      index: { extended: 0.2, bend: 90, spread: 0 },
      middle: { extended: 0.2, bend: 90, spread: 0 },
      ring: { extended: 0.2, bend: 90, spread: 0 },
      pinky: { extended: 1, bend: 0, spread: 0 },
      wristRotation: 0,
      handRotation: 0
    },
    '8': {
      thumb: { extended: 0.5, bend: 90, spread: 0 },
      index: { extended: 0.3, bend: 90, spread: 0 },
      middle: { extended: 1, bend: 0, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0,
      specialPose: 'pinch'
    },
    '9': {
      thumb: { extended: 0.6, bend: 60, spread: 0 },
      index: { extended: 0.2, bend: 150, spread: 0 },
      middle: { extended: 0.1, bend: 120, spread: 0 },
      ring: { extended: 0.1, bend: 120, spread: 0 },
      pinky: { extended: 0.1, bend: 120, spread: 0 },
      wristRotation: 0,
      handRotation: 0,
      specialPose: 'hooked'
    }
  }

  return poses[sign] || null
}
