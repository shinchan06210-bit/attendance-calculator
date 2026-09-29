/* =========================================================
   ATTENDANCE CALCULATOR
   MS2 Sep-Dec 2026 (UG)
========================================================= */


/* =========================================================
   CONSTANTS
========================================================= */

const SUBJECT_CODES = ["A", "B", "C", "D"];

const DEFAULT_ELIGIBILITY = 80;

const DEFAULT_COURSES = {

    A: {
        code: "Course Code",
        name: "Course Name"
    },

    B: {
        code: "Course Code",
        name: "Course Name"
    },

    C: {
        code: "Course Code",
        name: "Course Name"
    },

    D: {
        code: "Course Code",
        name: "Course Name"
    }

};


/*
    Attendance windows

    Each attendance marking = 1 count
*/

const ATTENDANCE_WINDOWS = [

    {
        session: 1,
        start: "02:00",
        end: "02:31"
    },

    {
        session: 1,
        start: "09:30",
        end: "09:44"
    },

    {
        session: 2,
        start: "12:00",
        end: "12:14"
    },

    {
        session: 2,
        start: "13:30",
        end: "13:44"
    }

];


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEYS = {

    settings:
        "attendance_settings_v5",

    records:
        "attendance_records_v5"

};


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let settings = loadSettings();

let attendanceRecords = loadRecords();

let scheduleData = [];

let calendarDate = new Date();

let timetableView = "month";

let activeAttendanceWindow = null;


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadSchedule();

        updateEverything();

        setInterval(() => {
            updateClockAndActiveWindow();
            
            renderSlotCards();
            
            renderTodaySchedule();
            
            renderTodayRecords();
            
            updateHeaderEligibility();

    },1000);

    }
);


/* =========================================================
   DEFAULT SETTINGS
========================================================= */

function getDefaultSettings() {

    return {

        eligibility:
            DEFAULT_ELIGIBILITY,

        courses:
            JSON.parse(
                JSON.stringify(
                    DEFAULT_COURSES
                )
            ),

        manual: {

            A: {
                absent: 0,
                facultyMissed: 0
            },

            B: {
                absent: 0,
                facultyMissed: 0
            },

            C: {
                absent: 0,
                facultyMissed: 0
            },

            D: {
                absent: 0,
                facultyMissed: 0
            }

        }

    };

}


/* =========================================================
   LOAD SETTINGS
========================================================= */

function loadSettings() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEYS.settings
            );

        if (!saved) {

            return getDefaultSettings();

        }

        const parsed =
            JSON.parse(saved);

        const defaults =
            getDefaultSettings();


        return {

            ...defaults,

            ...parsed,

            courses: {

                A: {
                    ...defaults.courses.A,
                    ...(
                        parsed.courses?.A || {}
                    )
                },

                B: {
                    ...defaults.courses.B,
                    ...(
                        parsed.courses?.B || {}
                    )
                },

                C: {
                    ...defaults.courses.C,
                    ...(
                        parsed.courses?.C || {}
                    )
                },

                D: {
                    ...defaults.courses.D,
                    ...(
                        parsed.courses?.D || {}
                    )
                }

            },

            manual: {

                A: {
                    ...defaults.manual.A,
                    ...(
                        parsed.manual?.A || {}
                    )
                },

                B: {
                    ...defaults.manual.B,
                    ...(
                        parsed.manual?.B || {}
                    )
                },

                C: {
                    ...defaults.manual.C,
                    ...(
                        parsed.manual?.C || {}
                    )
                },

                D: {
                    ...defaults.manual.D,
                    ...(
                        parsed.manual?.D || {}
                    )
                }

            }

        };

    }

    catch (error) {

        console.error(
            "Settings loading error:",
            error
        );

        return getDefaultSettings();

    }

}


/* =========================================================
   SAVE SETTINGS
========================================================= */

function saveSettingsToStorage() {

    localStorage.setItem(

        STORAGE_KEYS.settings,

        JSON.stringify(settings)

    );

}


/* =========================================================
   LOAD ATTENDANCE RECORDS
========================================================= */

function loadRecords() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEYS.records
            );

        if (!saved) {

            return [];

        }

        const parsed =
            JSON.parse(saved);

        return Array.isArray(parsed)
            ? parsed
            : [];

    }

    catch (error) {

        console.error(
            "Records loading error:",
            error
        );

        return [];

    }

}


/* =========================================================
   SAVE ATTENDANCE RECORDS
========================================================= */

function saveRecords() {

    localStorage.setItem(

        STORAGE_KEYS.records,

        JSON.stringify(
            attendanceRecords
        )

    );

}


/* =========================================================
   CSV SCHEDULE
========================================================= */

async function loadSchedule() {

    try {

        const response =
            await fetch(
                "schedule.csv",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not load schedule.csv"
            );

        }


        const csvText =
            await response.text();


        scheduleData =
            parseCSV(csvText);


        console.log(
            "Schedule loaded:",
            scheduleData
        );


    }

    catch (error) {

        console.error(error);

        scheduleData = [];


        const container =
            document.getElementById(
                "todaySchedule"
            );


        if (container) {

            container.innerHTML = `

                <div class="no-class-card">

                    ⚠️ Could not load schedule.csv.

                    <br><br>

                    Make sure schedule.csv is in the
                    same folder as index.html.

                </div>

            `;

        }

    }

}


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(text) {

    const lines =

        text
            .replace(/\r/g, "")
            .split("\n")
            .filter(
                line =>
                    line.trim() !== ""
            );


    if (lines.length < 2) {

        return [];

    }


    const headers =
        parseCSVLine(
            lines[0]
        );


    return lines

        .slice(1)

        .map(line => {

            const values =
                parseCSVLine(line);

            const row = {};


            headers.forEach(
                (header, index) => {

                    row[
                        header.trim()
                    ] =
                        (
                            values[index] ||
                            ""
                        ).trim();

                }
            );


            return row;

        })

        .filter(
            row => row.Date
        );

}


