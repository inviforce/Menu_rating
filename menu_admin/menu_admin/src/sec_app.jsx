import React, { useCallback, useRef } from "react";
import * as XLSX from "xlsx";

function Sec_app() {
  const fileInputRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.name.endsWith(".xlsx")) {
      alert("Please upload a valid .xlsx file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      console.log("Excel Data:", jsonData);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    handleFile(file);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const openFileDialog = () => {
    fileInputRef.current.click();
  };

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={openFileDialog}
        style={{
          border: "2px dashed #888",
          padding: "40px",
          borderRadius: "8px",
          cursor: "pointer",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h3>Click or Drag and drop your Excel (.xlsx) file here</h3>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        accept=".xlsx"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}

export default Sec_app;
