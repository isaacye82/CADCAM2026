import {bernsteinWeights,bernsteinBezier,bezierDerivativeOrder,cross,unit} from './math.js';
export const surfaceTypes={quadratic:{m:2,n:2,label:'双二次 (2,2) · 3×3'},cubic:{m:3,n:3,label:'双三次 (3,3) · 4×4'},quartic:{m:4,n:4,label:'双四次 (4,4) · 5×5'},mixed:{m:2,n:3,label:'混合次数 (2,3) · 3×4'}};
export function surfaceGrid(m,n){return Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>[-3+6*i/m,1.8*Math.sin(i/m*Math.PI)*Math.cos(j/n*Math.PI)+.5*Math.sin(j/n*Math.PI),-3+6*j/n]));}
// P[i][j]: i is U, j is V. All degrees use the same Bernstein evaluator.
export function surfacePoint(grid,u,v){const bu=bernsteinWeights(grid.length-1,u),bv=bernsteinWeights(grid[0].length-1,v);return [0,1,2].map(k=>grid.reduce((s,row,i)=>s+row.reduce((r,p,j)=>r+bu[i]*bv[j]*p[k],0),0));}
export function auxiliaryPoints(grid,t,direction='u'){return direction==='u'?grid.map(row=>bernsteinBezier(row,t)):grid[0].map((_,j)=>bernsteinBezier(grid.map(row=>row[j]),t));}
export function tensorPoint(grid,u,v,direction='u'){return bernsteinBezier(auxiliaryPoints(grid,direction==='u'?v:u,direction),direction==='u'?u:v);}
export function surfaceNormal(grid,u,v){const du=bezierDerivativeOrder(auxiliaryPoints(grid,v,'u'),u),dv=bezierDerivativeOrder(auxiliaryPoints(grid,u,'v'),v);const n=cross(dv,du);return Math.hypot(...n)>1e-12?unit(n):[0,1,0];}
