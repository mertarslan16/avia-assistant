// AivaModel.tsx - Teşhis ve Debug Versiyonu
import { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useSpeechStore } from '@/utils/tts';
import * as THREE from 'three';

interface AivaModelProps {
  speaking?: boolean;
  onLoaded?: () => void;
}

export function AivaModel({ onLoaded }: AivaModelProps) {
  const gltf = useLoader(GLTFLoader, '/models/facial_rig_test.glb');
  const modelRef = useRef<THREE.Group>(null);
  
  // Tüm bulunan bone'ları saklamak için
  const allBones = useRef<{ [key: string]: THREE.Bone }>({});
  const originalRotations = useRef<{ [key: string]: THREE.Euler }>({});
  const originalPositions = useRef<{ [key: string]: THREE.Vector3 }>({});
  
  // Seçilen bone'lar
  const activeBones = useRef<{
    jaw?: THREE.Bone;
    upperLip?: THREE.Bone;
    lowerLip?: THREE.Bone;
    mouth?: THREE.Bone;
    face?: THREE.Bone;
  }>({});
  
  // Speech store'dan veri al
  const { isSpeaking, currentViseme, visemeIntensity } = useSpeechStore();
  
  // Animasyon değişkenleri
  const currentMouthOpenness = useRef(0);
  const targetMouthOpenness = useRef(0);
  const isInitialized = useRef(false);

  // Model yüklendiğinde TÜM bone'ları listele ve kaydet
  useEffect(() => {
    if (!gltf.scene || isInitialized.current) return;
    
    console.log("🔍 Model yüklendi, TÜM bone'lar taranıyor...");
    console.log("📦 GLTF Scene:", gltf.scene);
    
    const foundBones: string[] = [];
    const potentialJawBones: string[] = [];
    const potentialLipBones: string[] = [];
    const potentialMouthBones: string[] = [];
    
    gltf.scene.traverse((child) => {
      console.log(`🔎 Taranan obje: ${child.name} (tip: ${child.type})`);
      
      if (child.type === 'SkinnedMesh') {
        const skinnedMesh = child as THREE.SkinnedMesh;
        console.log("💀 SkinnedMesh bulundu:", child.name);
        
        if (skinnedMesh.skeleton) {
          console.log("🦴 Skeleton bone sayısı:", skinnedMesh.skeleton.bones.length);
          
          skinnedMesh.skeleton.bones.forEach((bone, index) => {
            foundBones.push(bone.name);
            allBones.current[bone.name] = bone;
            originalRotations.current[bone.name] = bone.rotation.clone();
            originalPositions.current[bone.name] = bone.position.clone();
            
            const boneName = bone.name.toLowerCase();
            
            // Çene bone'u aday listesi
            if (boneName.includes('jaw') || 
                boneName.includes('çene') || 
                boneName.includes('mandible') ||
                boneName.includes('lower') && boneName.includes('head')) {
              potentialJawBones.push(bone.name);
            }
            
            // Dudak bone'u aday listesi
            if (boneName.includes('lip') || 
                boneName.includes('dudak') || 
                boneName.includes('mouth')) {
              if (boneName.includes('upper') || boneName.includes('üst')) {
                potentialLipBones.push(`UPPER: ${bone.name}`);
              } else if (boneName.includes('lower') || boneName.includes('alt')) {
                potentialLipBones.push(`LOWER: ${bone.name}`);
              } else {
                potentialMouthBones.push(bone.name);
              }
            }
            
            console.log(`  [${index}] ${bone.name} - Pos: (${bone.position.x.toFixed(2)}, ${bone.position.y.toFixed(2)}, ${bone.position.z.toFixed(2)}) - Rot: (${bone.rotation.x.toFixed(2)}, ${bone.rotation.y.toFixed(2)}, ${bone.rotation.z.toFixed(2)})`);
          });
        }
      }
      
      // Eğer child'ın kendisi bir bone ise
      if (child.type === 'Bone') {
        const bone = child as THREE.Bone;
        foundBones.push(bone.name);
        allBones.current[bone.name] = bone;
        originalRotations.current[bone.name] = bone.rotation.clone();
        originalPositions.current[bone.name] = bone.position.clone();
        
        console.log(`🦴 Direkt Bone bulundu: ${bone.name}`);
      }
    });
    
    // Sonuçları raporla
    console.log("📊 TARAMA SONUÇLARI:");
    console.log("🔢 Toplam bulunan bone sayısı:", foundBones.length);
    console.log("📋 Tüm bone isimleri:", foundBones);
    console.log("🦷 Potansiyel çene bone'ları:", potentialJawBones);
    console.log("👄 Potansiyel dudak bone'ları:", potentialLipBones);
    console.log("🗣️ Potansiyel ağız bone'ları:", potentialMouthBones);
    
    // En iyi bone'ları seç
    selectBestBones(potentialJawBones, potentialLipBones, potentialMouthBones);
    
    isInitialized.current = true;
    if (onLoaded) onLoaded();
  }, [gltf.scene, onLoaded]);

  // En uygun bone'ları seç
  const selectBestBones = (jawCandidates: string[], lipCandidates: string[], mouthCandidates: string[]) => {
    console.log("🎯 En iyi bone'lar seçiliyor...");
    
    // Çene bone'u seç (öncelik sırası)
    const jawPriority = ['DEF-Jaw_Rig_Facial', 'Jaw_Rig_Facial', 'DEF-Jaw', 'Jaw', 'jaw', 'mandible'];
    for (const priority of jawPriority) {
      if (allBones.current[priority]) {
        activeBones.current.jaw = allBones.current[priority];
        console.log("✅ Çene bone'u seçildi:", priority);
        break;
      }
    }
    
    // Alternatif çene bone'u arama
    if (!activeBones.current.jaw) {
      for (const candidate of jawCandidates) {
        if (allBones.current[candidate]) {
          activeBones.current.jaw = allBones.current[candidate];
          console.log("✅ Alternatif çene bone'u seçildi:", candidate);
          break;
        }
      }
    }
    
    // Ağız/dudak bone'larını seç
    const mouthPriority = ['Lips_Rig_Facial', 'Mouth_Rig_Facial', 'DEF-Lips', 'mouth', 'lips'];
    for (const priority of mouthPriority) {
      if (allBones.current[priority]) {
        activeBones.current.mouth = allBones.current[priority];
        console.log("✅ Ağız bone'u seçildi:", priority);
        break;
      }
    }
    
    // Alternatif ağız bone'u arama
    if (!activeBones.current.mouth) {
      for (const candidate of mouthCandidates) {
        if (allBones.current[candidate]) {
          activeBones.current.mouth = allBones.current[candidate];
          console.log("✅ Alternatif ağız bone'u seçildi:", candidate);
          break;
        }
      }
    }
    
    // Dudak bone'larını seç (üst ve alt dudak)
    for (const lipCandidate of lipCandidates) {
      const cleanName = lipCandidate.replace('UPPER: ', '').replace('LOWER: ', '');
      
      if (lipCandidate.startsWith('UPPER:') && allBones.current[cleanName]) {
        activeBones.current.upperLip = allBones.current[cleanName];
        console.log("✅ Üst dudak bone'u seçildi:", cleanName);
      } else if (lipCandidate.startsWith('LOWER:') && allBones.current[cleanName]) {
        activeBones.current.lowerLip = allBones.current[cleanName];
        console.log("✅ Alt dudak bone'u seçildi:", cleanName);
      }
    }
    
    console.log("🎭 AKTIF BONE'LAR:");
    console.log("  Çene:", activeBones.current.jaw?.name || 'BULUNAMADI');
    console.log("  Ağız:", activeBones.current.mouth?.name || 'BULUNAMADI');
    console.log("  Üst Dudak:", activeBones.current.upperLip?.name || 'BULUNAMADI');
    console.log("  Alt Dudak:", activeBones.current.lowerLip?.name || 'BULUNAMADI');
    
    // Eğer hiçbir bone bulunamazsa, ilk bone'u kullanmayı dene
    if (!activeBones.current.jaw && !activeBones.current.mouth && !activeBones.current.upperLip && !activeBones.current.lowerLip) {
      console.warn("⚠️ Hiçbir uygun bone bulunamadı! İlk bone'u deniyoruz...");
      const firstBoneName = Object.keys(allBones.current)[0];
      if (firstBoneName) {
        activeBones.current.jaw = allBones.current[firstBoneName];
        console.log("🆘 Acil durum bone'u:", firstBoneName);
      }
    }
  };

  // Viseme'ye göre ağız açıklığını hesapla
  const calculateMouthOpenness = (viseme: number, intensity: number): number => {
    const baseOpenness = {
      0: 0,      // Kapalı
      1: 0.1,    // f, v
      2: 0.15,   // s, z, h
      3: 0.25,   // ş, ç, c, j
      4: 0.2,    // d, l, n, r, t
      5: 0.1,    // g, k, ğ
      6: 0.6,    // a - en açık
      7: 0.4,    // e
      8: 0.2,    // ı, i
      9: 0.35,   // o, ö
      10: 0.3,   // u, ü
    };
    
    return (baseOpenness[viseme as keyof typeof baseOpenness] || 0) * intensity;
  };

  // Viseme değiştiğinde hedef açıklığı güncelle
  useEffect(() => {
    if (isSpeaking) {
      targetMouthOpenness.current = calculateMouthOpenness(currentViseme, visemeIntensity);
      console.log(`🎬 Hedef ağız açıklığı: ${targetMouthOpenness.current.toFixed(3)} (Viseme: ${currentViseme}, Yoğunluk: ${visemeIntensity.toFixed(2)})`);
    } else {
      targetMouthOpenness.current = 0;
    }
  }, [isSpeaking, currentViseme, visemeIntensity]);

  // Ana animasyon döngüsü - BASİT VE AÇIK
  useFrame((_, delta) => {
    // Yumuşak geçiş
    const lerpSpeed = 12;
    const oldOpenness = currentMouthOpenness.current;
    
    currentMouthOpenness.current = THREE.MathUtils.lerp(
      currentMouthOpenness.current,
      targetMouthOpenness.current,
      delta * lerpSpeed
    );
    
    // Değişiklik varsa logla
    if (Math.abs(oldOpenness - currentMouthOpenness.current) > 0.001) {
      console.log(`👄 Ağız açıklığı değişti: ${oldOpenness.toFixed(3)} → ${currentMouthOpenness.current.toFixed(3)}`);
    }
    
    // Çene bone'unu hareket ettir
    if (activeBones.current.jaw) {
      const originalRot = originalRotations.current[activeBones.current.jaw.name];
      if (originalRot) {
        // X ekseni rotasyonu (ağız açma/kapama)
        activeBones.current.jaw.rotation.x = originalRot.x + currentMouthOpenness.current;
        
        // Matrisi güncelle
        activeBones.current.jaw.updateMatrixWorld(true);
        
        // Debug için %5 şansla log
        if (Math.random() < 0.05 && currentMouthOpenness.current > 0.01) {
          console.log(`🦷 Çene hareketi: ${activeBones.current.jaw.name}, Rotasyon X: ${activeBones.current.jaw.rotation.x.toFixed(3)}`);
        }
      }
    }
    
    // Ağız bone'unu hareket ettir
    if (activeBones.current.mouth) {
      const originalRot = originalRotations.current[activeBones.current.mouth.name];
      if (originalRot) {
        // Dudaklar için daha küçük hareket
        activeBones.current.mouth.rotation.x = originalRot.x + currentMouthOpenness.current * 0.5;
        activeBones.current.mouth.updateMatrixWorld(true);
        
        if (Math.random() < 0.05 && currentMouthOpenness.current > 0.01) {
          console.log(`👄 Ağız hareketi: ${activeBones.current.mouth.name}, Rotasyon X: ${activeBones.current.mouth.rotation.x.toFixed(3)}`);
        }
      }
    }
    
    // Üst dudak bone'unu hareket ettir
    if (activeBones.current.upperLip) {
      const originalRot = originalRotations.current[activeBones.current.upperLip.name];
      if (originalRot) {
        // Üst dudak yukarı hareket
        activeBones.current.upperLip.rotation.x = originalRot.x - currentMouthOpenness.current * 0.3;
        activeBones.current.upperLip.updateMatrixWorld(true);
        
        if (Math.random() < 0.05 && currentMouthOpenness.current > 0.01) {
          console.log(`👄 Üst dudak hareketi: ${activeBones.current.upperLip.name}, Rotasyon X: ${activeBones.current.upperLip.rotation.x.toFixed(3)}`);
        }
      }
    }
    
    // Alt dudak bone'unu hareket ettir
    if (activeBones.current.lowerLip) {
      const originalRot = originalRotations.current[activeBones.current.lowerLip.name];
      if (originalRot) {
        // Alt dudak aşağı hareket
        activeBones.current.lowerLip.rotation.x = originalRot.x + currentMouthOpenness.current * 0.4;
        activeBones.current.lowerLip.updateMatrixWorld(true);
        
        if (Math.random() < 0.05 && currentMouthOpenness.current > 0.01) {
          console.log(`👄 Alt dudak hareketi: ${activeBones.current.lowerLip.name}, Rotasyon X: ${activeBones.current.lowerLip.rotation.x.toFixed(3)}`);
        }
      }
    }
    
    // Eğer hiçbir bone yoksa uyarı ver
    if (!activeBones.current.jaw && !activeBones.current.mouth && !activeBones.current.upperLip && !activeBones.current.lowerLip && Math.random() < 0.01) {
      console.warn("⚠️ Hiçbir aktif bone yok - animasyon çalışmıyor!");
    }
  });

  // Model render
  return (
    <>
      <primitive 
        object={gltf.scene} 
        ref={modelRef} 
        scale={[1.3, 1.3, 1.3]} 
        position={[0, -1.65, 0]} 
        rotation={[0, 0, 0]}
        castShadow
        receiveShadow
      />
      
      {/* Debug bilgisi için görsel helper */}
      {activeBones.current.jaw && (
        <mesh position={[1, 0, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={isSpeaking ? "red" : "green"} />
        </mesh>
      )}
    </>
  );
}