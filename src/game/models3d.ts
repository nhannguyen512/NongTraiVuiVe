import * as THREE from 'three';
import { DEFAULT_AVATAR_CUSTOMIZATION } from '../shared/gameTypes';
import type { AvatarCustomization } from '../shared/gameTypes';

function mat(
  color: THREE.ColorRepresentation,
  roughness = 0.55,
  metalness = 0.05,
  extra?: Partial<THREE.MeshStandardMaterialParameters>
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    ...extra,
  });
}

export function attachContactShadow(
  group: THREE.Group,
  shadowTex: THREE.Texture,
  radius = 0.85,
  opacity = 0.45
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity,
  });
  const shadow = new THREE.Mesh(geo, m);
  shadow.position.y = 0.02;
  group.add(shadow);
  return shadow;
}

export function createHeroModel(
  accentColor: string,
  shadowTex: THREE.Texture,
  custom?: AvatarCustomization
): THREE.Group {
  const cfg: AvatarCustomization = {
    ...DEFAULT_AVATAR_CUSTOMIZATION,
    ...custom,
    outfitColor: custom?.outfitColor || accentColor || DEFAULT_AVATAR_CUSTOMIZATION.outfitColor,
  };

  const root = new THREE.Group();
  attachContactShadow(root, shadowTex, 0.72, 0.45);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = mat(cfg.skinColor, 0.65, 0.02);
  const tunicMat = mat(cfg.outfitColor, 0.5, 0.05);
  const pantsMat = mat('#334155', 0.7, 0.05);
  const bootMat = mat('#78350f', 0.45, 0.12);
  const hairMat = mat(cfg.hairColor, 0.62, 0.04);
  const goldMat = mat('#fde047', 0.25, 0.7);
  const eyeMat = mat('#0f172a', 0.15, 0.1);
  const cheekMat = mat('#fb7185', 0.6, 0.0);

  // Legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.18, 0.38, 0);
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.2, 6, 10);
  const lLegMesh = new THREE.Mesh(legGeo, pantsMat);
  lLegMesh.position.y = -0.1;
  lLegMesh.castShadow = true;
  const bootGeo = new THREE.BoxGeometry(0.22, 0.16, 0.28);
  const lBoot = new THREE.Mesh(bootGeo, bootMat);
  lBoot.position.set(0, -0.26, 0.04);
  lBoot.castShadow = true;
  leftLeg.add(lLegMesh, lBoot);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.18;

  // Torso & Collar Accent
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.52, 16), tunicMat);
  torso.position.y = 0.64;
  torso.castShadow = true;

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 18), mat('#fffdf7', 0.65, 0.02));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.87;

  // Belt + gold buckle
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.09, 16), bootMat);
  belt.position.y = 0.5;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.08), goldMat);
  buckle.position.set(0, 0.5, 0.31);

  // Back Accessory (Adventure / Wings / Rocket / None)
  if (cfg.backpackStyle === 'adventure') {
    const bagMat = mat('#b45309', 0.6, 0.08);
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.22), bagMat);
    backpack.position.set(0, 0.66, -0.3);
    backpack.castShadow = true;
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.44, 12), mat('#38bdf8', 0.6, 0.05));
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.89, -0.3);
    bodyGroup.add(backpack, bedroll);
  } else if (cfg.backpackStyle === 'wings') {
    const wingMat = mat('#bae6fd', 0.22, 0.15, {
      emissive: new THREE.Color('#38bdf8'),
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.42, 0.45, 0.68, 0.18, 0.52, -0.18);
    wingShape.bezierCurveTo(0.36, -0.38, 0.12, -0.24, 0, -0.1);
    const wGeo = new THREE.ShapeGeometry(wingShape);

    const wingL = new THREE.Mesh(wGeo, wingMat);
    wingL.position.set(-0.08, 0.78, -0.28);
    wingL.rotation.y = 0.42;
    wingL.scale.x = -1;

    const wingR = new THREE.Mesh(wGeo, wingMat);
    wingR.position.set(0.08, 0.78, -0.28);
    wingR.rotation.y = -0.42;

    bodyGroup.add(wingL, wingR);
  } else if (cfg.backpackStyle === 'rocket') {
    const metal = mat('#e2e8f0', 0.3, 0.65);
    const redCone = mat('#ef4444', 0.35, 0.2);
    const flameMat = mat('#38bdf8', 0.2, 0, {
      emissive: new THREE.Color('#0ea5e9'),
      emissiveIntensity: 0.9,
    });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.1), metal);
    plate.position.set(0, 0.7, -0.26);
    for (const sx of [-0.12, 0.12]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.42, 12), metal);
      tank.position.set(sx, 0.68, -0.35);
      tank.castShadow = true;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 12), redCone);
      cap.position.set(sx, 0.96, -0.35);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 10), flameMat);
      flame.rotation.x = Math.PI;
      flame.position.set(sx, 0.4, -0.35);
      bodyGroup.add(tank, cap, flame);
    }
    bodyGroup.add(plate);
  }

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.36, 0.8, 0);
  const armMeshL = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 6, 10), tunicMat);
  armMeshL.position.y = -0.14;
  armMeshL.castShadow = true;
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), skinMat);
  handL.position.y = -0.29;
  leftArm.add(armMeshL, handL);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.36;

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 18), skinMat);
  head.position.y = 1.15;
  head.castShadow = true;

  // Eyes & cheeks
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), eyeMat);
  eyeL.position.set(-0.11, 1.17, 0.29);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.11;

  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), cheekMat);
  cheekL.scale.set(1.2, 0.7, 0.5);
  cheekL.position.set(-0.2, 1.09, 0.25);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.2;

  // Glasses
  if (cfg.glassesStyle === 'round') {
    const rimMat = mat('#1e293b', 0.25, 0.65);
    const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.016, 8, 18), rimMat);
    ringL.position.set(-0.11, 1.17, 0.325);
    const ringR = ringL.clone();
    ringR.position.x = 0.11;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.02), rimMat);
    bridge.position.set(0, 1.18, 0.33);
    bodyGroup.add(ringL, ringR, bridge);
  } else if (cfg.glassesStyle === 'star_shades') {
    const shadeMat = mat('#0f172a', 0.12, 0.4);
    const frameMat = mat('#fbbf24', 0.25, 0.75);
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.04), shadeMat);
    lensL.position.set(-0.11, 1.17, 0.325);
    const lensR = lensL.clone();
    lensR.position.x = 0.11;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.026, 0.045), frameMat);
    topBar.position.set(0, 1.22, 0.33);
    bodyGroup.add(lensL, lensR, topBar);
  }

  // Hair Base + Style
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hairCap.position.set(0, 1.17, -0.02);
  hairCap.rotation.x = -0.18;
  hairCap.castShadow = true;
  bodyGroup.add(hairCap);

  if (cfg.hairStyle === 'short') {
    const bang = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.12), hairMat);
    bang.position.set(0, 1.33, 0.23);
    bang.rotation.x = 0.25;
    bodyGroup.add(bang);
  } else if (cfg.hairStyle === 'spiky') {
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.24, 8), hairMat);
      spike.position.set(i * 0.1, 1.45 - Math.abs(i) * 0.03, 0.08 - Math.abs(i) * 0.05);
      spike.rotation.z = -i * 0.26;
      spike.rotation.x = 0.2;
      spike.castShadow = true;
      bodyGroup.add(spike);
    }
  } else if (cfg.hairStyle === 'pigtails') {
    const tieMat = mat('#fb7185', 0.4, 0.1);
    for (const sx of [-1, 1]) {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.022, 8, 14), tieMat);
      tie.position.set(sx * 0.34, 1.24, -0.05);
      tie.rotation.y = Math.PI / 2;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), hairMat);
      puff.position.set(sx * 0.43, 1.21, -0.08);
      puff.scale.set(0.95, 1.25, 0.95);
      puff.castShadow = true;
      bodyGroup.add(tie, puff);
    }
    const bangL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), hairMat);
    bangL.position.set(-0.11, 1.35, 0.24);
    const bangR = bangL.clone();
    bangR.position.x = 0.11;
    bodyGroup.add(bangL, bangR);
  } else if (cfg.hairStyle === 'bob') {
    const backHair = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.39, 0.32, 16, 1, false, Math.PI * 0.65, Math.PI * 1.7), hairMat);
    backHair.position.set(0, 1.12, -0.04);
    const fringe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 16, 1, false, -0.7, 1.4), hairMat);
    fringe.position.set(0, 1.33, 0.04);
    bodyGroup.add(backHair, fringe);
  }

  // Hat Styles
  if (cfg.hatStyle === 'explorer') {
    const hatMat = mat('#f59e0b', 0.48, 0.08);
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.49, 0.06, 20), hatMat);
    hatBrim.position.set(0, 1.4, 0.02);
    hatBrim.castShadow = true;
    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.24, 18), hatMat);
    hatCrown.position.set(0, 1.53, 0);
    hatCrown.castShadow = true;
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.32, 0.06, 18), mat('#ef4444', 0.5, 0.05));
    hatBand.position.set(0, 1.45, 0);
    const starBadge = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), goldMat);
    starBadge.position.set(0, 1.52, 0.28);
    bodyGroup.add(hatBrim, hatCrown, hatBand, starBadge);
  } else if (cfg.hatStyle === 'crown') {
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.18, 0.13, 16), goldMat);
    crownBase.position.set(0, 1.51, 0);
    crownBase.castShadow = true;
    bodyGroup.add(crownBase);
    const gemColors = ['#ef4444', '#38bdf8', '#10b981', '#ec4899'];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 6), goldMat);
      tip.position.set(Math.cos(a) * 0.16, 1.62, Math.sin(a) * 0.16);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), mat(gemColors[i], 0.15, 0.3));
      gem.position.set(Math.cos(a) * 0.2, 1.51, Math.sin(a) * 0.2);
      bodyGroup.add(tip, gem);
    }
  } else if (cfg.hatStyle === 'bunny_ears') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 18, Math.PI), mat('#fb7185', 0.5, 0.05));
    band.position.set(0, 1.24, 0.02);
    const earOuter = mat('#fffdf8', 0.7, 0.02);
    const earInner = mat('#fda4af', 0.65, 0.02);
    for (const sx of [-1, 1]) {
      const eOut = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.3, 6, 10), earOuter);
      eOut.position.set(sx * 0.14, 1.64, 0.02);
      eOut.rotation.z = -sx * 0.18;
      eOut.castShadow = true;
      const eIn = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.22, 4, 8), earInner);
      eIn.position.set(sx * 0.14, 1.63, 0.055);
      eIn.rotation.z = -sx * 0.18;
      bodyGroup.add(eOut, eIn);
    }
    bodyGroup.add(band);
  } else if (cfg.hatStyle === 'wizard') {
    const wizMat = mat('#6366f1', 0.45, 0.12);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.05, 20), wizMat);
    brim.position.set(0, 1.41, 0);
    brim.castShadow = true;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.56, 18), wizMat);
    cone.position.set(0, 1.7, -0.02);
    cone.rotation.x = -0.14;
    cone.castShadow = true;
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.06, 18), goldMat);
    ribbon.position.set(0, 1.46, 0);
    const starTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), goldMat);
    starTip.position.set(0, 1.98, -0.08);
    bodyGroup.add(brim, cone, ribbon, starTip);
  }

  bodyGroup.add(
    leftLeg,
    rightLeg,
    torso,
    collar,
    belt,
    buckle,
    leftArm,
    rightArm,
    head,
    eyeL,
    eyeR,
    cheekL,
    cheekR
  );

  root.userData.bodyGroup = bodyGroup;
  root.userData.leftLeg = leftLeg;
  root.userData.rightLeg = rightLeg;
  root.userData.leftArm = leftArm;
  root.userData.rightArm = rightArm;

  return root;
}

