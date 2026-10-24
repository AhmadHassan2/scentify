import { ApiError, parseJson, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserStore } from "@/lib/database/user-store";
import { preferenceProfileSchema } from "@/lib/validation/schemas";

export const POST = route(async (request) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sign in to save preferences to your account.");
  const profile = await parseJson(request, preferenceProfileSchema);
  await getUserStore().savePreferences(user.id, profile);
  return { ok: true, profile };
});
