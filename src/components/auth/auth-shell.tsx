export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="page-container grid min-h-[75vh] place-items-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">Scentify account</p>
          <h1 className="font-display text-4xl text-ivory sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-mist">{subtitle}</p>
        </div>
        <div className="surface rounded-2xl p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
