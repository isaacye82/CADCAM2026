// Shared directional Phong reflection model, in view coordinates, for all three strategies.
export const reflection=`uniform vec3 lightDirection; uniform float specularStrength; uniform float shininess;
vec3 illuminate(vec3 p,vec3 normal){vec3 N=normalize(normal);vec3 L=normalize(mat3(viewMatrix)*lightDirection);vec3 V=normalize(-p);float d=max(dot(N,L),0.0);float s=d>0.0?pow(max(dot(reflect(-L,N),V),0.0),shininess):0.0;return vec3(0.19,0.62,0.68)*(0.18+0.72*d)+vec3(specularStrength*s);}`;
export function surfaceShaders(mode){const vertex=mode==='flat'?'lit=illuminate((modelViewMatrix*vec4(faceCenter,1.0)).xyz,normalMatrix*faceNormal);':mode==='gouraud'?'lit=illuminate(p.xyz,normalMatrix*normal);':'';return {
vertexShader:`${reflection}
attribute vec3 faceNormal; attribute vec3 faceCenter; attribute vec2 parameter;
varying vec3 lit; varying vec3 viewPos; varying vec3 viewNormal; varying vec2 uvParameter;
void main(){vec4 p=modelViewMatrix*vec4(position,1.0);viewPos=p.xyz;viewNormal=normalMatrix*normal;uvParameter=parameter;${vertex}gl_Position=projectionMatrix*p;}`,
fragmentShader:`${reflection}
uniform float sweep; uniform float sweepAxis; uniform bool wire;
varying vec3 lit; varying vec3 viewPos; varying vec3 viewNormal; varying vec2 uvParameter;
void main(){if(mix(uvParameter.y,uvParameter.x,sweepAxis)>sweep+0.00001)discard;
vec3 color=${mode==='phong'?'illuminate(viewPos,normalize(viewNormal))':'lit'};
gl_FragColor=vec4(wire?vec3(0.25,0.40,0.50):color,1.0);}`};}
