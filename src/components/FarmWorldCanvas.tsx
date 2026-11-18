import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  DECO_CATALOG,
  hasPetSkill,
  isPondPoint,
  isWalkableLandPoint,
  isWaterPoint,
  streamCenterXAtZ,
} from '../shared/gameTypes';
import { soundEngine } from '../audio/soundEngine';
import type {
  AvatarCustomization,
  BattlePlayerState,
  PetInstanceState,
  PlacedDecoration,
  WorldOrb,
} from '../shared/gameTypes';
import {
  createDecorationModel,
  createHeroModel,
  createMathOrbModel,
  createPetModel,
} from '../game/models3d';
import {
  createContactShadowTexture,
  createGrassTexture,
  createWaterTexture,
  createWoodTexture,
} from '../game/textures';

export type GameMode = 'title' | 'harvest' | 'decorate' | 'battle';

export interface DraggingShopItem {
  decoId: string;
}

interface FarmWorldCanvasProps {
  mode: GameMode;
  playerId: string;
  avatarColor: string;
  avatarCustom?: AvatarCustomization;
  activePetId: string;
  activePetState?: PetInstanceState;
  unlockedPets: PetInstanceState[];
  placedDecorations: PlacedDecoration[];
  harvestOrbs: WorldOrb[];
  battleOrbs: WorldOrb[];
  battlePlayers: BattlePlayerState[];
  selectedDecoInstanceId: string | null;
  pendingPlaceDecoId: string | null;
  draggingShopDecoId: string | null;
  paused: boolean;
  celebrateCounter: number;
  resetCameraCounter: number;
  joystickVecRef: React.MutableRefObject<{ x: number; y: number }>;
  onCollectHarvestOrb: (orb: WorldOrb) => void;
  onCollectBattleOrb: (orb: WorldOrb) => void;
  onBattleMove: (x: number, z: number, rotY: number) => void;
  onSelectPlacedDeco: (instanceId: string | null) => void;
  onPlaceDecoAt: (decoId: string, gridX: number, gridZ: number) => void;
  onMoveDecoAt: (instanceId: string, gridX: number, gridZ: number) => void;
  onClearDraggingShop: () => void;
}

interface ParticleItem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _planeHit = new THREE.Vector3();

