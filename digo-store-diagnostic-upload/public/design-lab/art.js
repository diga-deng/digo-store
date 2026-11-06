(function(root){
function garment(p,back=false){
const c=p.color, stroke='#393934', pale='#eee9de';let shape='',detail='';
const line=(d)=>`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.5" opacity=".65"/>`;
const buttons=()=>[100,125,150,175,200].map(y=>`<circle cx="120" cy="${y}" r="2.3" fill="${stroke}"/>`).join('');
if(p.kind==='pants'){
shape='M65 38 L175 38 L181 106 Q201 172 184 274 L133 274 L122 142 L112 274 L59 274 Q41 168 61 104 Z';
detail=line('M65 55H175 M120 55V132 M75 58Q79 102 64 119 M165 58Q160 100 178 118 M87 66L78 259 M153 66L163 259');
if(p.brand==='form'||p.brand==='sunday')detail+=line('M70 75 Q40 155 70 258 M170 75Q200 155 170 258');
if(p.brand==='vale')detail+=line('M65 170L108 181 M135 181L178 170');
}else if(p.kind==='skirt'){
const h=p.brand==='afterclass'?215:274;
shape=`M74 45 L166 45 Q171 130 202 ${h} L38 ${h} Q69 125 74 45Z`;
detail=line(`M73 60H168 M142 60L85 ${h-5} M82 64L60 ${h-6}`);
if(p.brand==='afterclass')detail+=line('M132 62L136 209 M148 64L162 209 M162 70L187 209');
else detail+=line(`M75 61Q170 85 178 130 M169 75Q207 79 204 137`);
}else if(p.kind==='dress'){
shape='M84 32L106 32L106 57L134 57L134 32L156 32L160 95L148 125Q165 194 205 276L35 276Q75 193 91 125L80 95Z';
detail=line('M89 122Q120 136 151 122 M94 83L103 126Q88 197 70 268 M145 80L137 125Q151 194 170 269');
}else if(p.kind==='vest'){
shape='M76 44L102 35L120 66L138 35L166 44L162 91L182 106L180 235L60 235L58 106L78 91Z';
detail=line('M120 68V233 M72 152H108V191H72Z M134 163H169V203H134Z')+buttons();
if(p.brand==='vale')detail+=[100,124,150,179,210].map(y=>line(`M63 ${y} Q120 ${y+18} 177 ${y}`)).join('');
else detail+=line('M66 103L107 231 M173 107L137 231');
}else if(p.kind==='jacket'){
shape='M72 48L104 34L120 52L136 34L168 48L209 104L225 204L194 215L169 136L178 242L62 242L71 137L46 215L15 204L31 104Z';
detail=line('M104 35L88 97L112 118L120 217 M136 35L152 98L128 116 M120 130V240 M77 171L105 167 M135 167L163 171 M70 137L74 229 M170 137L166 229');
if(p.brand==='form')detail=line('M105 35L158 101L121 137L119 240 M72 136L75 230 M168 136L166 230 M75 176L107 172 M137 174L163 170');
}else if(p.kind==='top'){
shape=p.brand==='city'?'M76 53L98 39L146 51L167 66L163 103L178 235L60 235L77 107Z':'M75 60L102 40L102 23L139 23L139 40L164 60L157 102L177 230L63 230L81 102Z';
detail=p.brand==='city'?line('M98 40Q115 112 164 68 M92 49Q112 128 158 88 M78 125Q120 146 166 120'):line('M105 45L163 113L111 203L76 107 M113 52L143 114L113 173 M107 29V41 M131 29V41');
}else{
shape='M73 52L100 37Q120 50 140 37L167 52L210 116L219 218L190 222L164 132L175 235L65 235L76 132L50 222L21 218L30 116Z';
if(p.kind==='polo'){
shape='M73 52L101 36L120 54L139 36L167 52L207 113L176 140L161 117L175 235L65 235L79 117L64 140L33 113Z';
detail=line('M101 37L89 74L115 65L120 95L125 65L150 74L139 37 M120 55V104');
if(p.brand==='afterclass')detail+=`<path d="M44 105L193 105L177 138L162 119L166 156H72L79 119L64 139Z" fill="${pale}" opacity=".75"/>`+line('M120 57V105');
if(p.brand==='solaire')detail+=[87,104,136,153].map(x=>line(`M${x} 108V225`)).join('');
}else if(p.kind==='cardigan'){
detail=line('M101 38L120 95L139 38 M120 95V233 M72 164H105V203H72Z M135 164H168V203H135Z')+buttons()+`<path d="M100 39L120 95L139 39M120 95V234" fill="none" stroke="${pale}" stroke-width="6"/>`;
}else if(p.kind==='shirt'){
detail=line('M100 38L91 75L115 63L120 88L125 63L149 75L140 38 M120 75V235 M74 102H105V141H74Z M137 112H166V151H137Z M24 203L48 206 M193 206L216 203')+buttons();
if(p.brand==='vale')detail+=[83,98,143,158].map(x=>line(`M${x} 82V228`)).join('')+[150,178,205].map(y=>line(`M68 ${y}H170`)).join('');
}else detail=line('M100 38Q120 73 140 38 M66 216H173 M25 203L49 206 M192 206L216 203');
}
if(back){detail=line(p.kind==='pants'?'M65 55H175 M120 56V138 M74 84H106V111H74Z M135 84H166V111H135Z':p.kind==='skirt'?'M74 60H166 M120 60V130':p.kind==='dress'?'M105 53H135 M120 57V142 M93 123H148':'M78 77H163 M120 78V226');}
return `<g stroke-linejoin="round"><path d="${shape}" transform="translate(3 5)" fill="#000" opacity=".07"/><path d="${shape}" fill="${c}" stroke="${stroke}" stroke-width="1.6"/>${detail}<path d="${shape}" fill="url(#weave)" opacity=".22"/></g>`;
}
const defs='<defs><pattern id="weave" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 1H5M1 0V5" stroke="#fff" stroke-width=".6" opacity=".5"/></pattern></defs>';
function flat(p,back=false){return `<svg viewBox="0 0 240 300" role="img" aria-label="${p.id} ${back?'back':'front'} concept flat">${defs}${garment(p,back)}</svg>`;}
function scene(s,ps){
const [a,b,c]=s.palette;let bg=`<rect width="1000" height="680" fill="${c}"/><path d="M0 510H1000V680H0Z" fill="${a}"/><path d="M0 510H1000" stroke="${b}" opacity=".5"/>`;
if(s.kind==='coast'||s.kind==='cabin'){
bg+=`<path d="M60 70H445V405H60Z" fill="${a}"/><path d="M60 310Q160 240 230 305T445 280V405H60" fill="${b}"/><circle cx="345" cy="150" r="48" fill="${c}"/>`;
if(s.kind==='cabin')bg+=`<path d="M60 330L155 160L245 330L330 210L445 345V405H60Z" fill="${b}"/><path d="M0 30V510M40 30V510M465 30V510" stroke="${b}" stroke-width="8" opacity=".2"/>`;
}else if(s.kind==='night'){
bg+=`<rect x="65" y="65" width="365" height="365" rx="150" fill="${b}"/>`+[95,155,215,275,335].map((x,i)=>`<path d="M${x} 400V${230-i*14}H${x+37}V400Z" fill="${a}"/>`).join('');
}else if(s.kind==='cafe'){
bg+=`<rect x="60" y="65" width="365" height="340" fill="${a}"/>`+[150,245,340].map(y=>`<path d="M65 ${y}H420" stroke="${b}" stroke-width="7"/>`+[0,1,2,3,4,5,6].map((n)=>`<rect x="${85+n*45}" y="${y-60-(n%2)*15}" width="26" height="${60+(n%2)*15}" fill="${n%2?b:c}" opacity=".8"/>`).join('')).join('');
}else{
bg+=`<rect x="70" y="75" width="340" height="310" fill="${a}"/><path d="M115 330L235 120L365 330Z" fill="${b}" opacity=".55"/><circle cx="250" cy="216" r="66" fill="${c}" opacity=".65"/>`;
}
bg+=`<path d="M90 465Q90 420 140 420H275Q320 420 320 465V546H90Z" fill="${b}" opacity=".8"/><path d="M105 546V575M305 546V575" stroke="${b}" stroke-width="8"/><ellipse cx="345" cy="505" rx="73" ry="18" fill="${c}" stroke="${b}"/><path d="M345 519V580" stroke="${b}" stroke-width="7"/><path d="M335 493V473H354V493" fill="${b}"/>`;
const people=ps.slice(0,3).map((p,i)=>{
const x=480+i*168,y=i===1?207:230,scale=.7;
const head=`<ellipse cx="120" cy="-11" rx="20" ry="28" fill="#bfa18c"/><path d="M100 -12Q91 -50 119 -47Q147 -44 141 -3L131 -25L104 -30Z" fill="#464039"/><path d="M111 9V37H130V9" fill="#bfa18c"/>`;
const legs=`<path d="M86 220L96 398H112L120 257L129 398H146L155 220Z" fill="${b}"/><path d="M96 395L76 414H113L112 395M129 395V414H165L145 395" fill="#353531"/>`;
let body=head+legs;
if(p.kind==='pants')body+=`<path d="M77 40L105 28L135 28L163 40L174 142H66Z" fill="${c}" stroke="${b}"/><g transform="translate(0 109) scale(1 .99)">${garment(p)}</g>`;
else if(p.kind==='skirt')body+=`<path d="M78 41L104 29L136 29L161 41L171 144H69Z" fill="${c}" stroke="${b}"/><g transform="translate(0 109) scale(1 .95)">${garment(p)}</g>`;
else if(p.kind==='dress')body+=`<g transform="scale(1 1.35)">${garment(p)}</g>`;
else body+=garment(p);
return `<g transform="translate(${x-84} ${y}) scale(${scale})">${body}</g>`;
}).join('');
return `<svg viewBox="0 0 1000 680" role="img" aria-label="Illustrated design study for ${s.title}">${defs}${bg}<ellipse cx="665" cy="553" rx="245" ry="28" fill="${b}" opacity=".1"/>${people}<text x="40" y="635" font-family="Georgia,serif" font-size="25" fill="${b}">${s.title}</text></svg>`;
}
root.DIGO_ART={flat,scene};
})(window);
