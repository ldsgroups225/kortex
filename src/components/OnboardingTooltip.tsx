import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useRef, useState } from 'react'
import { useOnboarding } from './OnboardingProvider'

export function OnboardingTooltip() {
  const {
    isOnboardingActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipOnboarding,
  } = useOnboarding()

  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom')
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOnboardingActive || !currentStep) return

    const updatePosition = () => {
      const targetElement = document.querySelector(currentStep.targetElement)
      if (!targetElement || !tooltipRef.current) return

      const targetRect = targetElement.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const offset = 10

      let top = 0
      let left = 0

      switch (currentStep.position) {
        case 'bottom':
          top = targetRect.bottom + offset + window.scrollY
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2) + window.scrollX
          setArrowPosition('top')
          break
        case 'top':
          top = targetRect.top - tooltipRect.height - offset + window.scrollY
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2) + window.scrollX
          setArrowPosition('bottom')
          break
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2) + window.scrollY
          left = targetRect.left - tooltipRect.width - offset + window.scrollX
          setArrowPosition('right')
          break
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2) + window.scrollY
          left = targetRect.right + offset + window.scrollX
          setArrowPosition('left')
          break
      }

      // Keep tooltip within viewport bounds
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (left < 0) left = 10
      if (left + tooltipRect.width > viewportWidth) left = viewportWidth - tooltipRect.width - 10
      if (top < 0) top = 10
      if (top + tooltipRect.height > viewportHeight + window.scrollY) {
        top = viewportHeight + window.scrollY - tooltipRect.height - 10
      }

      setPosition({ top, left })
    }

    // Initial position update
    setTimeout(updatePosition, 100)

    // Update position on resize or scroll
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [isOnboardingActive, currentStep])

  useEffect(() => {
    if (!isOnboardingActive || !currentStep) return

    // Highlight target element
    const targetElement = document.querySelector(currentStep.targetElement) as HTMLElement
    if (targetElement) {
      targetElement.style.position = 'relative'
      targetElement.style.zIndex = '1000'
      targetElement.classList.add('onboarding-highlight')
    }

    return () => {
      if (targetElement) {
        targetElement.style.position = ''
        targetElement.style.zIndex = ''
        targetElement.classList.remove('onboarding-highlight')
      }
    }
  }, [currentStep, isOnboardingActive])

  if (!isOnboardingActive || !currentStep) {
    return null
  }

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-3 h-3 bg-white dark:bg-gray-800 border transform rotate-45'
    
    switch (arrowPosition) {
      case 'top':
        return `${baseClasses} -top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0`
      case 'bottom':
        return `${baseClasses} -bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0`
      case 'left':
        return `${baseClasses} -left-1.5 top-1/2 -translate-y-1/2 border-t-0 border-r-0`
      case 'right':
        return `${baseClasses} -right-1.5 top-1/2 -translate-y-1/2 border-b-0 border-l-0`
      default:
        return baseClasses
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-50 pointer-events-none" />
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[60] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-xs w-full animate-fade-in"
        style={{ top: position.top, left: position.left }}
      >
        {/* Arrow */}
        <div className={getArrowClasses()} />
        
        {/* Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white pr-2">
              {currentStep.title}
            </h3>
            <button
              onClick={skipOnboarding}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          
          {/* Content */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            {currentStep.content}
          </p>
          
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {currentStepIndex > 0 && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <ArrowLeftIcon className="h-3 w-3" />
                  Back
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={skipOnboarding}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={nextStep}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
              >
                {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                {currentStepIndex < totalSteps - 1 && <ArrowRightIcon className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom CSS for highlighting */}
      <style jsx global>{`
        .onboarding-highlight {
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          border-radius: 8px;
        }
      `}</style>
    </>
  )
}
