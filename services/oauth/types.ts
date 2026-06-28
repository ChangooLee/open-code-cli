// Shared types for the OAuth client, profile fetching, and referral/passes APIs.

export type SubscriptionType = 'max' | 'pro' | 'enterprise' | 'team'

export type RateLimitTier =
  | 'default_open_code_cli_max_5x'
  | 'default_open_code_cli_max_20x'
  | (string & {})

export type BillingType =
  | 'stripe_subscription'
  | 'stripe_subscription_contracted'
  | 'apple_subscription'
  | 'google_play_subscription'
  | (string & {})

export type OAuthProfileResponse = {
  account: {
    uuid: string
    email: string
    display_name?: string
    created_at?: string
  }
  organization: {
    uuid: string
    organization_type?: string
    rate_limit_tier?: RateLimitTier | null
    has_extra_usage_enabled?: boolean | null
    billing_type?: BillingType | null
    subscription_created_at?: string | null
  }
}

export type OAuthTokens = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  scopes: string[]
  subscriptionType: SubscriptionType | null
  rateLimitTier: RateLimitTier | null
  profile?: OAuthProfileResponse
  tokenAccount?: {
    uuid: string
    emailAddress: string
    organizationUuid?: string
  }
}

export type OAuthTokenExchangeResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  account?: {
    uuid: string
    email_address: string
  }
  organization?: {
    uuid: string
  }
}

export type UserRolesResponse = {
  organization_role: string
  workspace_role: string
  organization_name: string
}

export type ReferralCampaign = 'open_code_cli_guest_pass' | (string & {})

export type ReferrerRewardInfo = {
  currency: string
  amount_minor_units: number
}

export type ReferralEligibilityResponse = {
  eligible: boolean
  referral_code_details?: {
    referral_link?: string
    campaign?: string
  }
  referrer_reward?: ReferrerRewardInfo | null
  remaining_passes?: number
}

export type ReferralRedemptionsResponse = {
  redemptions?: Array<unknown>
  limit?: number
}
