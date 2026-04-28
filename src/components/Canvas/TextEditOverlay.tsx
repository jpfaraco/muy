import { useEffect, useRef, useCallback } from 'react'
import { useInteractionStore } from '../../store/interactionStore'
import { useAnimationStore, captureHistoryEntry } from '../../store/animationStore'
import { DEFAULT_LAYER_PROPS } from '../../types/animation'

export function TextEditOverlay() {
  const editingTextLayerId = useInteractionStore((s) => s.editingTextLayerId)
  const setEditingTextLayerId = useInteractionStore((s) => s.setEditingTextLayerId)

  const layers = useAnimationStore((s) => s.doc.layers)
  const currentFrame = useAnimationStore((s) => s.currentFrame)
  const getLayerPropsAtFrame = useAnimationStore((s) => s.getLayerPropsAtFrame)
  const updateTextContent = useAnimationStore((s) => s.updateTextContent)
  const centerTextPivot = useAnimationStore((s) => s.centerTextPivot)

  const divRef = useRef<HTMLDivElement>(null)
  const isCommittingRef = useRef(false)
  const historyPausedRef = useRef(false)

  const layer = editingTextLayerId ? layers[editingTextLayerId] : null
  const textData = layer?.text

  // Apply layer transform: translate(x + pivX, y + pivY) rotate(r) scale(s) translate(-pivX, -pivY)
  function layerCssTransform() {
    if (!editingTextLayerId || !layer) return 'none'
    const props = { ...DEFAULT_LAYER_PROPS, ...getLayerPropsAtFrame(editingTextLayerId, currentFrame) }
    const pivX = layer.pivotX ?? 0
    const pivY = layer.pivotY ?? 0
    return `translate(${props.x + pivX}px, ${props.y + pivY}px) rotate(${props.rotation}deg) scale(${props.scale}) translate(${-pivX}px, ${-pivY}px)`
  }

  const commit = useCallback(() => {
    if (isCommittingRef.current) return
    isCommittingRef.current = true
    const div = divRef.current
    if (div && editingTextLayerId) {
      updateTextContent(editingTextLayerId, div.innerText)

      // Measure bounding box to center pivot (only if not user-owned)
      const w = div.offsetWidth
      const h = div.offsetHeight
      if (w > 0 && h > 0) {
        centerTextPivot(editingTextLayerId, w, h)
      }
    }
    if (historyPausedRef.current) {
      useAnimationStore.temporal.getState().resume()
      historyPausedRef.current = false
    }
    setEditingTextLayerId(null)
    isCommittingRef.current = false
  }, [editingTextLayerId, updateTextContent, centerTextPivot, setEditingTextLayerId])

  // Focus on mount; pause history so all keystrokes merge into one undo entry
  useEffect(() => {
    if (!editingTextLayerId) return
    captureHistoryEntry()
    useAnimationStore.temporal.getState().pause()
    historyPausedRef.current = true

    const div = divRef.current
    if (!div) return
    // Place cursor at end
    div.focus()
    const range = document.createRange()
    range.selectNodeContents(div)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [editingTextLayerId])

  // Commit when editing ends
  useEffect(() => {
    if (!editingTextLayerId && historyPausedRef.current) {
      useAnimationStore.temporal.getState().resume()
      historyPausedRef.current = false
    }
  }, [editingTextLayerId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      commit()
    }
    // Allow Enter for newlines (default contenteditable behavior)
  }, [commit])

  const handleBlur = useCallback(() => {
    commit()
  }, [commit])

  if (!editingTextLayerId || !layer || !textData) return null

  const transform = layerCssTransform()

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform,
        transformOrigin: '0 0',
        pointerEvents: 'auto',
        zIndex: 10,
      }}
    >
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          fontFamily: `"${textData.fontFamily}", "Noto Color Emoji", sans-serif`,
          fontSize: textData.fontSize,
          color: textData.color,
          width: textData.width != null ? `${textData.width}px` : 'max-content',
          minWidth: '2px',
          whiteSpace: textData.width != null ? 'pre-wrap' : 'pre',
          lineHeight: 1.2,
          outline: 'none',
          caretColor: textData.color,
          WebkitUserSelect: 'text',
          userSelect: 'text',
        }}
      >
        {textData.content}
      </div>
    </div>
  )
}
