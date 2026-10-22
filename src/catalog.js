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
{id:10,slug:'10.bezier',title:'Bezier 曲线综合实验',group:'曲线与曲面',desc:'自由组合曲线构造、递推、切矢与活动标架，探索曲率和挠率。',tags:['de Casteljau','活动标架','曲率与挠率']}
];
export const pages=[...lessons];
