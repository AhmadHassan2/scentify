import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="border-b border-champagne/10 bg-champagne/[0.05]">
      <p className="page-container py-2 text-center text-[0.7rem] tracking-wide text-champagne-soft/80">
        Demo catalog — every brand, fragrance and price here is fictional.{" "}
        <Link href="/about#data" className="underline decoration-champagne/40 underline-offset-2 hover:text-champagne-soft">
          Learn more
        </Link>
      </p>
    </div>
  );
}
