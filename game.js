// Variables globales
let scene, camera, renderer, player, mixer, clock;
let isThirdPerson = true;
const moveSpeed = 0.1;
const keys = {};
let rightArm; // Pour stocker la référence au bras droit
let rightForearm; // Pour l'avant-bras
let rightHand;
let vapeModel;
let isRaisingHand = false; // Pour suivre l'état de l'animation
let handAnimationTimer = null; // Pour gérer le timer de l'animation
let currentHandAction = null; // Pour suivre l'animation en cours
let animationStartTime = 0; // Pour suivre le début de l'animation
let smokeParticles;
let ringParticles;
let smokeTimer = null;
let ringTimer = null;
let loadingManager;
let loadingScreen;
let loadingProgress;
let loadingStatus;
let loadingText;
let idleAnimation; // Pour stocker l'animation de T-pose
let leftLeg, rightLeg; // Pour les os des jambes
let walkAnimation; // Pour l'animation de marche
let vapeMenu;
let currentVapeModel = 'elf_bar_lost_mary_vape.glb';
let currentSmokeColor = new THREE.Color(0xffffff); // Couleur par défaut
let phone;
let musicPlayer;
let currentAudio = null;
let isPlaying = false;
let musicIndicator;
let timecodeElement;
let timecodeUpdateInterval;
let motorcycle = null;
let isOnMotorcycle = false;
let motorcycleSpeed = 0.2;
let motorcycleRotationSpeed = 0.05;
let interactionBubble;
let isNearMotorcycle = false;
const INTERACTION_DISTANCE = 3;
let accelerationSound;
let rollingSound;
let isAccelerating = false;
let lastAccelerationTime = 0;
const ACCELERATION_COOLDOWN = 2000; // 2 secondes de cooldown
let motorcycleAnimation; // Pour l'animation sur la moto

// Variables pour la caméra
let cameraDistance = 5;
let cameraAngle = 0;
const minDistance = 2;
const maxDistance = 15;
const zoomSpeed = 0.5;
const rotationSpeed = 0.02;

// Initialisation
function init() {
    // Configuration du gestionnaire de chargement
    loadingManager = new THREE.LoadingManager();
    loadingScreen = document.getElementById('loadingScreen');
    loadingProgress = document.getElementById('loadingProgress');
    loadingStatus = document.getElementById('loadingStatus');
    loadingText = document.getElementById('loadingText');

    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
        const progress = (itemsLoaded / itemsTotal) * 100;
        loadingProgress.style.width = progress + '%';
        loadingStatus.textContent = Math.round(progress) + '%';
        
        if (url.includes('Xbot.glb')) {
            loadingText.textContent = 'Chargement du personnage...';
        } else if (url.includes('elf_bar_lost_mary_vape.glb')) {
            loadingText.textContent = 'Chargement de la vape...';
        }
    };

    loadingManager.onLoad = function() {
        console.log('Tout est chargé !');
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    };

    loadingManager.onError = function(url) {
        console.error('Erreur lors du chargement de:', url);
        loadingText.textContent = 'Erreur de chargement. Veuillez rafraîchir la page.';
    };

    // Création de la scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    // Création de la caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Création du renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Initialisation de l'horloge pour les animations
    clock = new THREE.Clock();

    // Ajout de lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Création du sol
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Charger les modèles
    loadModels();

    // Gestionnaires d'événements
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
    window.addEventListener('resize', onWindowResize);

    // Créer les systèmes de particules
    createSmoke();
    createRingSmoke();

    // Animation
    animate();

    // Ajouter les événements de la souris
    window.addEventListener('wheel', handleMouseWheel);
    window.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Configurer le menu de vape
    setupVapeMenu();

    // Configurer le téléphone
    setupPhone();
    
    // Initialiser l'indicateur de musique
    musicIndicator = document.getElementById('musicIndicator');
    timecodeElement = document.querySelector('.timecode');
    
    // Ajouter l'événement pour le bouton play/pause de l'indicateur
    const miniPlayPause = document.querySelector('.mini-play-pause');
    miniPlayPause.addEventListener('click', (e) => {
        e.stopPropagation(); // Empêcher la propagation du clic
        togglePlayPause();
        updateMiniPlayPauseButton();
    });

    // Initialiser la bulle d'interaction
    interactionBubble = document.getElementById('interactionBubble');
    
    // Charger la moto
    loadMotorcycle();

    // Initialiser les sons de la moto
    accelerationSound = new Audio('acceleration.MP3');
    rollingSound = new Audio('rienpourlinstantcarlesonroulerestdegeu');
    rollingSound.loop = true;
    
    // Ajouter l'événement pour détecter la fin du son d'accélération
    accelerationSound.addEventListener('ended', () => {
        if (isAccelerating) {
            rollingSound.currentTime = 0;
            rollingSound.play();
        }
    });
}

