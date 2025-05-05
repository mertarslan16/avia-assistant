import { useRef, useEffect } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

interface AivaModelProps {
  speaking?: boolean;
  mouthOpenness?: number;
  onLoaded?: () => void;
}

export function AivaModel({ 
  speaking = false, 
  mouthOpenness = 0,
  onLoaded
}: AivaModelProps) {
  const gltf = useLoader(GLTFLoader, '/models/face.glb');
  const modelRef = useRef<THREE.Group>(null);
  
  // Ağız hareketini kontrol edecek referanslar
  const mouthRef = useRef<THREE.Mesh | null>(null);
  const jawRef = useRef<THREE.Bone | null>(null);
  
  // Model yüklendikten sonra ağız ve çene elemanlarını bul
  useEffect(() => {
    if (gltf && gltf.scene) {
      console.log("Model yüklendi, elemanlar araştırılıyor");
      
      // Model içindeki mesh ve kemikleri tara
      gltf.scene.traverse((child) => {
        // Ağzı temsil eden mesh'i bul
        if (child instanceof THREE.Mesh && 
           (child.name.toLowerCase().includes('mouth') || 
            child.name.toLowerCase().includes('agiz'))) {
          mouthRef.current = child;
          console.log("Ağız mesh'i bulundu:", child.name);
        }
        
        // Çene kemiğini bul
        if (child instanceof THREE.Bone && 
           (child.name.toLowerCase().includes('jaw') || 
            child.name.toLowerCase().includes('cene'))) {
          jawRef.current = child;
          console.log("Çene kemiği bulundu:", child.name);
        }
        
        // Morph targets (blend shapes) kontrolü
        if (child instanceof THREE.Mesh && child.morphTargetInfluences && child.morphTargetDictionary) {
          console.log("Morph targets bulundu:", Object.keys(child.morphTargetDictionary));
        }
      });
      
      // Eğer doğrudan bulunamadıysa, fallback olarak ilk mesh'i kullan
      if (!mouthRef.current) {
        const firstMesh = gltf.scene.children.find(child => child instanceof THREE.Mesh);
        if (firstMesh && firstMesh instanceof THREE.Mesh) {
          mouthRef.current = firstMesh;
          console.log("Fallback: İlk mesh ağız olarak kullanılacak");
        }
      }
      
      // Yükleme tamamlandı bilgisini ilet
      if (onLoaded) {
        onLoaded();
      }
    }
  }, [gltf, onLoaded]);
  
  // Her frame'de ağız hareketlerini güncelle
  useFrame(() => {
    // Konuşma animasyonu
    if (speaking) {
      // Ağız açıklığını hesapla - daha doğal bir hareket için sinüs dalgası ekle
      const baseOpenness = mouthOpenness || 0;
      const sineWave = Math.sin(Date.now() * 0.01) * 0.2; // Hafif dalgalanma ekler
      const openValue = Math.max(0, baseOpenness + sineWave);
      
      // Morph targets kullanarak ağız hareketleri (varsa)
      if (mouthRef.current?.morphTargetInfluences && mouthRef.current?.morphTargetDictionary) {
        // Modelde morph targets varsa, ağız açma/kapama için kullan
        const mouthOpenIndex = mouthRef.current.morphTargetDictionary['mouthOpen'] || 
                              mouthRef.current.morphTargetDictionary['mouth_open'] || 
                              mouthRef.current.morphTargetDictionary['speak'];
                              
        if (mouthOpenIndex !== undefined) {
          mouthRef.current.morphTargetInfluences[mouthOpenIndex] = openValue;
        }
      } 
      // Çene kemiği kullanarak hareket (varsa)
      else if (jawRef.current) {
        // Çene kemiği rotasyonu
        jawRef.current.rotation.x = openValue * -0.2; // Çene açılması için negatif değer
      }
      // En basit yöntem: Mesh deformasyonu
      else if (mouthRef.current) {
        // Mesh manipülasyonu - modele göre ayarlanması gerekebilir
        mouthRef.current.scale.y = 1 + openValue * 0.5;
      }
    } else {
      // Konuşma yoksa ağzı normale döndür
      if (mouthRef.current?.morphTargetInfluences && mouthRef.current?.morphTargetDictionary) {
        const mouthOpenIndex = mouthRef.current.morphTargetDictionary['mouthOpen'] || 
                              mouthRef.current.morphTargetDictionary['mouth_open'] || 
                              mouthRef.current.morphTargetDictionary['speak'];
                              
        if (mouthOpenIndex !== undefined) {
          mouthRef.current.morphTargetInfluences[mouthOpenIndex] = 0;
        }
      } else if (jawRef.current) {
        jawRef.current.rotation.x = 0;
      } else if (mouthRef.current) {
        mouthRef.current.scale.y = 1;
      }
    }
    
    // Temel canlandırma - nefes alma hareketi
    if (modelRef.current) {
      // Yukarı-aşağı hafif hareket
      modelRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.02;
      
      // Konuşurken daha fazla hareket
      if (speaking) {
        // Doğal görünüm için hafif baş hareketleri
        modelRef.current.rotation.y = Math.sin(Date.now() * 0.002) * 0.05;
        modelRef.current.rotation.x = Math.sin(Date.now() * 0.003) * 0.02;
        modelRef.current.rotation.z = Math.sin(Date.now() * 0.002) * 0.01;
      } else {
        // Konuşma yokken daha hafif hareket
        modelRef.current.rotation.y = Math.sin(Date.now() * 0.0005) * 0.03;
        modelRef.current.rotation.x = Math.sin(Date.now() * 0.0007) * 0.01;
        modelRef.current.rotation.z = 0;
      }
    }
  });
  
  // Debug bilgisi
  useEffect(() => {
    console.log("AivaModel durumu:", { speaking, mouthOpenness });
  }, [speaking, mouthOpenness]);
  
  // Modeli yükleme esnasında farklı renk ve düşük saydamlık
  const materialProps = {
    roughness: 0.5,
    metalness: 0.2,
    // Konuşurken ışıma
    emissive: new THREE.Color(speaking ? 0x101020 : 0x000000),
    emissiveIntensity: speaking ? 0.2 : 0,
  };
  
  return (
    <primitive 
      object={gltf.scene} 
      ref={modelRef} 
      scale={0.001}
      position={[0, 0, 0]} 
      rotation={[0, 0, 0]} 
      material={materialProps}
      castShadow
      receiveShadow
    />
  );
}