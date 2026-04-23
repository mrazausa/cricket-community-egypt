"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export default function TournamentDesignAdmin() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    const { data } = await supabase.from("tournaments").select("*");
    setTournaments(data || []);
  };

  const handleSelect = (id: string) => {
    const t = tournaments.find((x) => x.id === id);
    setSelectedId(id);
    setForm(t);
  };

  const handleSave = async () => {
    await supabase.from("tournaments").update(form).eq("id", selectedId);
    alert("Saved Successfully");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Tournament Hero Design</h1>

      <select
        className="border p-2 rounded mb-6 w-full"
        onChange={(e) => handleSelect(e.target.value)}
      >
        <option>Select Tournament</option>
        {tournaments.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>

      {selectedId && (
  <div className="space-y-6">

    {/* CORE INFO */}
    <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow">
      <h2 className="col-span-2 font-bold text-lg">Tournament Info</h2>

      <input
        placeholder="Title"
        value={form.title || ""}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <input
        placeholder="Slug"
        value={form.slug || ""}
        onChange={(e) => setForm({ ...form, slug: e.target.value })}
      />

      <input
        placeholder="Venue"
        value={form.venue || ""}
        onChange={(e) => setForm({ ...form, venue: e.target.value })}
      />

      <input
        placeholder="Format"
        value={form.format || ""}
        onChange={(e) => setForm({ ...form, format: e.target.value })}
      />

      <input
        type="date"
        value={form.start_date || ""}
        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
      />

      <input
        type="date"
        value={form.end_date || ""}
        onChange={(e) => setForm({ ...form, end_date: e.target.value })}
      />
    </div>

    {/* STATUS CONTROL */}
    <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow">
      <h2 className="col-span-2 font-bold text-lg">Status & Visibility</h2>

      <select
        value={form.status || "upcoming"}
        onChange={(e) => setForm({ ...form, status: e.target.value })}
      >
        <option value="upcoming">Upcoming</option>
        <option value="live">Live</option>
        <option value="completed">Completed</option>
      </select>

      <select
        value={form.is_featured_home ? "yes" : "no"}
        onChange={(e) =>
          setForm({ ...form, is_featured_home: e.target.value === "yes" })
        }
      >
        <option value="yes">Featured on Homepage</option>
        <option value="no">Not Featured</option>
      </select>

      <textarea
        className="col-span-2"
        placeholder="Overview / Description"
        value={form.overview || ""}
        onChange={(e) => setForm({ ...form, overview: e.target.value })}
      />
    </div>

    {/* HERO DESIGN (EXISTING) */}
    <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow">
      <h2 className="col-span-2 font-bold text-lg">Hero Design</h2>

      <input
        type="number"
        placeholder="Title Mobile Size"
        value={form.hero_title_font_mobile || ""}
        onChange={(e) =>
          setForm({ ...form, hero_title_font_mobile: Number(e.target.value) })
        }
      />

      <input
        type="number"
        placeholder="Title Desktop Size"
        value={form.hero_title_font_desktop || ""}
        onChange={(e) =>
          setForm({ ...form, hero_title_font_desktop: Number(e.target.value) })
        }
      />

      <input
        type="number"
        placeholder="Logo Mobile Size"
        value={form.hero_logo_size_mobile || ""}
        onChange={(e) =>
          setForm({ ...form, hero_logo_size_mobile: Number(e.target.value) })
        }
      />

      <input
        type="number"
        placeholder="Logo Desktop Size"
        value={form.hero_logo_size_desktop || ""}
        onChange={(e) =>
          setForm({ ...form, hero_logo_size_desktop: Number(e.target.value) })
        }
      />

      <input
        type="number"
        placeholder="Title Max Width"
        value={form.hero_title_max_width || ""}
        onChange={(e) =>
          setForm({ ...form, hero_title_max_width: Number(e.target.value) })
        }
      />

      <select
        value={form.hero_title_align || "center"}
        onChange={(e) =>
          setForm({ ...form, hero_title_align: e.target.value })
        }
      >
        <option value="center">Center</option>
        <option value="left">Left</option>
        <option value="right">Right</option>
      </select>
    </div>

    {/* SAVE BUTTON */}
    <button
      onClick={handleSave}
      className="w-full bg-emerald-600 text-white py-3 rounded-xl"
    >
      Save Tournament Settings
    </button>
  </div>
)}
}