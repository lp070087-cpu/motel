import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reducer } from '../lib/domain';
test('walk-in without name preserves the blank name, selected period and Uber arrival',()=>{
 const state=initialState(),room=state.rooms.find(r=>r.status==='available')!;
 const now=new Date().toISOString();
 const next=reducer(state,{type:'CHECK_IN',roomId:room.id,guestName:'  ',hours:6,arrivalMode:'uber',source:'walkin',now});
 const stay=next.stays[0];
 assert.equal(stay.guestName,'');assert.equal(stay.arrivalMode,'uber');assert.equal(stay.source,'walkin');
 assert.equal(stay.roomId,room.id);assert.equal(stay.rate,room.rate+3*room.extraHourRate);
 assert.equal(Date.parse(stay.expectedOut)-Date.parse(stay.checkIn),6*3600000);
 assert.throws(()=>reducer(next,{type:'CHECK_IN',roomId:room.id,guestName:'',now}),/ativa/);
});
test('anonymous walk-in still checks plate and period; online name remains required',()=>{
 const state=initialState(),room=state.rooms.find(r=>r.status==='available')!;
 assert.throws(()=>reducer(state,{type:'CHECK_IN',roomId:room.id,guestName:'',arrivalMode:'own'}),/placa/);
 assert.throws(()=>reducer(state,{type:'CHECK_IN',roomId:room.id,guestName:'',hours:0}),/quantidade|valor|positivo/i);
 assert.throws(()=>reducer(state,{type:'CHECK_IN',roomId:room.id,guestName:'',source:'online'}),/nome/);
 const reservation=state.reservations[0];
 assert.throws(()=>reducer(state,{type:'CHECK_IN',roomId:reservation.roomId,reservationId:reservation.id,guestName:''}),/nome/);
});
