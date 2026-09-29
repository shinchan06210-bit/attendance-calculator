# MS2 Sep-Dec 2026 Attendance Calculator

Static Vercel-ready attendance calculator.

## Features
- Loads the supplied fixed timetable from `schedule.csv`.
- Session 1 and Session 2 are separate attendance events.
- Each present class = 2 attendance counts.
- `-` = no class and cannot be marked.
- Blank schedule cells are treated as schedule not provided and are not counted.
- Subject names A/B/C/D can be customized.
- Attendance is saved in browser localStorage.
- Month and subject filters.
- Export attendance data as JSON.
- Import another CSV from the browser.

## Deploy on Vercel
1. Upload this folder to GitHub.
2. Import the repository in Vercel.
3. Framework preset: Other (or leave auto-detected).
4. Build command: none.
5. Output directory: `.`.
6. Deploy.

The app is intentionally static, so it works without a backend/database. Attendance is stored per browser/device using localStorage.
