/** Decoração discreta no canto inferior esquerdo (referência visual estilo marketing enterprise). */
export function EnterprisePageBackdrop() {
  const ascii = [
    "·+··+·+··+·",
    "·+·+·+·+·+·",
    "+·+·+·+·+·+",
    "·+··+·+··+",
    "+·+·+·+·+·",
    "··+·+·+··",
    "·+·+·+·+·+",
  ].join("\n");

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <pre
        className="pointer-events-none fixed bottom-8 left-4 hidden max-h-[40vh] overflow-hidden font-mono text-[8px] leading-[1.15] tracking-tight text-white/[0.12] sm:block lg:text-[9px]"
        aria-hidden
      >
        {ascii}
        {"\n"}
        {ascii}
      </pre>
    </>
  );
}