export function createPetModel(petId: string, level: number, shadowTex: THREE.Texture): THREE.Group {
  const root = new THREE.Group();
  attachContactShadow(root, shadowTex, 0.52, 0.38);

  const actor = new THREE.Group();
  root.add(actor);

  const eyeMat = mat('#0f172a', 0.15, 0.1);
  const goldMat = mat('#fbbf24', 0.25, 0.75);

  if (petId === 'rabbit') {
    const fur = mat('#fffdf8', 0.72, 0.02);
    const pink = mat('#fda4af', 0.65, 0.02);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 14), fur);
    body.scale.set(1, 0.95, 1.15);
    body.position.y = 0.28;
    body.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), fur);
    head.position.set(0, 0.54, 0.18);
    head.castShadow = true;

    const earGeo = new THREE.CapsuleGeometry(0.055, 0.26, 5, 8);
    const earL = new THREE.Mesh(earGeo, fur);
    earL.position.set(-0.09, 0.85, 0.14);
    earL.rotation.z = 0.16;
    const earR = earL.clone();
    earR.position.x = 0.09;
    earR.rotation.z = -0.16;

    const innerEarL = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.18, 4, 6), pink);
    innerEarL.position.set(-0.09, 0.84, 0.17);
    innerEarL.rotation.z = 0.16;
    const innerEarR = innerEarL.clone();
    innerEarR.position.x = 0.09;
    innerEarR.rotation.z = -0.16;

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), fur);
    tail.position.set(0, 0.25, -0.34);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), pink);
    nose.position.set(0, 0.53, 0.41);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), eyeMat);
    eyeL.position.set(-0.09, 0.58, 0.37);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.09;

    actor.add(body, head, earL, earR, innerEarL, innerEarR, tail, nose, eyeL, eyeR);
  } else if (petId === 'fox') {
    const orange = mat('#f97316', 0.62, 0.04);
    const cream = mat('#fef3c7', 0.72, 0.02);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.3, 8, 12), orange);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.28;
    body.castShadow = true;

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 12), cream);
    chest.position.set(0, 0.32, 0.2);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), orange);
    head.position.set(0, 0.52, 0.28);
    head.castShadow = true;

    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 10), cream);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.48, 0.48);

    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 8), orange);
    earL.position.set(-0.12, 0.72, 0.25);
    const earR = earL.clone();
    earR.position.x = 0.12;

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 10), orange);
    tail.rotation.x = -Math.PI / 2.6;
    tail.position.set(0, 0.34, -0.44);
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), cream);
    tailTip.position.set(0, 0.44, -0.58);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), eyeMat);
    eyeL.position.set(-0.09, 0.56, 0.45);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.09;

    actor.add(body, chest, head, snout, earL, earR, tail, tailTip, eyeL, eyeR);
  } else if (petId === 'turtle') {
    const green = mat('#10b981', 0.45, 0.08);
    const shellRim = mat('#f59e0b', 0.55, 0.12);
    const skin = mat('#84cc16', 0.65, 0.02);

    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), green);
    shell.position.y = 0.18;
    shell.castShadow = true;

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.055, 8, 18), shellRim);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.18;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), skin);
    head.position.set(0, 0.24, 0.39);
    head.castShadow = true;

    const legGeo = new THREE.SphereGeometry(0.085, 8, 8);
    const positions = [
      [-0.24, 0.1, 0.2],
      [0.24, 0.1, 0.2],
      [-0.24, 0.1, -0.2],
      [0.24, 0.1, -0.2],
    ];
    positions.forEach(([x, y, z]) => {
      const foot = new THREE.Mesh(legGeo, skin);
      foot.scale.set(1, 0.7, 1.3);
      foot.position.set(x, y, z);
      actor.add(foot);
    });

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeMat);
    eyeL.position.set(-0.07, 0.29, 0.51);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.07;

    actor.add(shell, rim, head, eyeL, eyeR);
  } else if (petId === 'rainbow_beetle') {
    const wingA = new THREE.MeshPhysicalMaterial({
      color: '#6366f1',
      roughness: 0.2,
      metalness: 0.55,
      iridescence: 0.9,
    });
    const wingB = mat('#ec4899', 0.22, 0.55);
    const darkBody = mat('#1e1b4b', 0.4, 0.3);

    const base = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), darkBody);
    base.scale.set(1, 0.68, 1.25);
    base.position.y = 0.22;
    base.castShadow = true;

    const elytraL = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12, 0, Math.PI, 0, Math.PI * 0.55), wingA);
    elytraL.rotation.z = 0.2;
    elytraL.position.set(-0.03, 0.24, -0.02);
    const elytraR = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12, 0, Math.PI, 0, Math.PI * 0.55), wingB);
    elytraR.rotation.z = -0.2;
    elytraR.position.set(0.03, 0.24, -0.02);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), darkBody);
    head.position.set(0, 0.22, 0.34);

    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 8), goldMat);
    horn.rotation.x = Math.PI / 3;
    horn.position.set(0, 0.32, 0.47);

    for (let i = -1; i <= 1; i++) {
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), goldMat);
      legL.rotation.z = Math.PI / 3;
      legL.position.set(-0.28, 0.11, i * 0.15);
      const legR = legL.clone();
      legR.rotation.z = -Math.PI / 3;
      legR.position.x = 0.28;
      actor.add(legL, legR);
    }

    actor.add(base, elytraL, elytraR, head, horn);
  } else if (petId === 'moon_moth') {
    const bodyMat = mat('#e0f2fe', 0.75, 0.05);
    const wingMat = mat('#38bdf8', 0.25, 0.1, {
      emissive: new THREE.Color('#0ea5e9'),
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 6, 10), bodyMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.52;
    torso.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), bodyMat);
    head.position.set(0, 0.56, 0.24);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.35, 0.32, 0.62, 0.12, 0.45, -0.18);
    wingShape.bezierCurveTo(0.32, -0.35, 0.1, -0.25, 0, -0.1);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.rotateX(-Math.PI / 2);

    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.08, 0.56, 0.05);
    const lWing = new THREE.Mesh(wingGeo, wingMat);
    lWing.scale.x = -1;
    leftWingPivot.add(lWing);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.08, 0.56, 0.05);
    const rWing = new THREE.Mesh(wingGeo, wingMat);
    rightWingPivot.add(rWing);

    actor.userData.leftWingPivot = leftWingPivot;
    actor.userData.rightWingPivot = rightWingPivot;
    actor.userData.hoverBaseY = 0.15;

    actor.add(torso, head, leftWingPivot, rightWingPivot);
  } else if (petId === 'crystal_dragonfly') {
    const crystal = mat('#14b8a6', 0.18, 0.45, {
      emissive: new THREE.Color('#2dd4bf'),
      emissiveIntensity: 0.3,
    });
    const wingMat = mat('#ccfbf1', 0.15, 0.1, {
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), crystal);
    head.position.set(0, 0.56, 0.26);

    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), crystal);
    thorax.position.set(0, 0.54, 0.04);

    // Segmented tail
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.05 - i * 0.008, 0.045 - i * 0.008, 0.14, 8), crystal);
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, 0.52, -0.14 - i * 0.14);
      actor.add(seg);
    }

    const wingGeo = new THREE.PlaneGeometry(0.48, 0.13);
    wingGeo.rotateX(-Math.PI / 2);

    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.08, 0.62, 0.06);
    const lw1 = new THREE.Mesh(wingGeo, wingMat);
    lw1.position.set(-0.24, 0, 0.06);
    const lw2 = new THREE.Mesh(wingGeo, wingMat);
    lw2.position.set(-0.22, 0, -0.09);
    leftWingPivot.add(lw1, lw2);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.08, 0.62, 0.06);
    const rw1 = new THREE.Mesh(wingGeo, wingMat);
    rw1.position.set(0.24, 0, 0.06);
    const rw2 = new THREE.Mesh(wingGeo, wingMat);
    rw2.position.set(0.22, 0, -0.09);
    rightWingPivot.add(rw1, rw2);

    actor.userData.leftWingPivot = leftWingPivot;
    actor.userData.rightWingPivot = rightWingPivot;
    actor.userData.hoverBaseY = 0.18;

    actor.add(head, thorax, leftWingPivot, rightWingPivot);
  } else if (petId === 'koi_fish') {
    const koiOrange = mat('#ef4444', 0.3, 0.08);
    const koiWhite = mat('#ffffff', 0.35, 0.05);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), koiWhite);
    body.scale.set(0.72, 0.85, 1.55);
    body.position.y = 0.28;
    body.castShadow = true;

    const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), koiOrange);
    spot1.position.set(0.02, 0.33, 0.12);
    const spot2 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), koiOrange);
    spot2.position.set(-0.04, 0.31, -0.15);

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.28, -0.35);
    const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 4), koiOrange);
    tailFin.rotation.x = -Math.PI / 2;
    tailFin.scale.set(0.35, 1, 1.2);
    tailFin.position.z = -0.12;
    tailGroup.add(tailFin);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat);
    eyeL.position.set(-0.12, 0.32, 0.26);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.12;

    actor.userData.tailGroup = tailGroup;
    actor.add(body, spot1, spot2, tailGroup, eyeL, eyeR);
  } else {
    // jade_frog
    const green = mat('#22c55e', 0.42, 0.05);
    const belly = mat('#fef08a', 0.65, 0.02);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), green);
    body.scale.set(1.15, 0.78, 1.05);
    body.position.y = 0.22;
    body.castShadow = true;

    const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), belly);
    bellyMesh.position.set(0, 0.16, 0.08);

    const eyeBumpL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), green);
    eyeBumpL.position.set(-0.14, 0.41, 0.16);
    const eyeBumpR = eyeBumpL.clone();
    eyeBumpR.position.x = 0.14;

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), goldMat);
    eyeL.position.set(-0.15, 0.43, 0.22);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.15;

    const legL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), green);
    legL.scale.set(0.8, 0.7, 1.3);
    legL.position.set(-0.24, 0.12, -0.12);
    const legR = legL.clone();
    legR.position.x = 0.24;

    actor.add(body, bellyMesh, eyeBumpL, eyeBumpR, eyeL, eyeR, legL, legR);
  }

  // Visual growth & level-up accessories
  const growthScale = 1 + Math.min(level - 1, 6) * 0.065;
  actor.scale.setScalar(growthScale);

  if (level >= 3) {
    const starCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.025, 8, 18),
      mat('#38bdf8', 0.2, 0.7, { emissive: new THREE.Color('#0284c7'), emissiveIntensity: 0.4 })
    );
    starCollar.rotation.x = Math.PI / 2;
    starCollar.position.set(0, 0.44, 0.15);
    actor.add(starCollar);
  }

  if (level >= 5) {
    const crown = new THREE.Group();
    crown.position.set(0, 0.78, 0.18);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.07, 12), goldMat);
    crown.add(band);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 6), goldMat);
      tip.position.set(Math.cos(a) * 0.08, 0.06, Math.sin(a) * 0.08);
      crown.add(tip);
    }
    actor.add(crown);
  }

  root.userData.actor = actor;
  return root;
}

