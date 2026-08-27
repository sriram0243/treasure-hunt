import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, Upload, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { playScanErrorSound, playScanSuccessSound } from '../utils/soundEffects';

export default function ScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState(null);

  const scannerRef = useRef(null);
  const html5QrCodeInstance = useRef(null);

  useEffect(() => {
    if (isOpen && !showManual) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, showManual]);

  const startCamera = async () => {
    setCameraError(null);
    setScanStatusMsg(null);
    setScanning(true);

    try {
      if (!html5QrCodeInstance.current) {
        html5QrCodeInstance.current = new Html5Qrcode('qr-reader-box');
      }

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0
      };

      await html5QrCodeInstance.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScannedResult(decodedText);
        },
        () => {
          // ignore transient scan frame errors
        }
      );
    } catch (err) {
      console.error('Camera initialization error:', err);
      setScanning(false);
      setCameraError('Camera access is required to scan the Treasure Hunt QR code. Please check device permissions.');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeInstance.current && html5QrCodeInstance.current.isScanning) {
      try {
        await html5QrCodeInstance.current.stop();
        html5QrCodeInstance.current.clear();
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      }
    }
    setScanning(false);
  };

  const handleScannedResult = async (tokenStr) => {
    if (!tokenStr) return;

    // Play scan beep
    playScanSuccessSound();

    // Stop scanner & process payload
    await stopCamera();
    setScanStatusMsg({ type: 'info', message: 'Validating mark with Treasure Vault...' });

    onScanSuccess(tokenStr);
  };

  // Fallback: Scan QR image from file
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (!html5QrCodeInstance.current) {
        html5QrCodeInstance.current = new Html5Qrcode('qr-reader-box-hidden');
      }
      const decodedText = await html5QrCodeInstance.current.scanFile(file, true);
      handleScannedResult(decodedText);
    } catch (err) {
      playScanErrorSound();
      setScanStatusMsg({ type: 'error', message: 'Could not read a valid QR code from the selected image.' });
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScannedResult(manualInput.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0D261E] border-2 border-[#F59E0B] rounded-2xl p-5 shadow-[0_0_40px_rgba(245,158,11,0.3)] text-[#E2E8F0]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/60 mb-4">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-[#FBBF24] animate-pulse" />
            <h3 className="font-heading font-bold text-amber-100 text-base tracking-wider">
              SCAN HIDDEN MARK
            </h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-gray-400 hover:text-amber-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <button
            onClick={() => setShowManual(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !showManual
                ? 'bg-[#F59E0B] text-[#071912] shadow-md'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}
          >
            📷 Live Camera Scanner
          </button>
          <button
            onClick={() => {
              stopCamera();
              setShowManual(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              showManual
                ? 'bg-[#F59E0B] text-[#071912] shadow-md'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}
          >
            🔑 Manual / Upload
          </button>
        </div>

        {/* Status Message Overlay */}
        {scanStatusMsg && (
          <div className={`mb-3 p-3 rounded-lg text-xs font-semibold flex items-center space-x-2 ${
            scanStatusMsg.type === 'error'
              ? 'bg-red-950/80 border border-red-800 text-red-300'
              : 'bg-amber-950/80 border border-amber-800 text-amber-300'
          }`}>
            {scanStatusMsg.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{scanStatusMsg.message}</span>
          </div>
        )}

        {/* Camera Viewport Area */}
        {!showManual && (
          <div className="relative w-full overflow-hidden rounded-xl bg-black border-2 border-amber-900/80 aspect-square flex flex-col items-center justify-center">
            
            {/* HTML5 QR Scanner Container */}
            <div id="qr-reader-box" className="w-full h-full"></div>

            {/* Laser Line Overlay */}
            {scanning && !cameraError && (
              <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-[#FBBF24] to-transparent shadow-[0_0_15px_#FBBF24] animate-laser pointer-events-none z-10" />
            )}

            {/* Corner Target Reticles */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#FBBF24] pointer-events-none"></div>
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#FBBF24] pointer-events-none"></div>
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#FBBF24] pointer-events-none"></div>
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#FBBF24] pointer-events-none"></div>

            {/* Camera Permission Denied Warning */}
            {cameraError && (
              <div className="absolute inset-0 bg-[#0A1813]/95 flex flex-col items-center justify-center p-5 text-center z-20">
                <AlertTriangle className="w-12 h-12 text-amber-400 mb-3 animate-bounce" />
                <h4 className="font-heading font-bold text-amber-200 text-base mb-1">
                  CAMERA PERMISSION REQUIRED
                </h4>
                <p className="text-xs text-gray-300 mb-4 max-w-xs leading-relaxed">
                  {cameraError}
                </p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-[#F59E0B] hover:bg-amber-400 text-[#071912] font-bold text-xs rounded-lg flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>RETRY CAMERA PERMISSION</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Code Entry & Image Upload View */}
        {showManual && (
          <div className="bg-[#071912] p-4 rounded-xl border border-emerald-900 space-y-4">
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center space-x-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Image File</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1E4637] file:text-amber-200 hover:file:bg-emerald-800 cursor-pointer"
              />
            </div>

            <div id="qr-reader-box-hidden" className="hidden"></div>

            <div className="relative my-2 flex items-center justify-center">
              <span className="bg-[#071912] px-2 text-[10px] text-gray-500 uppercase tracking-widest">
                OR PASTE TOKEN MANUALLY
              </span>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center space-x-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Secret Stage Token</span>
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Paste QR Token string here..."
                  className="w-full bg-emerald-950 border border-emerald-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-200 focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#F59E0B] hover:bg-amber-400 text-[#071912] font-bold text-xs rounded-lg transition-transform active:scale-98 shadow-md"
              >
                SUBMIT STAGE MARK TOKEN
              </button>
            </form>
          </div>
        )}

        <p className="text-[11px] text-emerald-400/80 text-center mt-3 font-sans">
          Point phone camera directly at the printed QR code placed on campus.
        </p>

      </div>
    </div>
  );
}
