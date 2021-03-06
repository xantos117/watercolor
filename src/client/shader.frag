#version 130
precision mediump float;
//---------------------------------------------------------------------------------------
// Actual shader
//
varying vec2 vUv;
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 inkColor;
// (e1,e2,e3,e4)
uniform sampler2D stVecs;
// (e5,e6,e7,e8)
uniform sampler2D diagVecs;
// (e0, u.x, u.y, rho)
uniform sampler2D otherVecs;
uniform sampler2D paperTexture;
uniform sampler2D reboundTexture;
uniform sampler2D pigmentTexture1;
uniform vec2 mousePrior;
uniform vec2 mousePos;
uniform float screenWidth;
uniform float screenHeight;
uniform int shaderStage;
uniform bool mDown;
uniform float omg;
uniform float rho0;
uniform float c;
uniform float alpha;
uniform float eta;
uniform bool ink;
uniform float brushRadius;
uniform vec2 dv;
uniform vec3 K;
uniform vec3 S;

// lattice direction vectors
vec2 e[9] = vec2[9](vec2(0,0),
            vec2(1,0),
            vec2(0,1),
            vec2(-1,0),
            vec2(0,-1),
            vec2(1,1),
            vec2(-1,1),
            vec2(-1,-1),
            vec2(1,-1));
// lattice geometry constants
float w[9] = float[9](4./9.,1./9.,1./9.,1./9.,1./9.,1./36.,1./36.,1./36.,1./36.);

float waterEvapRate = 0.01;
float maxWaterCap = 1.;
float MAX_KAPPA = 2e20;
//float brushRadius = 50.;

//	<https://www.shadertoy.com/view/Xd23Dh>
//	by inigo quilez <http://iquilezles.org/www/articles/voronoise/voronoise.htm>
//

vec3 hash3( vec2 p ){
    vec3 q = vec3( dot(p,vec2(127.1,311.7)), 
                dot(p,vec2(269.5,183.3)), 
                dot(p,vec2(419.2,371.9)) );
    return fract(sin(q)*43758.5453);
}

float iqnoise( in vec2 x, float u, float v ){
    vec2 p = floor(x);
    vec2 f = fract(x);
        
    float k = 1.0+63.0*pow(1.0-v,4.0);
    
    float va = 0.0;
    float wt = 0.0;
    for( int j=-2; j<=2; j++ )
    for( int i=-2; i<=2; i++ )
    {
        vec2 g = vec2( float(i),float(j) );
        vec3 o = hash3( p + g )*vec3(u,u,1.0);
        vec2 r = g - f + o.xy;
        float d = dot(r,r);
        float ww = pow( 1.0-smoothstep(0.0,1.414,sqrt(d)), k );
        va += o.z*ww;
        wt += ww;
    }
    
    return va/wt;
}

//	Classic Perlin 2D Noise 
//	by Stefan Gustavson
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec2 P){
    vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
    vec4 ix = Pi.xzxz;
    vec4 iy = Pi.yyww;
    vec4 fx = Pf.xzxz;
    vec4 fy = Pf.yyww;
    vec4 i = permute(permute(ix) + iy);
    vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;
    vec2 g00 = vec2(gx.x,gy.x);
    vec2 g10 = vec2(gx.y,gy.y);
    vec2 g01 = vec2(gx.z,gy.z);
    vec2 g11 = vec2(gx.w,gy.w);
    vec4 norm = 1.79284291400159 - 0.85373472095314 * 
        vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
    g00 *= norm.x;
    g01 *= norm.y;
    g10 *= norm.z;
    g11 *= norm.w;
    float n00 = dot(g00, vec2(fx.x, fy.x));
    float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z));
    float n11 = dot(g11, vec2(fx.w, fy.w));
    vec2 fade_xy = fade(Pf.xy);
    vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
}

