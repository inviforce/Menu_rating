import React, { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { parse } from "date-fns";

function Sec_app() {
  const fileInputRef = useRef();
  const [menuData, setMenuData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firebaseConfig = {
    apiKey: "AIzaSyAmacVQMKdZZRxgC9rKHX-LHN96L7BiSbA",
    authDomain: "some-23fc5.firebaseapp.com",
    projectId: "some-23fc5",
    storageBucket: "some-23fc5.firebasestorage.app",
    messagingSenderId: "683772900348",
    appId: "1:683772900348:web:8ac72d98c27e0bf3f6f879",
    measurementId: "G-7HQ641M1DQ",
  };

  const sendStructuredDataToFirestore = async (menuData, firebaseConfig) => {
    setIsSubmitting(true);
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const collectionRef = collection(db, "menu_data");

    const combinedData = {};

    for (const [mealType, dateItems] of Object.entries(menuData)) {
      for (const [dateStr, items] of Object.entries(dateItems)) {
        const cleanItems = items.map((item) => item.trim()).filter(Boolean);
        if (!combinedData[dateStr]) {
          combinedData[dateStr] = {};
        }
        const key = normalizeMealType(mealType);
        combinedData[dateStr][key] = cleanItems.join(", ");
      }
    }

    for (const [dateStr, meals] of Object.entries(combinedData)) {
      const parsedDate = parse(dateStr, "dd-MM-yyyy", new Date());
      if (isNaN(parsedDate)) {
        console.error("Invalid date format:", dateStr);
        continue;
      }
      parsedDate.setHours(12, 0, 0, 0);

      const timestampToMatch = Timestamp.fromDate(parsedDate);

      // Query existing docs for this date
      const q = query(collectionRef, where("Day.Day", "==", timestampToMatch));
      const querySnapshot = await getDocs(q);

      // Delete existing docs for this date
      const deletePromises = querySnapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, "menu_data", docSnap.id))
      );
      await Promise.all(deletePromises);

      const docData = {
        Day: {
          Breakfast: meals.Breakfast || "",
          Lunch: meals.Lunch || "",
          Snacks: meals.Snacks || meals.Evening || "",
          Dinner: meals.Dinner || "",
          Day: timestampToMatch,
        },
      };

      console.log("Prepared document:", docData);

      try {
        await addDoc(collectionRef, docData);
        console.log("✅ Uploaded document for:", dateStr);
      } catch (error) {
        console.error("❌ Upload failed:", error);
      }
    }
    setIsSubmitting(false);
  };

  const normalizeMealType = (str) => {
    const lower = str.toLowerCase();
    if (lower === "evening") return "Snacks";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  function parseMenuData(rows) {
    const sectionMap = {
      "BREAKFAST MENU LINE": "breakfast",
      "LUNCH MENU LINE": "lunch",
      "EVENING SNACK MENU LINE": "evening",
      "DINNER MENU LINE": "dinner",
    };

    const dates = Object.entries(rows[0])
      .filter(([key]) => key.startsWith("__EMPTY"))
      .map(([_, value]) => value);

    const result = {
      breakfast: {},
      lunch: {},
      evening: {},
      dinner: {},
    };

    let currentSection = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const label = row["FOOD MENU"];

      if (sectionMap[label]) {
        currentSection = sectionMap[label];
        continue;
      }

      if (!currentSection || !row) continue;

      dates.forEach((date, index) => {
        const key = `__EMPTY${index === 0 ? "" : `_${index}`}`;
        const item = row[key] || "";

        if (!result[currentSection][date]) {
          result[currentSection][date] = [];
        }

        if (item.trim()) {
          result[currentSection][date].push(item.trim());
        }
      });
    }

    return result;
  }

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
      const parsedData = parseMenuData(jsonData);
      setMenuData(parsedData);
      // Upload is only triggered on submit now
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

  const handleSubmit = () => {
    if (!menuData) {
      alert("Please upload a menu file first.");
      return;
    }
    sendStructuredDataToFirestore(menuData, firebaseConfig);
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

      <input
        type="file"
        accept=".xlsx"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <button
        onClick={handleSubmit}
        disabled={!menuData || isSubmitting}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1.5rem",
          fontSize: "1rem",
          cursor: !menuData || isSubmitting ? "not-allowed" : "pointer",
          opacity: !menuData || isSubmitting ? 0.6 : 1,
        }}
      >
        {isSubmitting ? "Submitting..." : "Submit to Firestore"}
      </button>

      {menuData && (
        <div style={{ textAlign: "left", margin: "2rem auto", width: "90%" }}>
          {Object.entries(menuData).map(([section, dates]) => (
            <div key={section}>
              <h2 style={{ textTransform: "capitalize" }}>{section}</h2>
              {Object.entries(dates).map(([date, items]) => (
                <div key={date} style={{ marginBottom: "1rem" }}>
                  <h4>{date}</h4>
                  <ul>
                    {items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Sec_app;
