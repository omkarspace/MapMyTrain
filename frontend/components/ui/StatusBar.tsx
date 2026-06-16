export default function StatusBar() {
  return (
    <div className="absolute bottom-2 right-2 z-50 flex items-center gap-3">
      <div className="text-[10px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded backdrop-blur-sm">
        ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-sky-400"
        >
          OpenStreetMap
        </a>{" "}
        contributors
      </div>
    </div>
  );
}