float relax(float f,int i) {
    vec2 u = texture2D(otherVecs,vUv).yz;
    //float alpha = 0.4;
    float rho = texture2D(otherVecs,vUv).a;
    float kap = texture2D(reboundTexture,vUv).b;
    float deu = dot(e[i],u);
    float psi = smoothstep( 0., alpha, rho);
    float f_eq = w[i] *(rho + rho0 * psi * ((3./(c*c))*deu + (9./(2.*(c*c*c*c))) * deu * deu  - (3./(2.*c*c)) * dot(u,u)));
    return (1. - omg) * f + omg * f_eq;
}

float relaxExplicit(float f,int i,vec2 u,float rho) {
    float kap = texture2D(reboundTexture,vUv).b;
    float deu = dot(e[i],u);
    float psi = smoothstep( 0., alpha, rho);
    float f_eq = w[i] *(rho + rho0 * psi * ((3./(c*c))*deu + (9./(2.*(c*c*c*c))) * deu * deu  - (3./(2.*c*c)) * dot(u,u)));
    return (1. - omg) * f + omg * f_eq;
}

vec2 getMouseDistance() {
    vec2 texel = vec2(screenWidth, screenHeight);
    //vec2 diff = (vUv - mousePos)*texel;
    //float dist = dot(diff, diff);
    vec2 p1 = mousePrior*texel;
    vec2 p2 = mousePos*texel;
    vec2 p0 = vUv*texel;
    vec2 diff = (p2 - p1);
    vec2 a = p1;
    vec2 n = normalize(p2-p1);
    vec2 dvec = (p0-a) - (dot((p0-a),n) * n);

    if(length(diff) < 0.001)
        return abs((p0-p2));


    vec2 v1 = normalize(p2 - p1);
    vec2 v2 = normalize(p0 - p1);
    vec2 v3 = normalize(p1 - p2);
    vec2 v4 = normalize(p0 - p2);

    if(dot(v1,v2) > 0. && dot(v3,v4) > 0.){
        return abs(dvec);
    } else {
        return float(dot(v1,v2)>0.)*abs((p0-p1)) + float(dot(v3,v4)>0.)*abs((p0-p2));
    }
    //return dist;

}

void flowPigment(out vec4 fragColor,in sampler2D pigTex) {
    vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);
    vec4 stVec = texture2D(stVecs,vUv);
    vec4 diagVec = texture2D(diagVecs,vUv);
    vec4 otherVec = texture2D(otherVecs,vUv);
    vec4 reboundVec = texture2D(reboundTexture,vUv);
    vec4 priorVec = texture2D(pigTex,vUv);

    
    vec2 vel = otherVec.yz;
    
    float psurf = priorVec.r;
    float pflow = priorVec.g;
    float pfix = priorVec.b;
    float ptemp = 0.;
    float nu = 0.01;
    float toFix = 0.;

    float dist = length(getMouseDistance());
    if(dist < brushRadius && mDown) {   
        psurf = 1.0;
    }
    
    if(reboundVec.b <= 1.){
        if(otherVec.a + reboundVec.r > 1.){
            pflow = min((pflow * otherVec.a + psurf * reboundVec.r)/(otherVec.a + reboundVec.r),1.);
            psurf = max(psurf - (psurf*reboundVec.r/(otherVec.a + reboundVec.r)),0.);
        }

        if(reboundVec.b < 10.) {
            // already wet
            // perhaps velocity should scale this? 
            pflow += texture2D(pigTex,vUv - vel).g;
        }else {
            for(int i = 1; i<5;i++) {
                ptemp += stVec[i] * texture2D(pigTex,vUv+e[i]).g;
            }
            for(int i = 5;i<9;i++) {
                ptemp += diagVec[i] * texture2D(pigTex,vUv+e[i]).g;
            }
            //if(otherVec.a > 1. && ptemp > eta)
            ptemp *= (1./otherVec.a);
            pflow = pflow + ptemp;
        }
        //psurf = ptemp;
        //psurf = max(psurf * reboundVec.r,0.);

        float wloss = reboundVec.a - otherVec.a;
        float psi = 0.;
        if(wloss > 0.)
            psi = abs((reboundVec.a - otherVec.a)/reboundVec.a);
        toFix = max(psi * (1.-smoothstep(0.,1.0,otherVec.a)),0.005);
        //toFix = min(toFix,pflow);
        pfix = min(pfix + toFix,1.0);
        pflow = clamp(pflow-toFix,0.,1.);
    }

    fragColor = vec4(clamp(psurf,0.,1.),clamp(pflow,0.,1.),clamp(pfix,0.,1.),1.);
}

