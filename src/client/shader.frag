#include <common>

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
uniform vec2 mousePos;
uniform float screenWidth;
uniform float screenHeight;
uniform bool mDown;

// lattice direction vectors
vec2 e[9] = vec2[](vec2(0,0),
            vec2(1,0),
            vec2(0,1),
            vec2(-1,0),
            vec2(0,-1),
            vec2(1,1),
            vec2(-1,1),
            vec2(-1,-1),
            vec2(1,-1));
// lattice geometry constants
float w[9] = float[](4/9,1/9,1/9,1/9,1/9,1/36,1/36,1/36,1/36);

float omg = 0.9;
float rho0 = 1.0;
float c = 1.0;

float relax(f,i) {
    vec2 u = texture2D(otherVecs,vUv).yz;
    float deu = dot(e[i],u);
    float f_eq = (3/(c*c))*deu + (9/(c*c*c*c)) * deu * deu  - (3/(2*c*c)) * dot(u,u);
    return (1 - omg) * f + omg * f_eq;
}

vec2 sumVecs(stVecs, diagVecs) {
    return e[1] * stVecs.r + e[2] * stVecs.g + e[3] * stVecs.b + e[4] * stVecs.a + e[5] * diagVecs.r + e[6] * diagVecs.g + e[7] * diagVecs.b + e[8] * diagVecs.a;
}

float sumFs(stVecs,diagVecs,f0) {
    return stVecs.r + stVecs.g + stVecs.b + stVecs.a + diagVecs.r + diagVecs.g + diagVecs.b + diagVecs.a + f0;
}

void streamIn(out vec4 fragcolor) {
    vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);
    vec4 stVecs = texture2D(stVecs,vUv);
    vec4 botVecs = texture2D(botVecs,vUv);
    vec4 otherVecs = texture2D(otherVecs,vUv);
    stVecs.b += texture2D(stVecs,vUv + e[1]*texel).b;
    stVecs.r += texture2D(stVecs,vUv + e[3]*texel).r;
    stVecs.g += texture2D(stVecs,vUv + e[4]*texel).g;
    stVecs.a += texture2D(stVecs,vUv + e[2]*texel).a;
    diagVecs.b += texture2D(diagVecs,vUv + e[5]*texel).b;
    diagVecs.r += texture2D(diagVecs,vUv + e[7]*texel).r;
    diagVecs.g += texture2D(diagVecs,vUv + e[8]*texel).g;
    diagVecs.a += texture2D(diagVecs,vUv + e[6]*texel).a;
    
    stVecs.r = relax(stVecs.r,1);
    stVecs.g = relax(stVecs.g,2);
    stVecs.b = relax(stVecs.b,3);
    stVecs.a = relax(stVecs.a,4);
    diagVecs.b = relax(diagVecs.b,7);
    diagVecs.r = relax(diagVecs.r,5);
    diagVecs.g = relax(diagVecs.g,6);
    diagVecs.a = relax(diagVecs.a,8);
    otherVecs.r = relax(otherVecs.r,0);

    float nRho = sumFs(stVecs,diagVecs,otherVecs.a);

    otherVecs.gb = 1/rho * sumVecs(stVecs,diagVecs);

    otherVecs.a = nRho;
}

void mainImage( out vec4 fragColor) {
    vec2 texel = vec2(1.0/screenWidth, 1.0/screenHeight);
    vec4 brush = vec4(1.);
    vec4 color1 = inkColor;
    vec4 color2 = vec4(0.0);
    float travelDist = (10. / 1000.) * iTime;

    vec2 diff = (vUv - mousePos)/texel;
    float dist = dot(diff, diff);
    vec4 curColor = texture2D(tSource,vUv);
    vec4 compColor;
    vec2 searchDir;

    compColor = vec4(0);

    for(float i = -1.; i<=1.001;i++){
        for(float j=-1.;j<=1.001;j++){
            if(!(i==0. && j==0.)){
                curColor = texture2D(tSource,vec2(vUv.x + i*texel.x, vUv.y + j*texel.y));
                compColor.r = max(compColor.r,curColor.r);
                compColor.g = max(compColor.g,curColor.g);
                compColor.b = max(compColor.b,curColor.b);
            }
        }
    }
    

    if(dist < 50. && mDown) {   
        fragColor = color1 + curColor;
    }
    else {
        compColor.r = min(1.,compColor.r);
        compColor.g = min(1.,compColor.g);
        compColor.b = min(1.,compColor.b);
        fragColor = (compColor*0.99);
    }
    
}

void main() {
    mainImage(gl_FragColor);
}