export const FarmWorldCanvas: React.FC<FarmWorldCanvasProps> = ({
  mode,
  playerId,
  avatarColor,
  avatarCustom,
  activePetId,
  activePetState,
  unlockedPets,
  placedDecorations,
  harvestOrbs,
  battleOrbs,
  battlePlayers,
  selectedDecoInstanceId,
  pendingPlaceDecoId,
  draggingShopDecoId,
  paused,
  celebrateCounter,
  resetCameraCounter,
  joystickVecRef,
  onCollectHarvestOrb,
  onCollectBattleOrb,
  onBattleMove,
  onSelectPlacedDeco,
  onPlaceDecoAt,
  onMoveDecoAt,
  onClearDraggingShop,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Sync latest React props into mutable refs so the WebGL loop never tears down
  const propsRef = useRef({
    mode,
    playerId,
    avatarColor,
    avatarCustom,
    activePetId,
    activePetState,
    unlockedPets,
    placedDecorations,
    harvestOrbs,
    battleOrbs,
    battlePlayers,
    selectedDecoInstanceId,
    pendingPlaceDecoId,
    draggingShopDecoId,
    paused,
    celebrateCounter,
    resetCameraCounter,
    onCollectHarvestOrb,
    onCollectBattleOrb,
    onBattleMove,
    onSelectPlacedDeco,
    onPlaceDecoAt,
    onMoveDecoAt,
    onClearDraggingShop,
  });

  propsRef.current = {
    mode,
    playerId,
    avatarColor,
    avatarCustom,
    activePetId,
    activePetState,
    unlockedPets,
    placedDecorations,
    harvestOrbs,
    battleOrbs,
    battlePlayers,
    selectedDecoInstanceId,
    pendingPlaceDecoId,
    draggingShopDecoId,
    paused,
    celebrateCounter,
    resetCameraCounter,
    onCollectHarvestOrb,
    onCollectBattleOrb,
    onBattleMove,
    onSelectPlacedDeco,
    onPlaceDecoAt,
    onMoveDecoAt,
    onClearDraggingShop,
  };

  // Expose helper to compute grid cell from client pointer coordinates
  const pointerToGridRef = useRef<(clientX: number, clientY: number) => { gx: number; gz: number } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL probe
    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#c8eef9');
    scene.fog = new THREE.Fog('#c8eef9', 28, 62);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      44,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      140
    );
    camera.position.set(0, 14.5, 11.5);

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = !isSoftwareGl;
    orbitControls.dampingFactor = 0.08;
    orbitControls.enablePan = false;
    orbitControls.minDistance = 8;
    orbitControls.maxDistance = 30;
    orbitControls.minPolarAngle = 0.22;
    orbitControls.maxPolarAngle = 1.28;
    orbitControls.rotateSpeed = 0.78;
    orbitControls.zoomSpeed = 0.9;
    orbitControls.target.set(0, 0.6, 0);
    orbitControls.update();

    // 2. Studio Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#a5e8ff', '#5da338', 0.92);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fff5da', 1.75);
    sunLight.position.set(14, 22, 12);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -18;
    sunLight.shadow.camera.right = 18;
    sunLight.shadow.camera.top = 18;
    sunLight.shadow.camera.bottom = -18;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#bae6fd', 0.55);
    rimLight.position.set(-14, 10, -14);
    scene.add(rimLight);

    // 3. Procedural Textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const grassTex = createGrassTexture(maxAniso);
    const waterTex = createWaterTexture(maxAniso);
    const woodTex = createWoodTexture(maxAniso);
    const shadowTex = createContactShadowTexture();

    // 4. Natural Valley Terrain + Winding Stream + Fish Pond
    const outerGround = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 110),
      new THREE.MeshStandardMaterial({
        color: '#63b84a',
        roughness: 0.92,
        metalness: 0.0,
      })
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.04;
    outerGround.receiveShadow = true;
    scene.add(outerGround);

    const farmGrass = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28, 28, 28),
      new THREE.MeshStandardMaterial({
        map: grassTex,
        roughness: 0.85,
        metalness: 0.02,
      })
    );
    farmGrass.rotation.x = -Math.PI / 2;
    farmGrass.position.y = 0;
    farmGrass.receiveShadow = true;
    scene.add(farmGrass);

    // Winding Stream Mesh built along streamCenterXAtZ
    const streamShape = new THREE.Shape();
    const zSteps = 44;
    for (let i = 0; i <= zSteps; i++) {
      const z = -18 + (i / zSteps) * 36;
      const cx = streamCenterXAtZ(z);
      if (i === 0) streamShape.moveTo(cx - 1.55, -z);
      else streamShape.lineTo(cx - 1.55, -z);
    }
    for (let i = zSteps; i >= 0; i--) {
      const z = -18 + (i / zSteps) * 36;
      const cx = streamCenterXAtZ(z);
      streamShape.lineTo(cx + 1.55, -z);
    }
    streamShape.closePath();

    const waterMat = new THREE.MeshStandardMaterial({
      map: waterTex,
      color: '#38bdf8',
      roughness: 0.14,
      metalness: 0.12,
      transparent: true,
      opacity: 0.92,
    });

    const streamGeo = new THREE.ShapeGeometry(streamShape);
    streamGeo.rotateX(-Math.PI / 2);
    const streamMesh = new THREE.Mesh(streamGeo, waterMat);
    streamMesh.position.y = 0.025;
    streamMesh.receiveShadow = true;
    scene.add(streamMesh);

    // Fish Pond Oval
    const pondGeo = new THREE.CircleGeometry(3.9, 32);
    pondGeo.rotateX(-Math.PI / 2);
    const pondMesh = new THREE.Mesh(pondGeo, waterMat);
    pondMesh.scale.set(1.08, 1, 0.92);
    pondMesh.position.set(6.2, 0.028, 4.5);
    pondMesh.receiveShadow = true;
    scene.add(pondMesh);

    // Riverbank stones (InstancedMesh > 20 items)
    const rockGeo = new THREE.DodecahedronGeometry(0.32, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.85, metalness: 0.05 });
    const rockPositions: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const z = -14 + (i / 39) * 28;
      const cx = streamCenterXAtZ(z);
      const side = i % 2 === 0 ? -1.72 : 1.72;
      const rx = cx + side + (Math.sin(i * 4.3) * 0.18);
      if (!isPondPoint(rx, z)) {
        rockPositions.push({ x: rx, z, s: 0.75 + (i % 5) * 0.15 });
      }
    }
    // Pond border stones
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rx = 6.2 + Math.cos(a) * 4.25;
      const rz = 4.5 + Math.sin(a) * 3.65;
      if (Math.abs(rx - streamCenterXAtZ(rz)) > 1.55) {
        rockPositions.push({ x: rx, z: rz, s: 0.85 + (i % 3) * 0.2 });
      }
    }
    const rocksInstanced = new THREE.InstancedMesh(rockGeo, rockMat, rockPositions.length);
    const dummy = new THREE.Object3D();
    const tintColor = new THREE.Color();
    rockPositions.forEach((rp, idx) => {
      dummy.position.set(rp.x, 0.06, rp.z);
      dummy.rotation.set(idx * 0.5, idx * 1.1, 0);
      dummy.scale.set(rp.s, rp.s * 0.65, rp.s);
      dummy.updateMatrix();
      rocksInstanced.setMatrixAt(idx, dummy.matrix);
      tintColor.setHex(idx % 3 === 0 ? 0x94a3b8 : idx % 3 === 1 ? 0xcbd5e1 : 0xa8a29e);
      rocksInstanced.setColorAt(idx, tintColor);
    });
    rocksInstanced.instanceMatrix.needsUpdate = true;
    if (rocksInstanced.instanceColor) rocksInstanced.instanceColor.needsUpdate = true;
    rocksInstanced.computeBoundingSphere();
    scene.add(rocksInstanced);

    // Outer perimeter tree grove (InstancedMesh trunks + canopies for lush natural horizon)
    const treeRingCount = 44;
    const trunkInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.22, 0.34, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.88 }),
      treeRingCount
    );
    const crownInst = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1.15, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.72 }),
      treeRingCount
    );
    for (let i = 0; i < treeRingCount; i++) {
      const a = (i / treeRingCount) * Math.PI * 2;
      const radius = 17.5 + (i % 4) * 2.4;
      const tx = Math.cos(a) * radius;
      const tz = Math.sin(a) * radius;
      const scale = 0.85 + (i % 5) * 0.14;

      dummy.position.set(tx, 0.75 * scale, tz);
      dummy.rotation.set(0, a, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 2.05 * scale, tz);
      dummy.scale.set(scale, scale * 1.1, scale);
      dummy.updateMatrix();
      crownInst.setMatrixAt(i, dummy.matrix);

      tintColor.setHSL(0.28 + (i % 4) * 0.02, 0.62, 0.42 + (i % 3) * 0.05);
      crownInst.setColorAt(i, tintColor);
    }
    trunkInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    crownInst.computeBoundingSphere();
    scene.add(trunkInst, crownInst);

    // Wild Meadow Koi Fish (2 ambient koi swimming in the pond)
    const wildKoiA = createPetModel('koi_fish', 2, shadowTex);
    const wildKoiB = createPetModel('koi_fish', 1, shadowTex);
    scene.add(wildKoiA, wildKoiB);

    // 5. Grid Overlay + Drag-Drop Preview Ghost (for Decorate Mode)
    const gridHelper = new THREE.GridHelper(26, 26, '#ffffff', '#e2e8f0');
    gridHelper.position.y = 0.04;
    gridHelper.visible = false;
    const gridMat = gridHelper.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.42;
    scene.add(gridHelper);

    const previewRing = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 24),
      new THREE.MeshBasicMaterial({ color: '#10b981', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    previewRing.rotation.x = -Math.PI / 2;
    previewRing.position.y = 0.06;
    previewRing.visible = false;
    scene.add(previewRing);

    const selectedRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 28),
      new THREE.MeshBasicMaterial({ color: '#f59e0b', side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    selectedRing.rotation.x = -Math.PI / 2;
    selectedRing.position.y = 0.065;
    selectedRing.visible = false;
    scene.add(selectedRing);

    // 6. Hero & Active Pet
    let currentHeroSig = JSON.stringify({
      c: propsRef.current.avatarColor,
      custom: propsRef.current.avatarCustom || null,
    });
    let heroGroup = createHeroModel(propsRef.current.avatarColor, shadowTex, propsRef.current.avatarCustom);
    heroGroup.position.set(-4, 0, 0);
    scene.add(heroGroup);

    // Magnet aura ring around hero (visible when item_magnet skill unlocked)
    const magnetAura = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.32, 32),
      new THREE.MeshBasicMaterial({
        color: '#ec4899',
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    magnetAura.rotation.x = -Math.PI / 2;
    magnetAura.position.y = 0.05;
    magnetAura.visible = false;
    heroGroup.add(magnetAura);

    let activePetKey = `${propsRef.current.activePetId}_${propsRef.current.activePetState?.level ?? 1}`;
    let activePetGroup = createPetModel(
      propsRef.current.activePetId,
      propsRef.current.activePetState?.level ?? 1,
      shadowTex
    );
    activePetGroup.position.set(-5.2, 0, 0.8);
    scene.add(activePetGroup);

    // Sanctuary roaming pets (other unlocked pets enjoying the farm & pond)
    const sanctuaryPetsGroup = new THREE.Group();
    scene.add(sanctuaryPetsGroup);
    let lastUnlockedSignature = '';

    // Placed farm decorations group
    const decosGroup = new THREE.Group();
    scene.add(decosGroup);
    const placedDecoMeshes = new Map<string, { group: THREE.Group; data: PlacedDecoration }>();
    let lastDecoSignature = '';

    // Math Orbs group (Harvest or Battle)
    const orbsGroup = new THREE.Group();
    scene.add(orbsGroup);
    const orbMeshes = new Map<string, { group: THREE.Group; orb: WorldOrb }>();
    let lastOrbsSignature = '';

    // Remote Battle Players group
    const remotePlayersGroup = new THREE.Group();
    scene.add(remotePlayersGroup);
    const remoteAvatarMap = new Map<
      string,
      { group: THREE.Group; targetX: number; targetZ: number; targetRotY: number; color: string }
    >();

    // Pooled Celebration Particles
    const particles: ParticleItem[] = [];
    const partGeo = new THREE.OctahedronGeometry(0.11, 0);
    const partColors = ['#fbbf24', '#38bdf8', '#f472b6', '#34d399'];
    const partMats = partColors.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, roughness: 0.3 })
    );
    for (let i = 0; i < 36; i++) {
      const m = new THREE.Mesh(partGeo, partMats[i % partMats.length]);
      m.visible = false;
      scene.add(m);
      particles.push({ mesh: m, vel: new THREE.Vector3(), life: 0, maxLife: 0.7 });
    }

    function burstParticles(x: number, y: number, z: number, count = 14): void {
      let spawned = 0;
      for (const p of particles) {
        if (p.life <= 0) {
          p.life = 0.65 + Math.random() * 0.25;
          p.maxLife = p.life;
          p.mesh.position.set(x, y, z);
          p.mesh.scale.setScalar(1);
          p.mesh.visible = true;
          const angle = Math.random() * Math.PI * 2;
          const spd = 2.2 + Math.random() * 3.0;
          p.vel.set(Math.cos(angle) * spd, 3.2 + Math.random() * 2.5, Math.sin(angle) * spd);
          spawned++;
          if (spawned >= count) break;
        }
      }
    }

    // 7. Input State (Keyboard + Pointer Drag-Drop)
    const heldKeys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      heldKeys[e.code] = true;
      soundEngine.unlock();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys[e.code] = false;
    };
    const onBlur = () => {
      for (const k of Object.keys(heldKeys)) heldKeys[k] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Raycasting helpers for Decorate Mode
    const raycaster = new THREE.Raycaster();
    let draggingPlacedId: string | null = null;
    let dragHoverGrid: { gx: number; gz: number } | null = null;

    const clientToGrid = (clientX: number, clientY: number): { gx: number; gz: number } | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      _rayMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, camera);
      if (raycaster.ray.intersectPlane(_groundPlane, _planeHit)) {
        const gx = Math.max(-12, Math.min(12, Math.round(_planeHit.x)));
        const gz = Math.max(-12, Math.min(12, Math.round(_planeHit.z)));
        return { gx, gz };
      }
      return null;
    };
    pointerToGridRef.current = clientToGrid;

    const isPlacementValid = (decoId: string, gx: number, gz: number, ignoreInstanceId?: string): boolean => {
      const def = DECO_CATALOG.find((d) => d.id === decoId);
      if (!def) return false;
      const water = isWaterPoint(gx, gz);
      if (def.terrain === 'water' && !water) return false;
      if (def.terrain === 'land' && water) return false;
      return !propsRef.current.placedDecorations.some(
        (d) => d.instanceId !== ignoreInstanceId && d.gridX === gx && d.gridZ === gz
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      soundEngine.unlock();
      if (propsRef.current.mode !== 'decorate') return;
      const grid = clientToGrid(e.clientX, e.clientY);
      if (!grid) return;

      // If user clicked a pending shop/inventory item to tap-place
      if (propsRef.current.pendingPlaceDecoId) {
        if (isPlacementValid(propsRef.current.pendingPlaceDecoId, grid.gx, grid.gz)) {
          propsRef.current.onPlaceDecoAt(propsRef.current.pendingPlaceDecoId, grid.gx, grid.gz);
          burstParticles(grid.gx, 0.6, grid.gz, 10);
        }
        return;
      }

      // Check if clicking an existing decoration
      const hit = propsRef.current.placedDecorations.find((d) => d.gridX === grid.gx && d.gridZ === grid.gz);
      if (hit) {
        propsRef.current.onSelectPlacedDeco(hit.instanceId);
        draggingPlacedId = hit.instanceId;
        dragHoverGrid = grid;
        orbitControls.enabled = false;
        renderer.domElement.setPointerCapture(e.pointerId);
      } else {
        propsRef.current.onSelectPlacedDeco(null);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (propsRef.current.mode !== 'decorate') return;
      const grid = clientToGrid(e.clientX, e.clientY);
      dragHoverGrid = grid;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (draggingPlacedId && dragHoverGrid) {
        const current = propsRef.current.placedDecorations.find((d) => d.instanceId === draggingPlacedId);
        if (
          current &&
          (current.gridX !== dragHoverGrid.gx || current.gridZ !== dragHoverGrid.gz) &&
          isPlacementValid(current.decoId, dragHoverGrid.gx, dragHoverGrid.gz, current.instanceId)
        ) {
          propsRef.current.onMoveDecoAt(current.instanceId, dragHoverGrid.gx, dragHoverGrid.gz);
          burstParticles(dragHoverGrid.gx, 0.5, dragHoverGrid.gz, 8);
        }
      }
      if (draggingPlacedId) {
        try {
          renderer.domElement.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
      orbitControls.enabled = true;
      draggingPlacedId = null;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Resize listener
    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 8. Sync helpers inside render loop
    let lastCelebrate = propsRef.current.celebrateCounter;
    let lastResetCam = propsRef.current.resetCameraCounter;
    let lastMode: GameMode | null = null;
    let heroCelebrateTimer = 0;
    let lastBattleSyncAt = 0;
    let stepDistAccum = 0;
    let stepAlt = false;
    const collectedCooldown = new Map<string, number>();

    const syncDecorations = () => {
      const list = propsRef.current.placedDecorations;
      const sig = list.map((d) => `${d.instanceId}:${d.decoId}:${d.gridX}:${d.gridZ}:${d.rotation}`).join('|');
      if (sig === lastDecoSignature) return;
      lastDecoSignature = sig;

      const activeIds = new Set(list.map((d) => d.instanceId));
      for (const [id, entry] of placedDecoMeshes.entries()) {
        if (!activeIds.has(id)) {
          decosGroup.remove(entry.group);
          placedDecoMeshes.delete(id);
        }
      }

      for (const d of list) {
        let entry = placedDecoMeshes.get(d.instanceId);
        if (!entry) {
          const model = createDecorationModel(d.decoId, woodTex, shadowTex);
          decosGroup.add(model);
          entry = { group: model, data: d };
          placedDecoMeshes.set(d.instanceId, entry);
        }
        entry.data = d;
        entry.group.position.set(d.gridX, 0, d.gridZ);
        entry.group.rotation.y = (d.rotation * Math.PI) / 2;
      }
    };

    const syncSanctuaryPets = () => {
      const activeId = propsRef.current.activePetId;
      const unlocked = propsRef.current.unlockedPets.filter((p) => p.unlocked && p.petId !== activeId);
      const sig = unlocked.map((p) => `${p.petId}:${p.level}`).join('|') + `_${activeId}`;
      if (sig === lastUnlockedSignature) return;
      lastUnlockedSignature = sig;

      while (sanctuaryPetsGroup.children.length > 0) {
        sanctuaryPetsGroup.remove(sanctuaryPetsGroup.children[0]);
      }

      unlocked.forEach((p, idx) => {
        const model = createPetModel(p.petId, p.level, shadowTex);
        const isWater = p.petId === 'koi_fish' || p.petId === 'jade_frog';
        const angle = idx * 1.9;
        const bx = isWater ? 6.2 + Math.cos(angle) * 2.1 : -6.5 + Math.cos(angle) * 3.8;
        const bz = isWater ? 4.5 + Math.sin(angle) * 1.8 : -4.0 + Math.sin(angle) * 4.2;
        model.position.set(bx, 0, bz);
        model.userData.homeX = bx;
        model.userData.homeZ = bz;
        model.userData.phase = idx * 1.4;
        model.userData.isWater = isWater;
        sanctuaryPetsGroup.add(model);
      });
    };

    const syncOrbs = () => {
      const currentMode = propsRef.current.mode;
      const orbs = currentMode === 'battle' ? propsRef.current.battleOrbs : currentMode === 'harvest' ? propsRef.current.harvestOrbs : [];
      const sig = `${currentMode}_` + orbs.map((o) => `${o.id}:${o.x}:${o.z}`).join('|');
      if (sig === lastOrbsSignature) return;
      lastOrbsSignature = sig;

      const validIds = new Set(orbs.map((o) => o.id));
      for (const [id, entry] of orbMeshes.entries()) {
        if (!validIds.has(id)) {
          orbsGroup.remove(entry.group);
          orbMeshes.delete(id);
        }
      }
      for (const orb of orbs) {
        if (!orbMeshes.has(orb.id)) {
          const mesh = createMathOrbModel(orb.isBonus);
          mesh.position.set(orb.x, 0, orb.z);
          orbsGroup.add(mesh);
          orbMeshes.set(orb.id, { group: mesh, orb });
        }
      }
    };

    const syncRemoteBattlePlayers = () => {
      const currentMode = propsRef.current.mode;
      const remotes =
        currentMode === 'battle'
          ? propsRef.current.battlePlayers.filter((p) => p.id !== propsRef.current.playerId)
          : [];
      const activeIds = new Set(remotes.map((r) => r.id));

      for (const [id, entry] of remoteAvatarMap.entries()) {
        if (!activeIds.has(id)) {
          remotePlayersGroup.remove(entry.group);
          remoteAvatarMap.delete(id);
        }
      }

      for (const rp of remotes) {
        let entry = remoteAvatarMap.get(rp.id);
        if (!entry) {
          const av = createHeroModel(rp.avatarColor, shadowTex, rp.avatarCustom);
          av.position.set(rp.x, 0, rp.z);
          remotePlayersGroup.add(av);
          entry = { group: av, targetX: rp.x, targetZ: rp.z, targetRotY: rp.rotY, color: rp.avatarColor };
          remoteAvatarMap.set(rp.id, entry);
        }
        entry.targetX = rp.x;
        entry.targetZ = rp.z;
        entry.targetRotY = rp.rotY;
      }
    };

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 9. Main 60fps Animation Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.elapsedTime;
      const state = propsRef.current;

      // Water stream scrolling
      waterTex.offset.y = (elapsed * 0.22) % 1;

      // Sync dynamic entities
      syncDecorations();
      syncSanctuaryPets();
      syncOrbs();
      syncRemoteBattlePlayers();

      // Rebuild hero if avatarColor or avatarCustom changed
      const nextHeroSig = JSON.stringify({
        c: state.avatarColor,
        custom: state.avatarCustom || null,
      });
      if (nextHeroSig !== currentHeroSig) {
        currentHeroSig = nextHeroSig;
        const pos = heroGroup.position.clone();
        const rotY = heroGroup.rotation.y;
        scene.remove(heroGroup);
        heroGroup = createHeroModel(state.avatarColor, shadowTex, state.avatarCustom);
        heroGroup.position.copy(pos);
        heroGroup.rotation.y = rotY;
        heroGroup.add(magnetAura);
        scene.add(heroGroup);
      }

      // Rebuild active pet if switched or leveled up
      const petKey = `${state.activePetId}_${state.activePetState?.level ?? 1}`;
      if (petKey !== activePetKey) {
        activePetKey = petKey;
        const pPos = activePetGroup.position.clone();
        scene.remove(activePetGroup);
        activePetGroup = createPetModel(state.activePetId, state.activePetState?.level ?? 1, shadowTex);
        activePetGroup.position.copy(pPos);
        scene.add(activePetGroup);
        burstParticles(pPos.x, 0.8, pPos.z, 18);
      }

      // Celebration trigger
      if (state.celebrateCounter !== lastCelebrate) {
        lastCelebrate = state.celebrateCounter;
        heroCelebrateTimer = 0.55;
        burstParticles(heroGroup.position.x, 1.1, heroGroup.position.z, 18);
        burstParticles(activePetGroup.position.x, 0.8, activePetGroup.position.z, 12);
      }

      // Hero movement (camera-relative in harvest & battle when not paused)
      const prevHeroX = heroGroup.position.x;
      const prevHeroZ = heroGroup.position.z;

      let inputX = 0;
      let inputY = 0;
      if ((state.mode === 'harvest' || state.mode === 'battle') && !state.paused) {
        if (heldKeys['KeyW'] || heldKeys['ArrowUp']) inputY -= 1;
        if (heldKeys['KeyS'] || heldKeys['ArrowDown']) inputY += 1;
        if (heldKeys['KeyA'] || heldKeys['ArrowLeft']) inputX -= 1;
        if (heldKeys['KeyD'] || heldKeys['ArrowRight']) inputX += 1;
        inputX += joystickVecRef.current.x;
        inputY += joystickVecRef.current.y;
      }

      const len = Math.hypot(inputX, inputY);
      const hasSpeedSkill = hasPetSkill(state.activePetState, 'speed_boost');
      const speed = hasSpeedSkill ? 8.1 : 6.4;

      if (len > 0.05) {
        camera.getWorldDirection(_vec3A);
        let fwdX = _vec3A.x;
        let fwdZ = _vec3A.z;
        const fwdLen = Math.hypot(fwdX, fwdZ);
        if (fwdLen > 0.01) {
          fwdX /= fwdLen;
          fwdZ /= fwdLen;
        } else {
          fwdX = 0;
          fwdZ = -1;
        }
        const rightX = -fwdZ;
        const rightZ = fwdX;

        const normX = inputX / Math.max(1, len);
        const normForward = -inputY / Math.max(1, len);
        const worldDirX = rightX * normX + fwdX * normForward;
        const worldDirZ = rightZ * normX + fwdZ * normForward;

        const nextX = heroGroup.position.x + worldDirX * speed * dt;
        const nextZ = heroGroup.position.z + worldDirZ * speed * dt;
        if (isWalkableLandPoint(nextX, nextZ)) {
          heroGroup.position.x = nextX;
          heroGroup.position.z = nextZ;
        }
        const targetRot = Math.atan2(worldDirX, worldDirZ);
        let diff = targetRot - heroGroup.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        heroGroup.rotation.y += diff * (1 - Math.exp(-14 * dt));

        // Walk cycle animation + rhythmic footsteps SFX
        const swing = Math.sin(elapsed * 14) * 0.6;
        if (heroGroup.userData.leftLeg) heroGroup.userData.leftLeg.rotation.x = swing;
        if (heroGroup.userData.rightLeg) heroGroup.userData.rightLeg.rotation.x = -swing;
        if (heroGroup.userData.leftArm) heroGroup.userData.leftArm.rotation.x = -swing * 0.7;
        if (heroGroup.userData.rightArm) heroGroup.userData.rightArm.rotation.x = swing * 0.7;
        if (heroGroup.userData.bodyGroup) {
          heroGroup.userData.bodyGroup.position.y = Math.abs(Math.sin(elapsed * 14)) * 0.08;
        }

        const movedDist = Math.hypot(heroGroup.position.x - prevHeroX, heroGroup.position.z - prevHeroZ);
        stepDistAccum += movedDist;
        if (stepDistAccum >= 1.05) {
          stepDistAccum = 0;
          stepAlt = !stepAlt;
          soundEngine.playFootstep(isWaterPoint(heroGroup.position.x, heroGroup.position.z), stepAlt);
        }
      } else {
        if (heroGroup.userData.leftLeg) heroGroup.userData.leftLeg.rotation.x *= 0.85;
        if (heroGroup.userData.rightLeg) heroGroup.userData.rightLeg.rotation.x *= 0.85;
        if (heroGroup.userData.leftArm) heroGroup.userData.leftArm.rotation.x *= 0.85;
        if (heroGroup.userData.rightArm) heroGroup.userData.rightArm.rotation.x *= 0.85;
        if (heroGroup.userData.bodyGroup) {
          heroGroup.userData.bodyGroup.position.y = Math.sin(elapsed * 3) * 0.025;
        }
      }

      if (heroCelebrateTimer > 0) {
        heroCelebrateTimer = Math.max(0, heroCelebrateTimer - dt);
        const hop = Math.sin((heroCelebrateTimer / 0.55) * Math.PI) * 0.75;
        if (heroGroup.userData.bodyGroup) heroGroup.userData.bodyGroup.position.y += hop;
      }

      // Send battle position updates (~18Hz)
      if (state.mode === 'battle' && elapsed - lastBattleSyncAt > 0.055) {
        lastBattleSyncAt = elapsed;
        state.onBattleMove(heroGroup.position.x, heroGroup.position.z, heroGroup.rotation.y);
      }

      // Magnet skill aura
      const hasMagnet = hasPetSkill(state.activePetState, 'item_magnet');
      magnetAura.visible = hasMagnet && (state.mode === 'harvest' || state.mode === 'battle');
      if (magnetAura.visible) {
        const s = 1 + Math.sin(elapsed * 4.5) * 0.12;
        magnetAura.scale.set(s, s, 1);
      }

      // Active pet smoothly follows behind hero
      _vec3A.set(
        heroGroup.position.x - Math.sin(heroGroup.rotation.y) * 1.45,
        0,
        heroGroup.position.z - Math.cos(heroGroup.rotation.y) * 1.45
      );
      activePetGroup.position.x = THREE.MathUtils.damp(activePetGroup.position.x, _vec3A.x, 6.5, dt);
      activePetGroup.position.z = THREE.MathUtils.damp(activePetGroup.position.z, _vec3A.z, 6.5, dt);
      const petDx = heroGroup.position.x - activePetGroup.position.x;
      const petDz = heroGroup.position.z - activePetGroup.position.z;
      if (petDx * petDx + petDz * petDz > 0.05) {
        activePetGroup.rotation.y = Math.atan2(petDx, petDz);
      }

      // Animate active pet actor (hover, wing flap, hop)
      const activeActor = activePetGroup.userData.actor as THREE.Group | undefined;
      if (activeActor) {
        const baseHover = Number(activeActor.userData.hoverBaseY || 0);
        activeActor.position.y = baseHover + Math.abs(Math.sin(elapsed * 5.2)) * 0.14;
        if (activeActor.userData.leftWingPivot && activeActor.userData.rightWingPivot) {
          const flap = Math.sin(elapsed * 18) * 0.52;
          activeActor.userData.leftWingPivot.rotation.z = flap;
          activeActor.userData.rightWingPivot.rotation.z = -flap;
        }
        if (activeActor.userData.tailGroup) {
          activeActor.userData.tailGroup.rotation.y = Math.sin(elapsed * 10) * 0.38;
        }
      }

      // Animate wild pond Koi & sanctuary roaming pets
      const koiAngleA = elapsed * 0.65;
      wildKoiA.position.set(6.2 + Math.cos(koiAngleA) * 2.2, 0.02, 4.5 + Math.sin(koiAngleA) * 1.7);
      wildKoiA.rotation.y = -koiAngleA;
      if (wildKoiA.userData.actor?.userData?.tailGroup) {
        wildKoiA.userData.actor.userData.tailGroup.rotation.y = Math.sin(elapsed * 9) * 0.4;
      }
      const koiAngleB = -elapsed * 0.5 + 2.2;
      wildKoiB.position.set(6.2 + Math.cos(koiAngleB) * 1.5, 0.02, 4.5 + Math.sin(koiAngleB) * 1.1);
      wildKoiB.rotation.y = -koiAngleB + Math.PI;
      if (wildKoiB.userData.actor?.userData?.tailGroup) {
        wildKoiB.userData.actor.userData.tailGroup.rotation.y = Math.sin(elapsed * 8 + 1) * 0.4;
      }

      sanctuaryPetsGroup.children.forEach((child) => {
        const phase = Number(child.userData.phase || 0);
        const hx = Number(child.userData.homeX || 0);
        const hz = Number(child.userData.homeZ || 0);
        const t = elapsed * 0.55 + phase;
        const nx = hx + Math.cos(t) * 1.1;
        const nz = hz + Math.sin(t * 0.8) * 1.1;
        child.rotation.y = Math.atan2(nx - child.position.x, nz - child.position.z);
        child.position.set(nx, 0, nz);
        const actor = child.userData.actor as THREE.Group | undefined;
        if (actor) {
          const baseHover = Number(actor.userData.hoverBaseY || 0);
          actor.position.y = baseHover + Math.abs(Math.sin(elapsed * 4 + phase)) * 0.1;
          if (actor.userData.leftWingPivot && actor.userData.rightWingPivot) {
            const flap = Math.sin(elapsed * 16 + phase) * 0.5;
            actor.userData.leftWingPivot.rotation.z = flap;
            actor.userData.rightWingPivot.rotation.z = -flap;
          }
        }
      });

      // Animate decorations (e.g., spinning windmill blades)
      for (const entry of placedDecoMeshes.values()) {
        if (entry.group.userData.windmillBlades) {
          entry.group.userData.windmillBlades.rotation.z -= dt * 1.8;
        }
      }

      // Animate Math Orbs & handle pickup + Magnet pull
      for (const [id, entry] of orbMeshes.entries()) {
        const { group, orb } = entry;
        if (group.userData.core) {
          group.userData.core.rotation.y += dt * 2.2;
          group.userData.core.position.y = 0.72 + Math.sin(elapsed * 3.5 + orb.x) * 0.14;
        }
        if (group.userData.ring) {
          group.userData.ring.rotation.z += dt * 1.6;
        }

        if (!state.paused && (state.mode === 'harvest' || state.mode === 'battle')) {
          const dx = heroGroup.position.x - group.position.x;
          const dz = heroGroup.position.z - group.position.z;
          const dist = Math.hypot(dx, dz);

          if (hasMagnet && dist < 4.4 && dist > 0.2) {
            group.position.x += (dx / dist) * 5.2 * dt;
            group.position.z += (dz / dist) * 5.2 * dt;
          }

          const lastCd = collectedCooldown.get(id) || 0;
          if (dist < 1.15 && elapsed - lastCd > 1.2) {
            collectedCooldown.set(id, elapsed);
            burstParticles(group.position.x, 0.8, group.position.z, 12);
            if (state.mode === 'harvest') state.onCollectHarvestOrb(orb);
            else state.onCollectBattleOrb(orb);
          }
        }
      }

      // Smoothly interpolate remote battle avatars
      for (const entry of remoteAvatarMap.values()) {
        entry.group.position.x = THREE.MathUtils.damp(entry.group.position.x, entry.targetX, 12, dt);
        entry.group.position.z = THREE.MathUtils.damp(entry.group.position.z, entry.targetZ, 12, dt);
        entry.group.rotation.y = THREE.MathUtils.damp(entry.group.rotation.y, entry.targetRotY, 12, dt);
      }

      // Update pooled particles
      for (const p of particles) {
        if (p.life > 0) {
          p.life -= dt;
          p.vel.y -= 9.5 * dt;
          p.mesh.position.addScaledVector(p.vel, dt);
          p.mesh.rotation.x += dt * 6;
          p.mesh.rotation.y += dt * 6;
          const ratio = Math.max(0, p.life / p.maxLife);
          p.mesh.scale.setScalar(ratio);
          if (p.life <= 0) p.mesh.visible = false;
        }
      }

      // Decorate mode grid & preview indicators
      const isDecorate = state.mode === 'decorate';
      gridHelper.visible = isDecorate;
      if (isDecorate) {
        const previewDecoId =
          state.draggingShopDecoId ||
          state.pendingPlaceDecoId ||
          (draggingPlacedId
            ? state.placedDecorations.find((d) => d.instanceId === draggingPlacedId)?.decoId
            : undefined);

        if (previewDecoId && dragHoverGrid) {
          previewRing.visible = true;
          previewRing.position.set(dragHoverGrid.gx, 0.06, dragHoverGrid.gz);
          const valid = isPlacementValid(previewDecoId, dragHoverGrid.gx, dragHoverGrid.gz, draggingPlacedId ?? undefined);
          (previewRing.material as THREE.MeshBasicMaterial).color.set(valid ? '#10b981' : '#ef4444');
        } else {
          previewRing.visible = false;
        }

        const sel = state.selectedDecoInstanceId
          ? state.placedDecorations.find((d) => d.instanceId === state.selectedDecoInstanceId)
          : undefined;
        if (sel) {
          selectedRing.visible = true;
          selectedRing.position.set(sel.gridX, 0.065, sel.gridZ);
        } else {
          selectedRing.visible = false;
        }
      } else {
        previewRing.visible = false;
        selectedRing.visible = false;
      }

      // Interactive Mouse OrbitControls + Smooth Mode/Hero Tracking
      const modeChanged = state.mode !== lastMode;
      const resetRequested = state.resetCameraCounter !== lastResetCam;
      if (modeChanged || resetRequested) {
        lastMode = state.mode;
        lastResetCam = state.resetCameraCounter;
        if (state.mode === 'title') {
          orbitControls.target.set(0, 0.8, 0);
          camera.position.set(0, 12.5, 16);
        } else if (state.mode === 'decorate') {
          orbitControls.target.set(0, 0, 0);
          camera.position.set(0, 20.5, 11.5);
        } else {
          orbitControls.target.set(heroGroup.position.x, 0.6, heroGroup.position.z);
          camera.position.set(heroGroup.position.x, 14.5, heroGroup.position.z + 11.5);
        }
      }

      if (state.mode === 'title') {
        orbitControls.autoRotate = !isSoftwareGl;
        orbitControls.autoRotateSpeed = 0.75;
        orbitControls.enabled = true;
      } else if (state.mode === 'decorate') {
        orbitControls.autoRotate = false;
        if (!draggingPlacedId) orbitControls.enabled = !state.paused;
        _targetLook.set(0, 0, 0);
        orbitControls.target.lerp(_targetLook, 1 - Math.exp(-6 * dt));
      } else {
        orbitControls.autoRotate = false;
        orbitControls.enabled = !state.paused;
        // Shift camera & orbit target by hero movement delta so mouse orbit angle is preserved!
        const heroDeltaX = heroGroup.position.x - prevHeroX;
        const heroDeltaZ = heroGroup.position.z - prevHeroZ;
        camera.position.x += heroDeltaX;
        camera.position.z += heroDeltaZ;
        orbitControls.target.x += heroDeltaX;
        orbitControls.target.z += heroDeltaZ;

        _targetLook.set(heroGroup.position.x, 0.6, heroGroup.position.z);
        _vec3B.copy(_targetLook).sub(orbitControls.target);
        const catchup = 1 - Math.exp(-8 * dt);
        orbitControls.target.addScaledVector(_vec3B, catchup);
        camera.position.addScaledVector(_vec3B, catchup);
      }

      orbitControls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      orbitControls.dispose();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      envRT.dispose();
      grassTex.dispose();
      waterTex.dispose();
      woodTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [joystickVecRef]);

  // HTML5 Drag & Drop support from Shop/Inventory cards straight onto the 3D Canvas
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (mode !== 'decorate') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (mode !== 'decorate') return;
    e.preventDefault();
    const decoId = e.dataTransfer.getData('text/plain') || draggingShopDecoId;
    if (!decoId || !pointerToGridRef.current) return;
    const grid = pointerToGridRef.current(e.clientX, e.clientY);
    if (grid) {
      onPlaceDecoAt(decoId, grid.gx, grid.gz);
    }
    onClearDraggingShop();
  };

  return (
    <div
      ref={mountRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="fixed inset-0 w-screen h-screen overflow-hidden"
    />
  );
};
