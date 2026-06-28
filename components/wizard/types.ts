import type { ComponentType, Dispatch, ReactNode, SetStateAction } from 'react'

/**
 * A wizard step is rendered as a component with no required props.
 * The step reads/writes shared data through the wizard context.
 */
export type WizardStepComponent<_T = Record<string, unknown>> = ComponentType

/**
 * Value exposed by the wizard context to step components.
 */
export interface WizardContextValue<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  currentStepIndex: number
  totalSteps: number
  wizardData: T
  setWizardData: Dispatch<SetStateAction<T>>
  updateWizardData: (updates: Partial<T>) => void
  goNext: () => void
  goBack: () => void
  goToStep: (index: number) => void
  cancel: () => void
  title?: string
  showStepCounter: boolean
}

/**
 * Props accepted by the WizardProvider.
 */
export interface WizardProviderProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  steps: WizardStepComponent<T>[]
  initialData?: T
  onComplete: (data: T) => void | Promise<void>
  onCancel?: () => void
  children?: ReactNode
  title?: string
  showStepCounter?: boolean
}
