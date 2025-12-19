const express = require("express");
const XLSX = require("xlsx");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = "./timetable_database.xlsx";


function readSheet(sheetName) {
    try {
        const wb = XLSX.readFile(DB_FILE);
        if (!wb.SheetNames.includes(sheetName)) return [];
        return XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    } catch (err) {
        return [];
    }
}

function writeSheet(sheetName, data) {
    let wb;
    try {
        wb = XLSX.readFile(DB_FILE);
    } catch {
        wb = XLSX.utils.book_new();
    }

    const ws = XLSX.utils.json_to_sheet(data);

    wb.Sheets[sheetName] = ws;
    if (!wb.SheetNames.includes(sheetName)) {
        wb.SheetNames.push(sheetName);
    }

    XLSX.writeFile(wb, DB_FILE);
}

function cleanTimetable(data) {
    const blockedDays = ["Fri", "Sat"];

    return data.filter(row =>
        row.year &&
        row.day &&
        row.period &&
        row.subject &&
        row.teacher_id &&
        row.subject !== "Free" &&
        !blockedDays.includes(row.day)
    );
}



app.post("/add_user", (req, res) => {
    const { id, name, role, year } = req.body;

    if (!id || !name || !role) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const users = readSheet("users");

    const exists = users.find(u => String(u.id) === String(id));
    if (exists) {
        return res.status(409).json({ error: "User already exists" });
    }

    users.push({ id, name, role, year });
    writeSheet("users", users);

    res.json({ message: "User added successfully" });
});



app.post("/login", (req, res) => {
    const { id, name } = req.body;

    if (!id || !name) {
        return res.status(400).json({ error: "Missing credentials" });
    }

    const users = readSheet("users");
    const user = users.find(
        u => String(u.id) === String(id) && u.name === name
    );

    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
        role: user.role,
        year: user.year
    });
});



app.post("/add_timetable", (req, res) => {
    let timetableData = req.body;

    if (!Array.isArray(timetableData)) {
        return res.status(400).json({ error: "Timetable must be an array" });
    }

    
    timetableData = cleanTimetable(timetableData);

    writeSheet("timetable", timetableData);

    res.json({ message: "Timetable saved successfully" });
});




app.post("/student_timetable", (req, res) => {
    const { year } = req.body;

    if (!year) {
        return res.status(400).json({ error: "Missing year" });
    }

    const timetable = readSheet("timetable");

    const result = timetable.filter(t =>
        String(t.year).trim() === String(year).trim()
    );

    res.json(result);
});




app.post("/staff_timetable", (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: "Missing staff id" });
    }

    const timetable = readSheet("timetable");

    const result = timetable.filter(t =>
        String(t.teacher_id).trim() === String(id).trim()
    );

    res.json(result);
});



app.listen(5000, () => {
    console.log("✅ Server running on http://localhost:5000");
});