// Gestion du redimensionnement de la fenêtre
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Mise à jour de la position de la caméra
function updateCamera() {
    if (!player) return;

    if (isThirdPerson) {
        // Vue à la troisième personne
        const cameraOffset = new THREE.Vector3(
            Math.sin(cameraAngle) * cameraDistance,
            3,
            Math.cos(cameraAngle) * cameraDistance
        );
        camera.position.copy(player.position).add(cameraOffset);
        camera.lookAt(player.position);
    } else {
        // Vue à la première personne
        camera.position.copy(player.position);
        camera.position.y += 1.8;
        camera.position.z += 0.3;
        camera.rotation.x = -0.3;
        camera.rotation.y = player.rotation.y;
        
        // Ajuster la position de la caméra pour mieux voir la main
        if (rightHand) {
            const handWorldPos = new THREE.Vector3();
            rightHand.getWorldPosition(handWorldPos);
            camera.lookAt(handWorldPos);
        }
    }
}

// Gestion des mouvements
function handleMovement() {
    if (!player) return;

    if (isOnMotorcycle) {
        handleMotorcycleMovement();
        return;
    }

    const moveDirection = new THREE.Vector3();
    let isMoving = false;
    
    if (keys['z'] || keys['arrowup']) {
        moveDirection.z = -1;
        isMoving = true;
    }
    if (keys['s'] || keys['arrowdown']) {
        moveDirection.z = 1;
        isMoving = true;
    }
    if (keys['q'] || keys['arrowleft']) {
        moveDirection.x = -1;
        isMoving = true;
    }
    if (keys['d'] || keys['arrowright']) {
        moveDirection.x = 1;
        isMoving = true;
    }

    if (isMoving) {
        moveDirection.normalize();
        player.position.add(moveDirection.multiplyScalar(moveSpeed));
        
        // Rotation du modèle dans la direction du mouvement
        const angle = Math.atan2(moveDirection.x, moveDirection.z);
        player.rotation.y = angle;

        // Démarrer l'animation de marche
        if (walkAnimation && !walkAnimation.isRunning()) {
            walkAnimation.play();
        }
    } else {
        // Arrêter l'animation de marche
        if (walkAnimation && walkAnimation.isRunning()) {
            walkAnimation.stop();
        }
    }
}

// Changement de vue
function toggleView() {
    if (keys['g']) {
        isThirdPerson = !isThirdPerson;
        keys['g'] = false;
    }
}

// Création du système de particules pour la fumée en nuage
function createSmoke() {
    const particleCount = 200;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;

        // Utiliser la couleur actuelle
        colors[i * 3] = currentSmokeColor.r;
        colors[i * 3 + 1] = currentSmokeColor.g;
        colors[i * 3 + 2] = currentSmokeColor.b;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });

    smokeParticles = new THREE.Points(particles, particleMaterial);
    smokeParticles.visible = false;
    scene.add(smokeParticles);
}

// Création du système de particules pour les ronds de fumée
function createRingSmoke() {
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;

        // Utiliser la couleur actuelle
        colors[i * 3] = currentSmokeColor.r;
        colors[i * 3 + 1] = currentSmokeColor.g;
        colors[i * 3 + 2] = currentSmokeColor.b;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    ringParticles = new THREE.Points(particles, particleMaterial);
    ringParticles.visible = false;
    scene.add(ringParticles);
}

