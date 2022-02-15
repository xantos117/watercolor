precision mediump float; 
vec2 texCoord;
vec4 fColor; 

void main() { 
    fColor.x = float(texCoord.x > 0.3 && texCoord.x < 0.7);
    fColor.y = float(texCoord.y > 0.3 && texCoord.y < 0.7);
    gl_FragColor = vec4(1); 
}