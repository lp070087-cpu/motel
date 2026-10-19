'use client';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { initialState, migrateState, reducer, type Action, type MotelState } from './domain';
import {createBrowserRepository,type MotelRepository} from './services/demo-repository';
let repository:MotelRepository|null=null;
const seed=initialState();
let current=seed;
let initialized=false;
let ready=false;
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(listener=>listener());
function valid(value:unknown):value is MotelState {
 if(!value||typeof value!=='object')return false;
 const v=value as Partial<MotelState>;
 return v.version===1&&Array.isArray(v.units)&&v.units.length===10&&Array.isArray(v.rooms)&&Array.isArray(v.stays)&&Array.isArray(v.reservations)&&Array.isArray(v.orders)&&Array.isArray(v.services)&&Array.isArray(v.products)&&Array.isArray(v.movements)&&Array.isArray(v.tickets)&&Array.isArray(v.staff)&&Array.isArray(v.transactions)&&Array.isArray(v.events)&&Array.isArray(v.reviews)&&!!v.settings;
}
function initialize(){
 if(initialized||typeof window==='undefined')return;
 initialized=true;
 try {
  repository=createBrowserRepository();
  const saved=repository.load();if(valid(saved))current=migrateState(saved);
  repository.save(current);
  repository.subscribe(()=>{try{const saved=repository!.load();const next=valid(saved)?migrateState(saved):initialState();if(JSON.stringify(next)!==JSON.stringify(current)){current=next;emit();}}catch{/* Ignore malformed updates. */}});
 }catch{/* The demonstration remains usable without persistent storage. */}
 ready=true;emit();
}
export interface DispatchResult {ok:boolean;error?:string}
export function dispatch(action:Action):DispatchResult {
 initialize();
 try {const latest=repository?.load();const base=valid(latest)?migrateState(latest):current;const next=reducer(base,action);if(next===base){if(JSON.stringify(base)!==JSON.stringify(current)){current=base;emit();}return {ok:true};}repository?.save(next);current=next;emit();return {ok:true};}
 catch(error){return {ok:false,error:error instanceof Error?error.message:'Não foi possível concluir a operação.'};}
}
export function reset():DispatchResult {
 try {const next=initialState();repository?.save(next);current=next;emit();return {ok:true};}
 catch {return {ok:false,error:'O navegador não permitiu salvar a demonstração.'};}
}
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}};
export function useMotel(){
 const state=useSyncExternalStore(subscribe,()=>current,()=>seed);
 const isReady=useSyncExternalStore(subscribe,()=>ready,()=>false);
 useEffect(initialize,[]);
 return {state,dispatch,reset,ready:isReady};
}
export function MotelProvider({children}:{children:ReactNode}){return children;}

export const demoGateway={execute:dispatch,snapshot:()=>current,subscribe};
