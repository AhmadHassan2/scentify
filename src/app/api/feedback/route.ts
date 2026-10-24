import { ApiError, parseJson, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getFragranceById } from "@/lib/database/catalog";
import { getUserStore } from "@/lib/database/user-store";
import { feedbackMutationSchema } from "@/lib/validation/schemas";

export const POST = route(async (request) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sign in to save feedback to your account.");
  const { fragranceId, type, action } = await parseJson(request, feedbackMutationSchema);
  if (!(await getFragranceById(fragranceId))) throw new ApiError(404, "Fragrance not found");
  const store = getUserStore();
  if (action === "add") await store.addFeedback(user.id, fragranceId, type);
  else await store.removeFeedback(user.id, fragranceId, type);
  return { feedback: await store.getFeedback(user.id) };
});
