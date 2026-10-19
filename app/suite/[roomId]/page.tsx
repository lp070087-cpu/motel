import {notFound} from 'next/navigation';
import SuiteEntry from '../../../components/SuiteEntry';
export default async function SuitePage({params}:{params:Promise<{roomId:string}>}){
 const {roomId}=await params;
 if(!/^u(?:[1-9]|10)-r(?:[1-9]|[1-5][0-9]|60)$/.test(roomId))notFound();
 return <SuiteEntry roomId={roomId}/>;
}
