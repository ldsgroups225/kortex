import { XMarkIcon } from '@heroicons/react/24/outline'
import { useMemo, useRef, useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
}

export function TagInput({
  tags,
  onChange,
  suggestions,
  placeholder = 'Add tags...',
  className = '',
}: TagInputProps) {
  const defaultSuggestions: string[] = []
  const suggestionsList = suggestions ?? defaultSuggestions
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Compute filtered suggestions during render
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) {
      return []
    }
    return suggestionsList.filter(
      suggestion =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase())
        && !tags.includes(suggestion),
    )
  }, [inputValue, suggestionsList, tags])

  // Compute show suggestions during render
  const showSuggestions = useMemo(() => {
    return inputValue && filteredSuggestions.length > 0
  }, [inputValue, filteredSuggestions.length])

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      onChange([...tags, tag.trim()])
      setInputValue('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
      else if (filteredSuggestions.length > 0) {
        addTag(filteredSuggestions[0])
      }
    }
    else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      // Handle arrow down navigation
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      // Handle arrow up navigation
    }
    else if (e.key === 'Escape') {
      // Handle escape key
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 min-h-[42px] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-md"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {}}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion: string, index: number) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                index === -1 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
