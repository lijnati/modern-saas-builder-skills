/**
 * Type-safe SaaS Analytics Event Taxonomy for PostHog / Mixpanel.
 * Tracks user activation, value realization, conversion funnel, and retention.
 */

export type SaasEvent =
  | { name: 'user_signed_up'; properties: { method: 'google' | 'github' | 'email'; source?: string } }
  | { name: 'onboarding_step_completed'; properties: { stepNumber: number; stepName: string } }
  | { name: 'core_value_action_performed'; properties: { actionType: string; latencyMs?: number; count?: number } }
  | { name: 'upgrade_modal_viewed'; properties: { trigger: string; currentPlan: string } }
  | { name: 'checkout_initiated'; properties: { targetPlan: string; interval: 'monthly' | 'yearly' } }
  | { name: 'team_member_invited'; properties: { role: string } }
  | { name: 'api_key_generated'; properties: { name: string } };

export interface AnalyticsClient {
  capture: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, userProperties?: Record<string, any>) => void;
  group: (groupType: string, groupKey: string, groupProperties?: Record<string, any>) => void;
}

/**
 * Helper to dispatch type-safe SaaS events
 */
export function trackEvent(client: AnalyticsClient, event: SaasEvent) {
  client.capture(event.name, event.properties);
}

/**
 * Identify a user and associate them with their organization/tenant group.
 */
export function identifyUserWithTenant(
  client: AnalyticsClient,
  userId: string,
  userProps: { email: string; name?: string; role?: string },
  tenantProps: { organizationId: string; organizationName: string; plan: string }
) {
  client.identify(userId, userProps);
  client.group('organization', tenantProps.organizationId, {
    name: tenantProps.organizationName,
    plan: tenantProps.plan,
  });
}
