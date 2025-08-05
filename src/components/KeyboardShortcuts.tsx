import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onCopyLastSelected?: () => void
  onCreateNote?: () => void
  onFocusSearch?: () => void
}

export function KeyboardShortcuts({
  onCopyLastSelected,
  onCreateNote,
  onFocusSearch,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement
        || event.target instanceof HTMLTextAreaElement
        || event.target instanceof HTMLSelectElement) {
        return
      }

      // Ctrl+Shift+C: Copy last selected item
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault()
        onCopyLastSelected?.()
      }

      // Ctrl+N: Create new note
      if (event.ctrlKey && event.key === 'N') {
        event.preventDefault()
        onCreateNote?.()
      }

      // Ctrl+F: Focus search bar
      if (event.ctrlKey && event.key === 'F') {
        event.preventDefault()
        onFocusSearch?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCopyLastSelected, onCreateNote, onFocusSearch])

  // This component doesn't render anything visible
  return null
}
