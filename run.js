// run.js

window.switchVisualizer = function(style){
    if (window.currentVisualizer){
        currentVisualizer.dispose(scene);
        currentVisualizer = null;
    }
    switch(style){
        case 'Waveform':
            currentVisualizer = new WaveformVisualizer(scene, analyser);
            break;
        case 'Particle Explosion':
            currentVisualizer = new ParticleExplosionVisualizer(scene, analyser);
            break;
        case 'Geometric Patterns':
            currentVisualizer = new GeometricPatternsVisualizer(scene, analyser);
            break;
        case 'Frequency Bars':
            currentVisualizer = new FrequencyBarsVisualizer(scene, analyser);
            break;
        default:
            currentVisualizer = new WaveformVisualizer(scene, analyser);
    }
};

switchVisualizer(settings.visualizerStyle);
animate();
