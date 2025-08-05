'use client'
import { useAuthActions } from '@convex-dev/auth/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function SignInForm() {
  const { t } = useTranslation()
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitting(true)
          const formData = new FormData(e.target as HTMLFormElement)
          formData.set('flow', flow)
          void signIn('password', formData).catch((error) => {
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
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder={t('auth.password')}
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
        </button>
        <div className="text-center text-sm text-secondary">
          <span>
            {flow === 'signIn'
              ? t('auth.dontHaveAccount')
              : t('auth.alreadyHaveAccount')}
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
            onClick={() => setFlow(flow === 'signIn' ? 'signUp' : 'signIn')}
          >
            {flow === 'signIn' ? t('auth.signUpInstead') : t('auth.signInInstead')}
          </button>
        </div>
      </form>
      <div className="flex items-center justify-center my-3">
        <hr className="my-4 grow border-gray-200" />
        <span className="mx-4 text-secondary">{t('auth.or')}</span>
        <hr className="my-4 grow border-gray-200" />
      </div>
      <button type="button" className="auth-button" onClick={() => void signIn('anonymous')}>
        {t('auth.signInAnonymously')}
      </button>
    </div>
  )
}
