import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-[#f7f8f6] px-6 py-8 text-[#434343] sm:px-10 sm:py-10 lg:px-16">
      <section className="mx-auto flex w-full max-w-7xl flex-col justify-between">
        <header className="flex items-center justify-between border-b border-[#434343]/15 pb-6">
          <Image
            src="/brand/180dc-uc-davis-landscape-dark.png"
            alt="180 Degrees Consulting at UC Davis"
            width={928}
            height={318}
            priority
            className="h-auto w-52 sm:w-64"
          />
          <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-[#519D39] sm:block">
            Fall 2026
          </p>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-20">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-[#519D39]">
              Growth Analyst Program
            </p>
            <h1 className="text-[clamp(6rem,24vw,15rem)] font-bold leading-[0.72] tracking-[-0.09em] text-[#434343]">
              GAP
            </h1>
            <div className="mt-10 h-1 w-24 bg-[#55B441]" aria-hidden="true" />
          </div>

          <div className="border-l-2 border-[#55B441] pl-6 sm:pl-8">
            <p className="text-xl font-semibold leading-snug text-[#434343] sm:text-2xl">
              A six-week professional development program for UC Davis consultants.
            </p>
            <p className="mt-5 text-base leading-7 text-[#434343]/70">
              Program materials and member access are coming soon.
            </p>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-[#434343]/15 pt-5 text-xs font-medium uppercase tracking-[0.14em] text-[#434343]/60 sm:flex-row sm:items-center sm:justify-between">
          <span>180 Degrees Consulting — UC Davis</span>
          <span>Analyst development</span>
        </footer>
      </section>
    </main>
  );
}
