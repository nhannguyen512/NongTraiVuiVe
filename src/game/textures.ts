import * as THREE from 'three';

export function createGrassTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#73c958';
  ctx.fillRect(0, 0, 512, 512);

  // Soft meadow patches
  const patchColors = ['#69bd4f', '#7fd463', '#85db69', '#5fb345'];
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = patchColors[i % patchColors.length];
    ctx.globalAlpha = 0.28;
    const x = (Math.sin(i * 12.9898) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 78.233) * 0.5 + 0.5) * 512;
    const r = 14 + (i % 24);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny grass blades & clover speckles
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 420; i++) {
    const x = ((i * 73) % 512);
    const y = ((i * 139) % 512);
    ctx.fillStyle = i % 5 === 0 ? '#fde047' : i % 3 === 0 ? '#bef264' : '#4d9a38';
    ctx.fillRect(x, y, 2, 5);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWaterTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#22b8cf');
  grad.addColorStop(0.5, '#38bdf8');
  grad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Cartoon water caustics / ripples
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 4;
  for (let y = 24; y < 512; y += 44) {
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const wy = y + Math.sin((x / 512) * Math.PI * 4 + y * 0.1) * 7;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 5);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWoodTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b4692e';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#8b4c1c';
  ctx.lineWidth = 3;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 224, 180, 0.16)';
  ctx.lineWidth = 2;
  for (let y = 10; y < 256; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(85, y + 4, 170, y - 4, 256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
  grad.addColorStop(0.65, 'rgba(15, 23, 42, 0.18)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
