import type * as React from 'react'

/**
 * Computes the default directory the assistant install wizard should target.
 */
export async function computeDefaultInstallDir(): Promise<string> {
  throw new Error('not implemented')
}

export type NewInstallWizardProps = {
  defaultDir: string
  onInstalled: (dir: string) => void
  onCancel: () => void
  onError: (message: string) => void
}

/**
 * Interactive wizard that installs the assistant into a chosen directory.
 */
export function NewInstallWizard(_props: NewInstallWizardProps): React.ReactNode {
  throw new Error('not implemented')
}
