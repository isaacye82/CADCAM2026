import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
export async function nurbsDocument(){
 const [html,css,license,bundle]=await Promise.all([readFile('src/nurbs/page.html','utf8'),readFile('src/nurbs/style.css','utf8'),readFile('node_modules/three/LICENSE','utf8'),build({entryPoints:['src/nurbs/app.js'],bundle:true,minify:true,format:'iife',target:'es2020',write:false,legalComments:'inline'})]);
 return html.replace('__STYLE__',css).replace('__SCRIPT__',()=>bundle.outputFiles[0].text.replace(/[ \t]+$/gm,'').replace(/<\/script/gi,'<\\/script')).replace('__LICENSE__',license.replace(/--/g,'—'));
}
