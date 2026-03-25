import { useState } from 'react'

interface HomeProps {
  onNavigate: (page: 'home' | 'learn' | 'practice' | 'game') => void
}

const Home = ({ onNavigate }: HomeProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleNavigate = (page: 'learn' | 'practice' | 'game') => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      onNavigate(page)
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="text-8xl mb-6 animate-bounce">🤟</div>
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
            ASL Learning Game
          </h1>
          <p className="text-2xl text-purple-200 max-w-2xl mx-auto">
            Learn American Sign Language through interactive play!
            Master the alphabet, numbers, and simple sentences.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="text-5xl mb-4">🔤</div>
            <h3 className="text-xl font-bold text-white mb-2">Alphabet A-Z</h3>
            <p className="text-purple-200">Learn all 26 letters with real-time feedback</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="text-5xl mb-4">🔢</div>
            <h3 className="text-xl font-bold text-white mb-2">Numbers 0-9</h3>
            <p className="text-purple-200">Master counting in sign language</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-white mb-2">Simple Sentences</h3>
            <p className="text-purple-200">Practice common phrases and greetings</p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Choose Your Mode
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Learn Mode */}
            <button
              onClick={() => handleNavigate('learn')}
              disabled={isLoading}
              className="group bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-2xl p-8 text-left transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📚</div>
              <h3 className="text-2xl font-bold text-white mb-2">Learn Mode</h3>
              <p className="text-green-100">
                Study each sign with detailed instructions and visual guides.
                Perfect for beginners!
              </p>
              <div className="mt-4 flex items-center text-white font-medium">
                Start Learning
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>

            {/* Practice Mode */}
            <button
              onClick={() => handleNavigate('practice')}
              disabled={isLoading}
              className="group bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 rounded-2xl p-8 text-left transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-2">Practice Mode</h3>
              <p className="text-blue-100">
                Practice any sign with real-time feedback and accuracy tracking.
                Improve at your own pace!
              </p>
              <div className="mt-4 flex items-center text-white font-medium">
                Start Practicing
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>

            {/* Game Mode */}
            <button
              onClick={() => handleNavigate('game')}
              disabled={isLoading}
              className="group bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 rounded-2xl p-8 text-left transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎮</div>
              <h3 className="text-2xl font-bold text-white mb-2">Game Mode</h3>
              <p className="text-orange-100">
                Challenge yourself with scored games! Earn points,
                build streaks, and unlock achievements.
              </p>
              <div className="mt-4 flex items-center text-white font-medium">
                Play Now
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Camera Compatibility Notice */}
        <div className="max-w-2xl mx-auto mt-16 bg-white/5 backdrop-blur-sm rounded-2xl p-6">
          <div className="flex items-center justify-center gap-4 text-purple-200">
            <div className="text-3xl">📷</div>
            <div>
              <p className="font-medium text-white">Camera Support</p>
              <p className="text-sm">Works with standard webcam and Intel RealSense depth cameras</p>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
              <span className="text-gray-700 font-medium">Loading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
