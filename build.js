// build.js

// 1. Waveform Visualizer
class WaveformVisualizer {
    constructor(scene, analyser) {
        this.analyser = analyser;
        this.bufferLength = this.analyser.frequencyBinCount;
        const positions = new Float32Array(this.bufferLength * 3);
        for (let i = 0; i < this.bufferLength; i++) {
            positions[i * 3] = (i / (this.bufferLength - 1)) * 10 - 5;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
        }
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const colors = new Float32Array(this.bufferLength * 3);
        for (let i = 0; i < this.bufferLength; i++) {
            const t = i / (this.bufferLength - 1);
            const color = new THREE.Color().setHSL(t, 1, 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.material = new THREE.LineBasicMaterial({ vertexColors: true });
        this.line = new THREE.Line(this.geometry, this.material);
        scene.add(this.line);
    }

    update(time) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(dataArray);
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        for (let i = 0; i < dataArray.length; i++) {
            const amplitude = (dataArray[i] - 128) / 128;
            const y = amplitude * 2;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = Math.sin((i / this.bufferLength) * Math.PI * 2 + time) * 2;
            const baseHue = i / (this.bufferLength - 1);
            const brightness = THREE.MathUtils.clamp((y + 2) / 4, 0, 1);
            const color = new THREE.Color().setHSL(baseHue, 1, brightness);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }

    dispose(scene) {
        scene.remove(this.line);
        this.geometry.dispose();
        this.material.dispose();
    }
}

// 2. Particle Explosion
class ParticleExplosionVisualizer {
    constructor(scene, analyser) {
        this.analyser = analyser;
        this.numParticles = 256;
        const positions = new Float32Array(this.numParticles * 3);
        this.directions = new Float32Array(this.numParticles * 3);
        for (let i = 0; i < this.numParticles; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            this.directions[i * 3] = Math.sin(phi) * Math.cos(theta);
            this.directions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
            this.directions[i * 3 + 2] = Math.cos(phi);
        }
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const colors = new Float32Array(this.numParticles * 3);
        for (let i = 0; i < this.numParticles; i++) {
            const color = new THREE.Color().setHSL(Math.random(), 1, 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        // Save initial colors to restore later
        this.initialColors = new Float32Array(colors);
        this.material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true });
        this.points = new THREE.Points(this.geometry, this.material);
        // We'll rotate the entire Points object.
        scene.add(this.points);

        // For sprayed particles
        this.sprayedParticles = [];
        // Create an array to track the last spray time per explosion particle
        this.lastSprayTimes = new Array(this.numParticles).fill(0);
        // Use a common geometry for spray particles
        this.sprayGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    }

    update(time) {
        const dt = time - (this.lastUpdateTime || time);
        this.lastUpdateTime = time;
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normAmp = avg / 255;
        const scale = normAmp * 10;
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const thresholdDistance = 4;

        // Update explosion particles positions and colors.
        for (let i = 0; i < this.numParticles; i++) {
            positions[i * 3] = this.directions[i * 3] * scale;
            positions[i * 3 + 1] = this.directions[i * 3 + 1] * scale;
            positions[i * 3 + 2] = this.directions[i * 3 + 2] * scale;

            const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
            const distance = Math.sqrt(x * x + y * y + z * z);
            if (distance > thresholdDistance) {
                colors[i * 3] = 1;
                colors[i * 3 + 1] = 1;
                colors[i * 3 + 2] = 1;
            } else {
                colors[i * 3] = this.initialColors[i * 3];
                colors[i * 3 + 1] = this.initialColors[i * 3 + 1];
                colors[i * 3 + 2] = this.initialColors[i * 3 + 2];
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;

        // Rotate the entire explosion
        this.points.rotation.y += 0.01;
        this.points.rotation.x += 0.005;

        // For each explosion particle that is peaking out, spawn a spray particle if its cooldown has expired.
        for (let i = 0; i < this.numParticles; i++) {
            const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
            const distance = Math.sqrt(x * x + y * y + z * z);
            if (distance > thresholdDistance && (time - this.lastSprayTimes[i] > 0.5)) {
                this.spawnSprayParticle(x, y, z, i);
                this.lastSprayTimes[i] = time;
            }
        }

        // Update sprayed particles: apply gravity, update glow, and shrink them.
        const gravity = 2.0;
        for (let i = this.sprayedParticles.length - 1; i >= 0; i--) {
            const particle = this.sprayedParticles[i];
            particle.velocity.y -= gravity * dt;
            particle.mesh.position.addScaledVector(particle.velocity, dt);
            particle.mesh.material.color.lerp(new THREE.Color(0xffffff), 0.05);
            particle.lifetime -= dt;
            // Update scale so the particle shrinks based on its remaining lifetime.
            const scaleFactor = particle.lifetime / particle.initialLifetime;
            particle.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
            if (particle.lifetime <= 0) {
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                scene.remove(particle.mesh);
                this.sprayedParticles.splice(i, 1);
            }
        }
    }

    spawnSprayParticle(x, y, z, i) {
        // Create a small glowing sphere using additive blending.
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        const mesh = new THREE.Mesh(this.sprayGeometry, material);
        mesh.position.set(x, y, z);
        // Use the explosion particle's direction as the base for velocity.
        const baseDir = new THREE.Vector3(
            this.directions[i * 3],
            this.directions[i * 3 + 1],
            this.directions[i * 3 + 2]
        );
        const speed = 2 + Math.random() * 2;
        const velocity = baseDir.clone().multiplyScalar(speed);
        // Set a short lifetime so the particle shrinks quickly.
        const lifetime = 1.0;
        const particle = {
            mesh: mesh,
            velocity: velocity,
            lifetime: lifetime,
            initialLifetime: lifetime
        };
        scene.add(mesh);
        this.sprayedParticles.push(particle);
    }

    dispose(scene) {
        scene.remove(this.points);
        this.geometry.dispose();
        this.material.dispose();
        for (let particle of this.sprayedParticles) {
            particle.mesh.geometry.dispose();
            particle.mesh.material.dispose();
            scene.remove(particle.mesh);
        }
    }
}

// 3. Geometric Patterns Visualizer
class GeometricPatternsVisualizer {
    constructor(scene, analyser) {
        this.analyser = analyser;
        this.group = new THREE.Group();
        scene.add(this.group);
        this.numShapes = 32;
        this.shapes = [];
        for (let i = 0; i < this.numShapes; i++) {
            const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const color = new THREE.Color().setHSL(i / this.numShapes, 1, 0.5);
            const material = new THREE.MeshBasicMaterial({ color: color });
            const mesh = new THREE.Mesh(geometry, material);
            const angle = (i / this.numShapes) * Math.PI * 2;
            const radius = 5;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.z = Math.sin(angle) * radius;
            mesh.position.y = 0;
            this.group.add(mesh);
            this.shapes.push(mesh);
        }
    }
    update() {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        const step = Math.floor(dataArray.length / this.numShapes);
        for (let i = 0; i < this.numShapes; i++) {
            let sum = 0;
            for (let j = 0; j < step; j++) {
                sum += dataArray[i * step + j];
            }
            const avg = sum / step;
            const normAmp = avg / 255;
            this.shapes[i].scale.y = 0.5 + normAmp * 2;
            this.shapes[i].position.y = (this.shapes[i].scale.y - 0.5) / 2;
            this.shapes[i].rotation.y += 0.01;
        }
        this.group.rotation.y += 0.005;
    }
    dispose(scene) {
        scene.remove(this.group);
        this.shapes.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
    }
}

// 4. Frequency Bars
class FrequencyBarsVisualizer {
    constructor(scene, analyser) {
        this.analyser = analyser;
        this.group = new THREE.Group();
        scene.add(this.group);
        this.numBars = 64;
        this.bars = [];
        const spacing = 0.4;
        const totalWidth = this.numBars * spacing;
        const startX = -totalWidth / 2;
        for (let i = 0; i < this.numBars; i++) {
            const geometry = new THREE.BoxGeometry(0.3, 1, 0.3);
            const color = new THREE.Color().setHSL(i / this.numBars, 1, 0.5);
            const material = new THREE.MeshBasicMaterial({ color: color });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = startX + i * spacing;
            mesh.position.y = 0.5;
            this.group.add(mesh);
            this.bars.push(mesh);
        }
    }

    update() {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        const step = Math.floor(dataArray.length / this.numBars);
        for (let i = 0; i < this.numBars; i++) {
            let sum = 0;
            for (let j = 0; j < step; j++) {
                sum += dataArray[i * step + j];
            }
            const avg = sum / step;
            const normAmp = avg / 255;
            const newHeight = 0.1 + normAmp * 5;
            this.bars[i].scale.y = newHeight;
            this.bars[i].position.y = newHeight / 2;
            const hsl = {};
            this.bars[i].material.color.getHSL(hsl);
            const newLightness = THREE.MathUtils.clamp(0.3 + normAmp * 0.7, 0, 1);
            this.bars[i].material.color.setHSL(hsl.h, hsl.s, newLightness);
        }
    }

    dispose(scene) {
        scene.remove(this.group);
        this.bars.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
    }
}