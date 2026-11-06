/* Deterministic prototype: evidence checks + scene matching, not an autonomous crawler or generative model. */
(function(root){
function likeRate(s){if(!s||!Number.isFinite(s.likes)||!Number.isFinite(s.views)||s.likes<0||s.views<=0||s.likes>s.views)return null;return s.likes/s.views;}
function matchScenes(p,data){return data.scenes.map(s=>({id:s.id,title:s.title,matchedTags:p.tags.filter(t=>s.tags.includes(t))})).filter(s=>s.matchedTags.length).sort((a,b)=>b.matchedTags.length-a.matchedTags.length||a.id.localeCompare(b.id));}
function evaluate(p,data){
if(!p||!data.products.some(x=>x.id===p.id))throw Error('Unknown style.');
const brand=data.brands.find(b=>b.id===p.brand);if(!brand)throw Error('Unknown brand.');
const refs=p.refs.map(id=>data.sources.find(s=>s.id===id));
const blockers=['真实供应商 SKU 与样布未确认','版师纸样、放码与合体样未批准','实物样衣与测试记录缺失','工厂报价、产能与交付窗口未确认','视觉与实物一致性、知识产权尚待人工审查'];
if(brand.open)blockers.unshift('第六品牌尚未定向：仅保留提案，不是已建立品牌');
if(refs.some(r=>!r))blockers.unshift('参考来源缺失');
/* No front-end boolean or simulated checkbox may authorize commerce. This MVP has no checkout adapter. */
return {styleId:p.id,revision:p.version,brand:brand.name,proposedScenes:matchScenes(p,data),research:refs.filter(Boolean).map(s=>({id:s.id,type:s.type,likeRate:likeRate(s)})),status:'concept_only',paymentEnabled:false,productionApproved:false,blockers,nextAction:brand.open?'先评审品牌提案，再确认面料与样衣路线':'向合作工厂申请真实样布与首轮技术评审',route:['top','polo','sweater','cardigan'].includes(p.kind)&&!p.material.includes('缎')?'针织厂先评审；横机成形款另需组织与机器程序':'梭织厂先评审；确认裁片、缝份与缝制能力'};
}
function run(data,ids){if(!Array.isArray(ids)||!ids.length)throw Error('Select at least one style.');return {runId:'local-'+new Date().toISOString(),mode:'curated-seed-rule-engine',researchAsOf:data.researchDate,liveResearch:false,generativeModelConnected:false,stages:['读取研究快照与品牌约束','检查款式档案与参考完整性','按场景标签匹配并给出理由','列出工程阻断项','输出仅概念展示清单'],results:[...new Set(ids)].map(id=>evaluate(data.products.find(p=>p.id===id),data)),warning:'This is a design-development prototype, not a manufacturing approval or an order.'};}
function brief(p,data){const r=evaluate(p,data);return {style:p,brand:data.brands.find(b=>b.id===p.brand),references:data.sources.filter(s=>p.refs.includes(s.id)),decision:r,requiredFactoryInputs:['面料 SKU、成分、克重、幅宽、弹性回复和缩率实测','工厂设备、可行工艺、MOQ、报价和交期','版师签名、纸样版本和样衣测量表'],technicalPackState:'设计评审简报；无已批准 POM / BOM / DXF，不可下单量产'};}
const api={likeRate,matchScenes,evaluate,run,brief};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DIGO_ENGINE=api;
})(typeof window!=='undefined'?window:globalThis);
