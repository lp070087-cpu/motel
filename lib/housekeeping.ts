import type { MotelState, Role, RoomStatus } from './domain';

export const housekeepingStatuses = [
 {id:'dirty',label:'Aguardando limpeza'}, {id:'cleaning',label:'Em limpeza'},
 {id:'inspection',label:'Aguardando inspeção'}, {id:'available',label:'Disponível'},
 {id:'maintenance',label:'Manutenção'},
] as const;
export type HousekeepingFilter = 'queue' | typeof housekeepingStatuses[number]['id'];
export function housekeepingView(state:MotelState,unitId:string,actorId:string,role:Role,filter:HousekeepingFilter) {
 const rooms=state.rooms.filter(r=>r.unitId===unitId&&(role!=='housekeeper'||r.assignedTo===actorId));
 const queue=(status:RoomStatus)=>['dirty','cleaning','inspection'].includes(status);
 const counts=Object.fromEntries(housekeepingStatuses.map(s=>[s.id,rooms.filter(r=>r.status===s.id).length])) as Record<typeof housekeepingStatuses[number]['id'],number>;
 return {rooms,counts,pending:rooms.filter(r=>queue(r.status)).length,
  visible:rooms.filter(r=>filter==='queue'?queue(r.status):r.status===filter)};
}
