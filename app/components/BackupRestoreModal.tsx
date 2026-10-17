"use client";
import { useRef, useState } from "react";
import { Download, FileJson, FileSpreadsheet, HardDrive, Upload, X } from "lucide-react";
import { usePortfolioStore } from "@/lib/portfolio-store";
import { exportTransactionsToCsv, parseTransactionsFromCsv } from "@/lib/portfolio-math";
import { useUiStore } from "@/lib/ui-store";

export function BackupRestoreModal() {
  const show = useUiStore((s) => s.showBackupRestore);
  const close = useUiStore((s) => s.setShowBackupRestore);

  const buckets = usePortfolioStore((s) => s.buckets);
  const transactions = usePortfolioStore((s) => s.transactions);
  const exportBackup = usePortfolioStore((s) => s.exportBackup);
  const importBackup = usePortfolioStore((s) => s.importBackup);
  const addTransaction = usePortfolioStore((s) => s.addTransaction);

  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  if (!show) return null;

  const handleDownloadJson = () => {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `cryptrack-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ text: "Backup file downloaded successfully!" });
  };

  const handleDownloadCsv = () => {
    const csv = exportTransactionsToCsv(transactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `cryptrack-ledger-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ text: "Transaction ledger CSV downloaded!" });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || (!parsed.buckets && !parsed.transactions)) {
          setMessage({ text: "Invalid backup file format", error: true });
          return;
        }
        const ok = importBackup(parsed);
        if (ok) {
          setMessage({
            text: `Restored ${parsed.buckets?.length || 0} buckets and ${
              parsed.transactions?.length || 0
            } transactions!`,
          });
        } else {
          setMessage({ text: "Failed to parse portfolio state", error: true });
        }
      } catch {
        setMessage({ text: "Corrupted or non-JSON backup file", error: true });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { transactions: parsed, errors } = parseTransactionsFromCsv(text, "core");
        if (!parsed.length) {
          setMessage({
            text: `No valid transactions found in CSV${errors.length ? ` (${errors.length} row errors)` : ""}`,
            error: true,
          });
          return;
        }
        parsed.forEach((tx) => addTransaction(tx));
        const errText = errors.length ? ` (${errors.length} rows skipped)` : "";
        setMessage({ text: `Imported ${parsed.length} transactions from CSV!${errText}` });
      } catch {
        setMessage({ text: "Failed to read CSV file", error: true });
      }
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in"
        onClick={() => close(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <header className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
              <HardDrive size={17} />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Data Backup & Restore</h2>
              <p className="text-xs text-muted">Local-first data management and export</p>
            </div>
          </div>
          <button
            onClick={() => close(false)}
            className="text-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        {message && (
          <div
            className={`mt-4 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
              message.error
                ? "border-down/40 bg-down/10 text-down"
                : "border-up/40 bg-up/10 text-up"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {/* JSON Full Backup */}
          <div className="rounded-xl border border-border/80 bg-surface-2/40 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <FileJson size={16} className="text-accent" />
              <h3 className="text-sm font-semibold">Full Application Backup (JSON)</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-3">
              Exports all {buckets.length} portfolio buckets, {transactions.length} transactions,
              and settings. Completely private and stored locally.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                <Download size={13} /> Export JSON
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
              >
                <Upload size={13} /> Restore from JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* CSV Spreadsheet Export / Import */}
          <div className="rounded-xl border border-border/80 bg-surface-2/40 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <FileSpreadsheet size={16} className="text-emerald-500" />
              <h3 className="text-sm font-semibold">Transaction Ledger (CSV)</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-3">
              Export your historical Buy/Sell/Transfer transactions for tax reporting or spreadsheet
              analysis.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
              >
                <Download size={13} /> Export CSV
              </button>
              <button
                onClick={() => csvInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-2"
              >
                <Upload size={13} /> Import CSV
              </button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
