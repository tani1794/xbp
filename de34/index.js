<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <!-- three.jsを読み込む -->
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.module.js"
      }
    }
  </script>
  <!-- index.jsを読み込む -->
  <script type="module" src="index.js"></script>
</head>
<body>
  <canvas id="myCanvas"></canvas>
</body>
</html>

import * as THREE from "three";

const width = 960;
const height = 540;

// レンダラーを作成
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#myCanvas')
});
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);

// シーンを作成
const scene = new THREE.Scene();

// カメラを作成
const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
// カメラの初期座標を設定（X座標:0, Y座標:0, Z座標:0）
camera.position.set(0, 0, 1000);

// 箱を作成
const geometry = new THREE.BoxGeometry(500, 500, 500);
const material = new THREE.MeshStandardMaterial({color: 0x0000FF});
const box = new THREE.Mesh(geometry, material);
scene.add(box);

// 平行光源
const light = new THREE.DirectionalLight(0xFFFFFF);
light.intensity = 2; // 光の強さを倍に
light.position.set(1, 1, 1); // ライトの方向
// シーンに追加
scene.add(light);

// レンダリング
renderer.render(scene, camera);








