"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";
import AdminNav from "@/components/admin/admin-nav";
import { supabase } from "@/utils/supabase/client";

type MenuItem = {
  id: string;
  menu_key: string;
  label: string;
  href: string;
  is_visible: boolean | null;
  sort_order: number | null;
  is_button: boolean | null;
  is_admin_only: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EditableMenuItem = {
  label: string;
  href: string;
  is_visible: boolean;
  sort_order: string;
  is_button: boolean;
  is_admin_only: boolean;
};

const EMPTY_NEW_ITEM: EditableMenuItem & { menu_key: string } = {
  menu_key: "",
  label: "",
  href: "",
  is_visible: true,
  sort_order: "10",
  is_button: false,
  is_admin_only: false,
};

function toEditable(row: MenuItem): EditableMenuItem {
  return {
    label: row.label ?? "",
    href: row.href ?? "",
    is_visible: row.is_visible !== false,
    sort_order: row.sort_order?.toString() ?? "0",
    is_button: row.is_button === true,
    is_admin_only: row.is_admin_only === true,
  };
}

function safeNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminMenuControlPage() {
  const [rows, setRows] = useState<MenuItem[]>([]);
  const [formState, setFormState] = useState<Record<string, EditableMenuItem>>({});
  const [newItem, setNewItem] = useState({ ...EMPTY_NEW_ITEM });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    loadMenuItems();
  }, []);

  async function loadMenuItems() {
    setLoading(true);
    setMessage("");
    setErrorText("");

    const { data, error } = await supabase
      .from("site_menu_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setErrorText(error.message || "Failed to load menu items.");
      setRows([]);
      setFormState({});
      setLoading(false);
      return;
    }

    const safeRows = (data || []) as MenuItem[];
    setRows(safeRows);

    const nextState: Record<string, EditableMenuItem> = {};
    for (const row of safeRows) nextState[row.id] = toEditable(row);
    setFormState(nextState);
    setLoading(false);
  }

  function updateField(rowId: string, field: keyof EditableMenuItem, value: string | boolean) {
    setFormState((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || toEditable(rows.find((r) => r.id === rowId)!)), [field]: value },
    }));
  }

  function updateNewField(field: keyof typeof newItem, value: string | boolean) {
    setNewItem((prev) => ({ ...prev, [field]: value }));
  }

  async function saveRow(rowId: string) {
    const current = formState[rowId];
    if (!current) return;

    if (!current.label.trim() || !current.href.trim()) {
      setErrorText("Label and URL are required.");
      return;
    }

    setSavingId(rowId);
    setMessage("");
    setErrorText("");

    const { error } = await supabase
      .from("site_menu_items")
      .update({
        label: current.label.trim(),
        href: current.href.trim(),
        is_visible: current.is_visible,
        sort_order: safeNumber(current.sort_order),
        is_button: current.is_button,
        is_admin_only: current.is_admin_only,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);

    if (error) {
      setErrorText(error.message || "Failed to save menu item.");
      setSavingId(null);
      return;
    }

    setMessage("Menu item saved successfully. Refresh public page to verify.");
    setSavingId(null);
    loadMenuItems();
  }

  async function createItem() {
    if (!newItem.menu_key.trim() || !newItem.label.trim() || !newItem.href.trim()) {
      setErrorText("Menu key, label and URL are required.");
      return;
    }

    setCreating(true);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("site_menu_items").insert({
      menu_key: newItem.menu_key.trim().toLowerCase().replace(/\s+/g, "_"),
      label: newItem.label.trim(),
      href: newItem.href.trim(),
      is_visible: newItem.is_visible,
      sort_order: safeNumber(newItem.sort_order),
      is_button: newItem.is_button,
      is_admin_only: newItem.is_admin_only,
    });

    if (error) {
      setErrorText(error.message || "Failed to create menu item.");
      setCreating(false);
      return;
    }

    setNewItem({ ...EMPTY_NEW_ITEM });
    setMessage("Menu item created successfully.");
    setCreating(false);
    loadMenuItems();
  }

  async function deleteRow(rowId: string) {
    if (!window.confirm("Delete this menu item?")) return;
    setSavingId(rowId);
    setMessage("");
    setErrorText("");

    const { error } = await supabase.from("site_menu_items").delete().eq("id", rowId);

    if (error) {
      setErrorText(error.message || "Failed to delete menu item.");
      setSavingId(null);
      return;
    }

    setMessage("Menu item deleted.");
    setSavingId(null);
    loadMenuItems();
  }

  const visibleCount = useMemo(() => rows.filter((row) => row.is_visible !== false && row.is_admin_only !== true).length, [rows]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <SiteHeader />
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">Admin Control</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Public Menu Control</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">
            Show, hide and reorder public header menu items without editing code. Use this to hide pages like Players until the registration data is ready.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Items" value={rows.length.toString()} />
          <SummaryCard label="Visible Public Items" value={visibleCount.toString()} />
          <SummaryCard label="Hidden / Admin Only" value={(rows.length - visibleCount).toString()} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        {message ? <MessageBox type="success">{message}</MessageBox> : null}
        {errorText ? <MessageBox type="error">{errorText}</MessageBox> : null}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 sm:p-6">
          <h2 className="text-2xl font-black">Add Menu Item</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-6">
            <Input label="Menu Key" value={newItem.menu_key} onChange={(v) => updateNewField("menu_key", v)} placeholder="players" />
            <Input label="Label" value={newItem.label} onChange={(v) => updateNewField("label", v)} placeholder="Players" />
            <Input label="URL" value={newItem.href} onChange={(v) => updateNewField("href", v)} placeholder="/players" />
            <Input label="Sort" value={newItem.sort_order} onChange={(v) => updateNewField("sort_order", v)} placeholder="5" />
            <Toggle label="Visible" checked={newItem.is_visible} onChange={(v) => updateNewField("is_visible", v)} />
            <Toggle label="Button" checked={newItem.is_button} onChange={(v) => updateNewField("is_button", v)} />
          </div>
          <button
            type="button"
            onClick={createItem}
            disabled={creating}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Menu Item"}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Header Menu</p>
              <h2 className="mt-1 text-2xl font-black">Edit existing items</h2>
            </div>
            <button type="button" onClick={loadMenuItems} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Loading menu items...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">No menu items found.</div>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => {
                const form = formState[row.id] || toEditable(row);
                return (
                  <div key={row.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 lg:grid-cols-6">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Key</label>
                        <div className="rounded-2xl bg-white px-3 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200">{row.menu_key}</div>
                      </div>
                      <Input label="Label" value={form.label} onChange={(v) => updateField(row.id, "label", v)} />
                      <Input label="URL" value={form.href} onChange={(v) => updateField(row.id, "href", v)} />
                      <Input label="Sort" value={form.sort_order} onChange={(v) => updateField(row.id, "sort_order", v)} />
                      <Toggle label="Visible" checked={form.is_visible} onChange={(v) => updateField(row.id, "is_visible", v)} />
                      <Toggle label="Button" checked={form.is_button} onChange={(v) => updateField(row.id, "is_button", v)} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Toggle label="Admin Only" checked={form.is_admin_only} onChange={(v) => updateField(row.id, "is_admin_only", v)} />
                      <button
                        type="button"
                        onClick={() => saveRow(row.id)}
                        disabled={savingId === row.id}
                        className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {savingId === row.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        disabled={savingId === row.id}
                        className="rounded-2xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        Delete
                      </button>
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
