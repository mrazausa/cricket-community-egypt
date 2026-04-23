export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="font-semibold text-slate-900">
            Cricket Community Egypt
          </p>
          <p className="mt-1">
            Premium cricket platform for tournaments, rankings, media, and community archives.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <a href="#" className="hover:text-emerald-700">
            Tournaments
          </a>
          <a href="#" className="hover:text-emerald-700">
            Rankings
          </a>
          <a href="#" className="hover:text-emerald-700">
            Teams
          </a>
          <a href="#" className="hover:text-emerald-700">
            Players
          </a>
          <a href="#" className="hover:text-emerald-700">
            Media
          </a>
          <a href="#" className="hover:text-emerald-700">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}