import type { OnboardingContextType } from '../lib/onboardingTypes'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { onboardingSteps } from '../lib/onboardingSteps'
import { OnboardingContext } from '../lib/useOnboarding'

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted')
    const hasSeenApp = localStorage.getItem('hasSeenApp')

    if (!hasSeenApp && !hasCompletedOnboarding) {
      localStorage.setItem('hasSeenApp', 'true')
      // Start onboarding automatically for first-time users after a brief delay
      const timeoutId = setTimeout(() => setIsOnboardingActive(true), 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [])

  const currentStep = isOnboardingActive ? onboardingSteps[currentStepIndex] : null

  const startOnboarding = () => {
    setCurrentStepIndex(0)
    setIsOnboardingActive(true)
  }

  const completeOnboarding = useCallback(() => {
    setIsOnboardingActive(false)
    localStorage.setItem('onboardingCompleted', 'true')
  }, [])

  const nextStep = useCallback(() => {
    if (currentStepIndex < onboardingSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
    else {
      completeOnboarding()
    }
  }, [currentStepIndex, completeOnboarding])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }, [currentStepIndex])

  const skipOnboarding = useCallback(() => {
    setIsOnboardingActive(false)
    localStorage.setItem('onboardingCompleted', 'true')
  }, [])

  const isStepVisible = useCallback((stepId: string) => {
    return isOnboardingActive && currentStep?.id === stepId
  }, [isOnboardingActive, currentStep?.id])

  const value: OnboardingContextType = useMemo(() => ({
    isOnboardingActive,
    currentStep,
    currentStepIndex,
    totalSteps: onboardingSteps.length,
    startOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    isStepVisible,
  }), [isOnboardingActive, currentStep, currentStepIndex, nextStep, prevStep, skipOnboarding, completeOnboarding, isStepVisible])

  return (
    <OnboardingContext value={value}>
      {children}
    </OnboardingContext>
  )
}