// Animation de la fumée en nuage
function updateSmoke() {
    if (!smokeParticles || !smokeParticles.visible) return;

    const positions = smokeParticles.geometry.attributes.position.array;
    const time = Date.now() * 0.001;

    for (let i = 0; i < positions.length; i += 3) {
        // Mouvement vers le haut
        positions[i + 1] += 0.015;
        // Mouvement aléatoire horizontal plus prononcé
        positions[i] += Math.sin(time + i) * 0.02;
        positions[i + 2] += Math.cos(time + i) * 0.02;
        // Fade out
        if (positions[i + 1] > 2) {
            positions[i] = 0;
            positions[i + 1] = 0;
            positions[i + 2] = 0;
        }
    }

    smokeParticles.geometry.attributes.position.needsUpdate = true;
}

// Animation des ronds de fumée
function updateRingSmoke() {
    if (!ringParticles || !ringParticles.visible) return;

    const positions = ringParticles.geometry.attributes.position.array;
    const time = Date.now() * 0.001;

    for (let i = 0; i < positions.length; i += 3) {
        // Mouvement vers le haut
        positions[i + 1] += 0.02;
        // Mouvement en anneau
        const angle = time + i * 0.1;
        positions[i] = Math.sin(angle) * 0.2;
        positions[i + 2] = Math.cos(angle) * 0.2;
        // Fade out
        if (positions[i + 1] > 1.5) {
            positions[i] = 0;
            positions[i + 1] = 0;
            positions[i + 2] = 0;
        }
    }

    ringParticles.geometry.attributes.position.needsUpdate = true;
}

// Création de l'animation de marche
function createWalkAnimation() {
    if (!leftLeg || !rightLeg) return;

    const duration = 1; // Durée d'un cycle de marche
    const tracks = [];

    // Animation pour la jambe gauche
    const leftLegTrack = new THREE.KeyframeTrack(
        leftLeg.uuid + '.rotation[x]',
        [0, duration/2, duration],
        [0, Math.PI/4, 0]
    );
    tracks.push(leftLegTrack);

    // Animation pour la jambe droite
    const rightLegTrack = new THREE.KeyframeTrack(
        rightLeg.uuid + '.rotation[x]',
        [0, duration/2, duration],
        [Math.PI/4, 0, Math.PI/4]
    );
    tracks.push(rightLegTrack);

    const clip = new THREE.AnimationClip('walk', duration, tracks);
    walkAnimation = mixer.clipAction(clip);
    walkAnimation.setLoop(THREE.LoopRepeat);
    walkAnimation.setEffectiveTimeScale(2); // Vitesse de l'animation
}

// Chargement du modèle 3D
function loadModels() {
    const loader = new THREE.GLTFLoader(loadingManager);
    
    // Chargement du personnage
    loader.load(
        'https://threejs.org/examples/models/gltf/Xbot.glb',
        function (gltf) {
            console.log('Personnage chargé avec succès');
            player = gltf.scene;
            player.scale.set(1, 1, 1);
            player.position.y = 0;
            player.castShadow = true;
            scene.add(player);

            // Trouver les os du modèlee
            player.traverse((node) => {
                if (node.isBone) {
                    console.log('Bone trouvé:', node.name);
                    if (node.name.toLowerCase().includes('rightarm')) {
                        rightArm = node;
                        console.log('Bras droit trouvé');
                    }
                    if (node.name.toLowerCase().includes('rightforearm')) {
                        rightForearm = node;
                        console.log('Avant-bras droit trouvé');
                    }
                    if (node.name.toLowerCase().includes('righthand')) {
                        rightHand = node;
                        console.log('Main droite trouvée');
                    }
                    if (node.name.toLowerCase().includes('leftupleg')) {
                        leftLeg = node;
                        console.log('Jambe gauche trouvée');
                    }
                    if (node.name.toLowerCase().includes('rightupleg')) {
                        rightLeg = node;
                        console.log('Jambe droite trouvée');
                    }
                }
            });

            // Configuration des animations
            mixer = new THREE.AnimationMixer(player);
            const animations = gltf.animations;
            
            // Configurer l'animation de T-pose (idle)
            idleAnimation = mixer.clipAction(animations[1]);
            idleAnimation.setEffectiveTimeScale(1);
            idleAnimation.setEffectiveWeight(1);
            idleAnimation.setLoop(THREE.LoopRepeat);
            idleAnimation.play();

            // Créer l'animation de marche
            createWalkAnimation();

            // Charger la vape une fois que le personnage est chargé
            loadVape();
        }
    );
}

