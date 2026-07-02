"use client";
import { useEffect } from "react";

/**
 * Recover from ChunkLoadError.
 *
 * A JS/CSS chunk can fail to load when:
 *  - the user refreshes mid-compile in dev (Turbopack aborts the in-flight fetch), or
 *  - a new deploy rotates chunk hashes while a client holds a stale page.
 *
 * Both surface as an unhandled ChunkLoadError. We reload the page once to fetch
 * the current chunks, using a sessionStorage guard so a genuinely broken build
 * can't trap the user in a reload loop.
 */
export default function ChunkErrorReload() {
  useEffect(() => {
    const RELOAD_KEY = "chunk-reload-attempt";

    // A successful mount means the current chunks loaded fine — clear the guard
    // so a future (unrelated) chunk error can still trigger a recovery reload.
    try { sessionStorage.removeItem(RELOAD_KEY); } catch {}

    const looksLikeChunkError = (name, message) => {
      if (name === "ChunkLoadError") return true;
      const m = String(message || "");
      return (
        m.includes("ChunkLoadError") ||
        m.includes("Failed to load chunk") ||
        m.includes("Loading chunk") ||
        m.includes("Loading CSS chunk")
      );
    };

    const recover = (reason) => {
      const name = reason && reason.name;
      const message = reason && (reason.message || (typeof reason === "string" ? reason : ""));
      if (!looksLikeChunkError(name, message)) return;
      try {
        if (sessionStorage.getItem(RELOAD_KEY)) return; // already retried — don't loop
        sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {}
      window.location.reload();
    };

    const onRejection = (e) => recover(e && e.reason);
    const onError = (e) => recover((e && e.error) || (e && e.message));

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
