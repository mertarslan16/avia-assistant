// AivaModel.tsx - Tam düzeltilmiş versiyonu
import { useRef, useEffect, useState } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { useSpeechStore, SPEECH_EVENTS } from '@/utils/tts';

interface AivaModelProps {
  speaking?: boolean;
  mouthOpenness?: number;
  onLoaded?: () => void;
}

// Kemikleri kategorize etmek için sabitleri tanımla
const BONE_CATEGORIES = {
  JAW: ['jaw', 'çene', 'chin', 'lower'],
  UPPER_LIP: ['upper_lip', 'üst_dudak', 'upperlip', 'upper'],
  LOWER_LIP: ['lower_lip', 'alt_dudak', 'lowerlip', 'lower'],
  LIP_CORNERS: ['corner', 'köşe', 'lip_corner', 'dudak_köşe'],
  TONGUE: ['tongue', 'dil']
};

// Ağız şekillerini tanımla
const MOUTH_SHAPES = {
  REST: 'rest',
  OPEN: 'open',
  ROUNDED: 'rounded',
  WIDE: 'wide',
  PURSED: 'pursed',
};

/**
 * Kemik isminin hangi kategoriye ait olduğunu belirler
 */
function getBoneCategory(boneName: string): string | null {
  const lowerName = boneName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(BONE_CATEGORIES)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }
  
  return null;
}

/**
 * Dudak kemiğinin tipini belirler (üst, alt, köşe, vs.)
 */
function determineLipBoneType(boneName: string): {
  type: 'upper' | 'lower' | 'corner' | 'other';
  side: 'left' | 'right' | 'center';
} {
  const name = boneName.toLowerCase();
  
  // Varsayılan sonuç
  let result = {
    type: 'other' as const,
    side: 'center' as const
  };
  
  // Üst dudak kemikleri
  if (name.includes('upper') || 
      name.includes('üst') || 
      name.match(/lip.*?[1-3]/) ||
      name.match(/lip[l|r]?[1-3]/) || 
      name.includes('top')) {
    result.type = 'upper';
  } 
  // Alt dudak kemikleri
  else if (name.includes('lower') || 
           name.includes('alt') || 
           name.match(/lip.*?[4-9]/) ||
           name.includes('bottom')) {
    result.type = 'lower';
  } 
  // Köşe dudak kemikleri
  else if (name.includes('corner') || 
           name.includes('köşe')) {
    result.type = 'corner';
  }
  
  // Tarafı belirle
  if (name.includes('l') && !name.includes('lower')) {
    result.side = 'left';
  } else if (name.includes('r') && !name.includes('right')) {
    result.side = 'right';
  }
  
  return result;
}

