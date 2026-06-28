import type * as React from 'react'
export async function computeDefaultInstallDir(): Promise<string> {
  throw new Error('not implemented')
}
export type NewInstallWizardProps = {
  defaultDir: string
  onInstalled: (dir: string) => void
  onCancel: () => void
  onError: (message: string) => void
}
export function NewInstallWizard(_props: NewInstallWizardProps): React.ReactNode {
  throw new Error('not implemented')
}
