import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page-container flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="font-display text-4xl text-ivory sm:text-5xl">This scent has evaporated.</h1>
      <p className="mt-4 max-w-md text-sm text-mist">We couldn&apos;t find that page or fragrance. It may have been renamed or retired.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/fragrances">Browse fragrances</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/quiz">Take the quiz</Link>
        </Button>
      </div>
    </div>
  );
}
