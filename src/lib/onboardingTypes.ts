export interface OnboardingStep {
  id: string
  title: string
  content: string
  targetElement: string
  position: 'top' | 'bottom' | 'left' | 'right'
  page: 'dashboard' | 'notes' | 'snippets' | 'todos' | 'settings'
}

export interface OnboardingContextType {
  isOnboardingActive: boolean
  currentStep: OnboardingStep | null
  currentStepIndex: number
  totalSteps: number
  startOnboarding: () => void
  nextStep: () => void
  prevStep: () => void
  skipOnboarding: () => void
  completeOnboarding: () => void
  isStepVisible: (stepId: string) => boolean
}
