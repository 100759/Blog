import { SettingsPreviewCard } from "./settings-preview-card";
import type { ThemePresetDefinition } from "../utils/theme-color";

export function ThemePresetPreview({
  darkLabel,
  description,
  lightLabel,
  onClick,
  preset,
  selected,
  title,
}: {
  darkLabel: string;
  description: string;
  lightLabel: string;
  onClick: () => void;
  preset: ThemePresetDefinition;
  selected: boolean;
  title: string;
}) {
  return (
    <SettingsPreviewCard
      title={title}
      description={description}
      selected={selected}
      onClick={onClick}
      preview={
        <div className="grid w-full grid-cols-2 gap-3">
          <div
            className="rounded-[20px] border p-3"
            style={{
              background: `linear-gradient(180deg, ${preset.light.paper}, ${preset.light.surface})`,
              borderColor: "rgba(0,0,0,0.08)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: preset.light.muted }}>
                {lightLabel}
              </span>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "rgb(var(--theme-rgb))" }} />
            </div>
            <div className="mt-5 rounded-[14px] border p-3" style={{ borderColor: "rgba(0,0,0,0.08)", backgroundColor: `${preset.light.paper}cc` }}>
              <div className="h-2 w-10 rounded-full" style={{ backgroundColor: `${preset.light.ink}22` }} />
              <div className="mt-3 h-8 rounded-[10px]" style={{ backgroundColor: `${preset.light.glow}33` }} />
            </div>
          </div>
          <div
            className="rounded-[20px] border p-3"
            style={{
              background: `linear-gradient(180deg, ${preset.dark.paper}, ${preset.dark.surface})`,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: preset.dark.muted }}>
                {darkLabel}
              </span>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "rgb(var(--theme-rgb))" }} />
            </div>
            <div className="mt-5 rounded-[14px] border p-3" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: `${preset.dark.surface}cc` }}>
              <div className="h-2 w-10 rounded-full" style={{ backgroundColor: `${preset.dark.ink}33` }} />
              <div className="mt-3 h-8 rounded-[10px]" style={{ backgroundColor: `${preset.dark.glow}40` }} />
            </div>
          </div>
        </div>
      }
    />
  );
}
