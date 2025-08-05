import { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function TagInput({ 
  tags, 
  onChange, 
  suggestions = [], 
  placeholder = "Add tags...",
  className = ""
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(suggestion)
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestion >= 0 && filteredSuggestions[selectedSuggestion]) {
        addTag(filteredSuggestions[selectedSuggestion]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
    }
  };

  useEffect(() => {
    if (inputValue) {
      setShowSuggestions(true);
      setSelectedSuggestion(-1);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue]);

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 min-h-[42px] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-md"
          >
            {tag}
            <button
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
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedSuggestion
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : ''
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
