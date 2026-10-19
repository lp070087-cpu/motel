import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../lib/domain';
import {createBrowserRepository,demoStorageKey} from '../lib/services/demo-repository';

test('same-origin repositories notify peers through BroadcastChannel and storage events, without network',()=>{
 const oldWindow=globalThis.window,oldStorage=globalThis.localStorage,oldChannel=globalThis.BroadcastChannel;
 const events=new EventTarget();const storage=new Map<string,string>();
 class Channel extends EventTarget{
  static peers=new Set<Channel>();constructor(public name:string){super();Channel.peers.add(this);}
  postMessage(data:unknown){for(const peer of Channel.peers)if(peer!==this&&peer.name===this.name)peer.dispatchEvent(new MessageEvent('message',{data}));}
  close(){Channel.peers.delete(this);}
 }
 Object.defineProperty(globalThis,'window',{value:events,configurable:true});
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)},configurable:true});
 Object.defineProperty(globalThis,'BroadcastChannel',{value:Channel,configurable:true});
 try{
  const first=createBrowserRepository(),second=createBrowserRepository();let received=0;
  second.subscribe(()=>{received++;assert.equal(second.load()?.settings.networkName,'Rede reativa');});
  const state=initialState();state.settings.networkName='Rede reativa';first.save(state);
  assert.equal(received,1);assert.equal(second.load()?.rooms.length,250);
  const event=new Event('storage');Object.defineProperty(event,'key',{value:demoStorageKey});events.dispatchEvent(event);assert.equal(received,2);
  first.close();second.close();assert.equal(Channel.peers.size,0);
 }finally{
  Object.defineProperty(globalThis,'window',{value:oldWindow,configurable:true});
  Object.defineProperty(globalThis,'localStorage',{value:oldStorage,configurable:true});
  Object.defineProperty(globalThis,'BroadcastChannel',{value:oldChannel,configurable:true});
 }
});

test('operational gateway publishes reactive inspection changes to subscribers in the same application',async()=>{
 const oldWindow=globalThis.window,oldStorage=globalThis.localStorage,oldChannel=globalThis.BroadcastChannel;
 const events=new EventTarget(),values=new Map<string,string>();
 const state=initialState(),room=state.rooms.find(r=>r.status==='occupied')!;
 values.set(demoStorageKey,JSON.stringify(state));
 Object.defineProperty(globalThis,'window',{value:events,configurable:true});
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)},configurable:true});
 Object.defineProperty(globalThis,'BroadcastChannel',{value:undefined,configurable:true});
 try{
  const {demoGateway}=await import('../lib/store');let updates=0;const stop=demoGateway.subscribe(()=>updates++);
  const result=demoGateway.execute({type:'START_CONSUMPTION_INSPECTION',roomId:room.id,actor:'housekeeper',actorId:room.assignedTo,actorUnitId:room.unitId});
  assert.equal(result.ok,true);assert.ok(updates>=1);
  assert.equal(demoGateway.snapshot().operations!.inspections[0].roomId,room.id);
  const inspection=demoGateway.snapshot().operations!.inspections[0];
  const completed=demoGateway.execute({type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:inspection.id,items:inspection.items.map(i=>({productId:i.productId,checked:true,consumed:i.consumed,remaining:i.remaining,divergence:false,note:''})),actor:'housekeeper',actorId:room.assignedTo,actorUnitId:room.unitId});
  assert.equal(completed.ok,true);assert.equal(demoGateway.snapshot().operations!.inspections[0].status,'submitted');assert.ok(updates>=2);stop();
 }finally{
  Object.defineProperty(globalThis,'window',{value:oldWindow,configurable:true});
  Object.defineProperty(globalThis,'localStorage',{value:oldStorage,configurable:true});
  Object.defineProperty(globalThis,'BroadcastChannel',{value:oldChannel,configurable:true});
 }
});
