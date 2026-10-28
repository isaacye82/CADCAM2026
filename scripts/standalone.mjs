import {readFile} from 'node:fs/promises';
import {experimentLabel} from '../src/catalog.js';
export async function standaloneDocument(page,prev,next){
  let html=await readFile(`src/standalone/${page.slug}.html`,'utf8');
  const css=await readFile('src/standalone/site.css','utf8');
  const label=experimentLabel(page);
  const navigation=`<nav class="sitecourse-header" aria-label="网站导航"><a class="sitecourse-brand" href="../index.html">◈ CAD/CAM <span>LAB</span></a><a href="../index.html#catalog">返回课程目录</a></nav>`;
  const footer=`<nav class="sitecourse-footer" aria-label="前后实验导航"><a href="${prev?prev.slug+'.html':'../index.html'}">← ${prev?experimentLabel(prev)+' · '+prev.title:'课程目录'}</a><a href="${next?next.slug+'.html':'../index.html'}">${next?experimentLabel(next)+' · '+next.title:'课程目录'} →</a></nav>`;
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${page.title} | CAD/CAM LAB</title>`)
    .replace('</head>',`<meta name="description" content="${page.desc}"><meta name="theme-color" content="#0c111b"><style>${css}</style></head>`)
    .replace('<body>',`<body data-page="${page.slug}">${navigation}`)
    .replace('<header>',`<header><div class="sitecourse-label">${label} / 曲线与曲面</div>`)
    .replace('</body>',`${footer}<script>document.body.dataset.ready='true';</script></body>`);
  return html;
}
