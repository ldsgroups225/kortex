import type { OnboardingContextType } from './onboardingTypes'
import { createContext, use } from 'react'

export const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function useOnboarding() {
  const context = use(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