// Chargement du modèle de vape
function loadVape() {
    console.log('Début du chargement de la vape:', currentVapeModel);
    const loader = new THREE.GLTFLoader(loadingManager);
    
    // Afficher le menu de chargement
    loadingScreen.style.display = 'flex';
    loadingText.textContent = 'Chargement de la vape...';
    
    // Supprimer l'ancien modèle de vape s'il existe
    if (vapeModel) {
        if (vapeModel.parent) {
            vapeModel.parent.remove(vapeModel);
        }
        scene.remove(vapeModel);
        vapeModel = null;
    }
    
    loader.load(
        currentVapeModel,
        function (gltf) {
            console.log('Vape chargée avec succès:', currentVapeModel);
            
            vapeModel = gltf.scene;
            
            // Créer un nouveau groupe pour la vape
            const vapeGroup = new THREE.Group();
            vapeGroup.add(vapeModel);
            
            // Ajuster la taille selon le modèle
            if (currentVapeModel === 'vape..glb') {
                // Pour la première vape
                vapeModel.scale.set(4, 4, 4);
                // Position plus en avant
                vapeGroup.position.set(0.5, 5, 1.5);
                // Couleur de fumée bleue
                currentSmokeColor = new THREE.Color(0x00ffff);
            } else if (currentVapeModel === 'vape_-_it (1).glb') {
                // Pour la deuxième vape
                vapeModel.scale.set(1, 1, 1);
                // Position plus en avant
                vapeGroup.position.set(0.5, 5, 1.5);
                // Couleur de fumée verte
                currentSmokeColor = new THREE.Color(0x00ff00);
            } else if (currentVapeModel === 'elf_bar_lost_mary_vape.glb') {
                // Pour l'Elf Bar Lost Mary
                vapeModel.scale.set(150, 150, 150);
                // Position normale
                vapeGroup.position.set(0.5, 5, 0.5);
                // Couleur de fumée blanche
                currentSmokeColor = new THREE.Color(0xffffff);
            }
            console.log('Taille de la vape définie à:', vapeModel.scale);
            
            // Rendre la vape visible
            vapeModel.traverse((node) => {
                if (node.isMesh) {
                    console.log('Mesh trouvé dans la vape:', node.name);
                    node.castShadow = true;
                    if (node.material) {
                        node.material.needsUpdate = true;
                        node.material.metalness = 0.7;
                        node.material.roughness = 0.3;
                        node.material.emissive = new THREE.Color(0x222222);
                    }
                }
            });
            
            // Attacher le groupe à la main droite
            if (rightHand) {
                console.log('Main droite trouvée, attachement de la vape');
                rightHand.add(vapeGroup);
                
                // Rotation de la vape
                vapeGroup.rotation.set(0, Math.PI / 2, 0);
                
                console.log('Vape attachée à la main à la position:', vapeGroup.position);
            } else {
                console.log('Main droite non trouvée');
            }
            
            // Recréer les systèmes de particules avec la nouvelle couleur
            if (smokeParticles) scene.remove(smokeParticles);
            if (ringParticles) scene.remove(ringParticles);
            createSmoke();
            createRingSmoke();
            
            // Cacher le menu de chargement
            loadingScreen.style.display = 'none';
        },
        function (xhr) {
            const progress = (xhr.loaded / xhr.total * 100);
            console.log('Chargement de la vape: ' + progress.toFixed(2) + '%');
            loadingProgress.style.width = progress + '%';
            loadingStatus.textContent = Math.round(progress) + '%';
        },
        function (error) {
            console.error('Erreur lors du chargement de la vape:', error);
            loadingText.textContent = 'Erreur de chargement de la vape. Veuillez réessayer.';
            setTimeout(() => {
                currentVapeModel = 'elf_bar_lost_mary_vape.glb';
                loadVape();
            }, 3000);
        }
    );
}

