// Three.js r160 ＋ addons を1ファイルにバンドルし window へ提供（ESMブートストラップ）。
//   esbuild でバンドル → vendor/three-bundle.js（`npm run bundle` で再生成）。
//   ゲーム本体は通常スクリプトのまま window.THREE / window.THREE_ADDONS を使用。
//   jsdom は module を実行しないため smoke は不変（THREE未定義でロジック検証）。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

window.THREE = THREE;
window.THREE_ADDONS = { EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, GLTFLoader, cloneSkeleton };
