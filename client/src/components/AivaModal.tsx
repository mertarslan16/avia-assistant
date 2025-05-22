// AivaModel.tsx - Basit versiyon (ağız hareketleri olmadan)
import { useRef, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

interface AivaModelProps {
  speaking?: boolean;
  onLoaded?: () => void;
}

export function AivaModel({ 
  onLoaded
}: AivaModelProps) {
  // GLTF modelini yükle
  const gltf = useLoader(GLTFLoader, '/models/facial_rig_test.glb');
  const modelRef = useRef<THREE.Group>(null);
  
  // Model yüklendikten sonra
  useEffect(() => {
    if (!gltf) return;
    
    console.log("3D Model başarıyla yüklendi");
    
    // Model yüklendi bilgisini gönder
    if (onLoaded) {
      onLoaded();
    }
  }, [gltf, onLoaded]);
  
  return (
    <primitive 
      object={gltf.scene} 
      ref={modelRef} 
      scale={[1.3, 1.3, 1.3]} 
      position={[0, -1.65, 0]} 
      rotation={[0, 0, 0]}
      castShadow
      receiveShadow
    />
  );
}