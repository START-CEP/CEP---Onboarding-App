import { Icon } from "@/components/icon";
import { bunnyEmbedUrl } from "@/lib/bunny";
import type { AssetInfo } from "@/lib/data/extra";

/** Video de Bunny con token firmado, o aviso si todavía no está subido / procesado. */
export function Video({ asset, title, locked = false, caption }: { asset?: AssetInfo | null; title: string; locked?: boolean; caption?: string }) {
  if (!locked && asset?.provider === "bunny" && asset.provider_id && asset.provider_library_id && asset.processing_status === "ready") {
    return (
      <div className="video" style={{ display: "block" }}>
        <iframe src={bunnyEmbedUrl(asset.provider_library_id, asset.provider_id)} title={title} loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen
          style={{ border: 0, position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </div>
    );
  }
  const state = locked ? "Bloqueado" : asset?.provider === "bunny" ? "Procesando video…" : "Video pendiente de subir";
  return (
    <div className="video" role="img" aria-label={`Video: ${title}`}>
      <span className="play"><Icon name={locked ? "lock" : "play"} size={26} /></span>
      <div className="cap"><span>{caption ?? title}</span><span>{state}</span></div>
    </div>
  );
}
