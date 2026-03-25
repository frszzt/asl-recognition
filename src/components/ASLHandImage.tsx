/**
 * ASL Hand Image Reference Component
 * Displays actual ASL hand sign images from a reliable public source
 */

import { getSignInfo } from '../data/aslData'

interface ASLHandImageProps {
  sign: string
  size?: number
  className?: string
  showLabel?: boolean
  alt?: string
}

/**
 * Get the image URL for a given ASL sign
 * Using static ASL alphabet images from a public CDN
 */
function getASLImageUrl(sign: string): string {
  const normalizedSign = sign.toUpperCase()

  // Using lifeprint.com ASL alphabet images (reliable educational resource)
  // Format: https://www.lifeprint.com/asl101/fingerspelling/images/{sign}.gif
  const lifeprintUrl = `https://www.lifeprint.com/asl101/fingerspelling/images/${normalizedSign}.gif`

  // Alternative: use ASL University images
  // const aslUniversityUrl = `https://www.asluniversity.com/asl101/fingerspelling/images/${normalizedSign}.jpg`

  // For numbers, use a different source
  if (/^\d$/.test(normalizedSign)) {
    return `https://www.lifeprint.com/asl101/numbers-signs/images/number${normalizedSign}.jpg`
  }

  return lifeprintUrl
}

/**
 * Check if image exists (fallback handling)
 */
function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  // Fallback to a placeholder or generic hand icon
  const target = e.target as HTMLImageElement
  // Use a data URI fallback or show a simple text representation
  target.style.display = 'none'
  const parent = target.parentElement
  if (parent) {
    const fallback = document.createElement('div')
    fallback.className = 'flex items-center justify-center text-4xl font-bold text-white/50'
    fallback.textContent = target.alt || '?'
    parent.appendChild(fallback)
  }
}

const ASLHandImage = ({
  sign,
  size = 200,
  className = '',
  showLabel = true,
  alt
}: ASLHandImageProps) => {
  const signInfo = getSignInfo(sign)
  const imageUrl = getASLImageUrl(sign)

  return (
    <div
      className={`flex flex-col items-center ${className}`}
      style={{ width: size, height: showLabel ? size + 30 : size }}
    >
      {/* ASL Hand Image */}
      <div
        className="relative rounded-xl overflow-hidden bg-white/5"
        style={{ width: size, height: size }}
      >
        <img
          src={imageUrl}
          alt={alt || `ASL sign for ${sign}`}
          className="w-full h-full object-contain"
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
          onError={handleImageError}
          loading="lazy"
        />
      </div>

      {/* Sign Label */}
      {showLabel && (
        <div className="mt-2 text-center">
          <span className="text-lg font-bold text-white/90">{sign}</span>
          {signInfo?.description && (
            <p className="text-xs text-white/60 mt-1 max-w-[200px] line-clamp-2">
              {signInfo.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Grid of ASL reference images
 */
interface ASLImageGridProps {
  signs: string[]
  onSelectSign?: (sign: string) => void
  completedSigns?: Set<string>
  currentSign?: string
  className?: string
}

export function ASLImageGrid({
  signs,
  onSelectSign,
  completedSigns = new Set(),
  currentSign,
  className = ''
}: ASLImageGridProps) {
  return (
    <div className={`grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 ${className}`}>
      {signs.map((sign) => {
        const isCompleted = completedSigns.has(sign)
        const isCurrent = sign === currentSign

        return (
          <button
            key={sign}
            onClick={() => onSelectSign?.(sign)}
            className={`
              relative aspect-square rounded-xl overflow-hidden
              transition-all duration-200 hover:scale-105
              ${isCurrent ? 'ring-4 ring-green-400 scale-105' : ''}
              ${isCompleted ? 'bg-green-500/20' : 'bg-white/10'}
              hover:bg-white/20
            `}
          >
            <img
              src={getASLImageUrl(sign)}
              alt={`ASL ${sign}`}
              className="w-full h-full object-contain p-2"
              loading="lazy"
            />
            {/* Status overlay */}
            {(isCompleted || isCurrent) && (
              <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                ${isCompleted ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}
              `}>
                {isCompleted ? '✓' : ''}
              </div>
            )}
            {/* Sign label overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm py-1">
              <span className="text-white font-bold text-sm">{sign}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default ASLHandImage
