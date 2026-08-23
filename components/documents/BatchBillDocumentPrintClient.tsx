"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Printer, FileText, Receipt, FileCheck2, ArrowLeft, Files, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { renderMultipleBillsDocumentHtml } from "@/lib/document-template-html";
import type { BillDocumentModel } from "@/lib/bill-document";

type BatchBillDocumentPrintClientProps = {
  documents: BillDocumentModel[];
  initialMode?: "all" | "contract" | "voucher" | "tax50twi";
};

export function BatchBillDocumentPrintClient({
  documents,
  initialMode = "all",
}: BatchBillDocumentPrintClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "contract" | "voucher" | "tax50twi">(initialMode);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState("1800px");

  const renderedHtml = useMemo(() => {
    return renderMultipleBillsDocumentHtml(documents, activeTab);
  }, [documents, activeTab]);

  useEffect(() => {
    function updateHeight() {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
          if (doc && doc.body) {
            const h = doc.body.scrollHeight;
            if (h > 100) {
              setIframeHeight(`${h + 60}px`);
            }
          }
        } catch {}
      }
    }

    const timer = setTimeout(updateHeight, 400);
    return () => clearTimeout(timer);
  }, [renderedHtml]);

  function handlePrint() {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  }

  const pagesPerBill = activeTab === "all" ? 3 : 1;
  const totalPages = documents.length * pagesPerBill;

  return (
    <div className="min-h-screen bg-slate-900/90 text-slate-100 flex flex-col font-sans">
      {/* TOP STICKY TOOLBAR (No Print) */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition border border-slate-700"
          >
            <ArrowLeft size={14} />
            <span>กลับหน้าเลือกเอกสาร</span>
          </Link>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2">
            <Files size={17} className="text-emerald-400" />
            <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>พิมพ์เอกสารชุด</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                {documents.length} บิล
              </span>
              <span className="text-xs text-slate-400 font-normal hidden sm:inline">
                ({totalPages} หน้ากระดาษ A4)
              </span>
            </h1>
          </div>
        </div>

        {/* Mode Selector & Print Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === "all"
                  ? "bg-slate-800 text-white font-medium shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ครบชุด 3 หน้า
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tax50twi")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === "tax50twi"
                  ? "bg-emerald-600 text-white font-medium shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCheck2 size={13} />
              <span>50 ทวิ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contract")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === "contract"
                  ? "bg-slate-800 text-white font-medium shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText size={13} />
              <span>สัญญาจ้าง</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("voucher")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === "voucher"
                  ? "bg-slate-800 text-white font-medium shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Receipt size={13} />
              <span>ใบสำคัญจ่าย</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold rounded-lg shadow-md transition active:scale-95 cursor-pointer"
          >
            <Printer size={16} />
            <span>สั่งพิมพ์ {totalPages} หน้า (Print / PDF)</span>
          </button>
        </div>
      </header>

      {/* DOCUMENT PREVIEW CONTAINER */}
      <main className="flex-1 w-full py-8 px-2 sm:px-6 flex flex-col items-center justify-start print:p-0 print:bg-white">
        <div className="w-full max-w-[225mm] rounded-xl overflow-hidden shadow-2xl border border-slate-700 print:border-none print:shadow-none bg-[#525659]">
          <iframe
            ref={iframeRef}
            srcDoc={renderedHtml}
            title="เอกสารรวมสำหรับพิมพ์"
            className="w-full border-0 block bg-[#525659]"
            style={{ height: iframeHeight, minHeight: "1200px" }}
            onLoad={() => {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                try {
                  const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
                  if (doc && doc.body) {
                    setIframeHeight(`${doc.body.scrollHeight + 60}px`);
                  }
                } catch {}
              }
            }}
          />
        </div>
      </main>
    </div>
  );
}
