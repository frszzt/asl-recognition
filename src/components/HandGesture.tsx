/**
 * HandGesture Component - SVG-based hand gesture reference
 * Displays animated hand poses for ASL signs
 */

import { useState, useEffect } from 'react'
import { getSignInfo } from '../data/aslData'
import { getSignPose } from '../utils/handPoseMapping'

interface HandGestureProps {
  sign: string
  size?: number
  className?: string
  animated?: boolean
  showMotion?: boolean
}

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

// Default pose (open hand)
const defaultPose: HandPoseData = {
  thumb: { extended: 1, bend: 0, spread: 0 },
  index: { extended: 1, bend: 0, spread: 0 },
  middle: { extended: 1, bend: 0, spread: 0 },
  ring: { extended: 1, bend: 0, spread: 0 },
  pinky: { extended: 1, bend: 0, spread: 0 },
  wristRotation: 0,
  handRotation: 0
}

const HandGesture = ({
  sign,
  size = 200,
  className = '',
  animated = true,
  showMotion = true
}: HandGestureProps) => {
  const [currentPose, setCurrentPose] = useState<HandPoseData>(defaultPose)

  // Get target pose for the sign
  const targetPose = getSignPose(sign)

  // Animate to target pose
  useEffect(() => {
    if (!targetPose) return

    if (animated) {
      const duration = 300
      const startTime = performance.now()
      const startPose = { ...currentPose }

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3)

        // Interpolate between start and target poses
        const newPose: HandPoseData = {
          thumb: interpolateFinger(startPose.thumb, targetPose.thumb, eased),
          index: interpolateFinger(startPose.index, targetPose.index, eased),
          middle: interpolateFinger(startPose.middle, targetPose.middle, eased),
          ring: interpolateFinger(startPose.ring, targetPose.ring, eased),
          pinky: interpolateFinger(startPose.pinky, targetPose.pinky, eased),
          wristRotation: lerp(startPose.wristRotation, targetPose.wristRotation, eased),
          handRotation: lerp(startPose.handRotation, targetPose.handRotation, eased)
        }

        setCurrentPose(newPose)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    } else {
      setCurrentPose(targetPose)
    }
  }, [sign, targetPose, animated])

  // Check if this sign requires motion animation (J or Z)
  const requiresMotion = sign === 'J' || sign === 'Z'

  const signInfo = getSignInfo(sign)

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 200 200`}
        className={`w-full h-full ${requiresMotion && showMotion ? 'hand-gesture-motion' : ''}`}
        style={{
          transform: `rotate(${currentPose.handRotation}deg)`,
          transition: animated ? 'transform 0.3s ease-out' : undefined
        }}
      >
        {/* Style for animations */}
        <style>{`
          .hand-gesture-motion {
            animation: ${requiresMotion && sign === 'J' ? 'motionJ' : 'motionZ'} 2s ease-in-out infinite;
          }
          .finger-segment {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: bottom center;
          }
          .thumb-segment {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: right center;
          }
          @keyframes motionJ {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(-10px, 10px); }
            50% { transform: translate(-15px, 0); }
            75% { transform: translate(-10px, -10px); }
          }
          @keyframes motionZ {
            0%, 100% { transform: translate(0, 0); }
            20% { transform: translate(15px, 0); }
            40% { transform: translate(15px, 15px); }
            60% { transform: translate(0, 15px); }
            80% { transform: translate(0, 0); }
          }
        `}</style>

        {/* Palm Base */}
        <ellipse
          cx="100"
          cy="140"
          rx="45"
          ry="35"
          fill="#FDBCB4"
          stroke="#E8A898"
          strokeWidth="2"
        />

        {/* Wrist */}
        <rect
          x="85"
          y="170"
          width="30"
          height="25"
          fill="#FDBCB4"
          stroke="#E8A898"
          strokeWidth="2"
          rx="5"
        />

        {/* Thumb */}
        <g
          style={{
            transform: `rotate(${-30 + currentPose.thumb.spread}deg)`,
            transformOrigin: '130px 130px',
            transition: 'transform 0.3s ease-out'
          }}
        >
          <rect
            x="125"
            y={130 - (currentPose.thumb.extended * 30)}
            width="12"
            height={currentPose.thumb.extended * 30 + 15}
            fill="#FDBCB4"
            stroke="#E8A898"
            strokeWidth="2"
            rx="5"
            className="thumb-segment"
          />
          {/* Thumbnail */}
          <circle
            cx="131"
            cy={130 - (currentPose.thumb.extended * 30) - 5}
            r="7"
            fill="#FDBCB4"
            stroke="#E8A898"
            strokeWidth="2"
          />
        </g>

        {/* Fingers */}
        {renderFinger('index', currentPose.index, 70, 130, '#FDBCB4')}
        {renderFinger('middle', currentPose.middle, 95, 125, '#FDBCB4')}
        {renderFinger('ring', currentPose.ring, 120, 130, '#FDBCB4')}
        {renderFinger('pinky', currentPose.pinky, 145, 140, '#FDBCB4')}

        {/* Sign label below hand */}
        <text
          x="100"
          y="195"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#94A3B8"
        >
          {sign}
        </text>
      </svg>

      {/* Sign description */}
      {signInfo && (
        <p className="text-xs text-center mt-2 text-white/60">
          {signInfo.description}
        </p>
      )}
    </div>
  )
}

// Helper to render a finger with joints
function renderFinger(
  name: string,
  pose: FingerPose,
  x: number,
  y: number,
  color: string
) {
  const fingerWidth = 14
  const segmentLength = 25
  const extendedLength = pose.extended * segmentLength
  const bendAmount = pose.bend * Math.PI / 180

  // Calculate finger segments based on bend
  const segments = []
  for (let i = 0; i < 3; i++) {
    const segmentProgress = i / 3
    const offsetY = segmentProgress * extendedLength
    const offsetX = Math.sin(bendAmount * segmentProgress * 3) * (i * 5)

    segments.push(
      <rect
        key={`${name}-${i}`}
        x={x + offsetX - fingerWidth / 2 + pose.spread * (i - 1) * 0.3}
        y={y - offsetY}
        width={fingerWidth}
        height={extendedLength / 3 + 2}
        fill={color}
        stroke="#E8A898"
        strokeWidth="2"
        rx="6"
        className="finger-segment"
      />
    )
  }

  // Fingertip
  const tipX = x + Math.sin(bendAmount) * (extendedLength * 0.5) + pose.spread * 0.5
  const tipY = y - extendedLength

  return (
    <g>
      {segments}
      <circle
        cx={tipX}
        cy={tipY}
        r="7"
        fill={color}
        stroke="#E8A898"
        strokeWidth="2"
        className="finger-segment"
      />
    </g>
  )
}

// Interpolate between two finger poses
function interpolateFinger(
  start: FingerPose,
  end: FingerPose,
  progress: number
): FingerPose {
  return {
    extended: lerp(start.extended, end.extended, progress),
    bend: lerp(start.bend, end.bend, progress),
    spread: lerp(start.spread, end.spread, progress)
  }
}

// Linear interpolation
function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress
}

export default HandGesture