void determineBoundary(out vec4 fragColor) {
    // write out to texture containing values ws, wf, kappa and rho prior
    vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);
    vec4 otherVec = texture2D(otherVecs,vUv);
    float dist = length(getMouseDistance());
    float ws = 0.;
    float wf = 0.;
    float kappa = 0.;
    float rho_p = 0.;
    float rho = otherVec.a;
    if(dist < brushRadius && mDown) {   
        ws = 1.0;
    }else{
        ws = max(texture2D(reboundTexture,vUv).r - waterEvapRate, 0.);
    }
    wf = clamp(ws,0.,max(maxWaterCap - rho,0.));
    ws = max(ws - wf, 0.);

    float sumDens = 0.;
    bool block = false;
    for(int i = 1;i<9;i++) {
        sumDens = texture2D(otherVecs,vUv + e[i]*texel).a;
        if(sumDens > eta) { 
            block == true;
        }
    }
    if(otherVec.a > eta || block) {
        vec4 pa = texture2D(paperTexture,vUv);
        kappa = (pa.r+pa.g+pa.b)/3.; //iqnoise(100.*vUv, 1., 1.);
    } else {
        kappa = MAX_KAPPA;
    }
    rho_p = otherVec.a;
    fragColor = vec4(ws,wf,kappa,rho_p);
}

void streamInPlus(out vec4 fragColor) {
    vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);
    vec4 stVec = texture2D(stVecs,vUv);
    vec4 rebound = texture2D(reboundTexture,vUv);

    float dist = length(getMouseDistance());
    vec2 dv = vec2(0.);

    if(dist < brushRadius && mDown) {  
        dv = (mousePos - mousePrior)/iTime;
        for(int i = 0;i<4;i++){
            //stVec[i] = w[i];
            stVec[i] = max(dot(e[i+1],dv),0.0);
        }
    } else {

        vec4 tex1 = texture2D(stVecs,vUv - e[1]*texel);
        vec4 tex2 = texture2D(stVecs,vUv - e[2]*texel);
        vec4 tex3 = texture2D(stVecs,vUv - e[3]*texel);
        vec4 tex4 = texture2D(stVecs,vUv - e[4]*texel);
        vec4 reb1 = texture2D(reboundTexture,vUv - e[1]*texel);
        vec4 reb2 = texture2D(reboundTexture,vUv - e[2]*texel);
        vec4 reb3 = texture2D(reboundTexture,vUv - e[3]*texel);
        vec4 reb4 = texture2D(reboundTexture,vUv - e[4]*texel);
        float kap1 = (reb1.b + rebound.b)/2.;
        float kap2 = (reb2.b + rebound.b)/2.;
        float kap3 = (reb3.b + rebound.b)/2.;
        float kap4 = (reb4.b + rebound.b)/2.;
        if(kap1<=1.){
            stVec.r = (kap1) * stVec.r + (1.-kap1) * tex3.b;
        }else {
            stVec.r = float(rebound.b <= 1.) * tex1.r + float(rebound.b > 1.) * tex3.b;
        }
        if(kap2<=1.){
            stVec.g = (kap2) * stVec.g + (1.-kap2) * tex4.a;
        }else {
            stVec.g = float(rebound.b <= 1.) * tex2.g + float(rebound.b > 1.) * tex4.a;
        }
        if(kap3<=1.){
            stVec.b = (kap3) * stVec.b + (1.-kap3) * tex1.r;
        }else {
            stVec.b = float(rebound.b <= 1.) * tex3.b + float(rebound.b > 1.) * tex1.r;
        }
        if(kap4<=1.){
            stVec.a = (kap4) * stVec.a + (1.-kap4) * tex2.g;
        }else {
            stVec.a = float(rebound.b <= 1.) * tex4.a + float(rebound.b > 1.) * tex2.g;
        }

        //fragColor.r = float(rebound.b < 10.) * tex1.r + float(rebound.b > 10.) * tex3.b;
        //fragColor.g = float(rebound.b < 10.) * tex2.g + float(rebound.b > 10.) * tex4.a;
        //fragColor.b = float(rebound.b < 10.) * tex3.b + float(rebound.b > 10.) * tex1.r;
        //fragColor.a = float(rebound.b < 10.) * tex4.a + float(rebound.b > 10.) * tex2.g;
    }

    fragColor = stVec;
}

