import React from 'react'
import { FallbackPermissionRequest } from '../../components/permissions/FallbackPermissionRequest.js'
import type { PermissionRequestProps } from '../../components/permissions/PermissionRequest.js'

/**
 * Permission dialog for the Workflow tool. Falls back to the generic permission
 * request UI; workflow-specific affordances are layered on top here.
 */
export function WorkflowPermissionRequest(
  props: PermissionRequestProps,
): React.ReactNode {
  return <FallbackPermissionRequest {...props} />
}
