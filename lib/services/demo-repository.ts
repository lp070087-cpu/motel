import type { MotelState } from '../domain';

/** Replace this port with an authenticated API/event adapter when a backend exists. */
export interface MotelRepository {
 load():MotelState|null;
 save(state:MotelState):void;
 subscribe(listener:()=>void):()=>void;
 close():void;
}
export const demoStorageKey='motel-demo-v1';
export function createBrowserRepository():MotelRepository {
 const listeners=new Set<()=>void>();
 let fallback:MotelState|null=null;
 const source=crypto.randomUUID();
 let channel:BroadcastChannel|null=null;
 try {if(typeof BroadcastChannel!=='undefined')channel=new BroadcastChannel('motel-demo-events-v1');}catch{channel=null;}
 const notify=()=>listeners.forEach(listener=>listener());
 const storage=(event:StorageEvent)=>{if(event.key===demoStorageKey)notify();};
 const message=(event:MessageEvent)=>{if(event.data?.kind==='state-changed'&&event.data?.source!==source)notify();};
 window.addEventListener('storage',storage);
 channel?.addEventListener('message',message);
 return {
  load(){try{const raw=localStorage.getItem(demoStorageKey);return raw?JSON.parse(raw):fallback;}catch{return fallback;}},
  save(state){fallback=state;try{localStorage.setItem(demoStorageKey,JSON.stringify(state));}catch{/* Keep same-tab operation available in memory. */}try{channel?.postMessage({kind:'state-changed',source,at:Date.now()});}catch{/* Storage events remain available. */}},
  subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener)};},
  close(){window.removeEventListener('storage',storage);channel?.removeEventListener('message',message);channel?.close();listeners.clear();},
 };
}
export interface OperationalGateway {
 execute(action:import('../domain').Action):{ok:boolean;error?:string};
 snapshot():MotelState;
 subscribe(listener:()=>void):()=>void;
}
