import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface CopyButtonProps {
  content: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon' | 'button' | 'text'
  showText?: boolean
}

export function CopyButton({
  content,
  className = '',
  size = 'md',
  variant = 'icon',
  showText = false,
}: CopyButtonProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success(t('toasts.copySuccess'), {
        description: t('toasts.copySuccessDesc'),
      })
    }
    catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error(t('toasts.copyError'), {
        description: t('toasts.copyErrorDesc'),
      })
    }
  }

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const baseClasses = `inline-flex items-center gap-1 rounded transition-colors ${sizeClasses[size]} ${className}`

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={`${baseClasses} bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50`}
        title={copied ? t('common.copied') : t('common.copy')}
      >
        {copied
          ? (
              <CheckIcon className={iconSizes[size]} />
            )
          : (
              <DocumentDuplicateIcon className={iconSizes[size]} />
            )}
        {showText && (
          <span className="text-sm">
            {copied ? t('common.copied') : t('common.copy')}
          </span>
        )}
      </button>
    )
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={`${baseClasses} text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300`}
        title={copied ? t('common.copied') : t('common.copy')}
      >
        {copied
          ? (
              <CheckIcon className={iconSizes[size]} />
            )
          : (
              <DocumentDuplicateIcon className={iconSizes[size]} />
            )}
        <span className="text-sm">
          {copied ? t('common.copied') : t('common.copy')}
        </span>
      </button>
    )
  }

  // Default icon variant
  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`${baseClasses} text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700`}
      title={copied ? t('common.copied') : t('common.copy')}
    >
      {copied
        ? (
            <CheckIcon className={iconSizes[size]} />
          )
        : (
            <DocumentDuplicateIcon className={iconSizes[size]} />
          )}
    </button>
  )
}
