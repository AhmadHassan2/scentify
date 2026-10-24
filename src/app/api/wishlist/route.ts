import { ApiError, parseJson, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getFragranceById } from "@/lib/database/catalog";
import { getUserStore } from "@/lib/database/user-store";
import { wishlistMutationSchema } from "@/lib/validation/schemas";

export const POST = route(async (request) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sign in to save fragrances to your wishlist.");
  const { fragranceId, action } = await parseJson(request, wishlistMutationSchema);
  if (!(await getFragranceById(fragranceId))) throw new ApiError(404, "Fragrance not found");
  const store = getUserStore();
  if (action === "add") await store.addToWishlist(user.id, fragranceId);
  else await store.removeFromWishlist(user.id, fragranceId);
  return { wishlist: await store.getWishlist(user.id) };
});
