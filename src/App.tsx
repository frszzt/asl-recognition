import { useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import Home from './pages/Home'
import LearnMode from './pages/LearnMode'
import PracticeMode from './pages/PracticeMode'
import GameMode from './pages/GameMode'

type Page = 'home' | 'learn' | 'practice' | 'game'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />
      case 'learn':
        return <LearnMode onNavigate={setCurrentPage} />
      case 'practice':
        return <PracticeMode onNavigate={setCurrentPage} />
      case 'game':
        return <GameMode onNavigate={setCurrentPage} />
      default:
        return <Home onNavigate={setCurrentPage} />
    }
  }

  const handleError = (error: Error, errorInfo: any) => {
    console.error('App error:', error)
    console.error('Error info:', errorInfo)
    // Could send to error tracking service here
  }

  return (
    <ErrorBoundary onError={handleError}>
      <div className="min-h-screen">
        {renderPage()}
      </div>
    </ErrorBoundary>
  )
}

export default App
