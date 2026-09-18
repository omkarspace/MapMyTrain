export default function StatusBar() {
  return (
    <div
      className="absolute bottom-2 right-2 z-50 flex items-center gap-3"
      style={{ animation: "fadeIn 0.3s ease-out" }}
    >
      <div
        className="text-[10px] px-2 py-0.5 rounded"
        style={{
          color: "var(--color-text-tertiary)",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-accent)" }}
          className="hover:underline"
        >
          OpenStreetMap
        </a>{" "}
        contributors
      </div>
    </div>
  );
}