// Animation de lever la main
function raiseHand() {
    if (!rightArm || !rightForearm) return;

    // Réinitialiser le timer si l'animation est déjà en cours
    if (handAnimationTimer) {
        clearTimeout(handAnimationTimer);
    }

    isRaisingHand = true;
    
    // Animation du bras (rotation vers l'avant)
    const armKeyframes = [
        { time: 0, value: rightArm.rotation.x },
        { time: 0.5, value: rightArm.rotation.x - Math.PI / 3 }
    ];

    const armTrack = new THREE.KeyframeTrack(
        rightArm.uuid + '.rotation[x]',
        armKeyframes.map(k => k.time),
        armKeyframes.map(k => k.value)
    );

    // Animation de l'avant-bras (pliage du coude)
    const forearmKeyframesX = [
        { time: 0, value: rightForearm.rotation.x },
        { time: 0.5, value: rightForearm.rotation.x - Math.PI / 2 }
    ];

    const forearmKeyframesZ = [
        { time: 0, value: rightForearm.rotation.z },
        { time: 0.5, value: rightForearm.rotation.z - Math.PI / 4 }
    ];

    const forearmTrackX = new THREE.KeyframeTrack(
        rightForearm.uuid + '.rotation[x]',
        forearmKeyframesX.map(k => k.time),
        forearmKeyframesX.map(k => k.value)
    );

    const forearmTrackZ = new THREE.KeyframeTrack(
        rightForearm.uuid + '.rotation[z]',
        forearmKeyframesZ.map(k => k.time),
        forearmKeyframesZ.map(k => k.value)
    );

    const clip = new THREE.AnimationClip('raiseHand', 0.5, [armTrack, forearmTrackX, forearmTrackZ]);
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.play();

    // Démarrer la fumée en nuage
    if (smokeParticles) {
        smokeParticles.visible = true;
        smokeParticles.position.copy(player.position);
        smokeParticles.position.y += 1.7;
        smokeParticles.position.z += 0.2;
    }

    // Réinitialiser l'état après 5 secondes
    handAnimationTimer = setTimeout(() => {
        isRaisingHand = false;
        handAnimationTimer = null;
        
        // Arrêter la fumée
        if (smokeParticles) {
            smokeParticles.visible = false;
        }

        // Animation de retour
        const returnArmKeyframes = [
            { time: 0, value: rightArm.rotation.x },
            { time: 0.5, value: rightArm.rotation.x + Math.PI / 3 }
        ];

        const returnForearmKeyframesX = [
            { time: 0, value: rightForearm.rotation.x },
            { time: 0.5, value: rightForearm.rotation.x + Math.PI / 2 }
        ];

        const returnForearmKeyframesZ = [
            { time: 0, value: rightForearm.rotation.z },
            { time: 0.5, value: rightForearm.rotation.z + Math.PI / 4 }
        ];

        const returnArmTrack = new THREE.KeyframeTrack(
            rightArm.uuid + '.rotation[x]',
            returnArmKeyframes.map(k => k.time),
            returnArmKeyframes.map(k => k.value)
        );

        const returnForearmTrackX = new THREE.KeyframeTrack(
            rightForearm.uuid + '.rotation[x]',
            returnForearmKeyframesX.map(k => k.time),
            returnForearmKeyframesX.map(k => k.value)
        );

        const returnForearmTrackZ = new THREE.KeyframeTrack(
            rightForearm.uuid + '.rotation[z]',
            returnForearmKeyframesZ.map(k => k.time),
            returnForearmKeyframesZ.map(k => k.value)
        );

        const returnClip = new THREE.AnimationClip('returnHand', 0.5, [returnArmTrack, returnForearmTrackX, returnForearmTrackZ]);
        const returnAction = mixer.clipAction(returnClip);
        returnAction.setLoop(THREE.LoopOnce);
        returnAction.clampWhenFinished = true;
        returnAction.play();
    }, 5000);
}

// Animation des ronds de fumée
function createRing() {
    if (!ringParticles) return;

    // Réinitialiser le timer si l'animation est déjà en cours
    if (ringTimer) {
        clearTimeout(ringTimer);
    }

    ringParticles.visible = true;
    ringParticles.position.copy(player.position);
    ringParticles.position.y += 1.7;
    ringParticles.position.z += 0.2;

    // Arrêter l'animation après 2 secondes
    ringTimer = setTimeout(() => {
        ringParticles.visible = false;
        ringTimer = null;
    }, 2000);
}

