import { useEffect, useRef } from "react";
import { X, ScanBarcode } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("stocktrace-reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 140 } },
      (decodedText) => {
        onDetected(decodedText);
        scanner.stop().catch(() => {});
      },
      () => {}
    ).catch(() => {});

    return () => {
      scanner.stop().catch(() => {});
      scanner.clear().catch(() => {});
    };
  }, [onDetected]);

  return (
    <div className="overlay">
      <div className="scanner-modal">
        <div className="scanner-head">
          <div>
            <span className="eyebrow">STOCKTRACE SCANNER</span>
            <h2>Scan a barcode</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20}/></button>
        </div>
        <div className="scanner-frame">
          <div id="stocktrace-reader" />
          <div className="scan-line" />
        </div>
        <div className="scanner-tip"><ScanBarcode size={18}/> Center the barcode inside the frame.</div>
      </div>
    </div>
  );
}