/* =========================================================
   CSV LINE PARSER
========================================================= */

function parseCSVLine(line) {

    const result = [];

    let current = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < line.length;
        i++
    ) {

        const char =
            line[i];


        if (char === '"') {

            insideQuotes =
                !insideQuotes;

        }

        else if (
            char === "," &&
            !insideQuotes
        ) {

            result.push(
                current
            );

            current = "";

        }

        else {

            current += char;

        }

    }


    result.push(current);


    return result;

}


/* =========================================================
   DATE HELPERS
========================================================= */

function parseScheduleDate(
    dateString
) {

    if (!dateString) {

        return null;

    }


    let clean =

        dateString
            .trim()
            .replace(
                /\s+/g,
                ""
            );


    clean =
        clean.replace(
            /-/g,
            "/"
        );


    const parts =
        clean.split("/");


    if (parts.length !== 3) {

        return null;

    }


    const day =
        parseInt(
            parts[0],
            10
        );


    const month =
        parseInt(
            parts[1],
            10
        ) - 1;


    const year =
        parseInt(
            parts[2],
            10
        );


    const date =
        new Date(
            year,
            month,
            day
        );


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}


/* =========================================================
   DATE KEY
========================================================= */

function formatDateKey(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* =========================================================
   SAME DATE
========================================================= */

function isSameDate(a, b) {

    return (

        a.getFullYear() ===
            b.getFullYear()

        &&

        a.getMonth() ===
            b.getMonth()

        &&

        a.getDate() ===
            b.getDate()

    );

}


/* =========================================================
   TODAY START
========================================================= */

function getTodayStart() {

    const now =
        new Date();


    const date =
        new Date(now);


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}


/* =========================================================
   TIME HELPERS
========================================================= */

function getMinutesFromTime(time) {

    const [
        hours,
        minutes
    ] =
        time
            .split(":")
            .map(Number);


    return (
        hours * 60 +
        minutes
    );

}


/* =========================================================
   CURRENT MINUTES
========================================================= */

function getCurrentMinutes() {

    const now =
        new Date();


    return (

        now.getHours() * 60 +

        now.getMinutes()

    );

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime12(time) {

    const [
        h,
        m
    ] =
        time
            .split(":")
            .map(Number);


    const suffix =
        h >= 12
            ? "PM"
            : "AM";


    let hour =
        h % 12;


    if (hour === 0) {

        hour = 12;

    }


    return (

        `${String(hour).padStart(2, "0")}:` +

        `${String(m).padStart(2, "0")} ` +

        suffix

    );

}


/* =========================================================
   COURSE INFORMATION
========================================================= */

function getCourse(slot) {

    return (

        settings.courses?.[slot]

        ||

        DEFAULT_COURSES[slot]

        ||

        {
            code: slot,
            name: "Course Name"
        }

    );

}


/* =========================================================
   COURSE CODE
========================================================= */

function getCourseCode(slot) {

    return (

        getCourse(slot).code ||

        DEFAULT_COURSES[slot]?.code ||

        slot

    );

}


/* =========================================================
   COURSE NAME
========================================================= */

function getCourseName(slot) {

    return (

        getCourse(slot).name ||

        "Course Name"

    );

}


/* =========================================================
   SESSION VALUE
========================================================= */

function getSessionValue(
    row,
    sessionNumber
) {

    const possibleHeaders =

        sessionNumber === 1

            ? [

                "Session 1 (08:00am to 11:00am)",

                "Session 1 (08:00am to 11:00am) "

            ]

            : [

                "Session 2 (12:00pm to 03:00pm)",

                "Session 2 (12:00pm to 03:00pm) "

            ];


    for (
        const header of possibleHeaders
    ) {

        if (

            Object.prototype.hasOwnProperty.call(
                row,
                header
            )

        ) {

            return cleanSlot(
                row[header]
            );

        }

    }


    const key =

        Object.keys(row).find(
            key =>

                key
                    .toLowerCase()
                    .includes(
                        `session ${sessionNumber}`
                    )
        );


    return key

        ? cleanSlot(
            row[key]
        )

        : "-";

}


/* =========================================================
   CLEAN SLOT
========================================================= */

function cleanSlot(value) {

    if (!value) {

        return "-";

    }


    const cleaned =

        String(value)
            .trim()
            .toUpperCase();


    if (

        cleaned === "-"

        ||

        cleaned === "NO CLASS"

        ||

        cleaned === "NO CLASSES"

    ) {

        return "-";

    }


    return cleaned;

}


/* =========================================================
   GET SCHEDULE FOR DATE
========================================================= */

function getScheduleForDate(date) {

    const target =
        formatDateKey(date);


    return (

        scheduleData.find(
            row => {

                const rowDate =
                    parseScheduleDate(
                        row.Date
                    );


                return (

                    rowDate &&

                    formatDateKey(
                        rowDate
                    ) === target

                );

            }
        )

        ||

        null

    );

}


/* =========================================================
   GET CLASSES FOR DATE
========================================================= */

function getClassesForDate(date) {

    const row =
        getScheduleForDate(
            date
        );


    if (!row) {

        return [];

    }


    const result = [];


    const session1 =
        getSessionValue(
            row,
            1
        );


    const session2 =
        getSessionValue(
            row,
            2
        );


    if (session1 !== "-") {

        result.push({

            slot: session1,

            session: 1,

            start: "08:00",

            end: "11:00"

        });

    }


    if (session2 !== "-") {

        result.push({

            slot: session2,

            session: 2,

            start: "12:00",

            end: "15:00"

        });

    }


    return result;

}


/* =========================================================
   SCHEDULED ATTENDANCE
========================================================= */

function getScheduledAttendance(slot) {

    const today =
        getTodayStart();


    let count = 0;


    for (
        const row of scheduleData
    ) {

        const date =
            parseScheduleDate(
                row.Date
            );


        if (!date) {

            continue;

        }


        if (date > today) {

            continue;

        }


        const slot1 =
            getSessionValue(
                row,
                1
            );


        const slot2 =
            getSessionValue(
                row,
                2
            );


        let sessionNumber =
            null;


        if (slot1 === slot) {

            sessionNumber = 1;

        }


        if (slot2 === slot) {

            sessionNumber = 2;

        }


        if (!sessionNumber) {

            continue;

        }


        /*
            Past date:
            Both attendance counts
            are completed.
        */

        if (date < today) {

            count += 2;

            continue;

        }


        /*
            Today:
            Count only windows
            whose END time passed.
        */

        const currentMinutes =
            getCurrentMinutes();


        for (
            const window
            of ATTENDANCE_WINDOWS
        ) {

            if (
                window.session !==
                sessionNumber
            ) {

                continue;

            }


            const endMinutes =
                getMinutesFromTime(
                    window.end
                );


            if (
                currentMinutes >=
                endMinutes
            ) {

                count++;

            }

        }

    }


    return count;

}


/* =========================================================
   RECORDS FOR DATE
========================================================= */

function getRecordsForDate(date) {

    const key =
        formatDateKey(date);


    return attendanceRecords.filter(

        record =>
            record.date === key

    );

}


/* =========================================================
   GET RECORD FOR WINDOW
========================================================= */

function getRecordForWindow(
    date,
    slot,
    window
) {

    const key =
        formatDateKey(date);


    return attendanceRecords.find(

        record =>

            record.date === key

            &&

            record.slot === slot

            &&

            record.windowStart ===
                window.start

            &&

            record.windowEnd ===
                window.end

    );

}


/* =========================================================
   ACTIVE ATTENDANCE WINDOW
========================================================= */

function getActiveAttendance() {

    const now =
        new Date();


    const today =
        getScheduleForDate(
            now
        );


    if (!today) {

        return null;

    }


    const currentMinutes =
        getCurrentMinutes();


    const sessions = [

        {
            slot:
                getSessionValue(
                    today,
                    1
                ),

            session: 1
        },

        {
            slot:
                getSessionValue(
                    today,
                    2
                ),

            session: 2
        }

    ];


    for (
        const item of sessions
    ) {

        if (
            item.slot === "-"
        ) {

            continue;

        }


        for (
            const window
            of ATTENDANCE_WINDOWS
        ) {

            if (
                window.session !==
                item.session
            ) {

                continue;

            }


            const startMinutes =
                getMinutesFromTime(
                    window.start
                );


            const endMinutes =
                getMinutesFromTime(
                    window.end
                );


            if (

                currentMinutes >=
                    startMinutes

                &&

                currentMinutes <=
                    endMinutes

            ) {

                const existing =
                    getRecordForWindow(
                        now,
                        item.slot,
                        window
                    );


                /*
                    If already answered,
                    don't show popup again.
                */

                if (existing) {

                    continue;

                }


                return {

                    slot:
                        item.slot,

                    session:
                        item.session,

                    window:
                        window

                };

            }

        }

    }


    return null;

}


/* =========================================================
   SUBJECT STATISTICS
========================================================= */

function getSubjectStatistics(slot) {

    const scheduled =
        getScheduledAttendance(
            slot
        );


    /*
        Manual attendance means
        historical attendance before
        using this calculator.

        Live records are counted
        separately.
    */

    const manual =

        settings.manual?.[slot]

        ||

        {
            absent: 0,
            facultyMissed: 0
        };


    const liveRecords =
        attendanceRecords.filter(

            record =>
                record.slot === slot

        );


    const liveAbsent =

        liveRecords.filter(

            record =>
                record.status ===
                "absent"

        ).length;


    const liveFacultyMissed =

        liveRecords.filter(

            record =>
                record.status ===
                "faculty_missed"

        ).length;


    const absent =

        Number(
            manual.absent || 0
        )

        +

        liveAbsent;


    const facultyMissed =

        Number(
            manual.facultyMissed || 0
        )

        +

        liveFacultyMissed;


    /*
        Effective total =
        scheduled attendance opportunities
        minus faculty missed.
    */

    const effective =

        Math.max(

            0,

            scheduled -
            facultyMissed

        );


    /*
        Present =
        Effective total - Absent
    */

    const present =

        Math.max(

            0,

            effective -
            absent

        );


    const percentage =

        effective > 0

            ?

            (
                present /
                effective
            ) * 100

            :

            0;


    return {

        scheduled,

        effective,

        present,

        absent,

        facultyMissed,

        percentage

    };

}


/* =========================================================
   LEAVE CALCULATION
========================================================= */

function getLeaveAllowed(
    present,
    effective,
    eligibility
) {

    if (
        effective <= 0
    ) {

        return 0;

    }


    const target =
        eligibility / 100;


    /*
        Present / (Effective + x)
        >= target

        x =
        floor(
            Present / target
            - Effective
        )
    */

    const raw =

        Math.floor(

            present / target

            -

            effective

            +

            0.0000001

        );


    return Math.max(
        0,
        raw
    );

}


/* =========================================================
   REQUIRED ATTENDANCE
========================================================= */

function getRequiredAttendance(
    present,
    effective,
    eligibility
) {

    if (
        effective <= 0
    ) {

        return 0;

    }


    const target =
        eligibility / 100;


    if (
        present / effective >=
        target
    ) {

        return 0;

    }


    /*
        (Present + x) /
        (Effective + x)
        >= target

        x =
        (target * Effective - Present)
        /
        (1 - target)
    */

    const required =

        Math.ceil(

            (
                target *
                effective
                -
                present
            )

            /

            (1 - target)

        );


    return Math.max(
        0,
        required
    );

}


/* =========================================================
   FORMAT PERCENTAGE
========================================================= */

function formatPercent(value) {

    if (
        !Number.isFinite(value)
    ) {

        return "0.0%";

    }


    return (
        value.toFixed(1)
        + "%"
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   UPDATE EVERYTHING
========================================================= */

function updateEverything() {

    updateClockAndActiveWindow();

    renderTodaySchedule();

    renderSlotCards();

    renderTodayRecords();

    renderCalendar();

    updateHeaderEligibility();

    loadManualAttendanceInputs();

}


/* =========================================================
   CLOCK + ACTIVE WINDOW
========================================================= */

function updateClockAndActiveWindow() {

    const now = new Date();


    /* =====================================================
       CURRENT DATE
    ===================================================== */

    const currentDateElement =
        document.getElementById(
            "currentDate"
        );


    if (currentDateElement) {

        currentDateElement.textContent =

            now.toLocaleDateString(
                "en-IN",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );

    }


    /* =====================================================
       CURRENT TIME
    ===================================================== */

    const currentTimeElement =
        document.getElementById(
            "currentTime"
        );


    if (currentTimeElement) {

        currentTimeElement.textContent =

            now.toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                }
            );

    }


    /* =====================================================
       FIND ACTIVE WINDOW
    ===================================================== */

    const previousWindow =
        activeAttendanceWindow;


    const active =
        getActiveAttendance();


    activeAttendanceWindow =
        active;


    const section =
        document.getElementById(
            "activeWindowSection"
        );


    if (!section) {

        return;

    }


    /* =====================================================
       NO ACTIVE WINDOW
    ===================================================== */

    if (!active) {

        section.classList.add(
            "hidden"
        );

        /*
           Important:
           When a window closes, refresh the
           slot attendance immediately.
        */

        if (previousWindow) {

            renderSlotCards();

            renderTodayRecords();

        }

        return;

    }


    /* =====================================================
       ACTIVE WINDOW
    ===================================================== */

    section.classList.remove(
        "hidden"
    );


    const course =
        getCourse(
            active.slot
        );


    const subjectElement =
        document.getElementById(
            "activeSubjectName"
        );


    const timeElement =
        document.getElementById(
            "activeWindowTime"
        );


    if (subjectElement) {

        subjectElement.textContent =

            `${active.slot} · ` +

            `${course.code} - ` +

            `${course.name}`;

    }


    if (timeElement) {

        timeElement.textContent =

            `${formatTime12(
                active.window.start
            )} – ` +

            `${formatTime12(
                active.window.end
            )}`;

    }

}

/* =========================================================
   HEADER ELIGIBILITY
========================================================= */

function updateHeaderEligibility() {

    const element =
        document.getElementById(
            "headerEligibility"
        );


    if (!element) {

        return;

    }


    element.textContent =

        `${settings.eligibility}%`;

}


/* =========================================================
   TODAY'S SCHEDULE
========================================================= */

function renderTodaySchedule() {

    const container =
        document.getElementById(
            "todaySchedule"
        );


    if (!container) {

        return;

    }


    const today =
        getTodayStart();


    const classes =
        getClassesForDate(
            today
        );


    if (!classes.length) {

        container.innerHTML = `

            <div class="no-class-card">

                📅 No classes scheduled
                for today.

            </div>

        `;

        return;

    }


    container.innerHTML =

        classes.map(
            cls => {

                const course =
                    getCourse(
                        cls.slot
                    );


                return `

                    <div
                        class="
                            today-class-card
                            slot-${escapeHTML(cls.slot)}
                        "
                    >

                        <div class="class-time">

                            ${formatTime12(
                                cls.start
                            )}

                            –

                            ${formatTime12(
                                cls.end
                            )}

                        </div>


                        <div class="class-code">

                            ${escapeHTML(
                                course.code
                            )}

                        </div>


                        <div class="class-name">

                            ${escapeHTML(
                                course.name
                            )}

                        </div>


                        <div class="class-slot">

                            SLOT
                            ${escapeHTML(
                                cls.slot
                            )}

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =========================================================
   SLOT CARDS
========================================================= */

function renderSlotCards() {

    const container =
        document.getElementById(
            "slotGrid"
        );


    if (!container) {

        return;

    }


    container.innerHTML =

        SUBJECT_CODES.map(
            slot => {

                const stats =
                    getSubjectStatistics(
                        slot
                    );


                const course =
                    getCourse(
                        slot
                    );


                const percentage =
                    stats.percentage;


                const progress =

                    Math.min(

                        100,

                        Math.max(
                            0,
                            percentage
                        )

                    );


                let color =
                    "#10b981";


                if (
                    percentage <
                    settings.eligibility
                ) {

                    color =
                        "#ef4444";

                }


                let resultHTML = "";


                /*
                    No attendance yet
                */

                if (
                    stats.effective <= 0
                ) {

                    resultHTML = `

                        <div
                            class="
                                slot-result
                                no-data
                            "
                        >

                            No completed
                            attendance yet

                        </div>

                    `;

                }


                /*
                    Attendance is above eligibility
                */

                else if (

                    percentage >=
                    settings.eligibility

                ) {

                    const leave =
                        getLeaveAllowed(

                            stats.present,

                            stats.effective,

                            settings.eligibility

                        );


                    const sessions =
                        Math.floor(
                            leave / 2
                        );


                    if (leave > 0) {

                        resultHTML = `

                            <div
                                class="
                                    slot-result
                                    can-leave
                                "
                            >

                                ✓ You can take

                                <strong>
                                    ${leave}
                                </strong>

                                attendance count
                                ${leave !== 1 ? "s" : ""}

                                leave

                                ${
                                    sessions > 0

                                        ?

                                        ` · ≈
                                        ${sessions}
                                        session
                                        ${sessions !== 1 ? "s" : ""}`

                                        :

                                        ""
                                }

                            </div>

                        `;

                    }

                    else {

                        resultHTML = `

                            <div
                                class="
                                    slot-result
                                    can-leave
                                "
                            >

                                ✓ At
                                ${settings.eligibility}%
                                eligibility

                            </div>

                        `;

                    }

                }


                /*
                    Attendance below eligibility
                */

                else {

                    const required =
                        getRequiredAttendance(

                            stats.present,

                            stats.effective,

                            settings.eligibility

                        );


                    const sessions =
                        Math.ceil(
                            required / 2
                        );


                    resultHTML = `

                        <div
                            class="
                                slot-result
                                need-attendance
                            "
                        >

                            ⚠ Attend

                            <strong>
                                ${required}
                            </strong>

                            more attendance
                            count
                            ${required !== 1 ? "s" : ""}

                            to reach

                            ${settings.eligibility}%

                            ${
                                sessions > 0

                                    ?

                                    `<br>
                                     ≈ ${sessions}
                                     session
                                     ${sessions !== 1 ? "s" : ""}`

                                    :

                                    ""
                            }

                        </div>

                    `;

                }


                /*
                    Requested:
                    Total = Present + Absent

                    Faculty Missed is NOT
                    included in Total.
                */

                const totalAttendance =

                    stats.present +
                    stats.absent;


                return `

                    <div
                        class="
                            slot-card
                            slot-${escapeHTML(slot)}
                        "
                    >


                        <!-- TOP -->

                        <div
                            class="slot-top"
                        >

                            <span
                                class="slot-label"
                            >

                                SLOT
                                ${escapeHTML(
                                    slot
                                )}

                            </span>


                            <span
                                class="
                                    slot-percentage-small
                                "
                                style="
                                    color:${color};
                                "
                            >

                                ${formatPercent(
                                    percentage
                                )}

                            </span>

                        </div>


                        <!-- CIRCLE -->

                        <div
                            class="circular-progress"
                            style="
                                --percentage:
                                ${progress}%;

                                --progress-color:
                                ${color};
                            "
                        >

                            <span>

                                ${Math.round(
                                    percentage
                                )}%

                            </span>

                        </div>


                        <!-- COURSE CODE -->

                        <div
                            class="slot-course-code"
                        >

                            ${escapeHTML(
                                course.code
                            )}

                        </div>


                        <!-- COURSE NAME -->

                        <div
                            class="slot-course-name"
                        >

                            ${escapeHTML(
                                course.name
                            )}

                        </div>


                        <!-- STATS -->

                        <div
                            class="slot-stats"
                        >


                            <div
                                class="stat-box"
                            >

                                <span>
                                    Present
                                </span>

                                <strong>
                                    ${stats.present}
                                </strong>

                            </div>


                            <div
                                class="stat-box"
                            >

                                <span>
                                    Absent
                                </span>

                                <strong>
                                    ${stats.absent}
                                </strong>

                            </div>


                            <div
                                class="stat-box"
                            >

                                <span>
                                    Faculty Missed
                                </span>

                                <strong>
                                    ${stats.facultyMissed}
                                </strong>

                            </div>


                        </div>


                        <!-- TOTAL -->

                        <div
                            class="slot-total-box"
                        >

                            <span>
                                Total Attendance
                            </span>

                            <strong>
                                ${totalAttendance}
                            </strong>

                        </div>


                        <!-- LEAVE / REQUIRED -->

                        ${resultHTML}


                    </div>

                `;

            }

        ).join("");

}


/* =========================================================
   TODAY RECORDS
========================================================= */

function renderTodayRecords() {

    const container =
        document.getElementById(
            "todayRecords"
        );


    if (!container) {

        return;

    }


    const records =

        getRecordsForDate(
            getTodayStart()
        )

        .sort(
            (a, b) =>
                a.timestamp -
                b.timestamp
        );


    if (!records.length) {

        container.innerHTML = `

            <div
                class="empty-records"
            >

                No attendance records
                have been entered today.

            </div>

        `;

        return;

    }


    container.innerHTML =

        records.map(
            record => {

                const course =
                    getCourse(
                        record.slot
                    );


                let statusText =
                    "Present";


                let statusClass =
                    "status-present";


                if (
                    record.status ===
                    "absent"
                ) {

                    statusText =
                        "Absent";

                    statusClass =
                        "status-absent";

                }


                if (
                    record.status ===
                    "faculty_missed"
                ) {

                    statusText =
                        "Faculty Missed";

                    statusClass =
                        "status-missed";

                }


                return `

                    <div
                        class="record-row"
                    >

                        <div
                            class="record-time"
                        >

                            ${new Date(
                                record.timestamp
                            ).toLocaleTimeString(

                                "en-IN",

                                {

                                    hour:
                                        "2-digit",

                                    minute:
                                        "2-digit",

                                    hour12:
                                        true

                                }

                            )}

                        </div>


                        <div
                            class="record-subject"
                        >

                            ${escapeHTML(
                                course.code
                            )}

                            ·

                            SLOT
                            ${escapeHTML(
                                record.slot
                            )}

                        </div>


                        <div
                            class="record-window"
                        >

                            ${formatTime12(
                                record.windowStart
                            )}

                            –

                            ${formatTime12(
                                record.windowEnd
                            )}

                        </div>


                        <div
                            class="
                                record-status
                                ${statusClass}
                            "
                        >

                            ${statusText}

                        </div>

                    </div>

                `;

            }

        ).join("");

}


/* =========================================================
   ATTENDANCE MODAL
========================================================= */

function openAttendanceModal() {

    if (
        !activeAttendanceWindow
    ) {

        return;

    }


    const slot =
        activeAttendanceWindow.slot;


    const course =
        getCourse(
            slot
        );


    const modalText =
        document.getElementById(
            "modalSubjectText"
        );


    if (modalText) {

        modalText.textContent =

            `${course.code} - ` +

            `${course.name} · ` +

            `Slot ${slot} · ` +

            `${formatTime12(
                activeAttendanceWindow.window.start
            )} – ` +

            `${formatTime12(
                activeAttendanceWindow.window.end
            )}`;

    }


    document
        .getElementById(
            "attendanceModal"
        )
        .classList.remove(
            "hidden"
        );

}


/* =========================================================
   CLOSE ATTENDANCE MODAL
========================================================= */

function closeAttendanceModal() {

    const modal =
        document.getElementById(
            "attendanceModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   SUBMIT ATTENDANCE
========================================================= */

function submitAttendance(
    status
) {

    if (
        !activeAttendanceWindow
    ) {

        return;

    }


    const now =
        new Date();


    const item =
        activeAttendanceWindow;


    const existing =
        getRecordForWindow(

            now,

            item.slot,

            item.window

        );


    if (existing) {

        closeAttendanceModal();

        return;

    }


    const record = {

        id:
            Date.now().toString(),

        date:
            formatDateKey(now),

        slot:
            item.slot,

        session:
            item.session,

        windowStart:
            item.window.start,

        windowEnd:
            item.window.end,

        status:
            status,

        timestamp:
            Date.now()

    };


    attendanceRecords.push(
        record
    );


    saveRecords();


    closeAttendanceModal();


    activeAttendanceWindow =
        null;


    updateEverything();

}


/* =========================================================
   CLEAR TODAY RECORDS
========================================================= */

function clearTodayRecords() {

    const today =
        formatDateKey(
            getTodayStart()
        );


    const recordsToday =

        attendanceRecords.filter(
            record =>
                record.date === today
        );


    const count =
        recordsToday.length;


    if (!count) {

        alert(
            "There are no attendance records for today."
        );

        return;

    }


    const confirmed =
        confirm(

            `Clear ${count} attendance record` +

            `${count !== 1 ? "s" : ""}` +

            ` from today?`

        );


    if (!confirmed) {

        return;

    }


    attendanceRecords =

        attendanceRecords.filter(

            record =>
                record.date !== today

        );


    saveRecords();


    activeAttendanceWindow =
        null;


    updateEverything();

}


/* =========================================================
   MAIN PAGE MANUAL ATTENDANCE
========================================================= */

function loadManualAttendanceInputs() {

    SUBJECT_CODES.forEach(
        slot => {

            const manual =

                settings.manual?.[slot]

                ||

                {
                    absent: 0,
                    facultyMissed: 0
                };


            const absentInput =
                document.getElementById(

                    `mainManualAbsent${slot}`

                );


            const facultyInput =
                document.getElementById(

                    `mainManualFaculty${slot}`

                );


            if (absentInput) {

                absentInput.value =

                    Number(
                        manual.absent || 0
                    );

            }


            if (facultyInput) {

                facultyInput.value =

                    Number(
                        manual.facultyMissed || 0
                    );

            }

        }
    );

}


/* =========================================================
   SAVE MANUAL ATTENDANCE
========================================================= */

function saveManualAttendance() {

    SUBJECT_CODES.forEach(
        slot => {

            const absentInput =
                document.getElementById(

                    `mainManualAbsent${slot}`

                );


            const facultyInput =
                document.getElementById(

                    `mainManualFaculty${slot}`

                );


            const absent =

                absentInput

                    ?

                    Math.max(

                        0,

                        Number(
                            absentInput.value
                        ) || 0

                    )

                    :

                    0;


            const facultyMissed =

                facultyInput

                    ?

                    Math.max(

                        0,

                        Number(
                            facultyInput.value
                        ) || 0

                    )

                    :

                    0;


            settings.manual[slot] = {

                absent:
                    absent,

                facultyMissed:
                    facultyMissed

            };

        }
    );


    saveSettingsToStorage();


    renderSlotCards();


    const button =
        document.querySelector(
            ".save-manual-btn"
        );


    if (button) {

        const oldText =
            button.innerHTML;


        button.innerHTML =
            "✓ Saved";


        button.disabled = true;


        setTimeout(
            () => {

                button.innerHTML =
                    oldText;

                button.disabled =
                    false;

            },
            1200
        );

    }

}


/* =========================================================
   SETTINGS
========================================================= */

function openSettings() {

    const eligibilityInput =
        document.getElementById(
            "eligibilityInput"
        );


    if (eligibilityInput) {

        eligibilityInput.value =
            settings.eligibility;

    }


    SUBJECT_CODES.forEach(
        slot => {

            const codeInput =
                document.getElementById(
                    `code${slot}`
                );


            const nameInput =
                document.getElementById(
                    `name${slot}`
                );


            if (codeInput) {

                codeInput.value =
                    getCourseCode(slot);

            }


            if (nameInput) {

                nameInput.value =
                    getCourseName(slot);

            }

        }
    );


    document
        .getElementById(
            "settingsModal"
        )
        .classList.remove(
            "hidden"
        );

}


/* =========================================================
   CLOSE SETTINGS
========================================================= */

function closeSettings() {

    const modal =
        document.getElementById(
            "settingsModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   SAVE SETTINGS
========================================================= */

function saveSettings() {

    const eligibility =
        Number(

            document
                .getElementById(
                    "eligibilityInput"
                )
                .value

        );


    if (

        !Number.isFinite(
            eligibility
        )

        ||

        eligibility <= 0

        ||

        eligibility > 100

    ) {

        alert(

            "Please enter an eligibility percentage between 1 and 100."

        );

        return;

    }


    settings.eligibility =
        eligibility;


    SUBJECT_CODES.forEach(
        slot => {

            const codeInput =
                document.getElementById(
                    `code${slot}`
                );


            const nameInput =
                document.getElementById(
                    `name${slot}`
                );


            const code =

                codeInput

                    ?

                    codeInput.value.trim()

                    :

                    "";


            const name =

                nameInput

                    ?

                    nameInput.value.trim()

                    :

                    "";


            settings.courses[slot] = {

                code:

                    code ||

                    DEFAULT_COURSES[
                        slot
                    ].code,

                name:

                    name ||

                    "Course Name"

            };

        }
    );


    saveSettingsToStorage();


    closeSettings();


    updateEverything();

}


/* =========================================================
   RESET SETTINGS
========================================================= */

function resetSettings() {

    const confirmed =
        confirm(

            "Reset eligibility, course details and manual attendance?"

        );


    if (!confirmed) {

        return;

    }


    settings =
        getDefaultSettings();


    saveSettingsToStorage();


    openSettings();


    updateEverything();

}


/* =========================================================
   TIMETABLE VIEW
========================================================= */

function setTimetableView(
    view
) {

    timetableView =
        view;


    const weekButton =
        document.getElementById(
            "weekViewBtn"
        );


    const monthButton =
        document.getElementById(
            "monthViewBtn"
        );


    if (weekButton) {

        weekButton.classList.toggle(

            "active",

            view === "week"

        );

    }


    if (monthButton) {

        monthButton.classList.toggle(

            "active",

            view === "month"

        );

    }


    renderCalendar();

}


/* =========================================================
   CHANGE MONTH
========================================================= */

function changeMonth(
    direction
) {

    calendarDate.setMonth(

        calendarDate.getMonth()
        +
        direction

    );


    renderCalendar();

}


/* =========================================================
   GO TO TODAY
========================================================= */

function goToToday() {

    calendarDate =
        new Date();


    renderCalendar();

}


/* =========================================================
   REFRESH SCHEDULE
========================================================= */

function refreshSchedule() {

    loadSchedule()

        .then(
            () => {

                updateEverything();

            }
        );

}


/* =========================================================
   RENDER CALENDAR
========================================================= */

function renderCalendar() {

    const container =
        document.getElementById(
            "calendarContainer"
        );


    if (!container) {

        return;

    }


    if (
        timetableView ===
        "month"
    ) {

        renderMonthCalendar(
            container
        );

    }

    else {

        renderWeekCalendar(
            container
        );

    }

}


/* =========================================================
   MONTH CALENDAR
========================================================= */

function renderMonthCalendar(
    container
) {

    const year =
        calendarDate.getFullYear();


    const month =
        calendarDate.getMonth();


    const firstDay =
        new Date(
            year,
            month,
            1
        );


    const lastDay =
        new Date(
            year,
            month + 1,
            0
        );


    const calendarTitle =
        document.getElementById(
            "calendarTitle"
        );


    if (calendarTitle) {

        calendarTitle.textContent =

            calendarDate.toLocaleDateString(

                "en-IN",

                {

                    month:
                        "long",

                    year:
                        "numeric"

                }

            );

    }


    /*
        Convert Sunday = 0
        into Monday = 0.
    */

    const startIndex =

        (
            firstDay.getDay()
            +
            6
        ) % 7;


    const totalDays =
        lastDay.getDate();


    let html = `

        <div
            class="month-calendar"
        >

            <div
                class="
                    calendar-week-header
                "
            >

                <div>MON</div>

                <div>TUE</div>

                <div>WED</div>

                <div>THU</div>

                <div>FRI</div>

                <div>SAT</div>

                <div>SUN</div>

            </div>


            <div
                class="calendar-grid"
            >

    `;


    /*
        Empty cells before
        first day.
    */

    for (
        let i = 0;
        i < startIndex;
        i++
    ) {

        html += `

            <div
                class="
                    calendar-day
                    empty
                "
            ></div>

        `;

    }


    const today =
        getTodayStart();


    for (
        let day = 1;
        day <= totalDays;
        day++
    ) {

        const date =
            new Date(
                year,
                month,
                day
            );


        const isToday =
            isSameDate(
                date,
                today
            );


        const classes =
            getClassesForDate(
                date
            );


        html += `

            <div
                class="
                    calendar-day
                    ${isToday
                        ? "today-day"
                        : ""}
                "
            >

                <div
                    class="day-number"
                >

                    ${day}

                </div>

        `;


        if (
            !classes.length
        ) {

            const row =
                getScheduleForDate(
                    date
                );


            if (row) {

                html += `

                    <div
                        class="no-class-text"
                    >

                        No classes

                    </div>

                `;

            }

        }

        else {

            classes.forEach(
                cls => {

                    const course =
                        getCourse(
                            cls.slot
                        );


                    html += `

                        <div
                            class="
                                calendar-event
                                slot-${escapeHTML(
                                    cls.slot
                                )}
                            "
                        >

                            <div
                                class="event-code"
                            >

                                ${escapeHTML(
                                    course.code
                                )}

                            </div>


                            <div
                                class="event-slot"
                            >

                                SLOT
                                ${escapeHTML(
                                    cls.slot
                                )}

                            </div>


                            <div
                                class="event-time"
                            >

                                ◷

                                ${formatTime12(
                                    cls.start
                                )}

                                –

                                ${formatTime12(
                                    cls.end
                                )}

                            </div>

                        </div>

                    `;

                }
            );

        }


        html += `

            </div>

        `;

    }


    /*
        Complete final week.
    */

    const totalCells =
        startIndex +
        totalDays;


    const remaining =

        (
            Math.ceil(
                totalCells / 7
            )
            *
            7
        )
        -
        totalCells;


    for (
        let i = 0;
        i < remaining;
        i++
    ) {

        html += `

            <div
                class="
                    calendar-day
                    empty
                "
            ></div>

        `;

    }


    html += `

            </div>

        </div>

    `;


    container.innerHTML =
        html;

}


/* =========================================================
   WEEK CALENDAR
========================================================= */

function renderWeekCalendar(
    container
) {

    /*
        Get Monday of current week.
    */

    const date =
        new Date(
            calendarDate
        );


    const day =
        date.getDay();


    const difference =

        day === 0

            ?

            -6

            :

            1 - day;


    const monday =
        new Date(date);


    monday.setDate(

        date.getDate()
        +
        difference

    );


    monday.setHours(
        0,
        0,
        0,
        0
    );


    const sunday =
        new Date(
            monday
        );


    sunday.setDate(
        monday.getDate()
        +
        6
    );


    const calendarTitle =
        document.getElementById(
            "calendarTitle"
        );


    if (calendarTitle) {

        calendarTitle.textContent =

            `${monday.toLocaleDateString(

                "en-IN",

                {

                    day:
                        "numeric",

                    month:
                        "short"

                }

            )} – ${sunday.toLocaleDateString(

                "en-IN",

                {

                    day:
                        "numeric",

                    month:
                        "short",

                    year:
                        "numeric"

                }

            )}`;

    }


    let html = `

        <div
            class="week-calendar"
        >

            <div
                class="week-title"
            >

                Weekly Fixed Schedule

            </div>


            <div
                class="week-list"
            >

    `;


    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const current =
            new Date(
                monday
            );


        current.setDate(

            monday.getDate()
            +
            i

        );


        const classes =
            getClassesForDate(
                current
            );


        html += `

            <div
                class="week-day-row"
            >

                <div
                    class="week-day-name"
                >

                    ${current.toLocaleDateString(

                        "en-IN",

                        {
                            weekday:
                                "short"
                        }

                    )}

                    <br>

                    ${current.getDate()}

                    ${current.toLocaleDateString(

                        "en-IN",

                        {

                            month:
                                "short"

                        }

                    )}

                </div>


                <div
                    class="week-events"
                >

        `;


        if (
            !classes.length
        ) {

            html += `

                <span
                    class="
                        no-class-text
                    "
                >

                    No classes

                </span>

            `;

        }

        else {

            classes.forEach(
                cls => {

                    const course =
                        getCourse(
                            cls.slot
                        );


                    html += `

                        <div
                            class="
                                calendar-event
                                slot-${escapeHTML(
                                    cls.slot
                                )}
                            "
                        >

                            <div
                                class="event-code"
                            >

                                ${escapeHTML(
                                    course.code
                                )}

                            </div>


                            <div
                                class="event-slot"
                            >

                                SLOT
                                ${escapeHTML(
                                    cls.slot
                                )}

                            </div>


                            <div
                                class="event-time"
                            >

                                ◷

                                ${formatTime12(
                                    cls.start
                                )}

                                –

                                ${formatTime12(
                                    cls.end
                                )}

                            </div>

                        </div>

                    `;

                }
            );

        }


        html += `

                </div>

            </div>

        `;

    }


    html += `

            </div>

        </div>

    `;


    container.innerHTML =
        html;

}


/* =========================================================
   CLOSE MODALS WHEN CLICKING OUTSIDE
========================================================= */

document.addEventListener(
    "click",
    event => {

        const attendanceModal =
            document.getElementById(
                "attendanceModal"
            );


        const settingsModal =
            document.getElementById(
                "settingsModal"
            );


        if (

            attendanceModal

            &&

            event.target ===
            attendanceModal

        ) {

            closeAttendanceModal();

        }


        if (

            settingsModal

            &&

            event.target ===
            settingsModal

        ) {

            closeSettings();

        }

    }
);


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        closeAttendanceModal();

        closeSettings();

    }
);
