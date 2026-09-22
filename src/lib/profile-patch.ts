import type { PersonalAccount } from '#/lib/personal-account'

export interface ProfileForm {
  firstName: string
  lastName: string
  contactEmail: string
  bio: string
}

export interface ProfilePatch {
  firstName?: string
  lastName?: string
  contactEmail?: string | null
  bio?: string | null
}

export function toForm(account: PersonalAccount): ProfileForm {
  return {
    firstName: account.firstName,
    lastName: account.lastName,
    contactEmail: account.contactEmail ?? '',
    bio: account.bio ?? '',
  }
}

/**
 * Only what changed goes to the Function. An untouched field is omitted
 * (kept), an optional field emptied in the form is sent as null (cleared).
 * The Function rejects "" on purpose, so it is never sent.
 */
export function buildProfilePatch(
  current: PersonalAccount,
  form: ProfileForm,
): ProfilePatch {
  const patch: ProfilePatch = {}

  const firstName = form.firstName.trim()
  if (firstName !== current.firstName) patch.firstName = firstName

  const lastName = form.lastName.trim()
  if (lastName !== current.lastName) patch.lastName = lastName

  const contactEmail = form.contactEmail.trim() || null
  if (contactEmail !== current.contactEmail) patch.contactEmail = contactEmail

  const bio = form.bio.trim() || null
  if (bio !== current.bio) patch.bio = bio

  return patch
}
