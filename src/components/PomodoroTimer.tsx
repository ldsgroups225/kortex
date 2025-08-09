/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import {
  ClockIcon,
  FlagIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PomodoroTimerProps {
  todoTitle: string
  onClose: () => void
  onComplete: () => void
}

interface PomodoroSettings {
  workDuration: number // minutes
  shortBreakDuration: number // minutes
  longBreakDuration: number // minutes
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartSessions: boolean
  soundNotifications: boolean
}

type TimerPhase = 'work' | 'shortBreak' | 'longBreak'

interface TimerState {
  phase: TimerPhase
  timeLeft: number // seconds
  isRunning: boolean
  currentSession: number
  totalSessions: number
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartSessions: false,
  soundNotifications: true,
}

export function PomodoroTimer({ todoTitle, onClose, onComplete }: PomodoroTimerProps) {
  const { t } = useTranslation()
  const [settings] = useState<PomodoroSettings>(DEFAULT_SETTINGS)
  const [timer, setTimer] = useState<TimerState>({
    phase: 'work',
    timeLeft: DEFAULT_SETTINGS.workDuration * 60,
    isRunning: false,
    currentSession: 1,
    totalSessions: DEFAULT_SETTINGS.sessionsUntilLongBreak,
  })
  const [shouldCompletePhase, setShouldCompletePhase] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get current phase duration in seconds
  const getPhaseDuration = useCallback((phase: TimerPhase): number => {
    switch (phase) {
      case 'work':
        return settings.workDuration * 60
      case 'shortBreak':
        return settings.shortBreakDuration * 60
      case 'longBreak':
        return settings.longBreakDuration * 60
    }
  }, [settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration])

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (settings.soundNotifications) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.5)
    }
  }, [settings.soundNotifications])

  // Start the timer
  const startTimer = () => {
    setTimer(prev => ({ ...prev, isRunning: true }))
  }

  // Pause the timer
  const pauseTimer = () => {
    setTimer(prev => ({ ...prev, isRunning: false }))
  }

  // Stop the timer and reset
  const stopTimer = () => {
    setTimer({
      phase: 'work',
      timeLeft: settings.workDuration * 60,
      isRunning: false,
      currentSession: 1,
      totalSessions: settings.sessionsUntilLongBreak,
    })
  }

  // Handle phase completion logic
  useEffect(() => {
    if (shouldCompletePhase) {
      setShouldCompletePhase(false)

      const { phase, currentSession } = timer
      playNotificationSound()

      if (phase === 'work') {
        // Work session completed
        if (currentSession >= settings.sessionsUntilLongBreak) {
          // Time for long break
          const longBreakDuration = getPhaseDuration('longBreak')
          setTimer(prev => ({
            ...prev,
            phase: 'longBreak' as TimerPhase,
            timeLeft: longBreakDuration,
            isRunning: settings.autoStartBreaks,
          }))
        }
        else {
          // Time for short break
          const shortBreakDuration = getPhaseDuration('shortBreak')
          setTimer(prev => ({
            ...prev,
            phase: 'shortBreak' as TimerPhase,
            timeLeft: shortBreakDuration,
            isRunning: settings.autoStartBreaks,
          }))
        }
      }
      else {
        // Break completed, back to work
        const isLongBreak = phase === 'longBreak'
        const nextSession = isLongBreak ? 1 : currentSession + 1

        if (isLongBreak && currentSession >= settings.sessionsUntilLongBreak) {
          // All sessions completed
          onComplete()
          return
        }

        const workDuration = getPhaseDuration('work')
        setTimer(prev => ({
          ...prev,
          phase: 'work' as TimerPhase,
          timeLeft: workDuration,
          currentSession: nextSession,
          isRunning: settings.autoStartSessions,
        }))
      }
    }
  }, [shouldCompletePhase, settings.autoStartBreaks, settings.autoStartSessions, settings.sessionsUntilLongBreak, getPhaseDuration, playNotificationSound, timer, onComplete])

  // Complete current phase and move to next
  const completePhase = useCallback(() => {
    setShouldCompletePhase(true)
  }, [])

  // Skip current phase
  const skipPhase = () => {
    completePhase()
  }

  // Timer countdown effect
  useEffect(() => {
    if (timer.isRunning && timer.timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1,
        }))
      }, 1000)
    }
    else if (timer.timeLeft === 0 && !shouldCompletePhase) {
      completePhase()
    }
    else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timer.isRunning, timer.timeLeft, shouldCompletePhase, completePhase])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Calculate progress percentage
  const getProgress = (): number => {
    const totalTime = getPhaseDuration(timer.phase)
    return ((totalTime - timer.timeLeft) / totalTime) * 100
  }

  // Get phase display info
  const getPhaseInfo = () => {
    switch (timer.phase) {
      case 'work':
        return {
          title: t('todos.pomodoro.workSession'),
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          progressColor: 'bg-red-500',
        }
      case 'shortBreak':
        return {
          title: t('todos.pomodoro.shortBreak'),
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          progressColor: 'bg-green-500',
        }
      case 'longBreak':
        return {
          title: t('todos.pomodoro.longBreak'),
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          progressColor: 'bg-blue-500',
        }
    }
  }

  const phaseInfo = getPhaseInfo()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border ${phaseInfo.borderColor}`}>
        {/* Header */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${phaseInfo.bgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FlagIcon className={`h-5 w-5 ${phaseInfo.color}`} />
              <h2 className={`font-medium ${phaseInfo.color}`}>
                {t('todos.pomodoro.focusMode')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="p-6">
          {/* Current Task */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {timer.phase === 'work' ? t('todos.pomodoro.workingOn') : phaseInfo.title}
            </p>
            {timer.phase === 'work' && (
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {todoTitle}
              </h3>
            )}
          </div>

          {/* Timer Circle */}
          <div className="relative mx-auto mb-6" style={{ width: '200px', height: '200px' }}>
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className={phaseInfo.color}
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgress() / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100">
                {formatTime(timer.timeLeft)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('todos.pomodoro.timeRemaining')}
              </div>
            </div>
          </div>

          {/* Session Counter */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <ClockIcon className="h-4 w-4" />
              <span>
                {t('todos.pomodoro.session')}
                {' '}
                {timer.currentSession}
                {' '}
                /
                {' '}
                {timer.totalSessions}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-3">
            {!timer.isRunning
              ? (
                  <button
                    type="button"
                    onClick={startTimer}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${phaseInfo.color} ${phaseInfo.bgColor} hover:opacity-80`}
                  >
                    <PlayIcon className="h-4 w-4" />
                    <span>{timer.timeLeft === getPhaseDuration(timer.phase) ? t('common.start') : t('todos.pomodoro.resume')}</span>
                  </button>
                )
              : (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg font-medium hover:opacity-80 transition-colors"
                  >
                    <PauseIcon className="h-4 w-4" />
                    <span>{t('todos.pomodoro.pause')}</span>
                  </button>
                )}

            <button
              type="button"
              onClick={stopTimer}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-medium hover:opacity-80 transition-colors"
            >
              <StopIcon className="h-4 w-4" />
              <span>{t('todos.pomodoro.stop')}</span>
            </button>

            <button
              type="button"
              onClick={skipPhase}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-medium hover:opacity-80 transition-colors"
            >
              <ForwardIcon className="h-4 w-4" />
              <span>{t('todos.pomodoro.skip')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
