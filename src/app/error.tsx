"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-container flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow mb-4">Unexpected error</p>
      <h1 className="font-display text-4xl text-ivory sm:text-5xl">This page lost its top notes.</h1>
      <p className="mt-4 max-w-md text-sm text-mist">
        Something went wrong while loading this page. Your saved data is safe. Try again, or head back home.
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
