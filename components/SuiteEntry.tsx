'use client';
import Guest from './Guest';
export default function SuiteEntry({roomId}:{roomId:string}){
 return <Guest entryRoomId={roomId} onBack={()=>{window.location.href='/'}}/>;
}
