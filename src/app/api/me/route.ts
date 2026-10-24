import { NextResponse } from "next/server";
import type { MeResponseDTO } from "@/types/dto";
import { getCurrentUser } from "@/lib/auth/session";
import { publicConfig } from "@/lib/config";
import { getUserStore } from "@/lib/database/user-store";
import { handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Everything the client needs to hydrate the signed-in experience. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const config = publicConfig();
    if (!user) {
      const body: MeResponseDTO = { user: null, profile: null, feedback: [], wishlist: [], collection: [], config };
      return NextResponse.json(body);
    }
    const store = getUserStore();
    const [profile, feedback, wishlist, collection] = await Promise.all([
      store.getPreferences(user.id),
      store.getFeedback(user.id),
      store.getWishlist(user.id),
      store.getCollection(user.id),
    ]);
    const body: MeResponseDTO = { user, profile, feedback, wishlist, collection, config };
    return NextResponse.json(body);
  } catch (error) {
    return handleApiError(error);
  }
}
