// AivaModel.tsx - Daha Doğal Ağız Hareketi Versiyonu
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
    
    
    const foundBones: string[] = [];
    const potentialJawBones: string[] = [];
    const potentialLipBones: string[] = [];
    const potentialMouthBones: string[] = [];
    
    gltf.scene.traverse((child) => {
      
      if (child.type === 'SkinnedMesh') {
        const skinnedMesh = child as THREE.SkinnedMesh;
        
        if (skinnedMesh.skeleton) {
          
          skinnedMesh.skeleton.bones.forEach((bone) => {
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
        
      }
    });
    
    // En iyi bone'ları seç
    selectBestBones(potentialJawBones, potentialLipBones, potentialMouthBones);
    
    isInitialized.current = true;
    if (onLoaded) onLoaded();
  }, [gltf.scene, onLoaded]);

  // En uygun bone'ları seç
  const selectBestBones = (jawCandidates: string[], lipCandidates: string[], mouthCandidates: string[]) => {
    
    // Çene bone'u seç (öncelik sırası)
    const jawPriority = ['DEF-Jaw_Rig_Facial', 'Jaw_Rig_Facial', 'DEF-Jaw', 'Jaw', 'jaw', 'mandible'];
    for (const priority of jawPriority) {
      if (allBones.current[priority]) {
        activeBones.current.jaw = allBones.current[priority];
        break;
      }
    }
    
    // Alternatif çene bone'u arama
    if (!activeBones.current.jaw) {
      for (const candidate of jawCandidates) {
        if (allBones.current[candidate]) {
          activeBones.current.jaw = allBones.current[candidate];
          break;
        }
      }
    }
    
    // Ağız/dudak bone'larını seç
    const mouthPriority = ['Lips_Rig_Facial', 'Mouth_Rig_Facial', 'DEF-Lips', 'mouth', 'lips'];
    for (const priority of mouthPriority) {
      if (allBones.current[priority]) {
        activeBones.current.mouth = allBones.current[priority];
        break;
      }
    }
    
    // Alternatif ağız bone'u arama
    if (!activeBones.current.mouth) {
      for (const candidate of mouthCandidates) {
        if (allBones.current[candidate]) {
          activeBones.current.mouth = allBones.current[candidate];
          break;
        }
      }
    }
    
    // Dudak bone'larını seç (üst ve alt dudak)
    for (const lipCandidate of lipCandidates) {
      const cleanName = lipCandidate.replace('UPPER: ', '').replace('LOWER: ', '');
      
      if (lipCandidate.startsWith('UPPER:') && allBones.current[cleanName]) {
        activeBones.current.upperLip = allBones.current[cleanName];
      } else if (lipCandidate.startsWith('LOWER:') && allBones.current[cleanName]) {
        activeBones.current.lowerLip = allBones.current[cleanName];
      }
    }
    
    
    // Eğer hiçbir bone bulunamazsa, ilk bone'u kullanmayı dene
    if (!activeBones.current.jaw && !activeBones.current.mouth && !activeBones.current.upperLip && !activeBones.current.lowerLip) {
      console.warn("⚠️ Hiçbir uygun bone bulunamadı! İlk bone'u deniyoruz...");
      const firstBoneName = Object.keys(allBones.current)[0];
      if (firstBoneName) {
        activeBones.current.jaw = allBones.current[firstBoneName];
      }
    }
  };

  // Viseme'ye göre ağız açıklığını hesapla - ORTA-YÜKSEKSEVİYE AÇILMA
  const calculateMouthOpenness = (viseme: number, intensity: number): number => {
    const baseOpenness = {
      0: 0,        // Kapalı
      1: 0.04,     // f, v - az (0.033 + %20)
      2: 0.064,    // s, z, h - az (0.053 + %20)
      3: 0.096,    // ş, ç, c, j - orta (0.08 + %20)
      4: 0.08,     // d, l, n, r, t - orta (0.067 + %20)
      5: 0.04,     // g, k, ğ - az (0.033 + %20)
      6: 0.2,      // a - orta açık (0.167 + %20)
      7: 0.16,     // e - orta (0.133 + %20)
      8: 0.08,     // ı, i - az (0.067 + %20)
      9: 0.144,    // o, ö - orta (0.12 + %20)
      10: 0.12,    // u, ü - orta (0.1 + %20)
    };
    
    // Yoğunluğu biraz daha az azalt
    const reducedIntensity = intensity * 0.85; // %85'i kadar kullan
    
    return (baseOpenness[viseme as keyof typeof baseOpenness] || 0) * reducedIntensity;
  };

  // Viseme değiştiğinde hedef açıklığı güncelle
  useEffect(() => {
    if (isSpeaking) {
      targetMouthOpenness.current = calculateMouthOpenness(currentViseme, visemeIntensity);
    } else {
      targetMouthOpenness.current = 0;
    }
  }, [isSpeaking, currentViseme, visemeIntensity]);

  // Ana animasyon döngüsü - DAHA HASSAS VE AZ HAREKET
  useFrame((_, delta) => {
    // Yumuşak ama responsive geçiş
    const lerpSpeed = 11; // Biraz daha hızlı
    const oldOpenness = currentMouthOpenness.current;
    
    currentMouthOpenness.current = THREE.MathUtils.lerp(
      currentMouthOpenness.current,
      targetMouthOpenness.current,
      delta * lerpSpeed
    );
    
    // Değişiklik varsa logla
    if (Math.abs(oldOpenness - currentMouthOpenness.current) > 0.0005) {
    }
    
    // Çene bone'unu hareket ettir - ORTA-YÜKSEK SEVİYE HAREKET
    if (activeBones.current.jaw) {
      const originalRot = originalRotations.current[activeBones.current.jaw.name];
      if (originalRot) {
        // X ekseni rotasyonu - orta-yüksek hareket
        activeBones.current.jaw.rotation.x = originalRot.x + currentMouthOpenness.current * 0.24; // 0.2 + %20
        
        // Matrisi güncelle
        activeBones.current.jaw.updateMatrixWorld(true);
        
        // Debug için %5 şansla log
        if (Math.random() < 0.05 && currentMouthOpenness.current > 0.005) {
        }
      }
    }
    
    // Ağız bone'unu hareket ettir - ORTA-YÜKSEK SEVİYE HAREKET
    if (activeBones.current.mouth) {
      const originalRot = originalRotations.current[activeBones.current.mouth.name];
      const originalPos = originalPositions.current[activeBones.current.mouth.name];
      
      if (originalRot && originalPos) {
        // Rotasyon - orta-yüksek
        activeBones.current.mouth.rotation.x = originalRot.x + currentMouthOpenness.current * 0.64; // 0.533 + %20
        // Y pozisyonu - orta-yüksek
        activeBones.current.mouth.position.y = originalPos.y + currentMouthOpenness.current * 0.016; // 0.013 + %20
        activeBones.current.mouth.updateMatrixWorld(true);
        
        
      }
    }
    
    // Üst dudak bone'unu hareket ettir - ORTA-YÜKSEK SEVİYE HAREKET
    if (activeBones.current.upperLip) {
      const originalRot = originalRotations.current[activeBones.current.upperLip.name];
      const originalPos = originalPositions.current[activeBones.current.upperLip.name];
      
      if (originalRot && originalPos) {
        // Üst dudak - orta-yüksek hareket
        activeBones.current.upperLip.rotation.x = originalRot.x - currentMouthOpenness.current * 0.48; // 0.4 + %20
        activeBones.current.upperLip.position.y = originalPos.y + currentMouthOpenness.current * 0.024; // 0.02 + %20
        activeBones.current.upperLip.position.z = originalPos.z - currentMouthOpenness.current * 0.008; // 0.0067 + %20
        activeBones.current.upperLip.updateMatrixWorld(true);
        
       
      }
    }
    
    // Alt dudak bone'unu hareket ettir - ORTA-YÜKSEK SEVİYE HAREKET
    if (activeBones.current.lowerLip) {
      const originalRot = originalRotations.current[activeBones.current.lowerLip.name];
      const originalPos = originalPositions.current[activeBones.current.lowerLip.name];
      
      if (originalRot && originalPos) {
        // Alt dudak - orta-yüksek hareket
        activeBones.current.lowerLip.rotation.x = originalRot.x + currentMouthOpenness.current * 0.56; // 0.467 + %20
        activeBones.current.lowerLip.position.y = originalPos.y - currentMouthOpenness.current * 0.032; // 0.027 + %20
        activeBones.current.lowerLip.position.z = originalPos.z + currentMouthOpenness.current * 0.012; // 0.01 + %20
        activeBones.current.lowerLip.updateMatrixWorld(true);
        
        
      }
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