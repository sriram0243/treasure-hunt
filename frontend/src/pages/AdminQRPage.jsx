import React, { useEffect, useState } from 'react';
import { Download, Printer, ArrowLeft, QrCode, Sparkles } from 'lucide-react';
import { api } from '../api/client';

export default function AdminQRPage({ onBackToDashboard }) {
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQRs();
  }, []);

  const fetchQRs = async () => {
    setLoading(true);
    try {
      const res = await api.getQRCodes();
      if (res.success) {
        setQrs(res.qr_codes);
      }
    } catch (err) {
      console.error('Error fetching QRs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#F59E0B]/30 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <QrCode className="w-6 h-6 text-[#FBBF24]" />
            <h2 className="text-2xl font-bold font-heading text-amber-200">
              QR CODE MANAGEMENT
            </h2>
          </div>
          <p className="text-xs text-emerald-300">
            Download high-resolution PNG/SVG QR codes or generate printable sheets.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrintAll}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-[#FBBF24] text-[#071912] font-bold text-xs rounded-xl hover:brightness-110 transition-transform active:scale-95 flex items-center space-x-2 shadow-lg"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT ALL 7 QR CODES</span>
          </button>

          <button
            onClick={onBackToDashboard}
            className="px-4 py-2.5 bg-[#0D261E] border border-emerald-800 text-amber-300 font-bold text-xs rounded-xl flex items-center space-x-2 hover:bg-emerald-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO DASHBOARD</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold text-black uppercase tracking-wider font-heading">
          COLLEGE TREASURE HUNT — OFFICIAL STAGE QR MARKS
        </h1>
        <p className="text-xs text-gray-600">
          Print out these 7 stage marks and place them at designated campus landmarks.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-amber-300 font-heading">
          LOADING HIGH-RES STAGE QR CODES...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrs.map((qr) => (
            <div
              key={qr.id}
              className="bg-[#0D261E] border-2 border-[#F59E0B]/50 rounded-3xl p-5 shadow-xl flex flex-col items-center text-center space-y-4 print:border-4 print:border-black print:bg-white print:text-black print:shadow-none break-inside-avoid"
            >
              <div className="w-full flex items-center justify-between pb-2 border-b border-amber-900/60 print:border-black">
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest print:text-black">
                  QR CODE 0{qr.stage_number}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800 print:border-black print:bg-gray-200 print:text-black">
                  STAGE 0{qr.stage_number}
                </span>
              </div>

              <h3 className="font-heading font-bold text-amber-100 text-lg print:text-black">
                {qr.title}
              </h3>

              {/* QR Image Display */}
              <div className="bg-white p-3 rounded-2xl shadow-inner border border-gray-300 w-48 h-48 flex items-center justify-center">
                <img
                  src={qr.png_url}
                  alt={`Stage ${qr.stage_number} QR Code`}
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-xs text-emerald-200/80 italic line-clamp-2 px-2 print:text-gray-700">
                "{qr.mission}"
              </p>

              {/* Download Buttons (hidden during print) */}
              <div className="w-full pt-2 flex items-center justify-center gap-2 print:hidden">
                <a
                  href={qr.png_url}
                  download={qr.png_filename}
                  className="flex-1 py-2 px-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-amber-300 font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </a>
                <a
                  href={qr.svg_url}
                  download={qr.svg_filename}
                  className="flex-1 py-2 px-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-amber-300 font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>SVG</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
