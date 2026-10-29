export const lessons=[
{id:1,slug:'1.convex-barycentric',title:'凸组合与重心坐标',group:'几何基础',desc:'从一个三角形出发，探索三个权重如何确定一个点的位置。',tags:['凸组合','面积坐标','交互拖动']},
{id:2,slug:'2.transformation-matrix',title:'变换矩阵',group:'变换与观察',desc:'编辑 4×4 齐次矩阵，观察变换、透视与斜投影阴影。',tags:['齐次坐标','仿射变换','斜投影']},
{id:3,slug:'3.kd-tree',title:'三维 KD 树',group:'空间算法',desc:'连接二叉树与空间划分，一步步追踪最近邻搜索。',tags:['空间划分','最近邻','回溯剪枝']},
{id:4,slug:'4.view-coordinate-system',title:'三维观察坐标系',group:'变换与观察',desc:'设置视点、目标与向上方向，亲手建立相机坐标系。',tags:['LookAt','正交基','相机视角']},
{id:5,slug:'5.viewing-pipeline',title:'三维观察流水线',group:'变换与观察',desc:'跟随一个顶点，从模型空间穿过矩阵，抵达屏幕。',tags:['MVP','齐次裁剪','视口映射']},
{id:6,slug:'6.realistic-rendering',title:'真实感图形显示',group:'光照与渲染',desc:'分离光照成分，对照 Gouraud 与 Phong 的高光表现。',tags:['隐藏面','光照模型','明暗处理']},
{id:7,slug:'7.arc-length-parameterization',title:'参数化与弧长',group:'曲线与曲面',desc:'让两颗点沿相同曲线运动，观察参数速度与实际速度。',tags:['自然参数','数值积分','等速运动']},
{id:8,slug:'8.curve-moving-frame',title:'曲线局部活动坐标系',group:'曲线与曲面',desc:'跟随 Frenet 标架，观察曲率圆、挠率与密切平面。',tags:['Frenet 标架','曲率','挠率']},
{id:9,slug:'9.surface-moving-frame',title:'曲面局部活动坐标系',group:'曲线与曲面',desc:'沿等参数线探索切平面、法向与曲面的主曲率。',tags:['等参数线','切平面','主曲率']},
{id:10,slug:'10.bezier',title:'Bezier 曲线综合实验',group:'曲线与曲面',desc:'自由组合曲线构造、递推、切矢与活动标架，探索曲率和挠率。',tags:['de Casteljau','活动标架','曲率与挠率']},
{id:11,slug:'11.bezier-surface',title:'Bézier 曲面与张量积构造',group:'曲线与曲面',desc:'编辑二维控制网格，对照三种光照，观察一条 Bézier 曲线如何扫掠成面。',tags:['Bernstein 基','张量积','线动成面']},
{id:12,slug:'12.bspline',title:'B 样条曲线与 de Boor 构造',group:'曲线与曲面',desc:'从独立分段走向统一参数域，编辑节点，探索基函数、心形造型与递推构造。',tags:['局部支撑','节点与连续性','de Boor']},
{id:13,slug:'13.nurbs',artwork:9,title:'NURBS 曲线与曲面',group:'曲线与曲面',desc:'调整权重与控制网格，探索精确圆锥曲线和航空航天曲面。',tags:['有理基函数','圆锥曲线','航空航天曲面']}
];
const surface=lessons.find(lesson=>lesson.id===11);
export const pages=lessons.flatMap(lesson=>lesson.id!==11?[lesson]:[
  {...lesson,experiment:'A'},
  {id:11,experiment:'B',slug:'11.bezier-interpolation',standalone:true,artwork:13,title:'Bézier 曲线插值与参数化',group:surface.group,desc:'给定型值点反求控制顶点，对照均匀参数化与弦长参数化产生的曲线差异。',tags:['型值点插值','Bernstein 矩阵','参数化对比']},
  {id:11,experiment:'C',slug:'11.bezier-tensor-product_surface',standalone:true,artwork:14,title:'Bézier 张量积曲面构造动画',group:surface.group,desc:'从控制网格逐层得到辅助控制点、等参数曲线和曲面点，对照两种构造顺序。',tags:['双三次曲面','分步构造','双视图对照']}
]);
export const experimentLabel=page=>`作业 ${page.id}${page.experiment?' · 实验 '+page.experiment:''}`;