void streamInX(out vec4 fragColor) {
    vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);
    vec4 diagVec = texture2D(diagVecs,vUv);
    vec4 rebound = texture2D(reboundTexture,vUv);

    float dist = length(getMouseDistance());
    vec2 dv = vec2(0.);

    if(dist < brushRadius && mDown) {  
        dv = (mousePos - mousePrior)/iTime;      
        for(int i = 0;i<4;i++){
            //diagVec[i] = w[i+5];
            diagVec[i] = max(dot(e[i+5],dv),0.0);
        }
    } else {
        vec4 tex1 = texture2D(diagVecs,vUv - e[5]*texel);
        vec4 tex2 = texture2D(diagVecs,vUv - e[6]*texel);
        vec4 tex3 = texture2D(diagVecs,vUv - e[7]*texel);
        vec4 tex4 = texture2D(diagVecs,vUv - e[8]*texel);
        float kap1 = (texture2D(reboundTexture,vUv - e[5]*texel).b + rebound.b)/2.;
        float kap2 = (texture2D(reboundTexture,vUv - e[6]*texel).b + rebound.b)/2.;
        float kap3 = (texture2D(reboundTexture,vUv - e[7]*texel).b + rebound.b)/2.;
        float kap4 = (texture2D(reboundTexture,vUv - e[8]*texel).b + rebound.b)/2.;
        if(kap1<=1.){
            diagVec.r = (kap1) * diagVec.r + (1.-kap1) * tex3.b;
        } else {
            diagVec.r = float(rebound.b <= 1.) * tex1.r + float(rebound.b > 1.) * tex3.b;
        }
        if(kap2<=1.){
            diagVec.g = (kap2) * diagVec.g + (1.-kap2) * tex4.a;
        }else {
            diagVec.g = float(rebound.b <= 1.) * tex2.g + float(rebound.b > 1.) * tex4.a;
        }

        if(kap3<=1.){
            diagVec.b = (kap3) * diagVec.b + (1.-kap3) * tex1.r;
        }else {
            diagVec.b = float(rebound.b <= 1.) * tex3.b + float(rebound.b > 1.) * tex1.r;
        }

        if(kap4<=1.){
            diagVec.a = (kap4) * diagVec.a + (1.-kap4) * tex2.g;
        }else {
            diagVec.a = float(rebound.b <= 1.) * tex4.a + float(rebound.b > 1.) * tex2.g;
        }

        //diagVec.r = float(rebound.b < 10.) * tex1.r + float(rebound.b > 10.) * tex3.b;
        //diagVec.g = float(rebound.b < 10.) * tex2.g + float(rebound.b > 10.) * tex4.a;
        //diagVec.b = float(rebound.b < 10.) * tex3.b + float(rebound.b > 10.) * tex1.r;
        //diagVec.a = float(rebound.b < 10.) * tex4.a + float(rebound.b > 10.) * tex2.g;
    }

    fragColor = diagVec;
}

