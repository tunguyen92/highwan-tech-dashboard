"use client";

import { type DragEvent, useRef, useState } from "react";

import { cn } from "cn";
import { Archive, FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/lib/i18n/provider";

import { createPayslipZip, readPayslipRows } from "./payslip-zip-export";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PayslipSplitter() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const isComplete = progress.total > 0 && progress.completed === progress.total;
  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  function selectFile(nextFile: File | null) {
    if (!nextFile) return;

    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      toast.error(t("Choose an .xlsx workbook."));
      return;
    }

    setFile(nextFile);
    setProgress({ completed: 0, total: 0 });
  }

  function reset() {
    setFile(null);
    setProgress({ completed: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!isProcessing) selectFile(event.dataTransfer.files[0] ?? null);
  }

  async function handleSplit() {
    if (!file || isProcessing) return;
    setIsProcessing(true);
    setProgress({ completed: 0, total: 0 });

    try {
      const employees = await readPayslipRows(await file.arrayBuffer());
      setProgress({ completed: 0, total: employees.length });
      const zip = await createPayslipZip(employees, (completed, total) => {
        setProgress({ completed, total });
      });
      downloadBlob(zip, `payslips_${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(t("Split and downloaded {count} payslip files.", { count: employees.length }));
    } catch (error) {
      console.error("[payslip ZIP export]", error);
      toast.error(error instanceof Error ? t(error.message) : t("Unable to generate the payslip ZIP."));
      setProgress({ completed: 0, total: 0 });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{t("Split salary workbook")}</CardTitle>
        <CardDescription>
          {t("Upload one salary workbook to generate an individual Excel payslip for each employee.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <input
          ref={inputRef}
          id="salary-workbook"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={isProcessing}
          onChange={(event) => {
            selectFile(event.currentTarget.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />
        <label
          htmlFor="salary-workbook"
          className={cn(
            "block cursor-pointer rounded-xl border border-dashed transition-colors focus-within:outline-none focus-within:ring-3 focus-within:ring-ring/50",
            isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40",
            isProcessing && "pointer-events-none opacity-60",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!isProcessing) setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Empty className="border-0 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">{file ? <FileSpreadsheet /> : <UploadCloud />}</EmptyMedia>
              <EmptyTitle>{file ? file.name : t("Drag and drop your salary workbook")}</EmptyTitle>
              <EmptyDescription>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${t("Click to choose a different file")}`
                  : t("or click to browse. Only .xlsx workbooks are supported.")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <span className="text-muted-foreground text-xs">
                {t("The workbook stays in your browser and is not uploaded to a server.")}
              </span>
            </EmptyContent>
          </Empty>
        </label>

        {progress.total > 0 && (
          <div className="flex flex-col gap-2" aria-live="polite">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium">
                {isComplete ? t("Payslip files ready") : t("Splitting payslip files")}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {progress.completed} / {progress.total}
              </span>
            </div>
            <Progress
              value={percentage}
              aria-label={t("{completed} of {total} payslips split", {
                completed: progress.completed,
                total: progress.total,
              })}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={reset} disabled={!file || isProcessing}>
          <X data-icon="inline-start" />
          {t("Clear")}
        </Button>
        <Button type="button" onClick={() => void handleSplit()} disabled={!file || isProcessing}>
          {isProcessing ? <Spinner /> : <Archive data-icon="inline-start" />}
          {isProcessing
            ? progress.total > 0
              ? t("Splitting {completed} of {total}", {
                  completed: progress.completed,
                  total: progress.total,
                })
              : t("Reading workbook...")
            : isComplete
              ? t("Download ZIP again")
              : t("Split and download ZIP")}
        </Button>
      </CardFooter>
    </Card>
  );
}
