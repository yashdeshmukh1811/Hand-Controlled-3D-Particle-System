 const PARTICLE_COUNT = 3000;
 let currentShape = 'galaxy';
 let handPosition = new THREE.Vector3(0, 0, 0);
 let pinchStrength = 0;
 const tempVector = new THREE.Vector3();

 const container = document.getElementById('canvas-container');
 const scene = new THREE.Scene();
 scene.fog = new THREE.FogExp2(0x050505, 0.002);

 const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
 camera.position.z = 50;

 const renderer = new THREE.WebGLRenderer({
     antialias: true,
     alpha: true
 });
 renderer.setSize(window.innerWidth, window.innerHeight);
 renderer.setPixelRatio(window.devicePixelRatio);
 container.appendChild(renderer.domElement);

 /* ---------- PARTICLES ---------- */

 const geometry = new THREE.BufferGeometry();
 const positions = new Float32Array(PARTICLE_COUNT * 3);
 const colors = new Float32Array(PARTICLE_COUNT * 3);
 const sizes = new Float32Array(PARTICLE_COUNT);
 const basePositions = new Float32Array(PARTICLE_COUNT * 3);

 const color1 = new THREE.Color(0x00ffff);
 const color2 = new THREE.Color(0xff00ff);

 for (let i = 0; i < PARTICLE_COUNT; i++) {
     sizes[i] = Math.random() * 2;
     positions[i * 3] = (Math.random() - 0.5) * 100;
     positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
     positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

     const t = Math.random();
     colors[i * 3] = THREE.MathUtils.lerp(color1.r, color2.r, t);
     colors[i * 3 + 1] = THREE.MathUtils.lerp(color1.g, color2.g, t);
     colors[i * 3 + 2] = THREE.MathUtils.lerp(color1.b, color2.b, t);
 }

 geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
 geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
 geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

 const material = new THREE.ShaderMaterial({
     uniforms: {
         pointTexture: {
             value: new THREE.TextureLoader().load("https://threejs.org/examples/textures/sprites/spark1.png")
         }
     },
     vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
     fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4(vColor, 1.0);
            gl_FragColor *= texture2D(pointTexture, gl_PointCoord);
        }
    `,
     blending: THREE.AdditiveBlending,
     depthTest: false,
     transparent: true
 });

 const particles = new THREE.Points(geometry, material);
 scene.add(particles);

 /* ---------- SHAPES ---------- */

 function generateShape(type) {
     for (let i = 0; i < PARTICLE_COUNT; i++) {
         let x, y, z;

         if (type === 'galaxy') {
             const angle = i * 0.1;
             const radius = 10 + i * 0.01;
             x = Math.cos(angle) * radius;
             y = (Math.random() - 0.5) * 5;
             z = Math.sin(angle) * radius;
         } else if (type === 'heart') {
             const t = (i / PARTICLE_COUNT) * Math.PI * 2;
             x = 16 * Math.pow(Math.sin(t), 3);
             y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
             z = (Math.random() - 0.5) * 5;
             x *= 1.5;
             y *= 1.5;
         } else if (type === 'flower') {
             const theta = (i / PARTICLE_COUNT) * Math.PI * 2;
             const radius = 20 * Math.sin(5 * theta);
             x = radius * Math.cos(theta);
             y = radius * Math.sin(theta);
             z = (Math.random() - 0.5) * 10;
         } else if (type === 'saturn') {
             if (i < PARTICLE_COUNT * 0.3) {
                 const r = 8;
                 const theta = Math.random() * Math.PI * 2;
                 const phi = Math.acos(2 * Math.random() - 1);
                 x = r * Math.sin(phi) * Math.cos(theta);
                 y = r * Math.sin(phi) * Math.sin(theta);
                 z = r * Math.cos(phi);
             } else {
                 const angle = i * 0.1;
                 const r = 12 + Math.random() * 8;
                 x = Math.cos(angle) * r;
                 z = Math.sin(angle) * r;
                 y = (Math.random() - 0.5);
             }
         } else {
             const r = 20 * Math.cbrt(Math.random());
             const theta = Math.random() * Math.PI * 2;
             const phi = Math.acos(2 * Math.random() - 1);
             x = r * Math.sin(phi) * Math.cos(theta);
             y = r * Math.sin(phi) * Math.sin(theta);
             z = r * Math.cos(phi);
         }

         basePositions[i * 3] = x;
         basePositions[i * 3 + 1] = y;
         basePositions[i * 3 + 2] = z;
     }
 }

 generateShape('galaxy');
 window.setShape = (shape) => generateShape(shape);

 /* ---------- MEDIAPIPE ---------- */

 const videoElement = document.getElementById('input-video');

 function onResults(results) {
     if (results.multiHandLandmarks && results.multiHandLandmarks.length) {
         const lm = results.multiHandLandmarks[0];

         const indexTip = lm[8];
         const thumbTip = lm[4];
         const mid = lm[9];

         const targetX = (0.5 - mid.x) * 80;
         const targetY = (0.5 - mid.y) * 50;

         tempVector.set(targetX, targetY, 0);
         handPosition.lerp(tempVector, 0.1);

         const dx = indexTip.x - thumbTip.x;
         const dy = indexTip.y - thumbTip.y;
         const distance = Math.sqrt(dx * dx + dy * dy);

         let pinch = Math.max(0, Math.min(1, (distance - 0.02) * 5));
         pinchStrength = 1 - pinch;
     } else {
         handPosition.lerp(tempVector.set(0, 0, 0), 0.05);
         pinchStrength = 0.1;
     }
 }

 const hands = new Hands({
     locateFile: (file) =>
         `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
 });

 hands.setOptions({
     maxNumHands: 1,
     modelComplexity: 1,
     minDetectionConfidence: 0.5,
     minTrackingConfidence: 0.5
 });

 hands.onResults(onResults);

 const cameraUtils = new Camera(videoElement, {
     onFrame: async() => {
         await hands.send({
             image: videoElement
         });
     },
     width: 320,
     height: 240
 });

 cameraUtils.start();

 /* ---------- ANIMATION ---------- */

 const clock = new THREE.Clock();

 function animate() {
     requestAnimationFrame(animate);

     const time = clock.getElapsedTime();
     const pos = geometry.attributes.position;
     const col = geometry.attributes.color;
     const expansion = 1 + pinchStrength * 0.5;

     for (let i = 0; i < PARTICLE_COUNT; i++) {
         const px = basePositions[i * 3];
         const py = basePositions[i * 3 + 1];
         const pz = basePositions[i * 3 + 2];

         const noise = Math.sin(time * 2 + i) * 0.5;

         const tx = px * expansion + handPosition.x + noise;
         const ty = py * expansion + handPosition.y + noise;
         const tz = pz * expansion + handPosition.z;

         pos.array[i * 3] += (tx - pos.array[i * 3]) * 0.1;
         pos.array[i * 3 + 1] += (ty - pos.array[i * 3 + 1]) * 0.1;
         pos.array[i * 3 + 2] += (tz - pos.array[i * 3 + 2]) * 0.1;

         const mix = (Math.sin(i * 0.01 + time) + 1) / 2;

         col.array[i * 3] = THREE.MathUtils.lerp(color1.r, color2.r, mix + pinchStrength);
         col.array[i * 3 + 1] = THREE.MathUtils.lerp(color1.g, color2.g, mix - pinchStrength);
         col.array[i * 3 + 2] = THREE.MathUtils.lerp(color1.b, color2.b, mix);
     }

     pos.needsUpdate = true;
     col.needsUpdate = true;

     particles.rotation.y = time * 0.1;
     particles.rotation.z = time * 0.05;

     renderer.render(scene, camera);
 }

 animate();

 window.addEventListener('resize', () => {
     camera.aspect = window.innerWidth / window.innerHeight;
     camera.updateProjectionMatrix();
     renderer.setSize(window.innerWidth, window.innerHeight);
 });