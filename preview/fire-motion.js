// Deterministic motion shared by the hearth and torches. Time is in seconds.
export function fireSignal(time,phase=0){
 return .55*Math.sin(time*3.8+phase)+.28*Math.sin(time*8.7+phase*2.3)+.17*Math.sin(time*15.1+phase*.7);
}
export function createFlameMotion(mesh,phase=0){
 const position=mesh.geometry.attributes.position,rest=position.array.slice();
 let height=0;for(let i=1;i<rest.length;i+=3)height=Math.max(height,rest[i]);
 mesh.geometry.computeBoundingSphere();mesh.geometry.boundingSphere.radius*=1.6;
 return time=>{
  const pulse=fireSignal(time,phase),breath=Math.sin(time*2.2+phase*.8);
  mesh.scale.set(1-pulse*.10,1+pulse*.22+breath*.05,1-pulse*.07);
  for(let i=0;i<rest.length;i+=3){
   const u=rest[i+1]/height,bend=u*u;
   position.array[i]=rest[i]+height*bend*(Math.sin(time*4.4+phase+u*1.8)*.13+Math.sin(time*9.2+phase*1.7)*.035);
   position.array[i+1]=rest[i+1]+height*Math.sin(Math.PI*u)*Math.sin(time*6.5+phase+u*2)*.045;
   position.array[i+2]=rest[i+2]+height*bend*Math.sin(time*3.3+phase*1.4+u)*.09;
  }
  // The bottom ring stays fixed: the fire grows from its fuel instead of bobbing.
  position.needsUpdate=true;mesh.rotation.y=Math.sin(time*2.5+phase)*.12;
 };
}
