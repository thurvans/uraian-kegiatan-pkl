import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import {
  PenLine,
  Save,
  Trash2,
} from "../components/icons.jsx";
import { api } from "../api.js";
import { Notice } from "../components/Feedback.jsx";
import { Page } from "../layouts/AppLayout.jsx";

export default function SignaturePage() {
  const canvasRef = useRef(null);
  const padRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/signatures/me").then((result) =>
      setHasSignature(result.data.hasSignature),
    );
    const canvas = canvasRef.current;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1),
        rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      padRef.current?.clear();
    };
    resize();
    padRef.current = new SignaturePad(canvas, {
      minWidth: 1,
      maxWidth: 2.5,
      penColor: "#000000",
    });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      padRef.current?.off();
    };
  }, []);
  const save = async () => {
    if (padRef.current.isEmpty()) {
      setNotice({
        type: "error",
        text: "Gambar tanda tangan terlebih dahulu.",
      });
      return;
    }
    setBusy(true);
    try {
      const result = await api("/signatures/me", {
        method: "PUT",
        body: JSON.stringify({
          imageData: padRef.current.toDataURL("image/png"),
        }),
      });
      setHasSignature(true);
      setNotice({ type: "success", text: result.message });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      title="Tanda tangan mentor"
      description="Buat satu spesimen untuk digunakan saat memvalidasi laporan terpilih."
      eyebrow="Spesimen privat"
    >
      <Notice value={notice} clear={() => setNotice(null)} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="card">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <PenLine size={19} />
            </span>
            <div>
              <h2 className="section-title">Area tanda tangan</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Gunakan mouse, sentuhan, atau stylus.
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-[linear-gradient(to_bottom,transparent_49%,#e2e8f0_50%,transparent_51%)] p-2">
            <canvas
              ref={canvasRef}
              className="h-64 w-full touch-none rounded-xl"
              aria-label="Area gambar tanda tangan"
            />
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-widest text-slate-300">
              Tanda tangan di area ini
            </span>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              className="btn-secondary"
              onClick={() => padRef.current.clear()}
            >
              <Trash2 size={16} /> Bersihkan kanvas
            </button>
            <button className="btn-primary" disabled={busy} onClick={save}>
              <Save size={16} />
              {busy
                ? "Menyimpan…"
                : hasSignature
                  ? "Simpan sebagai versi baru"
                  : "Simpan tanda tangan"}
            </button>
          </div>
        </section>
        <aside className="space-y-4">
          <div className="card">
            <p className="text-sm font-bold text-slate-900">
              Tips hasil terbaik
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
              <li>• Gunakan goresan hitam yang jelas.</li>
              <li>• Sisakan sedikit ruang di tepi kanvas.</li>
              <li>• Hindari tanda tangan terlalu kecil.</li>
            </ul>
          </div>
        </aside>
      </div>
    </Page>
  );
}
