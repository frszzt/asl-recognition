import { useState, useEffect, useRef } from 'react'
import HandTracker, { DetectedHand } from '../components/HandTracker'
import { classifyASL, calculateRoundScore, ClassificationSmoother } from '../utils/aslClassifier'
import { getSignSequence, ACHIEVEMENTS, ASL_ALPHABET, ASL_NUMBERS } from '../data/aslData'

interface GameModeProps {
  onNavigate: (page: 'home' | 'learn' | 'practice' | 'game') => void
}

type GameCategory = 'alphabet' | 'numbers' | 'sentences' | 'mixed'
type Difficulty = 'easy' | 'medium' | 'hard'

interface GameState {
  score: number
  streak: number
  bestStreak: number
  totalAttempts: number
  correctAttempts: number
  startTime: number
  completedSigns: string[]
  achievements: string[]
}

const GameMode = ({ onNavigate }: GameModeProps) => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    streak: 0,
    bestStreak: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    startTime: Date.now(),
    completedSigns: [],
    achievements: []
  })
  const [category, setCategory] = useState<GameCategory>('alphabet')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [currentSign, setCurrentSign] = useState<string>('')
  const [signsQueue, setSignsQueue] = useState<string[]>([])
  const [detectedSign, setDetectedSign] = useState<string>('')
  const [confidence, setConfidence] = useState(0)
  const [feedback, setFeedback] = useState<string>('')
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [showCelebration, setShowCelebration] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smootherRef = useRef(new ClassificationSmoother(5))
  const roundStartTimeRef = useRef<number>(Date.now())
  const hasRecognizedRef = useRef(false)

  // Initialize game
  const startGame = () => {
    let signs: string[]
    if (category === 'mixed') {
      // Mix alphabet and numbers
      signs = [...Object.keys(ASL_ALPHABET), ...Object.keys(ASL_NUMBERS)]
    } else {
      signs = getSignSequence(category)
    }
    const shuffled = [...signs].sort(() => Math.random() - 0.5)
    setSignsQueue(shuffled)
    setCurrentSign(shuffled[0])
    setIsPlaying(true)
    setIsGameOver(false)
    setTimeRemaining(difficulty === 'easy' ? 90 : difficulty === 'medium' ? 60 : 45)
    setGameState({
      score: 0,
      streak: 0,
      bestStreak: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      startTime: Date.now(),
      completedSigns: [],
      achievements: []
    })
    setFeedback('Make the sign shown above!')
    smootherRef.current.reset()
  }

  // Timer
  useEffect(() => {
    if (!isPlaying || isGameOver) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isPlaying, isGameOver])

  // Check achievements
  useEffect(() => {
    const newAchievements = [...gameState.achievements]

    ACHIEVEMENTS.forEach(achievement => {
      if (newAchievements.includes(achievement.id)) return

      let unlocked = false

      switch (achievement.id) {
        case 'first_steps':
        case 'on_fire':
        case 'asl_master':
          unlocked = gameState.correctAttempts >= achievement.requirement
          break
        case 'speed_demon':
          unlocked = gameState.streak >= achievement.requirement
          break
        case 'perfect_game':
          if (gameState.totalAttempts >= 10) {
            unlocked = (gameState.correctAttempts / gameState.totalAttempts) >= 1
          }
          break
        case 'alphabet_complete':
          unlocked = category === 'alphabet' && gameState.completedSigns.length >= 26
          break
        case 'numbers_complete':
          unlocked = category === 'numbers' && gameState.completedSigns.length >= 10
          break
      }

      if (unlocked) {
        newAchievements.push(achievement.id)
        showAchievementPopup(achievement)
      }
    })

    if (newAchievements.length !== gameState.achievements.length) {
      setGameState(prev => ({ ...prev, achievements: newAchievements }))
    }
  }, [gameState.correctAttempts, gameState.streak, gameState.completedSigns])

  const showAchievementPopup = (achievement: any) => {
    setFeedback(`🏆 Achievement: ${achievement.icon} ${achievement.name}!`)
    setTimeout(() => setFeedback(''), 3000)
  }

  const endGame = () => {
    setIsPlaying(false)
    setIsGameOver(true)
    setShowCelebration(true)
  }

  const handleHandsDetected = (hands: DetectedHand[]) => {
    if (!isPlaying || isGameOver || !currentSign) return

    if (hands.length === 0) {
      setDetectedSign('')
      setConfidence(0)
      return
    }

    const hand = hands[0]
    const result = smootherRef.current.add(classifyASL(hand.landmarks, currentSign))

    setDetectedSign(result.sign)
    setConfidence(result.confidence)

    // Check if correct (with debounce to prevent multiple detections)
    if (result.sign === currentSign && result.confidence > 0.7 && !hasRecognizedRef.current) {
      hasRecognizedRef.current = true

      const timeTaken = Date.now() - roundStartTimeRef.current
      const roundScore = calculateRoundScore(result, timeTaken, gameState.streak)

      setGameState(prev => {
        const newState = {
          ...prev,
          score: prev.score + roundScore,
          streak: prev.streak + 1,
          bestStreak: Math.max(prev.streak + 1, prev.bestStreak),
          totalAttempts: prev.totalAttempts + 1,
          correctAttempts: prev.correctAttempts + 1,
          completedSigns: [...prev.completedSigns, currentSign]
        }

        // Move to next sign
        setTimeout(() => {
          nextSign()
        }, 500)

        return newState
      })

      setFeedback(`🎉 +${roundScore} points!`)
    }

    // Reset recognition flag after delay
    setTimeout(() => {
      hasRecognizedRef.current = false
    }, 1000)
  }

  const nextSign = () => {
    if (signsQueue.length <= 1) {
      // Game complete!
      endGame()
      return
    }

    const newQueue = signsQueue.slice(1)
    setSignsQueue(newQueue)
    setCurrentSign(newQueue[0])
    roundStartTimeRef.current = Date.now()
    setFeedback('Make the sign shown above!')
    smootherRef.current.reset()
  }

  const accuracy = gameState.totalAttempts > 0
    ? Math.round((gameState.correctAttempts / gameState.totalAttempts) * 100)
    : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-pink-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-white hover:text-orange-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-white">🎮 Game Mode</h1>
          <div className="text-white font-bold text-xl">{gameState.score} pts</div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {!isPlaying ? (
          // Game Setup Screen
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-white text-center mb-8">Ready to Play?</h2>

              {/* Category Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Choose Category</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['alphabet', 'numbers', 'sentences', 'mixed'] as GameCategory[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        category === cat
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {cat === 'alphabet' && '🔤 Alphabet'}
                      {cat === 'numbers' && '🔢 Numbers'}
                      {cat === 'sentences' && '💬 Sentences'}
                      {cat === 'mixed' && '🎲 Mixed'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-3">Difficulty</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        difficulty === diff
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {diff === 'easy' && '😊 Easy (90s)'}
                      {diff === 'medium' && '😐 Medium (60s)'}
                      {diff === 'hard' && '😈 Hard (45s)'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold py-4 rounded-xl text-xl transition-all transform hover:scale-105 shadow-lg"
              >
                🚀 Start Game
              </button>

              {/* Instructions */}
              <div className="mt-6 p-4 bg-white/5 rounded-xl">
                <h4 className="text-white font-medium mb-2">How to Play</h4>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• Make the ASL sign shown on screen</li>
                  <li>• Faster recognition = more points</li>
                  <li>• Build streaks for bonus points</li>
                  <li>• Complete as many signs as possible before time runs out!</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          // Game Play Screen
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Panel - Stats */}
            <div className="space-y-4">
              {/* Timer */}
              <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center ${
                timeRemaining <= 10 ? 'animate-pulse' : ''
              }`}>
                <div className="text-white/70 text-sm mb-1">Time Remaining</div>
                <div className={`text-5xl font-bold ${
                  timeRemaining <= 10 ? 'text-red-400' : 'text-white'
                }`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>

              {/* Score Card */}
              <div className="bg-gradient-to-br from-orange-500/30 to-red-500/30 backdrop-blur-sm rounded-2xl p-6 border border-orange-400/30">
                <div className="text-center">
                  <div className="text-white/70 text-sm mb-1">Score</div>
                  <div className="text-5xl font-bold text-white">{gameState.score}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-white/70 text-xs">Streak</div>
                    <div className="text-2xl font-bold text-orange-300">{gameState.streak}🔥</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/70 text-xs">Best</div>
                    <div className="text-2xl font-bold text-yellow-300">{gameState.bestStreak}</div>
                  </div>
                </div>
              </div>

              {/* Accuracy */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70">Accuracy</span>
                  <span className="text-white font-bold">{accuracy}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-400 to-emerald-400 h-3 rounded-full"
                    style={{ width: `${accuracy}%` }}
                  ></div>
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-white/70 text-sm mb-3">Completed Signs</div>
                <div className="flex flex-wrap gap-2">
                  {gameState.completedSigns.slice(-15).map((sign, i) => (
                    <span key={i} className="bg-green-500/30 text-green-300 px-2 py-1 rounded text-sm">
                      {sign}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Center - Game Area */}
            <div className="lg:col-span-1">
              {/* Target Sign */}
              <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-8 text-center mb-4 shadow-lg">
                <div className="text-white/80 text-sm mb-2">Make this sign:</div>
                <div className="text-8xl font-bold text-white animate-pulse">{currentSign}</div>
              </div>

              {/* Camera */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden relative">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    width={480}
                    height={480}
                  />
                  <HandTracker
                    videoElement={videoRef.current}
                    canvasElement={canvasRef.current}
                    onHandsDetected={handleHandsDetected}
                    enabled={true}
                  />
                </div>

                {/* Result Display */}
                <div className={`mt-4 p-4 rounded-xl text-center transition-all ${
                  detectedSign === currentSign && confidence > 0.7
                    ? 'bg-green-500/30 border-2 border-green-400 scale-105'
                    : detectedSign
                    ? 'bg-white/10 border border-white/20'
                    : 'bg-white/5'
                }`}>
                  <div className="text-4xl font-bold text-white mb-1">
                    {detectedSign || '?'}
                  </div>
                  <div className="text-sm text-white/70">
                    Confidence: {Math.round(confidence * 100)}%
                  </div>
                  {feedback && (
                    <div className="mt-2 text-white font-medium">{feedback}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Achievements */}
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">🏆 Achievements</h3>
                <div className="space-y-3">
                  {ACHIEVEMENTS.map(achievement => {
                    const isUnlocked = gameState.achievements.includes(achievement.id)
                    const progress =
                      achievement.id === 'first_steps' || achievement.id === 'on_fire' || achievement.id === 'asl_master'
                        ? gameState.correctAttempts
                        : achievement.id === 'speed_demon'
                        ? gameState.streak
                        : achievement.id === 'alphabet_complete'
                        ? gameState.completedSigns.length
                        : achievement.id === 'numbers_complete'
                        ? gameState.completedSigns.length
                        : 0

                    const progressPercent = Math.min((progress / achievement.requirement) * 100, 100)

                    return (
                      <div
                        key={achievement.id}
                        className={`p-3 rounded-lg transition-all ${
                          isUnlocked
                            ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border border-yellow-400/50'
                            : 'bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`text-2xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium ${isUnlocked ? 'text-yellow-300' : 'text-white/70'}`}>
                              {achievement.name}
                            </div>
                            <div className="text-xs text-white/50">{achievement.description}</div>
                            {!isUnlocked && (
                              <div className="mt-1 w-full bg-white/10 rounded-full h-1.5">
                                <div
                                  className="bg-orange-400 h-1.5 rounded-full transition-all"
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                          {isUnlocked && <div className="text-green-400">✓</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Over Modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-3xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">Game Over!</h2>
            <p className="text-white/80 mb-6">Great effort! Here's how you did:</p>

            <div className="bg-white/10 rounded-2xl p-6 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Final Score</span>
                <span className="text-2xl font-bold text-white">{gameState.score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Best Streak</span>
                <span className="text-xl font-bold text-orange-300">{gameState.bestStreak}🔥</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Accuracy</span>
                <span className="text-xl font-bold text-green-300">{accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Signs Completed</span>
                <span className="text-xl font-bold text-cyan-300">{gameState.completedSigns.length}</span>
              </div>
            </div>

            {/* New Achievements */}
            {gameState.achievements.length > 0 && (
              <div className="bg-white/10 rounded-2xl p-4 mb-6">
                <div className="text-white/70 text-sm mb-2">Achievements Unlocked</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {gameState.achievements.map(id => {
                    const achievement = ACHIEVEMENTS.find(a => a.id === id)
                    return achievement ? (
                      <span key={id} className="bg-yellow-500/30 px-3 py-1 rounded-full text-white">
                        {achievement.icon} {achievement.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowCelebration(false)
                  startGame()
                }}
                className="flex-1 bg-white text-orange-600 font-bold py-3 rounded-xl hover:bg-white/90 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={() => {
                  setShowCelebration(false)
                  setIsPlaying(false)
                  setIsGameOver(false)
                }}
                className="flex-1 bg-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/30 transition-colors"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameMode
