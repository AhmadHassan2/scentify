import { ApiError, parseJson, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getFragranceById } from "@/lib/database/catalog";
import { getUserStore } from "@/lib/database/user-store";
import { collectionMutationSchema } from "@/lib/validation/schemas";

export const POST = route(async (request) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sign in to build your collection.");
  const { fragranceId, action, patch } = await parseJson(request, collectionMutationSchema);
  if (!(await getFragranceById(fragranceId))) throw new ApiError(404, "Fragrance not found");
  const store = getUserStore();
  if (action === "remove") {
    await store.removeFromCollection(user.id, fragranceId);
  } else {
    await store.upsertCollectionItem(user.id, fragranceId, patch);
    // Owning something implies it shouldn't sit on the wishlist anymore.
    await store.removeFromWishlist(user.id, fragranceId);
  }
  const [collection, wishlist] = await Promise.all([store.getCollection(user.id), store.getWishlist(user.id)]);
  return { collection, wishlist };
});