export function createMathOrbModel(isBonus: boolean): THREE.Group {
  const group = new THREE.Group();
  const coreColor = isBonus ? '#b91c1c' : '#ef4444';
  const emissiveColor = isBonus ? '#f59e0b' : '#dc2626';

  const coreMat = new THREE.MeshPhysicalMaterial({
    color: coreColor,
    emissive: emissiveColor,
    emissiveIntensity: isBonus ? 0.85 : 0.72,
    roughness: 0.14,
    metalness: 0.2,
    clearcoat: 1.0,
  });

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(isBonus ? 0.52 : 0.46, 0), coreMat);
  core.position.y = 0.82;
  core.castShadow = true;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(isBonus ? 0.7 : 0.62, 0.065, 10, 26),
    mat(isBonus ? '#fde047' : '#fef08a', 0.2, 0.75, {
      emissive: new THREE.Color(isBonus ? '#f59e0b' : '#ef4444'),
      emissiveIntensity: 0.35,
    })
  );
  ring.position.y = 0.82;
  ring.rotation.x = Math.PI / 3;

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.34, 1.5, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: isBonus ? '#fbbf24' : '#f87171',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beacon.position.y = 0.78;

  const groundHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.74, 28),
    new THREE.MeshBasicMaterial({
      color: isBonus ? '#f59e0b' : '#dc2626',
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  groundHalo.rotation.x = -Math.PI / 2;
  groundHalo.position.y = 0.035;

  group.add(core, ring, beacon, groundHalo);
  group.userData.core = core;
  group.userData.ring = ring;
  return group;
}

export function createDecorationModel(
  decoId: string,
  woodTex: THREE.Texture,
  shadowTex: THREE.Texture
): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.72, metalness: 0.05 });

  if (decoId === 'wooden_fence' || decoId === 'flower_fence') {
    const postMat = decoId === 'flower_fence' ? mat('#f8fafc', 0.55, 0.05) : woodMat;
    const postGeo = new THREE.BoxGeometry(0.16, 0.75, 0.16);
    const p1 = new THREE.Mesh(postGeo, postMat);
    p1.position.set(-0.42, 0.375, 0);
    p1.castShadow = true;
    const p2 = new THREE.Mesh(postGeo, postMat);
    p2.position.set(0.42, 0.375, 0);
    p2.castShadow = true;

    const railGeo = new THREE.BoxGeometry(1.1, 0.11, 0.08);
    const r1 = new THREE.Mesh(railGeo, postMat);
    r1.position.set(0, 0.56, 0);
    r1.castShadow = true;
    const r2 = new THREE.Mesh(railGeo, postMat);
    r2.position.set(0, 0.28, 0);
    r2.castShadow = true;

    group.add(p1, p2, r1, r2);

    if (decoId === 'flower_fence') {
      const flowerColors = ['#f43f5e', '#facc15', '#ec4899'];
      for (let i = -1; i <= 1; i++) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), mat('#22c55e', 0.75, 0));
        bush.position.set(i * 0.28, 0.12, 0.12);
        const blossom = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          mat(flowerColors[i + 1], 0.5, 0)
        );
        blossom.position.set(i * 0.28, 0.24, 0.14);
        group.add(bush, blossom);
      }
    }
    return group;
  }

  if (decoId === 'apple_tree' || decoId === 'sakura_tree') {
    attachContactShadow(group, shadowTex, 1.05, 0.36);
    const isSakura = decoId === 'sakura_tree';
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 1.35, 10),
      mat(isSakura ? '#57534e' : '#78350f', 0.85, 0.02)
    );
    trunk.position.y = 0.675;
    trunk.castShadow = true;

    const leafMat = mat(isSakura ? '#f9a8d4' : '#22c55e', 0.7, 0.02);
    const leafMat2 = mat(isSakura ? '#fbcfe8' : '#16a34a', 0.72, 0.02);

    const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), leafMat);
    c1.position.set(0, 1.75, 0);
    c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), leafMat2);
    c2.position.set(0.42, 1.55, 0.22);
    c2.castShadow = true;
    const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 10), leafMat2);
    c3.position.set(-0.38, 1.62, -0.2);
    c3.castShadow = true;

    group.add(trunk, c1, c2, c3);

    if (!isSakura) {
      const appleMat = mat('#ef4444', 0.25, 0.1);
      const spots = [
        [0.45, 1.75, 0.55],
        [-0.45, 1.6, 0.42],
        [0.12, 2.15, 0.52],
        [-0.2, 1.45, -0.45],
      ];
      spots.forEach(([x, y, z]) => {
        const apple = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), appleMat);
        apple.position.set(x, y, z);
        group.add(apple);
      });
    }
    return group;
  }

  if (decoId === 'sunflower_patch') {
    const stemMat = mat('#16a34a', 0.7, 0);
    const centerMat = mat('#713f12', 0.85, 0);
    const petalMat = mat('#facc15', 0.55, 0.05);
    const offsets = [
      [-0.24, 0.65, -0.15],
      [0.22, 0.78, 0.12],
      [0.02, 0.58, 0.24],
    ];
    offsets.forEach(([x, h, z]) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, h, 8), stemMat);
      stem.position.set(x, h / 2, z);
      stem.castShadow = true;
      const head = new THREE.Group();
      head.position.set(x, h, z);
      head.rotation.x = -0.35;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 12), centerMat);
      disc.rotation.x = Math.PI / 2;
      const petals = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.065, 6, 12), petalMat);
      head.add(disc, petals);
      group.add(stem, head);
    });
    return group;
  }

  if (decoId === 'glow_mushroom') {
    const stemMat = mat('#fef3c7', 0.7, 0);
    const capMat = mat('#06b6d4', 0.3, 0.1, {
      emissive: new THREE.Color('#22d3ee'),
      emissiveIntensity: 0.55,
    });
    const specs = [
      { x: 0, z: 0, s: 1.0 },
      { x: -0.3, z: 0.18, s: 0.65 },
      { x: 0.28, z: -0.15, s: 0.72 },
    ];
    specs.forEach(({ x, z, s }) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.11 * s, 0.48 * s, 10), stemMat);
      stem.position.set(x, 0.24 * s, z);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), capMat);
      cap.position.set(x, 0.44 * s, z);
      cap.castShadow = true;
      group.add(stem, cap);
    });
    return group;
  }

  if (decoId === 'windmill_mini') {
    attachContactShadow(group, shadowTex, 0.9, 0.4);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.54, 0.55, 10), mat('#94a3b8', 0.85, 0.05));
    base.position.y = 0.275;
    base.castShadow = true;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.44, 1.1, 10), mat('#fff7ed', 0.65, 0.02));
    tower.position.y = 1.1;
    tower.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.52, 10), mat('#ea580c', 0.5, 0.08));
    roof.position.y = 1.9;
    roof.castShadow = true;

    const hub = new THREE.Group();
    hub.position.set(0, 1.45, 0.36);
    const hubCap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), woodMat);
    hub.add(hubCap);

    const sailMat = mat('#fef9c3', 0.6, 0.02);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      const spar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.04), woodMat);
      spar.position.y = 0.36;
      const sail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.54, 0.02), sailMat);
      sail.position.set(0.11, 0.42, 0);
      arm.add(spar, sail);
      hub.add(arm);
    }

    group.userData.windmillBlades = hub;
    group.add(base, tower, roof, hub);
    return group;
  }

  if (decoId === 'wooden_bridge') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 1.25), woodMat);
    deck.position.y = 0.28;
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    const postGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.85, 8);
    const posts = [
      [-1.15, -0.55],
      [1.15, -0.55],
      [-1.15, 0.55],
      [1.15, 0.55],
    ];
    posts.forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(px, 0.42, pz);
      post.castShadow = true;
      group.add(post);
    });

    const railGeo = new THREE.BoxGeometry(2.4, 0.08, 0.07);
    const r1 = new THREE.Mesh(railGeo, woodMat);
    r1.position.set(0, 0.75, -0.55);
    const r2 = new THREE.Mesh(railGeo, woodMat);
    r2.position.set(0, 0.75, 0.55);
    group.add(r1, r2);
    return group;
  }

  if (decoId === 'lotus_lantern') {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 16), mat('#16a34a', 0.6, 0.02));
    pad.position.y = 0.05;
    const petalMat = mat('#fb7185', 0.45, 0.05);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 6), petalMat);
      petal.position.set(Math.cos(angle) * 0.18, 0.17, Math.sin(angle) * 0.18);
      petal.rotation.z = -Math.cos(angle) * 0.55;
      petal.rotation.x = Math.sin(angle) * 0.55;
      group.add(petal);
    }
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      mat('#fef08a', 0.2, 0, { emissive: new THREE.Color('#f59e0b'), emissiveIntensity: 0.9 })
    );
    core.position.y = 0.22;
    group.add(pad, core);
    return group;
  }

  if (decoId === 'koi_fountain') {
    const stone = mat('#cbd5e1', 0.72, 0.08);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.75, 0.28, 18), stone);
    basin.position.y = 0.16;
    basin.castShadow = true;
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.06, 18), mat('#38bdf8', 0.1, 0.1));
    pool.position.y = 0.29;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.65, 12), stone);
    pillar.position.y = 0.55;
    const topSculpture = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 8, 16), mat('#f97316', 0.3, 0.35));
    topSculpture.position.y = 0.98;
    group.add(basin, pool, pillar, topSculpture);
    return group;
  }

  if (decoId === 'lily_dock') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), woodMat);
    deck.position.y = 0.18;
    deck.castShadow = true;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 14), mat('#22c55e', 0.6, 0));
    pad.position.set(0.45, 0.05, 0.35);
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), mat('#f472b6', 0.4, 0.05));
    bud.position.set(0.45, 0.14, 0.35);
    group.add(deck, pad, bud);
    return group;
  }

  if (decoId === 'golden_dragon_statue') {
    attachContactShadow(group, shadowTex, 0.85, 0.42);
    const gold = mat('#fbbf24', 0.22, 0.82);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.32, 12), mat('#475569', 0.7, 0.1));
    plinth.position.y = 0.16;
    const body = new THREE.Mesh(new THREE.TorusKnotGeometry(0.24, 0.075, 48, 8, 2, 3), gold);
    body.position.y = 0.74;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), gold);
    head.position.set(0, 1.08, 0.16);
    const pearl = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 10),
      mat('#38bdf8', 0.1, 0.2, { emissive: new THREE.Color('#0ea5e9'), emissiveIntensity: 0.8 })
    );
    pearl.position.set(0, 1.24, 0.26);
    group.add(plinth, body, head, pearl);
    return group;
  }

  // starlight_arch
  attachContactShadow(group, shadowTex, 1.05, 0.36);
  const archMat = mat('#a855f7', 0.35, 0.35);
  const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.45, 10), archMat);
  pillarL.position.set(-0.65, 0.725, 0);
  pillarL.castShadow = true;
  const pillarR = pillarL.clone();
  pillarR.position.x = 0.65;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.11, 10, 24, Math.PI), archMat);
  arch.position.y = 1.42;
  arch.castShadow = true;
  const topStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    mat('#fde047', 0.2, 0.75, { emissive: new THREE.Color('#f59e0b'), emissiveIntensity: 0.45 })
  );
  topStar.position.y = 2.18;
  group.add(pillarL, pillarR, arch, topStar);
  return group;
}
