// Coherent, seeded ground variation. No textures, random frame state or shader effects.
function hash(x,z){let n=Math.imul(x,374761393)^Math.imul(z,668265263)^2302;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295}
const smooth=t=>t*t*(3-2*t);
export function noise(x,z){
 const ix=Math.floor(x),iz=Math.floor(z),u=smooth(x-ix),v=smooth(z-iz);
 const a=hash(ix,iz)*(1-u)+hash(ix+1,iz)*u,b=hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u;
 return a*(1-v)+b*v;
}
export function groundVariation(x,z){
 return .55*noise(x*.47,z*.47)+.30*noise(x*1.3+31,z*1.3)+.15*noise(x*3.2,z*3.2+19);
}
