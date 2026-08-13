import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-canvas px-6 py-8 text-ink sm:px-10 sm:py-10 lg:px-16">
      <section className="mx-auto flex w-full max-w-7xl flex-col justify-between">
        <header className="flex items-center justify-between border-b border-border pb-6">
          <Image
            src="/brand/180dc-uc-davis-landscape-dark.png"
            alt="180 Degrees Consulting at UC Davis"
            width={928}
            height={318}
            priority
            className="h-auto w-52 sm:w-64"
          />
          <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep sm:block">
            Fall 2026
          </p>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-20">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-brand-deep">
              Growth Analyst Program
            </p>
            <h1 className="text-[clamp(6rem,24vw,15rem)] font-bold leading-[0.72] tracking-[-0.09em] text-ink">
              GAP
            </h1>
            <div className="mt-10 h-1 w-24 bg-brand" aria-hidden="true" />
          </div>

          <div className="border-l-2 border-brand pl-6 sm:pl-8">
            <p className="text-xl font-semibold leading-snug text-ink sm:text-2xl">
              A six-week professional development program for UC Davis consultants.
            </p>
            <p className="mt-5 text-base leading-7 text-ink-soft">
              Program materials and member access are coming soon.
            </p>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-border pt-5 text-xs font-medium uppercase tracking-[0.14em] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span>180 Degrees Consulting — UC Davis</span>
          <span>Analyst development</span>
        </footer>
      </section>
    </main>
  );
}
