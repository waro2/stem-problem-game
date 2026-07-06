/**
 * STEM Problem Game — User profile data contract
 *
 * Shared between src/server/usersRouter.ts (producer) and
 * src/pages/Profile.tsx (consumer).
 */

export interface UpdateUserNamePayload {
  name: string;
}

export interface UpdatedUserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

/** PATCH /api/users/me — update the authenticated user's display name. */
export async function updateUserName(
  apiUrl: string,
  name: string,
  token: string
): Promise<UpdatedUserProfile> {
  const res = await fetch(`${apiUrl}/api/users/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name } satisfies UpdateUserNamePayload),
  });
  if (!res.ok) throw new Error(`Failed to update profile: ${res.status}`);
  return res.json() as Promise<UpdatedUserProfile>;
}
