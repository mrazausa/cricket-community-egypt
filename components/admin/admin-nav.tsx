const adminLinks = [
  { label: "Dashboard", href: "/admin" },
  { label: "Registrations", href: "/admin/registrations" },
  { label: "Player Approvals", href: "/admin/player-approvals" },
  { label: "Team Approvals", href: "/admin/team-approvals" },
  { label: "Team Squads", href: "/admin/team-squads" },
  { label: "Squad Linking", href: "/admin/team-squad-linking" },
  { label: "Rankings", href: "/admin/rankings" },
  { label: "Team Rankings", href: "/admin/team-rankings" },
  { label: "Player Rankings", href: "/admin/player-rankings" },
];

export default function AdminNav() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="overflow-x-auto rounded-2xl bg-white shadow-md ring-1 ring-slate-200">
        <div className="flex min-w-max gap-2 p-3">
          {adminLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}