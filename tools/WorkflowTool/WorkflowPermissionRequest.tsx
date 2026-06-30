import React from 'react'
import { FallbackPermissionRequest } from '../../components/permissions/FallbackPermissionRequest.js'
import type { OnPermissionRequestProps } from '../../components/permissions/OnPermissionRequest.js'
export function WorkflowPermissionRequest(
  props: OnPermissionRequestProps,
): React.ReactNode {
  return <FallbackPermissionRequest {...props} />
}
