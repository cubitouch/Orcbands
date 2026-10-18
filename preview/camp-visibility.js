import * as THREE from 'three';
import {HUT_PLACEMENT,CAMPFIRE_PLACEMENT,TORCH_PLACEMENTS} from './environment-layout.js?v=__ORCBANDS_REVISION__';

// Authored beside the foot trails, with overlapping pools leading out of camp.
export {TORCH_PLACEMENTS};
export const REVEAL_SOURCES=[
 {...HUT_PLACEMENT,radius:10.5}, {...CAMPFIRE_PLACEMENT,radius:5},
 ...TORCH_PLACEMENTS.map(p=>({...p,radius:6.2}))
];
const feather=3;
export function visibilityAt(x,z){
 const distance=Math.max(...REVEAL_SOURCES.map(p=>p.radius-Math.hypot(x-p.x,z-p.z)));
 const t=THREE.MathUtils.clamp(distance/feather,0,1);return t*t*(3-2*t);
}
// A world-space visibility mask on the actual geometry, including instanced trees.
// No screen overlay, transparent terrain layers, render targets or shadow passes.
export function buildCampVisibility(root){
 const enabled={value:1},inverse={value:new THREE.Matrix4()};
 const sources={value:REVEAL_SOURCES.map(p=>new THREE.Vector3(p.x,p.z,p.radius))};
 const materials=new Set();
 root.traverse(o=>{if(o.isMesh)for(const m of(Array.isArray(o.material)?o.material:[o.material]))materials.add(m)});
 for(const material of materials){
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
   previous.call(this,shader,renderer);
   Object.assign(shader.uniforms,{campFogEnabled:enabled,campFogInverse:inverse,campFogSources:sources});
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
    uniform mat4 campFogInverse;
    varying vec2 campFogPosition;`).replace('#include <project_vertex>',`#include <project_vertex>
    vec4 campLocal=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
     campLocal=instanceMatrix*campLocal;
    #endif
    campFogPosition=(campFogInverse*modelMatrix*campLocal).xz;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    uniform float campFogEnabled;
    uniform vec3 campFogSources[${REVEAL_SOURCES.length}];
    varying vec2 campFogPosition;`).replace('#include <opaque_fragment>',`
    float revealDistance=-10000.0;
    for(int i=0;i<${REVEAL_SOURCES.length};i++){
     vec3 source=campFogSources[i];
     revealDistance=max(revealDistance,source.z-length(campFogPosition-source.xy));
    }
    // Tiny boundary undulation keeps the transition from reading as perfect circles.
    float ripple=sin(campFogPosition.x*1.7+sin(campFogPosition.y*.9))*.16
                +sin(campFogPosition.y*2.1+campFogPosition.x*.6)*.10;
    float obscured=(1.0-smoothstep(0.0,${feather.toFixed(1)},revealDistance+ripple))*campFogEnabled;
    outgoingLight=mix(outgoingLight,vec3(.008,.014,.019),obscured);
    #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=> 'camp-visibility-v1';material.needsUpdate=true;
 }
 function update(){root.updateWorldMatrix(true,false);inverse.value.copy(root.matrixWorld).invert()}
 update();
 return {setEnabled(value){enabled.value=value?1:0},update,metrics(){return {enabled:!!enabled.value,sources:REVEAL_SOURCES.length}}};
}