// Gestion des touches
function handleKeys() {
    if (keys['f']) {
        raiseHand();
        keys['f'] = false;
    }
    if (keys['o']) {
        createRing();
        keys['o'] = false;
    }
    if (keys['e']) {
        toggleVapeMenu();
        keys['e'] = false;
    }
    if (keys['arrowup']) {
        togglePhone();
        keys['arrowup'] = false;
    }
    if (keys['arrowdown']) {
        if (!phone.classList.contains('hidden')) {
            togglePhone();
        }
        keys['arrowdown'] = false;
    }
    if (keys['m']) {
        toggleMotorcycle();
        keys['m'] = false;
    }
    if (keys['r']) {
        if (isNearMotorcycle) {
            toggleMotorcycle();
        }
        keys['r'] = false;
    }
}

// Gestion de la molette de la souris
function handleMouseWheel(event) {
    if (!isThirdPerson) return;
    
    cameraDistance -= event.deltaY * zoomSpeed * 0.01;
    cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance));
}

// Gestion du mouvement de la souris
function handleMouseMove(event) {
    if (!isThirdPerson) return;
    
    if (event.buttons === 2) {
        cameraAngle += event.movementX * rotationSpeed;
    }
}

// Gestion du menu de vape
function setupVapeMenu() {
    vapeMenu = document.getElementById('vapeMenu');
    const closeButton = document.getElementById('closeMenu');
    const vapeOptions = document.querySelectorAll('.vapeOption');

    // Fermer le menu
    closeButton.addEventListener('click', () => {
        vapeMenu.style.display = 'none';
    });

    // Sélectionner une vape
    vapeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const modelPath = option.dataset.model;
            console.log('Nouvelle vape sélectionnée:', modelPath);
            currentVapeModel = modelPath;
            // Mettre à jour la sélection visuelle
            vapeOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            // Forcer le rechargement de la vape
            loadVape();
            vapeMenu.style.display = 'none';
        });
    });

    // Sélectionner l'option actuelle au démarrage
    vapeOptions.forEach(option => {
        if (option.dataset.model === currentVapeModel) {
            option.classList.add('selected');
        }
    });
}

// Afficher/Masquer le menu
function toggleVapeMenu() {
    if (vapeMenu.style.display === 'none') {
        vapeMenu.style.display = 'block';
    } else {
        vapeMenu.style.display = 'none';
    }
}

// Gestion du téléphone
function setupPhone() {
    phone = document.getElementById('phone');
    musicPlayer = document.getElementById('musicPlayer');
    const musicApp = document.querySelector('.music-app');
    const backButton = document.querySelector('.back-button');
    const playButtons = document.querySelectorAll('.play-button');
    const playPauseButton = document.querySelector('.play-pause');
    const prevButton = document.querySelector('.control-button:nth-child(1)');
    const nextButton = document.querySelector('.control-button:nth-child(3)');

    // Ouvrir l'app de musique
    musicApp.addEventListener('click', () => {
        musicPlayer.classList.remove('hidden');
    });

    // Retour à l'écran d'accueil
    backButton.addEventListener('click', () => {
        musicPlayer.classList.add('hidden');
    });

    // Jouer une chanson spécifique
    playButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const songItem = e.target.closest('.music-item');
            const songPath = songItem.dataset.song;
            playSong(songPath);
        });
    });

    // Contrôles de lecture
    playPauseButton.addEventListener('click', togglePlayPause);
    prevButton.addEventListener('click', playPreviousSong);
    nextButton.addEventListener('click', playNextSong);
}

// Afficher/Masquer le téléphone
function togglePhone() {
    phone.classList.toggle('hidden');
    if (phone.classList.contains('hidden')) {
        // Ne plus arrêter la musique quand le téléphone est fermé
        // On garde juste l'indicateur de musique visible
        if (currentAudio && isPlaying) {
            musicIndicator.classList.add('visible');
        }
    }
}

// Jouer une chanson
function playSong(songPath) {
    if (currentAudio) {
        currentAudio.pause();
        clearInterval(timecodeUpdateInterval);
    }
    currentAudio = new Audio(songPath);
    currentAudio.play();
    isPlaying = true;
    updatePlayPauseButton();
    
    // Afficher l'indicateur de musique
    musicIndicator.classList.add('visible');
    
    // Mettre à jour le timecode toutes les secondes
    timecodeUpdateInterval = setInterval(updateTimecode, 1000);
    
    // Mettre à jour le timecode immédiatement
    updateTimecode();
}

