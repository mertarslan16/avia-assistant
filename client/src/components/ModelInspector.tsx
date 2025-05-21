// src/components/ModelInspector.tsx
// Bu dosyayı projenize ekleyerek 3D modelinizi inceleyebilirsiniz
import { useState, useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

export default function ModelInspector() {
  const [modelData, setModelData] = useState<{
    isLoaded: boolean;
    meshes: { name: string; morphs: string[] }[];
    bones: string[];
    hasVisemes: boolean;
    error: string | null;
  }>({
    isLoaded: false,
    meshes: [],
    bones: [],
    hasVisemes: false,
    error: null
  });

  // Model yükleme ve inceleme işlemi
  useEffect(() => {
    const loader = new GLTFLoader();
    
    // Modeli yükle ve incele
    loader.load(
      '/models/facial_rig_test.glb', // Modelinizin yolunu doğru şekilde belirtin
      (gltf) => {
        console.log("GLTF model yüklendi:", gltf);
        
        const meshes: { name: string; morphs: string[] }[] = [];
        const bones: string[] = [];
        let hasVisemes = false;
        
        // Model yapısını analiz et
        gltf.scene.traverse((object) => {
          // Mesh'leri bul
          if (object instanceof THREE.Mesh) {
            const morphs: string[] = [];
            
            // Morph targets var mı kontrol et
            if (object.morphTargetDictionary) {
              Object.keys(object.morphTargetDictionary).forEach(key => {
                morphs.push(key);
                
                // Viseme kontrolü
                if (key.includes('viseme') || 
                    key.includes('mouth') || 
                    key.includes('jaw') || 
                    key.includes('lip')) {
                  hasVisemes = true;
                }
              });
            }
            
            meshes.push({
              name: object.name,
              morphs
            });
          }
          
          // Kemikleri bul
          if (object instanceof THREE.Bone) {
            bones.push(object.name);
          }
        });
        
        setModelData({
          isLoaded: true,
          meshes,
          bones,
          hasVisemes,
          error: null
        });
      },
      // İlerleme durumu
      (progress) => {
        console.log('Yükleme ilerlemesi:', (progress.loaded / progress.total) * 100 + '%');
      },
      // Hata durumu
      (error) => {
        console.error('Model yükleme hatası:', error);
        setModelData(prev => ({
          ...prev,
          error: error.message || 'Model yüklenirken bir hata oluştu'
        }));
      }
    );
  }, []);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50 p-4 overflow-auto">
      <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto text-white">
        <h2 className="text-2xl font-bold mb-4">GLFT Model İnceleyici</h2>
        
        {modelData.error ? (
          <div className="bg-red-500 bg-opacity-20 p-4 rounded mb-4">
            <h3 className="font-bold text-red-400">Hata:</h3>
            <p>{modelData.error}</p>
          </div>
        ) : !modelData.isLoaded ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 p-3 rounded">
                <h3 className="font-semibold text-blue-400 mb-2">Model Bilgileri</h3>
                <ul className="list-disc pl-4 text-sm">
                  <li>Mesh Sayısı: {modelData.meshes.length}</li>
                  <li>Kemik Sayısı: {modelData.bones.length}</li>
                  <li>Konuşma Morph'ları: {modelData.hasVisemes ? 'Var ✓' : 'Yok ✕'}</li>
                </ul>
              </div>
              
              <div className="bg-gray-800 p-3 rounded">
                <h3 className="font-semibold text-green-400 mb-2">Tavsiyeler</h3>
                <ul className="list-disc pl-4 text-sm">
                  {!modelData.hasVisemes && (
                    <li className="text-yellow-400">
                      Modelinizde konuşma morph'ları bulunamadı. Daha gerçekçi ağız hareketleri için 
                      viseme veya ağız morphları içeren bir model kullanmanız önerilir.
                    </li>
                  )}
                  {modelData.meshes.length === 0 && (
                    <li className="text-red-400">
                      Modelinizde mesh bulunamadı! Geçerli bir 3D model kullandığınızdan emin olun.
                    </li>
                  )}
                  {modelData.bones.length === 0 && (
                    <li className="text-yellow-400">
                      Modelinizde kemik bulunamadı. Alternatif ağız animasyonu için kemikli bir model 
                      kullanabilirsiniz.
                    </li>
                  )}
                  {modelData.hasVisemes && (
                    <li className="text-green-400">
                      Modelinizde konuşma için gerekli morph'lar mevcut! Ağız animasyonları için bu
                      morph'ları kullanabilirsiniz.
                    </li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="bg-gray-800 p-3 rounded">
                <h3 className="font-semibold text-blue-400 mb-2">Mesh'ler ve Morph'lar</h3>
                {modelData.meshes.length === 0 ? (
                  <p className="text-red-400">Modelinizde mesh bulunamadı!</p>
                ) : (
                  <div className="space-y-3">
                    {modelData.meshes.map((mesh, idx) => (
                      <div key={idx} className="border-b border-gray-700 pb-2">
                        <h4 className="font-medium">{mesh.name || `Mesh ${idx + 1}`}</h4>
                        {mesh.morphs.length > 0 ? (
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Morph targets:</p>
                            <div className="flex flex-wrap gap-1">
                              {mesh.morphs.map((morph, midx) => (
                                <span
                                  key={midx}
                                  className={`text-xs px-2 py-1 rounded ${
                                    morph.includes('viseme') || 
                                    morph.includes('mouth') || 
                                    morph.includes('lip')
                                      ? 'bg-green-600 bg-opacity-30 text-green-300'
                                      : 'bg-gray-700'
                                  }`}
                                >
                                  {morph}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-yellow-400">
                            Bu mesh'in morph target'ları yok.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {modelData.bones.length > 0 && (
                <div className="bg-gray-800 p-3 rounded">
                  <h3 className="font-semibold text-blue-400 mb-2">Kemikler</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {modelData.bones.map((bone, idx) => (
                      <div 
                        key={idx}
                        className={`text-sm p-2 rounded ${
                          bone.toLowerCase().includes('jaw') || 
                          bone.toLowerCase().includes('mouth') ||
                          bone.toLowerCase().includes('lip') ||
                          bone.toLowerCase().includes('tongue')
                            ? 'bg-green-600 bg-opacity-30 text-green-300'
                            : 'bg-gray-700'
                        }`}
                      >
                        {bone}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Yenile
          </button>
          
          <a
            href="https://github.com/mrdoob/three.js/blob/master/examples/webgl_morphtargets_sphere.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Three.js Morph Örnekleri
          </a>
        </div>
      </div>
    </div>
  );
}

// Düğme bileşeni - istediğiniz bileşenin içine yerleştirin
export function ModelInspectorButton() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-lg"
      >
        3D Model İncele
      </button>
      
      {isOpen && (
        <>
          <ModelInspector />
          <button 
            className="fixed top-2 right-2 bg-gray-800 text-white p-2 rounded-full z-[60]"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </>
      )}
    </>
  );
}