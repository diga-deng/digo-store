/* AI-authored design proposals. Research is a curated snapshot, not live scraping. */
(function(root){
const sources = [
{id:'cos',name:'COS · Best Sellers',url:'https://www.cos.com/en-us/women/most-popular',type:'official_collection',signal:'品牌官方热销栏目；非可比销量排名',observed:'2026-11-05',features:['圆弧廓形','结构针织','垂坠层次'],likes:null,views:null,reviews:null},
{id:'alex',name:'Alex Mill · Women’s Best Sellers',url:'https://www.alexmill.com/collections/womens-best-sellers',type:'official_collection',signal:'品牌官方热销栏目；非社交点赞数据',observed:'2026-11-05',features:['复古层搭','棉质衬衫','条纹开衫'],likes:null,views:null,reviews:null},
{id:'ganni',name:'GANNI · Striped Pointelle Cardigan',url:'https://www.ganni.com/en/cardigan-in-striped-pointelle-A1160003.html',type:'official_product',signal:'官方款式参考；没有已核实热度排名',observed:'2026-11-05',features:['镂空针织','短开衫','年轻学院'],likes:null,views:null,reviews:null},
{id:'arket',name:'ARKET · Women’s Most Popular',url:'https://www.arket.com/en-ww/women/clothing/most-popular/',type:'official_collection',signal:'品牌官方 Most popular 栏目；没有点赞率',observed:'2026-11-05',features:['弧形裤腿','松量','有纹理的日常层搭'],likes:null,views:null,reviews:null},
{id:'quince',name:'Quince · Linen Corset Midi Dress',url:'https://www.quince.com/women/100-european-linen-corset-midi-dress',type:'official_product',signal:'抓取页面显示 398 条评论；不是销量或点赞率',observed:'2026-11-05',features:['亚麻','收腰与宽摆对比','度假长度'],likes:null,views:null,reviews:398},
{id:'sezane',name:'Sézane · Marye Dress',url:'https://www.sezane.com/us-en/product/marye-dress/black-crochet-ecru-background',type:'official_product',signal:'官方款式参考；没有已核实热度排名',observed:'2026-11-05',features:['棉麻','海岸纹理','轻盈层次'],likes:null,views:null,reviews:null},
{id:'aritzia',name:'Aritzia · The Effortless Pant',url:'https://www.aritzia.com/us/en/product/the-effortless-pant%E2%84%A2/96000.html',type:'official_product',signal:'官方产品页；不声称为全网最热',observed:'2026-11-05',features:['高腰宽腿','垂顺梭织','通勤层搭'],likes:null,views:null,reviews:null},
{id:'snowpeak',name:'Snow Peak · Flexible Insulated Vest',url:'https://www.snowpeak.com/products/flexible-insulated-vest-2',type:'official_product',signal:'官方产品页；没有已核实点赞率',observed:'2026-11-05',features:['轻量层搭','日常户外','实用口袋'],likes:null,views:null,reviews:null}
];
const brands = [
{id:'form',name:'FORM',num:'01',line:'建筑感极简 / 结构针织',collection:'Quiet structure',story:'让衣服像空间一样，有支撑，也有留白。',colors:['#d8d1c3','#68695e','#292c2b'],tags:['gallery','work','minimal'],scene:'gallery',refs:['cos','arket'],forbidden:['装饰性大标识','复杂印花'],open:false},
{id:'afterclass',name:'AFTERCLASS',num:'02',line:'年轻新学院 / 趣味复古',collection:'Not quite uniform',story:'从下课铃，到唱片店，再到晚一点的咖啡。',colors:['#7c3036','#d6b75d','#253b4c'],tags:['campus','cafe','playful'],scene:'campus',refs:['alex','ganni'],forbidden:['校徽与品牌徽章复制','标志性纽扣复制'],open:false},
{id:'sunday',name:'SUNDAY DEPT.',num:'03',line:'中性松弛 / 精致街头',collection:'A slower city',story:'没有紧迫行程的一天，宽松但不潦草。',colors:['#b8b3a2','#708077','#3b4244'],tags:['city','cafe','relaxed'],scene:'coffee',refs:['arket','alex'],forbidden:['夸张街头标语','刻意破坏'],open:false},
{id:'solaire',name:'SOLAIRE',num:'04',line:'海岸艺术 / 轻盈度假',collection:'Lunch by the light',story:'光、陶器、海风，还有一顿不赶时间的午餐。',colors:['#c0785c','#e8dfc9','#8caaa5'],tags:['coast','terrace','art'],scene:'coast',refs:['quince','sezane'],forbidden:['复制刺绣图案','未经测试的防晒宣称'],open:false},
{id:'city',name:'CITY AFTER DARK',num:'05',line:'都市穿搭 / 日夜转换',collection:'The second half',story:'办公室的一天结束了，你的一天还没有。',colors:['#353c4c','#735563','#b8b5ab'],tags:['work','dinner','city'],scene:'dinner',refs:['aritzia','cos'],forbidden:['牺牲活动量的塑形','复制专属产品名称'],open:false},
{id:'open',name:'OPEN PROPOSAL',num:'06',line:'开放提案 / 非最终品牌',collection:'Fold / unfold',story:'一项临时研究：让围裹与折叠，为同一件衣服增加用法。',colors:['#a492b7','#d8c9ac','#525163'],tags:['art','gallery','studio'],scene:'studio',refs:[],forbidden:['未经主理人批准定为第六品牌'],open:true},
{id:'vale',name:'VALE & RIDGE',num:'07',line:'经典松弛 / 山系轻户外',collection:'A softer outside',story:'从木屋早餐，到公园散步；不用把生活穿成远征。',colors:['#7a8168','#b6a181','#e1d9c5'],tags:['cabin','park','relaxed'],scene:'cabin',refs:['snowpeak','arket'],forbidden:['未经实测的防水保暖等级','极限运动承诺'],open:false}
];
const scenes = [
{id:'gallery',title:'A quiet opening',cn:'午后的画廊',setting:'石材、低矮座椅、斜落的光',tags:['gallery','art','minimal'],kind:'gallery',weather:'室内 / 干燥',palette:['#d7d2c8','#a4a296','#f3eee4']},
{id:'campus',title:'After the last class',cn:'下课后的唱片咖啡店',setting:'木质书架、唱片、共用长桌',tags:['campus','cafe','playful'],kind:'cafe',weather:'室内 / 日常',palette:['#d0bda1','#8b664f','#ede3cd']},
{id:'coffee',title:'No plans, just coffee',cn:'周末的街角书店',setting:'布艺沙发、绿植、一杯慢咖啡',tags:['city','cafe','relaxed'],kind:'cafe',weather:'室内为主 / 日常',palette:['#c2c6b6','#7f8b79','#ece9dd']},
{id:'coast',title:'Stay for lunch',cn:'海岸露台的午餐',setting:'石灰墙、陶器、亚麻桌布',tags:['coast','terrace','art'],kind:'coast',weather:'温暖干燥 / 非性能建议',palette:['#d8bba4','#91aaa3','#f0e2cb']},
{id:'dinner',title:'One more place to go',cn:'下班后的晚餐',setting:'深色木桌、弧形灯、窗外夜色',tags:['work','dinner','city'],kind:'night',weather:'城市室内 / 日夜转换',palette:['#727583','#343b48','#c6b9a1']},
{id:'studio',title:'Something taking shape',cn:'开放工作室',setting:'折叠纸、样布、可移动的桌台',tags:['studio','art','gallery'],kind:'studio',weather:'室内 / 提案展示',palette:['#c1b5ce','#8f849f','#ece4d6']},
{id:'cabin',title:'Outside, gently',cn:'木屋与林间散步',setting:'木平台、帆布椅、远处的山',tags:['cabin','park','relaxed'],kind:'cabin',weather:'轻户外示意 / 无防护承诺',palette:['#b6bea3','#74846b','#e3dbc6']}
];
/* style, name, zh, category, fabric hypothesis, change, engineering risk */
const rows = {
form:[['01','Offset Fold Top','偏轴折面针织上衣','top','紧密双面针织，350–420 g/m²；成分与回弹待选料','偏轴覆片、低立领与分离式侧固定；不用参考款的圆形开衫结构','折面塌陷、领口穿脱与袖窿活动量'],['02','Arc Seam Trouser','弧线拼片长裤','pants','羊毛混纺斜纹，240–300 g/m²；垂坠待测','弧线侧片、内移袋位、后腰微调袢；非单纯换色','左右拼片平衡、胯部余量与面料悬垂'],['03','Plane Cropped Jacket','折面短外套','jacket','双面毛呢候选，380–450 g/m²；结构支撑待测','无驳头折面门襟与箱形背片，短衣长配弧线裤','前襟厚度、肩线支撑与里布余量']],
afterclass:[['01','Offbeat Rugby','错拍学院领上衣','polo','棉质珠地或双面布，250–300 g/m²','非对称分区配色、加宽领尖与短门襟；无校徽','色牢度、深浅拼色沾色与领部回缩'],['02','Notebook Cardigan','页边撞色开衫','cardigan','棉混纺针织，240–300 g/m²；机号待工厂评估','页边式局部窄撞色、方形贴袋、普通素面纽扣；不复制条纹序列','开襟拉长、纽扣拉力和口袋下坠'],['03','Margin Pleat Skirt','错位折页半裙','skirt','棉涤斜纹候选，220–270 g/m²','单侧三层刀褶与可调搭袢；长度按试穿确认','褶裥回弹、坐姿遮蔽和腰头稳定']],
sunday:[['01','Backfold Overshirt','背褶宽松衬衫','shirt','棉质细斜纹，180–230 g/m²','横向背褶、低肩与不等高双袋；侧摆留活动口','肩宽平衡、洗后扭斜及中性尺码覆盖'],['02','Curve Utility Pant','曲线口袋弧形裤','pants','棉麻或棉斜纹，240–290 g/m²','弧线裁片与内藏调节腰带，取消外露工装大袋','膝位弧度、袋口变形和缩率'],['03','Texture Crew','细纹短身圆领衫','sweater','棉混纺小颗粒针织，280–330 g/m²','短身宽摆、偏移肩缝与细窄领边；区别于普通长身毛衣','起球、领圈回弹与横向伸长']],
solaire:[['01','Tide Panel Dress','潮线拼片连衣裙','dress','亚麻黏胶候选，180–220 g/m²；透视待实测','宽肩带船领、弧线插片和后中拉链；不复制束身胸衣结构','透视、腋下贴合、接缝滑移和洗后尺寸'],['02','Sunline Open Knit','光线镂空针织衫','polo','棉麻混纺纱；克重与组织待针织厂试片','竖向宽窄组织块、无标识短门襟；不使用现有刺绣图案','勾丝、透明度与组织横向拉伸'],['03','Terrace Wrap Skirt','露台围裹长裙','skirt','亚麻棉候选，190–240 g/m²','内藏安全扣、斜向围裹边及单侧系带；降低走动暴露','风中覆盖量、系带拉力与褶皱表现']],
city:[['01','Shift Seam Blazer','转折腰线西装','jacket','垂顺精纺混纺，240–290 g/m²','无领折线前襟、低腰隐形调节袢；同一件日夜两种松量','肩袖活动量、扣合稳定与熨烫痕'],['02','Afterhours Shell','斜领垂褶上衣','top','哑光缎或黏胶斜纹，150–190 g/m²','斜领小垂褶与双层肩带，不沿用参考裤款结构','领口走光、接缝滑移和里层长度'],['03','Interval Trouser','间奏宽腿西裤','pants','羊毛涤混纺候选，240–290 g/m²','双向收省、后腰调节与裤脚隐形开衩；独立版型开发','后裆平衡、坐姿松量和垂顺度']],
open:[['01','Fold Study Vest','折叠研究背心','vest','棉斜纹候选，230–280 g/m²','临时提案：侧片折叠、三档扣位、无独特品牌符号','调节结构舒适性；需先批准品牌方向'],['02','Wrap Study Skirt','围裹研究裙','skirt','再生涤混纺候选；成分来源未核实','临时提案：双层围裹与错位开口；不作可持续宣称','覆盖量与面料证明；需先批准品牌方向'],['03','Panel Study Shirt','拼片研究衬衫','shirt','棉府绸候选，140–180 g/m²','临时提案：可折袖口与偏移后片；仅用于提案讨论','扣位、洗后变形；需先批准品牌方向']],
vale:[['01','Contour Liner Vest','等高线轻夹棉背心','vest','锦纶棉感表布与薄填充；厚度待试样','错层侧袋、浅V领与弧线绗缝；不沿用品牌填充材料名称','填充迁移、绗缝缩量与层搭松量'],['02','Trail Table Shirt','木屋格纹衬衫','shirt','棉质小格面料，180–220 g/m²；图案需自制','原创细格节奏、后背通活动褶、隐藏笔袋','格纹对位、耐磨与洗后缩率'],['03','Weekend Pleat Pant','周末折膝长裤','pants','棉锦混纺候选，210–260 g/m²','膝部小折、锥形裤脚与内藏收口；非专业登山裤','屈膝活动、袋口牢度和耐磨']]
};
const products = brands.flatMap(b=>rows[b.id].map((r,i)=>({id:b.id.toUpperCase()+'-'+r[0],brand:b.id,name:r[1],cn:r[2],kind:r[3],material:r[4],difference:r[5],risk:r[6],color:b.colors[i],tags:b.tags,refs:b.refs,version:'0.1',status:'concept',baseSize:'US 4 / EU 36 — fit block not validated',supplierSku:null,patternApproval:null,sampleApproval:null,capacityEvidence:null,rightsReview:null,price:null,allowPayment:false}))); 
const data = {version:'0.1.0',researchDate:'2026-11-05',sources,brands,scenes,products};
if(typeof module!=='undefined'&&module.exports)module.exports=data;else root.DIGO_DATA=data;
})(typeof window!=='undefined'?window:globalThis);
