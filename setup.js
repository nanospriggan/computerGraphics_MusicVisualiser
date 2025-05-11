// setup.js

window.scene    = new THREE.Scene();
window.camera   = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
camera.position.z = 10;

window.renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// GUI & File‐Loader
window.gui      = new dat.GUI();
window.settings = { visualizerStyle: 'Waveform' };
gui.add(settings, 'visualizerStyle',
    ['Waveform','Particle Explosion','Geometric Patterns','Frequency Bars'])
    .name('Visualizer Style')
    .onChange(style=> switchVisualizer(style));

// hidden <input type="file">
const fileInput = document.createElement('input');
fileInput.type  = 'file';
fileInput.type  = 'file';
fileInput.accept= 'audio/*';
fileInput.style.display='none';
document.body.appendChild(fileInput);

const fileLoader = { loadFile: () => fileInput.click() };
gui.add(fileLoader,'loadFile').name('Load Audio File');

// Audio setup
window.audioContext = new (AudioContext||webkitAudioContext)();
window.audio        = new Audio();
audio.crossOrigin   = "anonymous";
audio.src           = ''; // empty, will get filled by selected file

const source    = audioContext.createMediaElementSource(audio);
window.analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

source.connect(analyser);
analyser.connect(audioContext.destination);

// resume & play on first click
document.body.addEventListener('click', () => {
    if (audioContext.state === 'suspended') audioContext.resume();
    audio.play();
}, { once: true });

// load user‐picked file
fileInput.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    audio.pause();
    audio.src = URL.createObjectURL(f);
    audio.load();
    audio.play();
});
