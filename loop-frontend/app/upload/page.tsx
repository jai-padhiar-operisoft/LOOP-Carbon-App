"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, Download } from "lucide-react";
import { uploadTransactions } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { startLoading } from "@/components/PageLoader";
import Navbar from "@/components/Navbar";
import MilestoneCelebration from "@/components/MilestoneCelebration";

const SAMPLE_CSV = `date,merchant,amount
2024-01-03,Swiggy,450
2024-01-04,Ola Cabs,280
2024-01-05,BESCOM Electricity,1200
2024-01-06,Zomato,380
2024-01-08,Myntra,2100
2024-01-09,IRCTC Train Ticket,850
2024-01-10,Croma Electronics,4500
2024-01-11,Uber,320
2024-01-12,DMart Grocery,1800
2024-01-13,Swiggy,520
2024-01-14,Petrol HP Pump,2200
2024-01-15,Netflix,199
2024-01-16,Namma Metro,45
2024-01-17,Zomato,610
2024-01-18,Amazon Shopping,3200
2024-01-19,Ola Cabs,190
2024-01-20,Cafe Coffee Day,340
2024-01-21,Indigo Airlines,5800
2024-01-22,OYO Rooms,2400
2024-01-23,Swiggy,490`;

export default function UploadPage() {
  const router = useRouter();
  const { ready } = useAuth();
  const [file, setFile]     = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle"|"uploading"|"done"|"error">("idle");
  const [error, setError]   = useState("");
  const [result, setResult] = useState<any>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [newMilestones, setNewMilestones] = useState<any[]>([]);

  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    setUserId(Number(localStorage.getItem("loop_user_id")));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) { setFile(f); setError(""); }
    else setError("Please drop a .csv file");
  }, []);

  async function handleUpload() {
    if (!file || !userId) return;
    setStatus("uploading"); setError("");
    try {
      const data = await uploadTransactions(file, userId);
      setResult(data); setStatus("done");
      localStorage.setItem("loop_result", JSON.stringify(data));
      
      // Check for newly unlocked milestones
      if (data.newly_unlocked_milestones && data.newly_unlocked_milestones.length > 0) {
        setNewMilestones(data.newly_unlocked_milestones);
        setShowMilestones(true);
      }
    } catch (e: any) {
      setError(e.message || "Upload failed"); setStatus("error");
    }
  }

  function downloadSample() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
    a.download = "sample_transactions.csv";
    a.click();
  }

  return (
    <div className="page">
      <Navbar />
      
      {/* Milestone celebration modal */}
      {showMilestones && userId && newMilestones.length > 0 && (
        <MilestoneCelebration
          milestones={newMilestones}
          userId={userId}
          onClose={() => setShowMilestones(false)}
        />
      )}
      
      <div className="wrap-sm" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
        {status === "done" && result ? (
          <div className="fade-up">
            {/* Success state */}
            <div className="card" style={{ textAlign: "center", padding: "48px 40px", borderColor: "rgba(74,222,128,0.2)", background: "linear-gradient(135deg, rgba(22,163,74,0.06), var(--card))" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(74,222,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "1px solid rgba(74,222,128,0.2)" }}>
                <CheckCircle size={28} color="var(--g400)" />
              </div>
              <h2 className="font-black text-white" style={{ fontSize: "22px", marginBottom: "6px" }}>
                {result.transaction_count} transactions analysed
              </h2>
              <p className="text-muted text-sm" style={{ marginBottom: "32px" }}>
                Your carbon footprint is ready.
                {result.columns_detected && (
                  <span style={{ display: "block", marginTop: "6px", fontSize: "12px", color: "var(--text3)" }}>
                    Detected: <span style={{ color: "var(--g400)" }}>{result.columns_detected.merchant}</span> as merchant,{" "}
                    <span style={{ color: "var(--g400)" }}>{result.columns_detected.amount}</span> as amount
                    {result.columns_detected.date && <>, <span style={{ color: "var(--g400)" }}>{result.columns_detected.date}</span> as date</>}
                  </span>
                )}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "32px" }}>
                {[
                  { label: "Loop Score", value: result.score },
                  { label: "kg CO₂", value: result.total_co2 },
                  { label: "Personality", value: result.personality?.name?.split(" ")[0] },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--dark3)", borderRadius: "12px", padding: "16px 12px" }}>
                    <p className="font-black text-green" style={{ fontSize: "22px", lineHeight: 1.1 }}>{value}</p>
                    <p className="text-faint text-xs" style={{ marginTop: "4px" }}>{label}</p>
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={() => { startLoading(); router.push("/dashboard"); }} style={{ justifyContent: "center" }}>
                Open Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="fade-up">
            <h1 className="page-title mb-8" style={{ marginBottom: "8px" }}>Upload transactions</h1>
            <p className="page-sub" style={{ marginBottom: "32px" }}>
              Export a CSV from your bank or UPI app. We classify every merchant automatically.
            </p>

            {/* Drop zone */}
            <div
              className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input id="file-input" type="file" accept=".csv" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(""); } }}
              />
              <div style={{ width: 52, height: 52, borderRadius: "14px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                {file ? <FileText size={24} color="var(--g400)" /> : <Upload size={24} color="var(--text3)" />}
              </div>
              {file ? (
                <>
                  <p className="font-semi text-white" style={{ fontSize: "15px", marginBottom: "4px" }}>{file.name}</p>
                  <p className="text-muted text-sm">{(file.size / 1024).toFixed(1)} KB - click to change</p>
                </>
              ) : (
                <>
                  <p className="font-semi text-white" style={{ fontSize: "15px", marginBottom: "4px" }}>Drop your CSV here</p>
                  <p className="text-muted text-sm">or click to browse</p>
                </>
              )}
            </div>

            {/* Hint */}
            <div style={{ background: "var(--dark2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 18px", marginTop: "14px" }}>
              <p className="text-sm text-muted">
                <span className="text-white font-semi">Works with any bank CSV.</span>{" "}
                HDFC, SBI, ICICI, Axis, Kotak, PhonePe, Google Pay, Paytm and more.
                Our engine detects your columns automatically.
              </p>
            </div>

            {error && <div className="alert-error" style={{ marginTop: "14px" }}><AlertCircle size={14} style={{ display: "inline", marginRight: "6px" }} />{error}</div>}

            <div className="row gap-12" style={{ marginTop: "20px" }}>
              <button className="btn-ghost btn-sm" onClick={downloadSample} style={{ gap: "6px" }}>
                <Download size={14} /> Sample CSV
              </button>
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={!file || status === "uploading"}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {status === "uploading"
                  ? <><span className="spinner" /> Analysing...</>
                  : <>Analyse my footprint <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