// Mettre en pause/Reprendre la lecture
function togglePlayPause() {
    if (currentAudio) {
        if (isPlaying) {
            currentAudio.pause();
            clearInterval(timecodeUpdateInterval);
        } else {
            currentAudio.play();
            timecodeUpdateInterval = setInterval(updateTimecode, 1000);
        }
        isPlaying = !isPlaying;
        updatePlayPauseButton();
        updateMiniPlayPauseButton();
    }
}

// Jouer la chanson précédente
function playPreviousSong() {
    const currentSong = document.querySelector('.music-item.playing');
    if (currentSong) {
        const prevSong = currentSong.previousElementSibling;
        if (prevSong) {
            const songPath = prevSong.dataset.song;
            playSong(songPath);
            updatePlayingSong(prevSong);
        }
    }
}

// Jouer la chanson suivante
function playNextSong() {
    const currentSong = document.querySelector('.music-item.playing');
    if (currentSong) {
        const nextSong = currentSong.nextElementSibling;
        if (nextSong) {
            const songPath = nextSong.dataset.song;
            playSong(songPath);
            updatePlayingSong(nextSong);
        }
    }
}

// Mettre à jour le bouton play/pause
function updatePlayPauseButton() {
    const playPauseButton = document.querySelector('.play-pause');
    playPauseButton.textContent = isPlaying ? '⏸' : '▶';
}

// Mettre à jour la chanson en cours de lecture
function updatePlayingSong(songElement) {
    document.querySelectorAll('.music-item').forEach(item => {
        item.classList.remove('playing');
    });
    songElement.classList.add('playing');
}

// Mettre à jour le timecode
function updateTimecode() {
    if (currentAudio) {
        const currentTime = Math.floor(currentAudio.currentTime);
        const minutes = Math.floor(currentTime / 60);
        const seconds = currentTime % 60;
        timecodeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Mettre à jour le bouton play/pause de l'indicateur
function updateMiniPlayPauseButton() {
    const miniPlayPause = document.querySelector('.mini-play-pause');
    miniPlayPause.textContent = isPlaying ? '⏸' : '▶';
}

// Chargement du modèle de moto
function loadMotorcycle() {
    const loader = new THREE.GLTFLoader(loadingManager);
    
    loader.load(
        'ktm_450_exc.glb',
        function (gltf) {
            console.log('Moto chargée avec succès');
            motorcycle = gltf.scene;
            motorcycle.scale.set(1, 1, 1);
            motorcycle.position.set(5, 0, 5);
            motorcycle.rotation.y = Math.PI;
            motorcycle.castShadow = true;
            scene.add(motorcycle);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% chargé');
        },
        function (error) {
            console.error('Erreur lors du chargement de la moto:', error);
        }
    );
}

// Monter/Descendre de la moto
function toggleMotorcycle() {
    if (!motorcycle) return;
    
    if (!isOnMotorcycle) {
        // Monter sur la moto
        const motorcyclePosition = motorcycle.position.clone();
        player.position.copy(motorcyclePosition);
        player.position.y += 0.5;
        player.position.z += 0.2;
        player.rotation.y = motorcycle.rotation.y;
        player.rotation.x = -0.2;
        isOnMotorcycle = true;
        interactionBubble.classList.remove('visible');

        // Créer et jouer l'animation de position moto
        createMotorcycleAnimation();
        if (motorcycleAnimation) {
            motorcycleAnimation.play();
        }
    } else {
        // Descendre de la moto
        const offset = new THREE.Vector3(2, 0, 0);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), motorcycle.rotation.y);
        player.position.copy(motorcycle.position).add(offset);
        player.rotation.x = 0;
        isOnMotorcycle = false;
        
        // Arrêter l'animation moto et revenir à l'animation idle
        if (motorcycleAnimation) {
            motorcycleAnimation.stop();
        }
        if (idleAnimation) {
            idleAnimation.play();
        }
        
        // Arrêter les sons
        accelerationSound.pause();
        rollingSound.pause();
        isAccelerating = false;
    }
}

