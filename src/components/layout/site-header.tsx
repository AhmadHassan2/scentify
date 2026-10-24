"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dna, Heart, LibraryBig, LogOut, Menu, Sparkles, UserRound } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/overlays";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/fragrances", label: "Browse" },
  { href: "/budget", label: "Budget Finder" },
  { href: "/today", label: "Wear Today" },
  { href: "/chat", label: "Assistant" },
];

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn("relative rounded-full px-3 py-2 text-[0.82rem] transition-colors", active ? "text-ivory" : "text-mist hover:text-ivory")}
    >
      {label}
      {active && <span className="absolute inset-x-3 -bottom-0.5 h-px bg-ivory" />}
    </Link>
  );
}

export function SiteHeader() {
  const { user, ready, wishlist } = useApp();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        scrolled ? "border-ivory/[0.07] bg-ink/80" : "border-transparent bg-transparent",
      )}
    >
      <div className="page-container flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/quiz">
              <Sparkles /> Find your scent
            </Link>
          </Button>

          {user && (
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishlist.length} saved`}
              className="relative hidden size-10 place-items-center rounded-full text-mist transition-colors hover:bg-ivory/5 hover:text-ivory sm:grid"
            >
              <Heart className="size-[1.1rem]" />
              {wishlist.length > 0 && (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-ivory text-[0.6rem] font-semibold text-ink">
                  {wishlist.length}
                </span>
              )}
            </Link>
          )}

          {!ready ? (
            <div className="skeleton size-10 rounded-full" />
          ) : user ? (
            <Dropdown>
              <DropdownTrigger asChild>
                <button
                  aria-label="Account menu"
                  className="grid size-10 cursor-pointer place-items-center rounded-full border border-ivory/12 bg-ivory/[0.04] font-display text-lg text-champagne-soft transition-colors hover:border-champagne/50"
                >
                  {user.displayName.slice(0, 1).toUpperCase()}
                </button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownLabel>Signed in as {user.email}</DropdownLabel>
                <DropdownItem asChild>
                  <Link href="/profile"><Dna /> Fragrance DNA</Link>
                </DropdownItem>
                <DropdownItem asChild>
                  <Link href="/collection"><LibraryBig /> My collection</Link>
                </DropdownItem>
                <DropdownItem asChild>
                  <Link href="/wishlist"><Heart /> Wishlist</Link>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onSelect={() => void logoutAction()}>
                  <LogOut /> Sign out
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </DialogTrigger>
            <DialogContent title="Menu" side="right">
              <nav aria-label="Mobile" className="flex flex-col gap-1">
                <Link href="/quiz" onClick={() => setOpen(false)} className="mb-3 flex items-center justify-center gap-2 rounded-full bg-ivory py-3 text-sm font-medium text-ink">
                  <Sparkles className="size-4" /> Find your scent
                </Link>
                {[...NAV, { href: "/profile", label: "Fragrance DNA" }, { href: "/collection", label: "My Collection" }, { href: "/wishlist", label: "Wishlist" }, { href: "/compare", label: "Compare" }].map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-display text-xl text-parchment hover:bg-ivory/5">
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 border-t border-ivory/10 pt-4">
                  {user ? (
                    <button onClick={() => void logoutAction()} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm text-mist hover:bg-ivory/5">
                      <LogOut className="size-4" /> Sign out ({user.email})
                    </button>
                  ) : (
                    <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-mist hover:bg-ivory/5">
                      <UserRound className="size-4" /> Sign in or create an account
                    </Link>
                  )}
                </div>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
