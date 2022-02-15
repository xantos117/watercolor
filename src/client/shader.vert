vec4 vPosition; 
vec2 vTexCoord; 
uniform vec4 uColor; 
varying vec4 fColor;
varying vec2 texCoord;
void main() { 
    gl_Position = vPosition; 
    fColor = uColor; 
    texCoord = vTexCoord;
}