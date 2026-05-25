import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// =====================================================
// FIREBASE CONFIG (Your Data)
// =====================================================
const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Local Network IPs
const camIP = ""; // Assuming the camera IP is still needed

// =====================================================
// DOM ELEMENTS MAPPING
// =====================================================
const ui = {
    btnCctvToggle: document.getElementById("btn-cctv-toggle"),
    cctvContainer: document.getElementById("cctv-container"),
    cctvStream: document.getElementById("cctv-stream"),
    camBrightness: document.getElementById("cam-brightness"),
    camFlash: document.getElementById("cam-flash"),
    btnHMirror: document.getElementById("btn-h-mirror"),
    btnVMirror: document.getElementById("btn-v-mirror"),
    camStatus: document.getElementById("cam-status"),

    dispTime: document.getElementById("disp-time"),
    dispDate: document.getElementById("disp-date"),
    dispRoomTemp: document.getElementById("disp-room-temp"),
    dispRoomHumi: document.getElementById("disp-room-humi"),

    btnAnalog: document.getElementById("btn-analog"),
    btnDigital: document.getElementById("btn-digital"),
    btnInfo: document.getElementById("btn-info"),
    currentFaceLabel: document.getElementById("current-face-label"),
    messageInput: document.getElementById("message-input"),
    btnSendMessage: document.getElementById("btn-send-message"),
    
    alarmTimeInput: document.getElementById("alarm-time-input"),
    alarmLabelInput: document.getElementById("alarm-label-input"),
    btnAlarmSet: document.getElementById("btn-alarm-set"),
    btnAlarmClear: document.getElementById("btn-alarm-clear"),
    alarmSetStatus: document.getElementById("alarm-set-status"),
    
    timerInput: document.getElementById("timer-input"),
    btnTimerStart: document.getElementById("btn-timer-start"),
    
    rgbColor: document.getElementById("rgb-color"),
    brightnessSlider: document.getElementById("brightness-slider"),
    btnRgbOff: document.getElementById("btn-rgb-off"),
    btnRgbCycle: document.getElementById("btn-rgb-cycle")
};

// =====================================================
// CCTV ENGINE LOGIC
// =====================================================
let isStreamActive = false;

const sendCamControl = (variable, value) => {
    fetch(`http://${camIP}/control?var=${variable}&val=${value}`, { mode: 'no-cors' })
        .then(() => console.log(`Cam Control ${variable} => ${value}`))
        .catch(err => console.error("Camera unreachable."));
};

ui.btnCctvToggle.addEventListener("click", () => {
    isStreamActive = !isStreamActive;
    if (isStreamActive) {
        ui.cctvStream.src = `http://${camIP}:81/stream`;
        ui.cctvContainer.style.display = "block";
        ui.btnCctvToggle.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Stream';
        ui.btnCctvToggle.className = "btn btn-danger w-100";
    } else {
        ui.cctvStream.src = "";
        ui.cctvContainer.style.display = "none";
        ui.btnCctvToggle.innerHTML = '<i class="fa-solid fa-play"></i> Initialize Stream';
        ui.btnCctvToggle.className = "btn btn-primary w-100";
    }
});

ui.camBrightness.addEventListener("change", (e) => sendCamControl("brightness", e.target.value));

let hFlip = 0, vFlip = 0;
ui.btnHMirror.addEventListener("click", () => { hFlip = hFlip === 0 ? 1 : 0; sendCamControl("hmirror", hFlip); });
ui.btnVMirror.addEventListener("click", () => { vFlip = vFlip === 0 ? 1 : 0; sendCamControl("vflip", vFlip); });

if (ui.camFlash) {
    ui.camFlash.addEventListener("input", (e) => {
        fetch(`http://${camIP}:82/flash?val=${e.target.value}`, { mode: 'no-cors' })
            .catch(() => {});
    });
}

// Camera Ping Routine
setInterval(() => {
    fetch(`http://${camIP}/status`, { mode: 'no-cors' })
        .then(() => {
            ui.camStatus.textContent = "Online";
            ui.camStatus.className = "status-badge online";
            ui.btnCctvToggle.disabled = false;
        })
        .catch(() => {
            ui.camStatus.textContent = "Offline";
            ui.camStatus.className = "status-badge offline";
            if(!isStreamActive) ui.btnCctvToggle.disabled = true;
        });
}, 5000);


