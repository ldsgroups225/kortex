'use client'
import { useAuthActions } from '@convex-dev/auth/react'
import { EnvelopeIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function SignInForm() {
  const { t } = useTranslation()
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="w-full space-y-6">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitting(true)
          const formData = new FormData(e.target as HTMLFormElement)
          formData.set('flow', flow)
          void signIn('password', formData)
            .then(() => {
              toast.success(
                flow === 'signIn' ? 'Welcome back!' : 'Account created!',
                {
                  description: flow === 'signIn'
                    ? 'You have successfully signed in.'
                    : 'Your account has been created and you are now signed in.',
                },
              )
            })
            .catch((error) => {
              let toastTitle = ''
              if (error.message.includes('Invalid password')) {
                toastTitle = 'Invalid password. Please try again.'
              }
              else {
                toastTitle
                  = flow === 'signIn'
                    ? 'Could not sign in, did you mean to sign up?'
                    : 'Could not sign up, did you mean to sign in?'
              }
              toast.error(toastTitle)
              setSubmitting(false)
            })
        }}
      >
        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              type="email"
              name="email"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('auth.password')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword
                ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )
                : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              )
            : (
                flow === 'signIn' ? t('auth.signIn') : t('auth.signUp')
              )}
        </button>

        {/* Toggle Sign In/Sign Up */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <span>
            {flow === 'signIn'
              ? t('auth.dontHaveAccount')
              : t('auth.alreadyHaveAccount')}
          </span>
          {' '}
          <button
            type="button"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            onClick={() => setFlow(flow === 'signIn' ? 'signUp' : 'signIn')}
          >
            {flow === 'signIn' ? t('auth.signUpInstead') : t('auth.signInInstead')}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">{t('auth.or')}</span>
        </div>
      </div>

      {/* Anonymous Sign In */}
      <button
        type="button"
        className="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        onClick={() => {
          void signIn('anonymous')
            .then(() => {
              toast.success('Signed in anonymously!', {
                description: 'You can start using the app right away.',
              })
            })
            .catch(() => {
              toast.error('Failed to sign in anonymously', {
                description: 'Please try again.',
              })
            })
        }}
      >
        {t('auth.signInAnonymously')}
      </button>
    </div>
  )
}
