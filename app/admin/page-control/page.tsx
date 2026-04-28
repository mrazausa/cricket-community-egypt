"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

type PageBlock = {
  id: string;
  page_key: string;
  block_key: string;
  block_title: string;
  is_visible: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EditableBlock = {
  block_title: string;
  is_visible: boolean;
  sort_order: string;
};

const EMPTY_NEW_BLOCK = {
  page_key: "",
  block_key: "",
  block_title: "",
  is_visible: true,
  sort_order: "10",
};

function toEditable(row: PageBlock): EditableBlock {
  return {
    block_title: row.block_title ?? "",
    is_visible: row.is_visible !== false,
    sort_order: row.sort_order?.toString() ?? "0",
  };
}

function safeNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminPageControlPage() {
  const [rows, setRows] = useState<PageBlock[]>([]);
  const [formState, setFormState] = useState<Record<string, EditableBlock>>({});
  const [newBlock, setNewBlock] = useState({ ...EMPTY_NEW_BLOCK });
  const [selectedPage, setSelectedPage] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    loadBlocks();
  }, []);

  async function loadBlocks() {
    setLoading(true);
    setMessage("");
    setErrorText("");

    const { data, error } = await supabase
      .from("site_page_blocks")
      .select("*")
      .order("page_key", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      setErrorText(error.message || "Failed to load page blocks.");
      setRows([]);
      setFormState({});
      setLoading(false);
      return;
    }

    const safeRows = (data || []) as PageBlock[];
    setRows(safeRows);

    const nextState: Record<string, EditableBlock> = {};
    for (const row of safeRows) nextState[row.id] = toEditable(row);
    setFormState(nextState);
    setLoading(false);
  }

  function updateField(rowId: string, field: keyof EditableBlock, value: string | boolean) {
    setFormState((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || toEditable(rows.find((r) => r.id === rowId)!)), [field]: value },
    }));
  }

  function updateNewField(field: keyof typeof newBlock, value: string | boolean) {
    setNewBlock((prev) => ({ ...prev, [field]: value }));
  }

  async function saveRow(rowId: string) {
    const current = formState[rowId];
    if (!current) return;
    if (!current.block_title.trim()) {
      setErrorText("Block title is required.");
      return;
    }

    setSavingId(rowId);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("site_page_blocks")
      .update({
        block_title: current.block_title.trim(),
        is_visible: current.is_visible,
        sort_order: safeNumber(current.sort_order),
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);

    if (error) {
      setErrorText(error.message || "Failed to save block.");
      setSavingId(null);
      return;
    }

    setMessage("Page block saved successfully.");
    setSavingId(null);
    loadBlocks();
  }

  async function createBlock() {
    if (!newBlock.page_key.trim() || !newBlock.block_key.trim() || !newBlock.block_title.trim()) {
      setErrorText("Page key, block key and title are required.");
      return;
    }

    setCreating(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("site_page_blocks").insert({
      page_key: newBlock.page_key.trim().toLowerCase().replace(/\s+/g, "_"),
      block_key: newBlock.block_key.trim().toLowerCase().replace(/\s+/g, "_"),
      block_title: newBlock.block_title.trim(),
      is_visible: newBlock.is_visible,
      sort_order: safeNumber(newBlock.sort_order),
    });

    if (error) {
      setErrorText(error.message || "Failed to create block.");
      setCreating(false);
      return;
    }

    setNewBlock({ ...EMPTY_NEW_BLOCK });
    setMessage("Page block created successfully.");
    setCreating(false);
    loadBlocks();
  }

  async function deleteRow(rowId: string) {
    if (!window.confirm("Delete this page block setting?")) return;
    setSavingId(rowId);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("site_page_blocks").delete().eq("id", rowId);
    if (error) {
      setErrorText(error.message || "Failed to delete block.");
      setSavingId(null);
      return;
    }

    setMessage("Page block deleted.");
    setSavingId(null);
    loadBlocks();
  }

  const pageOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.page_key))).sort(), [rows]);
  const filteredRows = selectedPage === "all" ? rows : rows.filter((row) => row.page_key === selectedPage);
  const visibleCount = rows.filter((row) => row.is_visible !== false).length;

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">Admin Control</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Page Block Control</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">
            Control page sections without deleting data. Example: keep /players page alive but hide the Player Directory block until registrations are cleaned.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Blocks" value={rows.length.toString()} />
          <SummaryCard label="Visible Blocks" value={visibleCount.toString()} />
          <SummaryCard label="Hidden Blocks" value={(rows.length - visibleCount).toString()} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        {message ? <MessageBox type="success">{message}</MessageBox> : null}
        {errorText ? <MessageBox type="error">{errorText}</MessageBox> : null}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 sm:p-6">
          <h2 className="text-2xl font-black">Add Page Block</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-6">
            <Input label="Page Key" value={newBlock.page_key} onChange={(v) => updateNewField("page_key", v)} placeholder="players" />
            <Input label="Block Key" value={newBlock.block_key} onChange={(v) => updateNewField("block_key", v)} placeholder="directory" />
            <Input label="Title" value={newBlock.block_title} onChange={(v) => updateNewField("block_title", v)} placeholder="Player Directory" />
            <Input label="Sort" value={newBlock.sort_order} onChange={(v) => updateNewField("sort_order", v)} placeholder="2" />
            <Toggle label="Visible" checked={newBlock.is_visible} onChange={(v) => updateNewField("is_visible", v)} />
            <div className="flex items-end">
              <button
                type="button"
                onClick={createBlock}
                disabled={creating}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Page Blocks</p>
              <h2 className="mt-1 text-2xl font-black">Edit block visibility</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedPage("all")} className={`rounded-2xl px-4 py-2 text-sm font-bold ${selectedPage === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>All</button>
              {pageOptions.map((page) => (
                <button key={page} onClick={() => setSelectedPage(page)} className={`rounded-2xl px-4 py-2 text-sm font-bold ${selectedPage === page ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{page}</button>
              ))}
              <button type="button" onClick={loadBlocks} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Refresh</button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Loading page blocks...</div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">No page blocks found.</div>
          ) : (
            <div className="space-y-4">
              {filteredRows.map((row) => {
                const form = formState[row.id] || toEditable(row);
                return (
                  <div key={row.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 lg:grid-cols-6">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Page</label>
                        <div className="rounded-2xl bg-white px-3 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200">{row.page_key}</div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Block</label>
                        <div className="rounded-2xl bg-white px-3 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200">{row.block_key}</div>
                      </div>
                      <Input label="Title" value={form.block_title} onChange={(v) => updateField(row.id, "block_title", v)} />
                      <Input label="Sort" value={form.sort_order} onChange={(v) => updateField(row.id, "sort_order", v)} />
                      <Toggle label="Visible" checked={form.is_visible} onChange={(v) => updateField(row.id, "is_visible", v)} />
                      <div className="flex items-end gap-2">
                        <button onClick={() => saveRow(row.id)} disabled={savingId === row.id} className="h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                          {savingId === row.id ? "Saving..." : "Save"}
                        </button>
                        <button onClick={() => deleteRow(row.id)} disabled={savingId === row.id} className="h-11 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function MessageBox({ type, children }: { type: "success" | "error"; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${type === "error" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500" />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
    </label>
  );
}
