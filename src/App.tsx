import { useEffect } from 'react'
import { useAnimationStore } from './store/animationStore'
import { useAnimationLoop } from './hooks/useAnimationLoop'
import { initialDoc } from './assets/sample/initialDoc'
import { Header } from './components/Header'
import { Timeline } from './components/Timeline/Timeline'
import { LeftPanel } from './components/LeftPanel/LeftPanel'
import { CanvasArea } from './components/Canvas/CanvasArea'

export default function App() {
  const setDoc = useAnimationStore((s) => s.setDoc)

  useEffect(() => {
    setDoc(initialDoc)
  }, [setDoc])

  useAnimationLoop()

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftPanel />
        <CanvasArea />
      </div>
      <Timeline />
    </div>
  )
}