// =====================================================
// SYSTEM CLOCK ENGINE
// =====================================================
setInterval(() => {
    const now = new Date();
    let hours12 = now.getHours() % 12 || 12;
    const ampm = now.getHours() >= 12 ? "PM" : "AM";
    
    ui.dispTime.textContent = `${String(hours12).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${ampm}`;
    
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    ui.dispDate.textContent = `${months[now.getMonth()]} ${now.getDate()}, ${days[now.getDay()]}`;
}, 1000);


// =====================================================
// FIREBASE SYNCHRONIZATION
// =====================================================
onValue(ref(db), (snapshot) => {
    const data = snapshot.val() || {};
    
    // Telemetry Sync
    // Assuming ESP32 publishes DHT data to 'dht/temperature' and 'dht/humidity'
    if (data.dht) {
        ui.dispRoomTemp.textContent = data.dht.temperature !== undefined ? data.dht.temperature.toFixed(1) : '--';
        ui.dispRoomHumi.textContent = data.dht.humidity !== undefined ? data.dht.humidity.toFixed(1) : '--';
    } else {
        // Reset if DHT data is not present
        ui.dispRoomTemp.textContent = '--';
        ui.dispRoomHumi.textContent = '--';
    }
    
    // Alarm Sync
    const alarm = data.alarm || {};
    if (alarm.time && alarm.enabled) {
        ui.alarmSetStatus.innerHTML = `<i class="fa-solid fa-bell"></i> Armed for ${alarm.time}`;
    } else {
        ui.alarmSetStatus.innerHTML = "No active alarms.";
    }

    // Current Clock Face Sync
    if (data.display && data.display.type) {
        ui.btnAnalog.className = data.display.type === "analog" ? "btn btn-primary" : "btn btn-secondary";
        ui.btnDigital.className = data.display.type === "digital" ? "btn btn-primary" : "btn btn-secondary";
        ui.btnInfo.className = data.display.type === "info" ? "btn btn-primary" : "btn btn-secondary";
        if (ui.currentFaceLabel) {
            ui.currentFaceLabel.textContent = data.display.type.toUpperCase();
        }
    }

    // Timer Sync (Fix for timer "repeating twice" on UI)
    // If the ESP32 signals the timer is no longer running, clear the input on the dashboard
    const timer = data.timer || {};
    if (!timer.running && ui.timerInput.value !== "") {
        ui.timerInput.value = "";
    }
});

// Hardware Interface Commands
ui.btnAnalog.addEventListener("click", () => set(ref(db, "display/type"), "analog"));
ui.btnDigital.addEventListener("click", () => set(ref(db, "display/type"), "digital"));
ui.btnInfo.addEventListener("click", () => set(ref(db, "display/type"), "info"));

ui.btnSendMessage.addEventListener("click", () => {
    const text = ui.messageInput.value.trim();
    if (!text) return;
    set(ref(db, "message"), { text: text, new: true, timestamp: Date.now() });
    ui.messageInput.value = "";
});

// Scheduler Execution
ui.btnAlarmSet.addEventListener("click", () => {
    const time = ui.alarmTimeInput.value;
    if (!time) return;
    set(ref(db, "alarm"), { enabled: true, time: time, message: ui.alarmLabelInput.value || "ALARM", active: false });
});

ui.btnAlarmClear.addEventListener("click", () => update(ref(db, "alarm"), { enabled: false }));

ui.btnTimerStart.addEventListener("click", () => {
    const seconds = parseInt(ui.timerInput.value);
    if (!seconds || seconds <= 0) return;
    update(ref(db, "timer"), { running: true, seconds: seconds });
    ui.timerInput.value = "";
});


// RGB Chroma Bus
ui.rgbColor.addEventListener("input", (e) => {
    const hex = e.target.value;
    update(ref(db, "rgb"), { 
        mode: "solid", 
        r: parseInt(hex.substring(1, 3), 16), 
        g: parseInt(hex.substring(3, 5), 16), 
        b: parseInt(hex.substring(5, 7), 16) 
    });
});

ui.brightnessSlider.addEventListener("input", (e) => update(ref(db, "rgb"), { brightness: parseInt(e.target.value) }));
ui.btnRgbOff.addEventListener("click", () => update(ref(db, "rgb"), { mode: "off" }));
ui.btnRgbCycle.addEventListener("click", () => update(ref(db, "rgb"), { mode: "cycle" }));
