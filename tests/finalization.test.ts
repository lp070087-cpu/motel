import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initialState, reducer, cleaningChecklist, stockFor } from '../lib/domain';
import { housekeepingView, housekeepingStatuses } from '../lib/housekeeping';
import { roomProfile, unitImage } from '../lib/catalog';
import metadata from '../lib/photo-metadata.json';

test('housekeeping filters count assigned suites in all five states and preserve selection after release',()=>{
 const state=initialState();
 for(const unit of state.units){
  const staff=state.staff.find(s=>s.unitId===unit.id&&s.role==='housekeeper')!;
  const view=housekeepingView(state,unit.id,staff.id,'housekeeper','queue');
  assert.ok(view.rooms.length>0);assert.ok(view.rooms.every(r=>r.unitId===unit.id&&r.assignedTo===staff.id));
  for(const status of housekeepingStatuses){
   const filtered=housekeepingView(state,unit.id,staff.id,'housekeeper',status.id);
   assert.equal(filtered.visible.length,view.counts[status.id]);assert.ok(filtered.visible.every(r=>r.status===status.id));
  }
  assert.equal(view.pending,view.counts.dirty+view.counts.cleaning+view.counts.inspection);
 }
 assert.equal(housekeepingView(state,'u1','unknown','housekeeper','queue').rooms.length,0);
});

test('anonymous operational journey across ten units: consumption, checkout, restock, maintenance and authorized inspection',()=>{
 for(const unit of initialState().units){
  let state=initialState();const room=state.rooms.find(r=>r.unitId===unit.id&&r.status==='available')!;
  const staff=state.staff.find(s=>s.id===room.assignedTo)!;
  const reception=state.staff.find(s=>s.unitId===unit.id&&s.role==='reception')!;
  const actor={actor:'reception' as const,actorId:reception.id,actorUnitId:unit.id};
  const cleaner={actor:'housekeeper' as const,actorId:staff.id,actorUnitId:unit.id};
  state=reducer(state,{type:'CHECK_IN',roomId:room.id,guestName:'',arrivalMode:'uber',...actor});
  const stay=state.stays[0];const stock=stockFor(state,unit.id,'p1');
  state=reducer(state,{type:'ORDER',stayId:stay.id,productId:'p1',quantity:2,...actor});
  state=reducer(state,{type:'CONFIRM_ORDER',orderId:state.orders[0].id,...actor});
  assert.equal(stockFor(state,unit.id,'p1'),stock-2);
  state=reducer(state,{type:'EXTEND_STAY',stayId:stay.id,hours:1,...actor});
  state=reducer(state,{type:'CHECK_OUT',stayId:stay.id,...actor});
  const paid=state.transactions[0].amount;
  assert.equal(paid,room.rate+room.extraHourRate+16);
  state=reducer(state,{type:'START_CLEANING',roomId:room.id,...cleaner});
  state=reducer(state,{type:'RECONCILE_MINIBAR',roomId:room.id,productId:'p1',quantity:3,...cleaner});
  assert.equal(state.transactions[0].amount,paid);assert.equal(state.reviews[0].status,'pending');
  state=reducer(state,{type:'RESTOCK_ROOM',roomId:room.id,productId:'p1',quantity:1,...cleaner});
  assert.equal(stockFor(state,unit.id,'p1'),stock-3);
  state=reducer(state,{type:'OPEN_TICKET',roomId:room.id,title:'Verificar luminária da suíte',priority:'medium',...cleaner});
  const ticket=state.tickets[0];
  state=reducer(state,{type:'FINISH_CLEANING',roomId:room.id,checklist:cleaningChecklist,...cleaner});
  assert.equal(state.rooms.find(r=>r.id===room.id)?.status,'inspection');
  assert.throws(()=>reducer(state,{type:'INSPECT',roomId:room.id,...cleaner}),/gerência|recepção/);
  assert.throws(()=>reducer(state,{type:'INSPECT',roomId:room.id}),/chamados/);
  state=reducer(state,{type:'CLOSE_TICKET',ticketId:ticket.id});
  state=reducer(state,{type:'INSPECT',roomId:room.id});
  assert.equal(state.rooms.find(r=>r.id===room.id)?.status,'available');
  assert.equal(state.transactions[0].amount,paid);
 }
});

test('assigned housekeeping identity cannot operate another cleaners suite',()=>{
 const state=initialState(),room=state.rooms.find(r=>r.unitId==='u1'&&r.status==='dirty')!;
 const assigned=state.staff.find(s=>s.id===room.assignedTo)!;
 state.staff.push({...assigned,id:'other-cleaner',name:'Outra operadora fictícia'});
 assert.throws(()=>reducer(state,{type:'START_CLEANING',roomId:room.id,actor:'housekeeper',actorUnitId:'u1',actorId:'other-cleaner'}),/outra camareira/);
});

test('large photographic surfaces use local high-resolution originals and every gallery file is present',()=>{
 const state=initialState();const dimensions=metadata as Record<string,{width:number;height:number}>;
 assert.equal(new Set(state.units.map(u=>unitImage(u.id))).size,10);
 for(const src of [...state.units.map(u=>unitImage(u.id)),...state.rooms.map(r=>roomProfile(r).image)]){
  assert.ok(dimensions[src].width>=1000,src);assert.ok(existsSync(resolve('public','.'+src)));
 }
 for(const room of state.rooms)for(const src of roomProfile(room).images)assert.ok(existsSync(resolve('public','.'+src)));
 const photo=readFileSync('components/Photo.tsx','utf8');
 assert.ok(photo.includes("from 'next/image'"));assert.ok(photo.includes('sizes={sizes}'));
});
