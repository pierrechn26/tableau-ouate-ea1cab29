import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, ExternalLink, RefreshCw, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const DIAGNOSTIC_URL = "https://diagnostic-ouate.lovable.app";

export function DiagnosticPreview() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleRestart = () => {
    // Post a reset message to the iframe, then reload with a fresh key
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "ouate_diagnostic_reset" }, "*");
    } catch (_) { /* cross-origin — ignored */ }
    // Small delay to let the message propagate, then force new iframe
    setTimeout(() => {
      setIframeKey((prev) => prev + 1);
    }, 100);
  };

  const handleOpenExternal = () => {
    window.open(DIAGNOSTIC_URL, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-gradient-to-br from-card via-card to-muted/30 rounded-xl border border-border/50 p-6 shadow-md ${
        isFullscreen ? "fixed inset-4 z-50" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-foreground/5">
            <Eye className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground font-heading">
              Votre diagnostic
            </h3>
            <p className="text-sm text-muted-foreground">
              Prévisualisez l'expérience client en temps réel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button size="sm" onClick={handleRestart}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Recommencer
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 mr-2" />
                Réduire
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 mr-2" />
                Agrandir
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenExternal}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Ouvrir
          </Button>
        </div>
      </div>

      <div 
        className={`relative bg-white rounded-xl border-2 border-foreground/10 overflow-hidden ${
          isFullscreen ? "h-[calc(100%-80px)]" : "h-[600px]"
        }`}
      >
        {/* Browser-like header */}
        <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground truncate">
              {DIAGNOSTIC_URL}
            </div>
          </div>
        </div>

        {/* Iframe — sandbox without allow-same-origin blocks sessionStorage, forcing fresh start */}
        <iframe
          key={iframeKey}
          name={`diagnostic-frame-${iframeKey}`}
          src={DIAGNOSTIC_URL}
          ref={iframeRef}
          className="w-full h-[calc(100%-40px)] border-0"
          title="Diagnostic OUATE"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          tabIndex={-1}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Propulsé par Ask-It × OUATE</span>
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Synchronisé en temps réel
        </span>
      </div>
    </motion.div>
  );
}
