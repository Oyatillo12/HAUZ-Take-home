/**
 * Shapes shared by server and client for the Personal Account, mirroring
 * what the `personal-account` Function returns. Safe to import anywhere.
 */

export const ROLES = ['property_owner', 'realtor'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  property_owner: 'Property Owner',
  realtor: 'Realtor',
}

export interface PersonalAccount {
  id: string
  firstName: string
  lastName: string
  role: Role
  contactEmail: string | null
  bio: string | null
}
