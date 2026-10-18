import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from 'three';
import { architectureLayout } from '../lib/architecture';
import { mapFrame, isoDirection, placeMapLabels, labelWidth, labelHeight } from '../lib/map-view';

for (const unitId of ['u1','u2','u3']) for (const count of [25,40,60]) for (const [width,height] of [[320,560],[700,760],[1050,820]]) {
  test('orthographic frame and identifiers: '+unitId+' / '+count+' / '+width, () => {
    const layout=architectureLayout(unitId,count), frame=mapFrame(layout,width,height);
    const camera=new OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,700);
    let target=frame.center.clone();
    camera.position.copy(target).addScaledVector(isoDirection,180);camera.lookAt(target);
    target.addScaledVector(new Vector3(0,1,0).applyQuaternion(camera.quaternion),-frame.offsetY/frame.zoom);
    camera.position.copy(target).addScaledVector(isoDirection,180);camera.lookAt(target);
    camera.zoom=frame.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const coverage=Math.max(frame.projectedWidth*frame.zoom/(width-32),frame.projectedHeight*frame.zoom/(height-92));
    assert.ok(Math.abs(coverage-.92)<.0001);
    for(const corner of frame.corners){
      const p=corner.clone().project(camera);
      assert.ok(Math.abs(p.x)<1 && Math.abs(p.y)<1 && Math.abs(p.z)<1,'building clipped');
    }
    for(const factor of [1,1.2,2]){
      camera.zoom=frame.zoom*factor;camera.updateProjectionMatrix();
      const anchors=layout.positions.map(([x,y,z],i)=>{
        const p=new Vector3(x,y+.12,z+(layout.mirrored[i]?-3.95:3.95)).project(camera);
        return {id:String(i),x:(p.x+1)*width/2,y:(1-p.y)*height/2};
      });
      const labels=placeMapLabels(anchors,width,height-60);
      if(factor===1)assert.equal(labels.length,count,'missing identifier in overview');
      for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
        assert.ok(Math.abs(labels[i].x-labels[j].x)>=labelWidth+4 || Math.abs(labels[i].y-labels[j].y)>=labelHeight+4,'overlapping labels');
      }
    }
  });
}
