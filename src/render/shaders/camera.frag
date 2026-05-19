precision highp float;
uniform sampler2D uVideo; uniform float uTime; uniform vec2 uResolution; uniform vec2 uFinger; uniform float uStrength; uniform float uPinch; uniform float uSwipe; uniform float uTransition; uniform int uMode; uniform float uMirror;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
vec3 thermal(vec3 c,float n){ float l=dot(c,vec3(.299,.587,.114))+n*.25; return .55+.5*cos(6.28318*(vec3(.05,.36,.66)+l*vec3(1.0,.78,.55))); }
vec3 edge(sampler2D t,vec2 uv){ vec2 px=1./uResolution; vec3 c=texture2D(t,uv).rgb; vec3 r=texture2D(t,uv+vec2(px.x,0.)*2.).rgb; vec3 d=texture2D(t,uv+vec2(0.,px.y)*2.).rgb; return vec3(length(c-r)+length(c-d)); }
vec2 swirl(vec2 uv,vec2 c,float r,float a){ vec2 p=uv-c; float d=length(p); float m=smoothstep(r,0.,d); float s=a*m; float cs=cos(s),sn=sin(s); return c+mat2(cs,-sn,sn,cs)*p; }
void main(){
  vec2 uv=vUv; if(uMirror>.5) uv.x=1.-uv.x; vec2 f=vec2(uMirror>.5?1.-uFinger.x:uFinger.x,uFinger.y);
  float d=distance(uv,f); float m=smoothstep(.42,0.,d)*uStrength; vec2 dir=normalize(uv-f+1e-4);
  vec2 wuv=uv+dir*(sin(d*46.-uTime*5.)*.008+.055*uPinch)*m; wuv=swirl(wuv,f,.55,uPinch*4.2+uSwipe*.8);
  if(uMode==6) wuv=floor(wuv*vec2(80.,142.))/vec2(80.,142.);
  float tear=step(.88,hash(vec2(floor(uv.y*90.+uTime*18.),floor(uTime*12.))))*uSwipe*.025;
  if(uMode==8) wuv.x+=tear+sin(uv.y*80.+uTime*24.)*.01*uSwipe;
  vec3 col; float ca=.008*m+.012*uSwipe;
  col.r=texture2D(uVideo,wuv+vec2(ca,0)).r; col.g=texture2D(uVideo,wuv).g; col.b=texture2D(uVideo,wuv-vec2(ca,0)).b;
  float n=noise(uv*uResolution*.55+uTime*18.);
  if(uMode==2){ col=mix(col,vec3(.08,.16,.24)+col.bgr*1.15,.45); col+=vec3(.08,.16,.25)*sin((uv.y+uTime*.75)*90.)*.25; }
  if(uMode==3){ col=thermal(col,n); col+=vec3(1.,.16,.03)*m*.75; }
  if(uMode==4){ vec3 e=edge(uVideo,wuv); col=vec3(.02,.18,.12)+e*vec3(.1,1.,.72)*3.+col.ggg*vec3(.05,.55,.35); col*=.85+.15*sin(uv.y*uResolution.y*1.7); }
  if(uMode==5){ col+=vec3(.45,.18,.55)*m+pow(max(0.,1.-d*2.5),3.)*vec3(.9,.55,1.); }
  if(uMode==6){ col=floor(col*7.)/7.; col*=.85+hash(floor(uv*vec2(80.,142.)))*.25; }
  if(uMode==7){ float ring=abs(distance(uv,f)-(.16+.12*uPinch)); col+=vec3(.2,.75,1.)*smoothstep(.025,0.,ring)*2.4; col=mix(col,col.brg, m*.45); }
  if(uMode==8){ col=vec3(col.r, texture2D(uVideo,wuv+vec2(.018*uSwipe,0)).g, texture2D(uVideo,wuv-vec2(.018*uSwipe,0)).b); col+=hash(uv*uResolution+uTime)*uSwipe*.25; }
  if(uMode==9){ float scan=step(.96,fract(uv.y*95.+uTime*6.)); col=col.ggg*vec3(.05,.75,.22)+scan*vec3(.0,1.,.25); }
  if(uMode==10){ col=thermal(col,n)*.55+col.brg*.45; col+=vec3(.25,.7,1.)*m+hash(uv*uResolution+uTime)*.15; }
  col += (hash(uv*uResolution+uTime)-.5)*.045; col *= .82+.18*smoothstep(.9,.2,distance(uv,vec2(.5)));
  col=mix(col,vec3(1.),uTransition*.2); gl_FragColor=vec4(col,1.);
}
