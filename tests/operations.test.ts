import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,migrateState,reducer,stockFor,validPlate,type Action,type MotelState} from '../lib/domain';
const now='2026-10-18T15:00:00.000Z';
const run=(state:MotelState,action:Action)=>reducer(state,{...action,now});
test('network migration preserves historical records and aggregate inventory while adding 250 suites',()=>{
 const s=initialState();assert.equal(s.rooms.length,250);assert.equal(new Set(s.units.map(u=>u.city)).size,10);
 for(const u of s.units)assert.equal(s.rooms.filter(r=>r.unitId===u.id).length,25);
 const legacy=JSON.parse(JSON.stringify(s)) as MotelState;delete legacy.schemaVersion;delete legacy.unitStock;delete legacy.accessEvents;legacy.rooms=legacy.rooms.filter(r=>Number(r.id.split('-r')[1])<=12);
 const oldStays=JSON.stringify(legacy.stays),oldTransactions=JSON.stringify(legacy.transactions);const upgraded=migrateState(legacy);
 assert.equal(upgraded.rooms.length,250);assert.equal(JSON.stringify(upgraded.stays),oldStays);assert.equal(JSON.stringify(upgraded.transactions),oldTransactions);
 for(const p of upgraded.products)assert.equal(upgraded.units.reduce((sum,u)=>sum+stockFor(upgraded,u.id,p.id),0),p.stock);
 assert.equal(migrateState(upgraded),upgraded);
});
test('walk-in car entry uses its unit tariff, validates plate, and closes only the guest vehicle',()=>{
 let s=initialState();const r=s.rooms.find(r=>r.unitId==='u2'&&r.status==='available')!;
 assert.throws(()=>run(s,{type:'CHECK_IN',roomId:r.id,guestName:'Pessoa Demo',arrivalMode:'own',vehicle:{plate:'invalid',type:'carro'}}),/placa/);
 s=run(s,{type:'CHECK_IN',roomId:r.id,guestName:'Pessoa Demo',arrivalMode:'own',vehicle:{plate:'abc-1d23',type:'carro'},actor:'reception',actorUnitId:'u2',overnight:true});
 const t=s.stays[0];assert.equal(t.source,'walkin');assert.equal(t.unitId,'u2');assert.equal(t.vehicle?.plate,'ABC1D23');assert.equal(t.rate,r.overnightRate);assert.equal(t.checkIn,now);
 assert.throws(()=>run(s,{type:'CHECK_IN',roomId:r.id,guestName:'Outra Pessoa'}),/ativa/);
 s=run(s,{type:'ACCESS_ENTRY',unitId:'u2',roomId:r.id,stayId:t.id,mode:'uber'});const uber=s.accessEvents![0];
 s=run(s,{type:'CHECK_OUT',stayId:t.id});assert.equal(s.accessEvents!.find(v=>v.mode==='own')?.exitedAt,now);assert.equal(s.accessEvents!.find(v=>v.id===uber.id)?.exitedAt,undefined);
 s=run(s,{type:'ACCESS_EXIT',accessId:uber.id});assert.equal(s.accessEvents![0].exitedAt,now);assert.equal(run(s,{type:'ACCESS_EXIT',accessId:uber.id}),s);
 assert.ok(validPlate('ABC1234'));assert.ok(validPlate('ABC1D23'));assert.equal(validPlate('ABC12D3'),false);
});
test('Uber arrival does not create a stay, occupy a suite or launch a transaction',()=>{
 const initial=initialState(),r=initial.rooms.find(r=>r.status==='available')!;
 let s=run(initial,{type:'ACCESS_ENTRY',unitId:r.unitId,roomId:r.id,mode:'uber',observation:'Chegada fictícia'});
 assert.equal(s.stays.length,initial.stays.length);assert.equal(s.transactions.length,initial.transactions.length);assert.equal(s.rooms.find(v=>v.id===r.id)?.status,'available');
 s=run(s,{type:'CHECK_IN',roomId:r.id,guestName:'Pessoa Demo',arrivalMode:'uber'});s=run(s,{type:'LINK_ACCESS',accessId:s.accessEvents![0].id,stayId:s.stays[0].id});assert.equal(s.accessEvents![0].stayId,s.stays[0].id);
});
test('unit authorization applies across rooms, orders, services, stock, finance and portaria',()=>{
 let s=initialState();const room=s.rooms.find(r=>r.unitId==='u2'&&r.status==='available')!;
 s=run(s,{type:'CHECK_IN',roomId:room.id,guestName:'Pessoa Demo'});const t=s.stays[0];s=run(s,{type:'ORDER',stayId:t.id,productId:'p1',quantity:1});const order=s.orders[0];
 s=run(s,{type:'REQUEST_SERVICE',stayId:t.id,service:'Toalhas'});const service=s.services[0];
 for(const action of [{type:'CHECK_OUT',stayId:t.id},{type:'CONFIRM_ORDER',orderId:order.id},{type:'COMPLETE_SERVICE',serviceId:service.id},{type:'STOCK_IN',unitId:'u2',productId:'p1',quantity:3},{type:'EXPENSE',unitId:'u2',description:'Teste fictício',amount:10}] as Action[])assert.throws(()=>run(s,{...action,actor:'manager',actorUnitId:'u1'}),/outra unidade/);
 const other=stockFor(s,'u1','p1'),own=stockFor(s,'u2','p1');s=run(s,{type:'CONFIRM_ORDER',orderId:order.id,actor:'reception',actorUnitId:'u2'});assert.equal(stockFor(s,'u1','p1'),other);assert.equal(stockFor(s,'u2','p1'),own-1);
 s=run(s,{type:'ACCESS_ENTRY',unitId:'u2',roomId:room.id,mode:'uber'});assert.throws(()=>run(s,{type:'ACCESS_EXIT',accessId:s.accessEvents![0].id,actor:'reception',actorUnitId:'u1'}),/outra unidade/);
 assert.throws(()=>run(s,{type:'UPDATE_SETTINGS',settings:{lowStockThreshold:1},actor:'manager',actorUnitId:'u1'}),/proprietário/);
 assert.throws(()=>run(s,{type:'ADD_STAFF',unitId:'u1',name:'Perfil fictício',role:'owner',actor:'manager',actorUnitId:'u1'}),/proprietário/);
 assert.throws(()=>run(s,{type:'STOCK_IN',unitId:'u1',productId:'p1',quantity:1,actor:'manager',actorUnitId:'u1',actorId:'staff-manager-2'}),/vínculo/);
});
test('room count configuration preserves historical suites and retention preserves open entries',()=>{
 let s=initialState();s=run(s,{type:'CONFIGURE_UNIT',unitId:'u1',roomCount:30});assert.equal(s.rooms.filter(r=>r.unitId==='u1').length,30);
 s=run(s,{type:'CONFIGURE_UNIT',unitId:'u1',roomCount:25});assert.equal(s.rooms.filter(r=>r.unitId==='u1').length,25);
 assert.throws(()=>run(s,{type:'CONFIGURE_UNIT',unitId:'u1',roomCount:1}),/histórico/);
 const r=s.rooms.find(r=>r.unitId==='u1'&&r.status==='available')!;s=run(s,{type:'ACCESS_ENTRY',unitId:'u1',roomId:r.id,mode:'uber'});const open=s.accessEvents![0];
 s.accessEvents!.push({...open,id:'closed-old',enteredAt:'2025-01-01T00:00:00Z',exitedAt:'2025-01-01T01:00:00Z'});
 s=run(s,{type:'PRUNE_ACCESS',unitId:'u1'});assert.equal(s.accessEvents!.length,1);assert.equal(s.accessEvents![0].id,open.id);
});
