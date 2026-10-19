'use client';
import {useMotel} from '../lib/store';
import type {Role} from '../lib/domain';
export default function PrivilegeRules({role,actorId,actorUnitId}:{role:Role;actorId:string;actorUnitId:string}){
 const {state,dispatch}=useMotel();const rules=state.operations?.privilege;
 if(!rules||!['owner','manager'].includes(role))return null;
 return <section className="panel"><h3 className="bo-section-title">MOTEL Privilege · regras demonstrativas</h3><form className="bo-form" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const data=new FormData(form);const result=dispatch({type:'CONFIGURE_PRIVILEGE',brlPerPoint:Number(data.get('rate')),includeConsumption:data.get('consumption')==='on',benefits:rules.benefits.map(b=>({...b,cost:Number(data.get(b.id))})),actor:role,actorId,actorUnitId});const output=form.querySelector('output');if(output)output.textContent=result.ok?'Regras atualizadas para pagamentos futuros.':result.error??'Não foi possível atualizar.';}}>
 <label>Reais elegíveis por ponto<input type="number" name="rate" min="1" max="10000" step=".01" required defaultValue={rules.brlPerPoint}/></label><label className="bo-check"><input type="checkbox" name="consumption" defaultChecked={rules.includeConsumption}/>Incluir consumo confirmado no valor elegível</label>{rules.benefits.map(b=><label key={b.id}>{b.name} · custo em pontos<input type="number" name={b.id} min="1" step="1" required defaultValue={b.cost}/></label>)}<button type="submit">Salvar regras de pontos</button><output role="status"/></form><p className="bo-caption">Crédito apenas após pagamento, uma vez por transação. Estornos revertem os pontos; resgates são simulados.</p></section>;
}
