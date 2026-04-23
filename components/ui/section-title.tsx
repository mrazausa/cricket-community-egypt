type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  actionHref = "#",
}: SectionTitleProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {subtitle}
          </p>
        ) : null}
      </div>

      {actionLabel ? (
        <a
          href={actionHref}
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}