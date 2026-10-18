'use client';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { initialState, migrateState, reducer, type Action, type MotelState } from './domain';
const KEY='motel-demo-v1';
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
 try {const raw=localStorage.getItem(KEY);if(raw){const saved:unknown=JSON.parse(raw);if(valid(saved)){current=migrateState(saved);localStorage.setItem(KEY,JSON.stringify(current));}}}catch{ /* The demo remains usable when browser storage is unavailable. */ }
 ready=true;emit();
 window.addEventListener('storage',(event)=>{if(event.key!==KEY)return;try{if(event.newValue){const saved:unknown=JSON.parse(event.newValue);if(valid(saved)){current=migrateState(saved);emit();}}else{current=initialState();emit();}}catch{/* Ignore malformed storage from other tabs. */}});
}
export interface DispatchResult {ok:boolean;error?:string}
export function dispatch(action:Action):DispatchResult {
 initialize();
 try {const next=reducer(current,action);if(next===current)return {ok:true};if(typeof window!=='undefined')localStorage.setItem(KEY,JSON.stringify(next));current=next;emit();return {ok:true};}
 catch(error){return {ok:false,error:error instanceof Error?error.message:'Não foi possível concluir a operação.'};}
}
export function reset():DispatchResult {
 try {const next=initialState();if(typeof window!=='undefined')localStorage.setItem(KEY,JSON.stringify(next));current=next;emit();return {ok:true};}
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
