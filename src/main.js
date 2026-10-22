import {lessons,pages} from './catalog.js';
import {$,el} from './ui.js';
import {artwork} from './thumbnails.js';
import {barycentricDemo} from './modules/barycentric.js';
import {matrixDemo} from './modules/matrix.js';
import {kdDemo} from './modules/kd.js';
import {viewDemo,pipelineDemo} from './modules/observation.js';
import {lightingDemo} from './modules/lighting.js';
import {arcDemo,curveDemo,surfaceDemo} from './modules/differential.js';
import {bezierDemo} from './modules/bezier.js';
import {bezierSurfaceDemo} from './modules/bezier-surface.js';
const slug=document.body.dataset.page;
if(slug==='home'){let query='',category='全部';const render=()=>{const cards=$('#cards');cards.replaceChildren();const list=lessons.filter(l=>(category==='全部'||l.group===category)&&`${l.title}${l.desc}${l.tags.join(' ')}${l.id}`.toLowerCase().includes(query.toLowerCase()));for(const l of list){const article=el('article',{class:'card'},cards);el('div',{class:'thumb',html:artwork(l.id)+`<span class="card-no">EXPERIMENT ${String(l.id).padStart(2,'0')}</span>`},article);const body=el('div',{class:'card-body'},article);el('small',{text:l.group},body);el('h3',{text:l.title},body);el('p',{text:l.desc},body);const tags=el('div',{class:'tags'},body);l.tags.forEach(t=>el('span',{class:'tag',text:t},tags));const links=el('div',{class:'card-links'},body);el('a',{href:`courses/${l.slug}.html`,text:'进入交互实验 →'},links);}$('#result-count').textContent=`${list.length} / ${lessons.length} 个作业`;if(!list.length)el('p',{class:'empty',text:'没有匹配的作业，请尝试其他关键词。'},cards);};$('#search').addEventListener('input',e=>{query=e.target.value.trim();render();});for(const c of ['全部',...new Set(lessons.map(l=>l.group))]){const b=el('button',{text:c,class:c===category?'active':'',onclick:()=>{category=c;for(const n of $('#filters').children)n.classList.toggle('active',n===b);render();}},$('#filters'));}render();}
else{const disclosure=$('#control-disclosure'),portraitLayout=matchMedia('(max-width:740px)');if(disclosure){disclosure.open=!portraitLayout.matches;portraitLayout.addEventListener('change',e=>disclosure.open=!e.matches);}const page=pages.find(p=>p.slug===slug);const ctx={page,stage:$('#stage'),side:$('#side'),readout:$('#readout'),info:$('#theory'),instructions:$('#instructions')};const handlers={1:barycentricDemo,2:matrixDemo,3:kdDemo,4:viewDemo,5:pipelineDemo,6:lightingDemo,7:arcDemo,8:curveDemo,9:surfaceDemo,10:bezierDemo,11:bezierSurfaceDemo};try{handlers[page.id](ctx);document.body.dataset.ready='true';}catch(e){console.error(e);el('div',{class:'error',text:'此演示需要支持 WebGL2 的浏览器和硬件加速。请在新版 Chrome、Edge 或 Firefox 中打开，并确认已启用硬件加速。'},ctx.stage);document.body.dataset.ready='error';}}
