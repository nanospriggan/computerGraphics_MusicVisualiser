// setup.js

window.scene = new THREE.Scene();
window.camera = new THREE.PerspectiveCamera(
   75,
   innerWidth / innerHeight,
   0.1,
   1000
);
camera.position.z = 10;

window.renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// GUI & File Loader
window.gui = new dat.GUI();
window.settings = { visualizerStyle: "Waveform" };
gui.add(settings, "visualizerStyle", [
   "Waveform",
   "Particle Explosion",
   "Geometric Patterns",
   "Frequency Bars",
])
   .name("Visualizer Style")
   .onChange((style) => switchVisualizer(style));

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "audio/*";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

const fileLoader = { loadFile: () => fileInput.click() };
gui.add(fileLoader, "loadFile").name("Load Audio File");

// Audio setup
window.audioContext = new (AudioContext || webkitAudioContext)();
window.audio = new Audio();
audio.crossOrigin = "anonymous";
audio.src = "";

const source = audioContext.createMediaElementSource(audio);
window.gainNode = audioContext.createGain();
window.analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

// source.connect(gainNode);
// gainNode.connect(analyser);
// analyser.connect(audioContext.destination);
source.connect(analyser);
source.connect(gainNode);
gainNode.connect(audioContext.destination);

// Resume on first interaction
document.body.addEventListener(
   "click",
   () => {
      if (audioContext.state === "suspended") audioContext.resume();
      audio.play();
   },
   { once: true }
);

// UI Container
const controlsContainer = document.createElement("div");
controlsContainer.style.position = "absolute";
controlsContainer.style.bottom = "10px";
controlsContainer.style.left = "10px";
controlsContainer.style.color = "white";
controlsContainer.style.font = "12px sans-serif";
controlsContainer.style.zIndex = "100";
controlsContainer.style.background = "rgba(0, 0, 0, 0.5)";
controlsContainer.style.padding = "10px";
controlsContainer.style.borderRadius = "8px";
document.body.appendChild(controlsContainer);

// File + time info
const fileNameDisplay = document.createElement("div");
fileNameDisplay.textContent = "No file loaded";
fileNameDisplay.style.fontWeight = "bold";
controlsContainer.appendChild(fileNameDisplay);

const timeDisplay = document.createElement("div");
timeDisplay.textContent = "00:00 / 00:00";
controlsContainer.appendChild(timeDisplay);

// Duration slider
const seekSlider = document.createElement("input");
seekSlider.type = "range";
seekSlider.min = 0;
seekSlider.max = 1;
seekSlider.step = 0.01;
seekSlider.value = 0;
seekSlider.style.width = "100%";
seekSlider.title = "Seek";
controlsContainer.appendChild(seekSlider);

seekSlider.addEventListener("input", () => {
   if (audio.duration) {
      audio.currentTime = seekSlider.value * audio.duration;
   }
});

// Playback controls
const controls = document.createElement("div");
controls.style.marginTop = "5px";
controls.innerHTML = `
  <button id="backward">⏪ 5s</button>
  <button id="playpause">▶️</button>
  <button id="forward">5s ⏩</button>
  <button id="replay" style="display:none">🔁 Replay</button>
`;
controlsContainer.appendChild(controls);

const playPauseBtn = document.getElementById("playpause");
const forwardBtn = document.getElementById("forward");
const backwardBtn = document.getElementById("backward");
const replayBtn = document.getElementById("replay");

playPauseBtn.addEventListener("click", () => {
   if (audio.paused) {
      audio.play();
      playPauseBtn.textContent = "⏸️";
      replayBtn.style.display = "none";
   } else {
      audio.pause();
      playPauseBtn.textContent = "▶️";
   }
});

forwardBtn.addEventListener("click", () => {
   audio.currentTime += 5;
});
backwardBtn.addEventListener("click", () => {
   audio.currentTime -= 5;
});
replayBtn.addEventListener("click", () => {
   audio.currentTime = 0;
   audio.play();
   playPauseBtn.textContent = "⏸️";
   replayBtn.style.display = "none";
});

// Time update
audio.addEventListener("timeupdate", () => {
   const formatTime = (s) =>
      `${Math.floor(s / 60)
         .toString()
         .padStart(2, "0")}:${Math.floor(s % 60)
         .toString()
         .padStart(2, "0")}`;
   timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(
      audio.duration || 0
   )}`;
   if (audio.duration) {
      seekSlider.value = audio.currentTime / audio.duration;
   }
});

// Show replay only if loop is off
audio.addEventListener("ended", () => {
   if (!audio.loop) {
      playPauseBtn.textContent = "▶️";
      replayBtn.style.display = "inline";
   }
});

// Load file
fileInput.addEventListener("change", (e) => {
   const f = e.target.files[0];
   if (!f) return;
   audio.pause();
   audio.src = URL.createObjectURL(f);
   audio.load();
   audio.play();
   fileNameDisplay.textContent = `Now playing: ${f.name}`;
   playPauseBtn.textContent = "⏸️";
   replayBtn.style.display = "none";
});

// Volume + mute
const volumeContainer = document.createElement("div");
volumeContainer.style.marginTop = "10px";
volumeContainer.innerHTML = `
  <label for="volume">Volume: </label>
  <input id="volume" type="range" min="0" max="1" step="0.01" value="1" style="width:100px">
  <span id="volumeLabel">100%</span>
  <button id="muteToggle" title="Mute/unmute audio">🔊</button>
`;
controlsContainer.appendChild(volumeContainer);

const volumeSlider = document.getElementById("volume");
const volumeLabel = document.getElementById("volumeLabel");
const muteBtn = document.getElementById("muteToggle");

// Fix label + mute button alignment
volumeLabel.style.display = "inline-block";
volumeLabel.style.width = "40px";
muteBtn.style.verticalAlign = "middle";

let lastVolume = 1;
volumeSlider.addEventListener("input", (e) => {
   const vol = parseFloat(e.target.value);
   gainNode.gain.value = vol;
   volumeLabel.textContent = `${Math.round(vol * 100)}%`;
   if (vol === 0) {
      muteBtn.textContent = "🔇";
   } else {
      muteBtn.textContent = "🔊";
      lastVolume = vol;
   }
});

muteBtn.addEventListener("click", () => {
   if (gainNode.gain.value > 0) {
      lastVolume = gainNode.gain.value;
      gainNode.gain.value = 0;
      volumeSlider.value = 0;
      volumeLabel.textContent = "0%";
      muteBtn.textContent = "🔇";
   } else {
      gainNode.gain.value = lastVolume;
      volumeSlider.value = lastVolume;
      volumeLabel.textContent = `${Math.round(lastVolume * 100)}%`;
      muteBtn.textContent = "🔊";
   }
});

// Loop toggle
const loopContainer = document.createElement("div");
loopContainer.style.marginTop = "10px";
loopContainer.innerHTML = `
  <label><input type="checkbox" id="loopToggle"> Loop</label>
`;
controlsContainer.appendChild(loopContainer);

const loopCheckbox = document.getElementById("loopToggle");
loopCheckbox.addEventListener("change", () => {
   audio.loop = loopCheckbox.checked;
});

// Apply consistent button font
const allButtons = controlsContainer.querySelectorAll("button");
allButtons.forEach((btn) => {
   btn.style.font = "12px sans-serif";
});