// Créer l'animation pour la position moto
function createMotorcycleAnimation() {
    if (!leftLeg || !rightLeg || !rightArm || !rightForearm) return;

    const duration = 0.5; // Durée de l'animation en secondes
    const tracks = [];

    // Animation pour la jambe gauche (plier)
    const leftLegTrack = new THREE.KeyframeTrack(
        leftLeg.uuid + '.rotation[x]',
        [0, duration],
        [0, Math.PI/2] // Plier la jambe à 90 degrés
    );
    tracks.push(leftLegTrack);

    // Animation pour la jambe droite (plier)
    const rightLegTrack = new THREE.KeyframeTrack(
        rightLeg.uuid + '.rotation[x]',
        [0, duration],
        [0, Math.PI/2] // Plier la jambe à 90 degrés
    );
    tracks.push(rightLegTrack);

    // Animation pour le bras droit (position guidon)
    const rightArmTrack = new THREE.KeyframeTrack(
        rightArm.uuid + '.rotation[x]',
        [0, duration],
        [0, -Math.PI/4] // Baisser le bras
    );
    tracks.push(rightArmTrack);

    // Animation pour l'avant-bras droit (position guidon)
    const rightForearmTrack = new THREE.KeyframeTrack(
        rightForearm.uuid + '.rotation[x]',
        [0, duration],
        [0, -Math.PI/3] // Plier l'avant-bras
    );
    tracks.push(rightForearmTrack);

    const clip = new THREE.AnimationClip('motorcycle', duration, tracks);
    motorcycleAnimation = mixer.clipAction(clip);
    motorcycleAnimation.setLoop(THREE.LoopOnce);
    motorcycleAnimation.clampWhenFinished = true;
}

// Gestion des mouvements de la moto
function handleMotorcycleMovement() {
    if (!isOnMotorcycle || !motorcycle) return;

    const currentTime = Date.now();
    const isFirstAcceleration = currentTime - lastAccelerationTime > ACCELERATION_COOLDOWN;

    if (keys['z'] || keys['arrowup']) {
        // Avancer
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), motorcycle.rotation.y);
        motorcycle.position.add(direction.multiplyScalar(motorcycleSpeed));
        player.position.copy(motorcycle.position);
        player.position.y += 0.5;
        player.position.z += 0.2;
        player.rotation.x = -0.2;

        // Gestion des sons
        if (!isAccelerating) {
            if (isFirstAcceleration) {
                accelerationSound.currentTime = 0;
                accelerationSound.play();
                lastAccelerationTime = currentTime;
            } else if (rollingSound.paused) {
                rollingSound.currentTime = 0;
                rollingSound.play();
            }
            isAccelerating = true;
        }
    } else {
        if (isAccelerating) {
            rollingSound.pause();
            isAccelerating = false;
        }
    }

    if (keys['s'] || keys['arrowdown']) {
        // Reculer
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), motorcycle.rotation.y);
        motorcycle.position.add(direction.multiplyScalar(motorcycleSpeed));
        player.position.copy(motorcycle.position);
        // Maintenir la position assise pendant le mouvement
        player.position.y += 0.5;
        player.position.z += 0.2;
        player.rotation.x = -0.2;
    }
    if (keys['q'] || keys['arrowleft']) {
        // Tourner à gauche
        motorcycle.rotation.y += motorcycleRotationSpeed;
        player.rotation.y = motorcycle.rotation.y;
    }
    if (keys['d'] || keys['arrowright']) {
        // Tourner à droite
        motorcycle.rotation.y -= motorcycleRotationSpeed;
        player.rotation.y = motorcycle.rotation.y;
    }
}

// Vérifier la proximité avec la moto
function checkMotorcycleProximity() {
    if (!motorcycle || !player) return;
    
    const distance = player.position.distanceTo(motorcycle.position);
    const wasNearMotorcycle = isNearMotorcycle;
    isNearMotorcycle = distance < INTERACTION_DISTANCE;
    
    // Afficher/masquer la bulle d'interaction seulement si on n'est pas sur la moto
    if (!isOnMotorcycle) {
        if (isNearMotorcycle && !wasNearMotorcycle) {
            interactionBubble.classList.add('visible');
        } else if (!isNearMotorcycle && wasNearMotorcycle) {
            interactionBubble.classList.remove('visible');
        }
    } else {
        interactionBubble.classList.remove('visible');
    }
}

// Boucle d'animation
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    
    handleMovement();
    handleKeys();
    toggleView();
    updateCamera();
    updateSmoke();
    updateRingSmoke();
    checkMotorcycleProximity(); // Vérifier la proximité avec la moto
    
    renderer.render(scene, camera);
}

// Démarrage du jeu
init(); 