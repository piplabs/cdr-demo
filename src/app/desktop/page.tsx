export default function DesktopPage() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[5] flex flex-col items-center justify-center text-center">
      <h2 className="bg-gradient-to-br from-white/60 to-white/20 bg-clip-text text-[52px] font-extrabold tracking-[-2px] text-transparent">
        CDR
      </h2>
      <p className="mt-2 text-sm font-medium text-white/20">
        Click an app in the dock or menu bar to begin
      </p>
    </div>
  );
}