export function AivaModel({ 
  speaking = false, 
  mouthOpenness = 0,
  onLoaded
}: AivaModelProps) {
  // GLTF modelini yükle
  const gltf = useLoader(GLTFLoader, '/models/facial_rig_test.glb');
  const modelRef = useRef<THREE.Group>(null);
  
  // Kemik referansları
  const jawBonesRef = useRef<THREE.Object3D[]>([]);
  const lipBonesRef = useRef<THREE.Object3D[]>([]);
  const tongueBonesRef = useRef<THREE.Object3D[]>([]);
  
  // Orijinal dönüşler ve pozisyonlar
  const originalRotation = useRef<{[key: string]: THREE.Euler}>({});
  const originalPosition = useRef<{[key: string]: THREE.Vector3}>({});
  
  // Morph targets için referanslar
  const meshesWithMorphsRef = useRef<THREE.Mesh[]>([]);
  const morphTargetsRef = useRef<{
    [key: string]: { mesh: THREE.Mesh; index: number }
  }>({});
  
  // Animasyon için mixer
  const animationMixerRef = useRef<THREE.AnimationMixer | null>(null);
  
  // Ağız durumu 
  const [mouthState, setMouthState] = useState<{
    isOpen: boolean;
    openAmount: number;
    mouthShape: string;
    phoneticData: any;
  }>({
    isOpen: false,
    openAmount: 0,
    mouthShape: MOUTH_SHAPES.REST,
    phoneticData: null
  });
  
  // Model yüklendikten sonra kemikleri bul ve hazırla
  useEffect(() => {
    if (!gltf) return;
    
    console.log("Model yüklendi, kemikler ve morph targets tespit ediliyor...");
    
    // Debug için global değişkene modeli kaydet
    window.loadedModel = gltf.scene;
    
    // Animasyon mixer'ı oluştur
    const mixer = new THREE.AnimationMixer(gltf.scene);
    animationMixerRef.current = mixer;
    
    // Tüm kemikleri global değişkene kaydet (debug için)
    window.modelBones = [];
    
    // Morph target'ları tespit et
    const findMorphTargets = (object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh && object.morphTargetDictionary && object.morphTargetInfluences) {
        meshesWithMorphsRef.current.push(object);
        
        // Morph targetları logla ve kaydet
        Object.entries(object.morphTargetDictionary).forEach(([name, index]) => {
          console.log(`Morph Target bulundu: ${name} (${index})`);
          
          // Ağız ile ilgili morph target'ları kaydet
          if (name.toLowerCase().includes('mouth') || 
              name.toLowerCase().includes('jaw') || 
              name.toLowerCase().includes('lip') || 
              name.toLowerCase().includes('viseme') ||
              name.toLowerCase().includes('ağız') || 
              name.toLowerCase().includes('çene') || 
              name.toLowerCase().includes('dudak')) {
            morphTargetsRef.current[name] = { mesh: object, index };
          }
        });
      }
    };
    
    // Kemikleri bul ve referansları kaydet
    const findBones = (object: THREE.Object3D) => {
      // Orijinal rotasyonu ve pozisyonu sakla
      originalRotation.current[object.name] = object.rotation.clone();
      originalPosition.current[object.name] = object.position.clone();
      
      // Debug için model yapısını kaydet
      window.modelBones.push(object);
      
      // Kemik kategorisini kontrol et
      const category = getBoneCategory(object.name);
      
      if (category === 'JAW') {
        console.log("Çene kemiği bulundu:", object.name);
        jawBonesRef.current.push(object);
      }
      else if (category === 'UPPER_LIP' || category === 'LOWER_LIP' || category === 'LIP_CORNERS') {
        console.log("Dudak kemiği bulundu:", object.name);
        lipBonesRef.current.push(object);
      }
      else if (category === 'TONGUE') {
        console.log("Dil kemiği bulundu:", object.name);
        tongueBonesRef.current.push(object);
      }
      // Alternatif yöntem: isim içerik kontrolü
      else if (object.name.toLowerCase().includes('jaw') || 
               object.name.toLowerCase().includes('çene')) {
        console.log("İsim bazlı çene kemiği bulundu:", object.name);
        jawBonesRef.current.push(object);
      }
      else if (object.name.toLowerCase().includes('lip') || 
               object.name.toLowerCase().includes('mouth') ||
               object.name.toLowerCase().includes('dudak') ||
               object.name.toLowerCase().includes('ağız')) {
        console.log("İsim bazlı dudak kemiği bulundu:", object.name);
        lipBonesRef.current.push(object);
      }
      
      // Morph target'ları kontrol et
      findMorphTargets(object);
      
      // Alt nesnelere rekursif olarak bak
      object.children.forEach(findBones);
    };
    
    // Tüm model hiyerarşisinde kemikleri ara
    findBones(gltf.scene);
    
    // Kemik bulunamadıysa logla
    if (jawBonesRef.current.length === 0) {
      console.warn("Belirtilen çene kemikleri bulunamadı! Alternatif kemik aranıyor...");
      
      // Alternatif olarak tüm kemikleri yeniden gözden geçir ve tahmin et
      window.modelBones.forEach(bone => {
        const name = bone.name.toLowerCase();
        // Çene olabilecek kemikleri bul
        if ((name.includes('jaw') || name.includes('chin') || name.includes('lower')) && 
            !jawBonesRef.current.includes(bone)) {
          console.log("Tahmin edilen çene kemiği:", bone.name);
          jawBonesRef.current.push(bone);
        }
        // Dudak olabilecek kemikleri bul
        else if ((name.includes('lip') || name.includes('mouth')) && 
                 !lipBonesRef.current.includes(bone)) {
          console.log("Tahmin edilen dudak kemiği:", bone.name);
          lipBonesRef.current.push(bone);
        }
      });
    }
    
    // Debug: bulunan kemik sayılarını yazdır
    console.log(`Toplam ${window.modelBones.length} kemik incelendi.`);
    console.log(`Bulunan çene kemikleri: ${jawBonesRef.current.length}`);
    console.log(`Bulunan dudak kemikleri: ${lipBonesRef.current.length}`);
    console.log(`Bulunan dil kemikleri: ${tongueBonesRef.current.length}`);
    console.log(`Bulunan morph targets: ${Object.keys(morphTargetsRef.current).length}`);
    
    // Model yüklendi bilgisini gönder
    if (onLoaded) {
      onLoaded();
    }
  }, [gltf, onLoaded]);
  
  // Ses olaylarını dinle
  useEffect(() => {
    const handleVolumeChange = (event: CustomEvent) => {
      const volume = event.detail.volume || 0;
      const phoneme = event.detail.phoneme || '';
      const mouthShape = event.detail.mouthShape || 'default';
      const roundness = event.detail.roundness || 0.1;
      const jaw = event.detail.jaw || 0.1;
      const isTransition = event.detail.isTransition || false;
      const isClosing = event.detail.isClosing || false;
      
      // Ses seviyesine göre ağız durumunu güncelle
      if (volume > 0.05) {
        setMouthState({
          isOpen: true,
          openAmount: volume,
          mouthShape: mouthShape,
          phoneticData: {
            phoneme,
            roundness,
            jaw,
            isTransition,
            isClosing
          }
        });
      } else if (isClosing) {
        // Kapanma animasyonu
        setMouthState({
          isOpen: false,
          openAmount: volume,
          mouthShape: 'rest',
          phoneticData: {
            phoneme: '',
            roundness: 0.1,
            jaw: 0.1,
            isTransition: false,
            isClosing: true
          }
        });
      } else {
        // Konuşma durdu
        setMouthState({
          isOpen: false,
          openAmount: 0,
          mouthShape: 'rest',
          phoneticData: null
        });
      }
    };
    
    // Konuşma olaylarını dinle
    const handleSpeechStart = () => {
      setMouthState({ 
        isOpen: true, 
        openAmount: 0.3,
        mouthShape: 'default',
        phoneticData: null
      });
    };
    
    const handleSpeechEnd = () => {
      setMouthState({ 
        isOpen: false, 
        openAmount: 0,
        mouthShape: 'rest',
        phoneticData: null
      });
    };
    
    window.addEventListener(SPEECH_EVENTS.START, handleSpeechStart);
    window.addEventListener(SPEECH_EVENTS.END, handleSpeechEnd);
    window.addEventListener(SPEECH_EVENTS.VOLUME, handleVolumeChange as EventListener);
    
    return () => {
      window.removeEventListener(SPEECH_EVENTS.START, handleSpeechStart);
      window.removeEventListener(SPEECH_EVENTS.END, handleSpeechEnd);
      window.removeEventListener(SPEECH_EVENTS.VOLUME, handleVolumeChange as EventListener);
    };
  }, []);
  
  // Morph target'larla ağız şeklini güncelle
  const updateMorphTargets = (openAmount: number, roundness: number, mouthShape: string) => {
    Object.entries(morphTargetsRef.current).forEach(([name, { mesh, index }]) => {
      const nameL = name.toLowerCase();
      
      // Ağız açma/kapama morph targets
      if (nameL.includes('open') || nameL.includes('wide') || nameL.includes('jaw')) {
        // Ağzı açma morph target'ları
        mesh.morphTargetInfluences![index] = openAmount;
      } 
      else if (nameL.includes('close') || nameL.includes('purse')) {
        // Ağzı kapatma morph target'ları - ters oran
        mesh.morphTargetInfluences![index] = 1.0 - openAmount;
      }
      else if (nameL.includes('viseme')) {
        // Viseme morph targets - ses çıkartmaya özel ağız şekilleri
        let influence = 0;
        
        if (mouthShape === 'ah' && nameL.includes('ah')) {
          influence = openAmount;
        }
        else if (mouthShape === 'oh' && (nameL.includes('oh') || nameL.includes('oo'))) {
          influence = openAmount * roundness;
        }
        else if (mouthShape === 'ee' && nameL.includes('ee')) {
          influence = openAmount;
        }
        else if (mouthShape === 'f' && nameL.includes('f')) {
          influence = openAmount;
        }
        else {
          // Diğer viseme durumları için...
          influence = openAmount * 0.3;
        }
        
        mesh.morphTargetInfluences![index] = influence;
      }
      else if (nameL.includes('smile') || nameL.includes('happy')) {
        // Gülümseme morph targets (opsiyonel)
        mesh.morphTargetInfluences![index] = Math.random() * 0.2;
      }
    });
  };
  
  // Her karede ağız animasyonunu güncelle
  useFrame((state, delta) => {
    // Mixer'ı güncelle
    if (animationMixerRef.current) {
      animationMixerRef.current.update(delta);
    }
    
    // Konuşma durumunu ve ağız açıklığını al
    const { isOpen, openAmount, mouthShape, phoneticData } = mouthState;
    
    // Phonetic verileri çıkart
    const roundness = phoneticData?.roundness || 0.1;
    const jaw = phoneticData?.jaw || openAmount;
    const isTransition = phoneticData?.isTransition || false;
    const isClosing = phoneticData?.isClosing || false;
    
    // ÇENE KEMİKLERİ ANİMASYONU
    if (jawBonesRef.current.length > 0 && isOpen) {
      jawBonesRef.current.forEach(jawBone => {
        const origRot = originalRotation.current[jawBone.name];
        const origPos = originalPosition.current[jawBone.name];
        
        if (!origRot || !origPos) return;
        
        // ÖNEMLİ: Daha düşük değerlerle çalış
        // X ekseni rotasyonu (çene açılması) - negatif değer, çeneyi açar
        const jawOpenAmount = -0.1 * jaw; // Daha düşük değer
        
        // Yumuşak geçiş için lerp kullan
        jawBone.rotation.x = THREE.MathUtils.lerp(
          jawBone.rotation.x,
          origRot.x + jawOpenAmount,
          isTransition ? 0.2 : 0.3 // Geçişlerde daha yavaş
        );
        
        // Hafif Y ve Z rotasyonu ekle (daha doğal görünüm)
        jawBone.rotation.y = THREE.MathUtils.lerp(
          jawBone.rotation.y,
          origRot.y + (Math.random() * 0.01 - 0.005) * jaw,
          0.1
        );
        
        jawBone.rotation.z = THREE.MathUtils.lerp(
          jawBone.rotation.z,
          origRot.z + (Math.random() * 0.01 - 0.005) * jaw,
          0.1
        );
        
        // POZİSYON BAZLI ÇENİ ANİMASYONU (opsiyonel)
        // Pozisyon değişikliği de ekle
        jawBone.position.y = THREE.MathUtils.lerp(
          jawBone.position.y,
          origPos.y - 0.003 * jaw, // Çok küçük değer - aşağı inme
          isTransition ? 0.2 : 0.3
        );
        
        // İleri hareket (opsiyonel)
        jawBone.position.z = THREE.MathUtils.lerp(
          jawBone.position.z,
          origPos.z + 0.001 * jaw, // Çok küçük değer - ileri hareket
          isTransition ? 0.2 : 0.3
        );
      });
    } 
    // Konuşma durduğunda orijinal pozisyona dön
    else if (jawBonesRef.current.length > 0) {
      jawBonesRef.current.forEach(jawBone => {
        const origRot = originalRotation.current[jawBone.name];
        const origPos = originalPosition.current[jawBone.name];
        
        if (!origRot || !origPos) return;
        
        // Rotasyonları sıfırla
        jawBone.rotation.x = THREE.MathUtils.lerp(jawBone.rotation.x, origRot.x, isClosing ? 0.1 : 0.2);
        jawBone.rotation.y = THREE.MathUtils.lerp(jawBone.rotation.y, origRot.y, 0.2);
        jawBone.rotation.z = THREE.MathUtils.lerp(jawBone.rotation.z, origRot.z, 0.2);
        
        // Pozisyonları sıfırla
        jawBone.position.y = THREE.MathUtils.lerp(jawBone.position.y, origPos.y, isClosing ? 0.1 : 0.2);
        jawBone.position.z = THREE.MathUtils.lerp(jawBone.position.z, origPos.z, 0.2);
      });
    }
    
    // DUDAK KEMİKLERİ ANİMASYONU
    if (lipBonesRef.current.length > 0 && isOpen) {
      lipBonesRef.current.forEach(lipBone => {
        const { type, side } = determineLipBoneType(lipBone.name);
        const origRot = originalRotation.current[lipBone.name];
        const origPos = originalPosition.current[lipBone.name];
        
        if (!origRot || !origPos) return;
        
        // Dudak hareketleri - farklı kemiklere göre farklı hareketler
        if (type === 'upper') {
          // ÜST DUDAK HAREKETİ - değerler küçültüldü
          
          // X ekseni (dikey hareket) - yukarı kalk
          lipBone.rotation.x = THREE.MathUtils.lerp(
            lipBone.rotation.x,
            origRot.x - 0.03 * openAmount, // Dikey hareket - KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
          
          // Z ekseni (ileri-geri hareket) - yuvarlaklık ile ilgili
          lipBone.rotation.z = THREE.MathUtils.lerp(
            lipBone.rotation.z,
            origRot.z - 0.01 * roundness, // Yuvarlaklık faktörü - KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
          
          // DİREKT POZİSYON DEĞİŞİKLİĞİ - bazı modeller için daha etkili
          lipBone.position.y = THREE.MathUtils.lerp(
            lipBone.position.y,
            origPos.y + 0.001 * openAmount, // Yukarı kaldır - ÇOK KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
          
          // Yuvarlaklık için öne hareket
          lipBone.position.z = THREE.MathUtils.lerp(
            lipBone.position.z,
            origPos.z + 0.001 * roundness, // Öne hareket - ÇOK KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
        } 
        else if (type === 'lower') {
          // ALT DUDAK HAREKETİ
          
          // X ekseni (dikey hareket) - aşağı in
          lipBone.rotation.x = THREE.MathUtils.lerp(
            lipBone.rotation.x,
            origRot.x + 0.04 * openAmount, // Aşağı hareket - biraz daha fazla
            isTransition ? 0.2 : 0.25
          );
          
          // Z ekseni (ileri-geri hareket) - yuvarlaklık ile ilgili
          lipBone.rotation.z = THREE.MathUtils.lerp(
            lipBone.rotation.z,
            origRot.z + 0.01 * roundness, // Yuvarlaklık faktörü - KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
          
          // DİREKT POZİSYON DEĞİŞİKLİĞİ
          lipBone.position.y = THREE.MathUtils.lerp(
            lipBone.position.y,
            origPos.y - 0.002 * openAmount, // Aşağı hareket - ÇOK KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
          
          // Yuvarlaklık için öne hareket
          lipBone.position.z = THREE.MathUtils.lerp(
            lipBone.position.z,
            origPos.z + 0.001 * roundness, // Öne hareket - ÇOK KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
        }
        else if (type === 'corner') {
          // DUDAK KÖŞE HAREKETİ
          
          // Sağ ve sol için yön belirle
          const sideMultiplier = side === 'left' ? -1 : 1;
          
          // Y ekseni (yatay hareket) - sadece küçük bir hareket
          lipBone.rotation.y = THREE.MathUtils.lerp(
            lipBone.rotation.y,
            origRot.y + (0.02 * sideMultiplier) * roundness, // KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
          
          // Z ekseni (ileri-geri hareket)
          lipBone.rotation.z = THREE.MathUtils.lerp(
            lipBone.rotation.z,
            origRot.z + (0.02 * sideMultiplier) * roundness, // KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
          
          // DİREKT POZİSYON DEĞİŞİKLİĞİ
          // X ekseni (yatay hareket) - yana
          lipBone.position.x = THREE.MathUtils.lerp(
            lipBone.position.x,
            origPos.x + (0.001 * sideMultiplier) * roundness, // ÇOK KÜÇÜK değer
            isTransition ? 0.2 : 0.25
          );
        }
        else {
          // Diğer dudak kemikleri
          // Genel bir hareket ekle - tamamen kapanmasını önler
          
          lipBone.rotation.x = THREE.MathUtils.lerp(
            lipBone.rotation.x,
            origRot.x + (Math.random() * 0.02 - 0.01) * openAmount, // Rastgele küçük hareket
            0.2
          );
        }
      });
    } 
    // Konuşma durduğunda dudakları orijinal pozisyona getir
    else if (lipBonesRef.current.length > 0) {
      lipBonesRef.current.forEach(lipBone => {
        const origRot = originalRotation.current[lipBone.name];
        const origPos = originalPosition.current[lipBone.name];
        
        if (!origRot || !origPos) return;
        
        // Rotasyonu sıfırla
        lipBone.rotation.x = THREE.MathUtils.lerp(lipBone.rotation.x, origRot.x, isClosing ? 0.1 : 0.2);
        lipBone.rotation.y = THREE.MathUtils.lerp(lipBone.rotation.y, origRot.y, isClosing ? 0.1 : 0.2);
        lipBone.rotation.z = THREE.MathUtils.lerp(lipBone.rotation.z, origRot.z, isClosing ? 0.1 : 0.2);
        
        // Pozisyonu sıfırla
        lipBone.position.x = THREE.MathUtils.lerp(lipBone.position.x, origPos.x, isClosing ? 0.1 : 0.2);
        lipBone.position.y = THREE.MathUtils.lerp(lipBone.position.y, origPos.y, isClosing ? 0.1 : 0.2);
        lipBone.position.z = THREE.MathUtils.lerp(lipBone.position.z, origPos.z, isClosing ? 0.1 : 0.2);
      });
    }
    
    // MORPH TARGET ANİMASYONU - eğer model destekliyorsa
    if (Object.keys(morphTargetsRef.current).length > 0) {
      updateMorphTargets(openAmount, roundness, mouthShape);
    }
    
    // DİL ANİMASYONU - opsiyonel
    if (tongueBonesRef.current.length > 0 && isOpen) {
      tongueBonesRef.current.forEach(tongueBone => {
        const origRot = originalRotation.current[tongueBone.name];
        
        if (!origRot) return;
        
        // Çok hafif rastgele dil hareketi
        tongueBone.rotation.x = THREE.MathUtils.lerp(
          tongueBone.rotation.x,
          origRot.x + (Math.random() * 0.01 - 0.005) * openAmount,
          0.1
        );
      });
    }
    else if (tongueBonesRef.current.length > 0) {
      tongueBonesRef.current.forEach(tongueBone => {
        const origRot = originalRotation.current[tongueBone.name];
        
        if (!origRot) return;
        
        tongueBone.rotation.x = THREE.MathUtils.lerp(tongueBone.rotation.x, origRot.x, 0.2);
      });
    }
  });
  
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