void updateDensVel(out vec4 fragColor) {
    vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);
    vec4 stVec = texture2D(stVecs,vUv);
    vec4 diagVec = texture2D(diagVecs,vUv);
    vec4 otherVec = texture2D(otherVecs,vUv);

    float dist = length(getMouseDistance());

    float rho = 0.;
    //if(dist < brushRadius && mDown) {   
    //    rho = 1.0;
    //    otherVec.r = w[0];
    //}
    //else {
    //    //rho *= 0.9;
    //}
    rho = stVec.r + stVec.g + stVec.b + stVec.a + diagVec.r + diagVec.g + diagVec.b + diagVec.a + otherVec.r;

    vec2 u = e[1] * stVec.r + e[2] * stVec.g + e[3] * stVec.b + e[4] * stVec.a + e[5] * diagVec.r + e[6] * diagVec.g + e[7] * diagVec.b + e[8] * diagVec.a; 
    u *= (1./rho0);

    fragColor = vec4(relaxExplicit(otherVec.r,0,u,rho), u.x, u.y, rho);
}

void relaxPlus(out vec4 fragColor) {
    vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);
    vec4 stVec = texture2D(stVecs,vUv);

    stVec.r = relax(stVec.r,1);
    stVec.g = relax(stVec.g,2);
    stVec.b = relax(stVec.b,3);
    stVec.a = relax(stVec.a,4);

    fragColor = stVec;
}

void relaxX(out vec4 fragColor) {
    vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);
    vec4 diagVec = texture2D(diagVecs,vUv);

    diagVec.r = relax(diagVec.r,5);
    diagVec.g = relax(diagVec.g,6);
    diagVec.b = relax(diagVec.b,7);
    diagVec.a = relax(diagVec.a,8);

    fragColor = diagVec;
}

void drawToScreen(out vec4 fragColor) {
    vec4 otherVec = texture2D(otherVecs,vUv);
    vec4 paperVec = texture2D(paperTexture,vUv);
    vec4 boundVec = texture2D(reboundTexture,vUv);
    vec4 redVec = texture2D(pigmentTexture1,vUv);
    float sumRed = redVec.r + redVec.g + redVec.b;
    float intens = clamp(sumRed/3.,0.,1.);
    fragColor = vec4(intens,0.,0.,intens);
    //if(sumRed<0.01) {
    //    fragColor = vec4(0.8,0.8,0.8,1.);
    //}else {
    //    fragColor = vec4(intens,0.,0.,1.);
    //    //fragColor = redVec;
    //}
    //vec4 lColor = mix(paperVec+vec4(1.),vec4(vec3(0.),1.),intens);
    //fragColor = colormap(boundVec.b);
}

void drawUv(out vec4 fragColor){
    vec4 height = texture2D(paperTexture,vUv);
    fragColor = height;//vec4(height,height,height,1.0);
}

void getKMColor(out vec4 fragColor){
    // assuming given K and S
    vec3 a = 1 + (K/S);
    vec3 b = sqrt(a*a - 1);
    vec4 thick = texture2D(pigmentTexture1,vUv);
    float d = (thick.r + thick.g + thick.b)/3;
    vec3 R = 1/(a + b * atanh(1/(b*S*d)));
    fragColor = vec4(R,1.0);
}

void main() {
    //vec4 rPig = texture2D(pigmentTexture1,vUv);
    switch (shaderStage) {
        case 0:
            streamInPlus(gl_FragColor);
            break;
        case 1:
            streamInX(gl_FragColor);
            break;
        case 2:
            updateDensVel(gl_FragColor);
            break;
        case 3:
            relaxPlus(gl_FragColor);
            break;
        case 4: 
            relaxX(gl_FragColor);
            break;
        case 5:
            determineBoundary(gl_FragColor);
            break;
        case 6:
            flowPigment(gl_FragColor,pigmentTexture1);
            break;
        case 7:
            drawUv(gl_FragColor);
            break;
        default:
            //drawToScreen(gl_FragColor);
            getKMColor(gl_FragColor);
            break;
    }
}