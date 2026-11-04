"use client";
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
export function JourneyActions({ product }: { product: Product }) {
  const [status,setStatus]=useState(''),[scene,setScene]=useState('');
  useEffect(()=>{setScene(new URLSearchParams(location.search).get('scene')||'');},[]);
  function add(edit=false){
    try{
      const world=JSON.parse(localStorage.getItem('digo-journeys-v2')||'{}');
      world.saved=Array.isArray(world.saved)?world.saved:[];
      const existing=world.saved.find((x:{key:string})=>x.key==='product:'+product.id);
      if(existing)existing.savedManually=true;
      else world.saved.unshift({key:'product:'+product.id,kind:'product',id:product.id,type:'catalog',title:product.name,snapshot:product,status:'liked',savedManually:true,group:'',at:Date.now()});
      if(edit){const id='pieces-'+product.id;world.boards=world.boards||{};world.boards[id]=world.boards[id]||{id,title:product.name+' · my combination',sceneId:scene||null,items:[{key:crypto.randomUUID(),id:product.id,type:'catalog',snapshot:product,selected:true,locked:false,owned:false}],history:[],future:[],budget:'',mood:'',color:''};}
      localStorage.setItem('digo-journeys-v2',JSON.stringify(world));
      if(edit)location.assign('/#/edit/pieces-'+product.id);else setStatus('Saved to your wardrobe on this device.');
    }catch{setStatus('Could not save. Your selection is unchanged. Please retry.');}
  }
  return <div className="journey-product-actions"><div><button className="button" onClick={()=>add()}>Save to wardrobe</button><button className="button" onClick={()=>add(true)}>Make it mine</button></div><p role="status">{status}</p>{scene&&<a className="text-link" href={'/#/scene/'+encodeURIComponent(scene)}>Back to the original moment →</a>}</div>;
}
