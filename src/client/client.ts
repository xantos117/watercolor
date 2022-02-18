import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'lil-gui'
import { WebGLRenderTarget } from 'three';

let mouseX : number, mouseY : number;
let mouseDown = false;
let mouse = new THREE.Vector3(0,0,1);
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
let blankTextureData = new Uint8Array(canvasWidth * canvasHeight);
let initTex = new THREE.DataTexture(blankTextureData,canvasWidth,canvasHeight,THREE.LuminanceFormat,THREE.UnsignedByteType);
initTex.magFilter = THREE.NearestFilter;
initTex.needsUpdate = true;
let initTex2 = new THREE.Texture().copy(initTex);

let scene = new THREE.Scene();

let camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
camera.position.z = 100;
let renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
renderer.setSize(canvasWidth,canvasHeight);
document.body.append(renderer.domElement);

let bufferScene = new THREE.Scene();

let bufferTexture = new THREE.WebGLRenderTarget( 1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});

let Texture1 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});
let Texture2 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
    {minFilter: THREE.LinearFilter,
     magFilter: THREE.LinearFilter,
     format: THREE.RGBAFormat,
     type: THREE.FloatType});

const geometry = new THREE.BoxGeometry()
const paper = new THREE.PlaneGeometry(1,1)
const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
})
const paperMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
})

let vertShader : HTMLElement | null = document.getElementById('vertex-shader');
let fragShader : HTMLElement | null = document.getElementById('fragment-shader');
let fragScreen : HTMLElement | null = document.getElementById('fragment-screen');

const loader = new THREE.TextureLoader();
const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/bayer.png');
texture.minFilter = THREE.NearestFilter;
texture.magFilter = THREE.NearestFilter;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;

let uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(1, 1, 1) },
    mousePos: { value: new THREE.Vector2() },
    inkColor: { value: new THREE.Vector4(1,1,1,1)},
    screenWidth: {value: canvasWidth},
    screenHeight: {value: canvasHeight},
    tSource: {type: "t", value: initTex as THREE.Texture},
    mDown: {type: "b", value: false},    
};


const sizes = {
    width: canvasWidth,
    height: canvasHeight
};

let onMouseMove = function(e: MouseEvent)
{
    mouseX = e.pageX
    mouseY = e.pageY

    if(mouseDown)
        uniforms.iResolution.value.x = mouseX/canvasWidth;
        uniforms.iResolution.value.y = 1-mouseY/canvasHeight;
}

let onMouseDown = function(e: MouseEvent)
{
    mouse.x = e.pageX;
    mouse.y = e.pageY;
    mouseDown = true;
    uniforms.mDown.value = true;

    uniforms.mousePos.value.x = mouseX/canvasWidth;
    uniforms.mousePos.value.y = (1-mouseY)/canvasHeight;
}

let onMouseUp = function(e: Event)
{
    mouseDown = false;
    uniforms.mDown.value = false;
}

function handleMouseMove(event: MouseEvent) {
    mouse.x = event.pageX;
    mouse.y = event.pageY;
    mouse.z = 1;

    if(mouseDown){
        uniforms.mousePos.value.x = mouse.x/canvasWidth;
        uniforms.mousePos.value.y = 1 - (mouse.y/canvasHeight);
        console.log(uniforms.mousePos.value);
    }
}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    renderer.setSize( window.innerWidth, window.innerHeight );
}

window.onmousedown = onMouseDown;
window.onmouseup = onMouseUp;
window.onmousemove = onMouseMove;

window.addEventListener("mousemove", handleMouseMove);

let vertShaderText : string | null = "";
if(vertShader) {
    vertShaderText = vertShader.textContent;
}

let fragShaderText : string | null = "";
if(fragShader) {
    fragShaderText = fragShader.textContent;
}

let fragScreenText : string | null = "";
if(fragScreen) {
    fragScreenText = fragScreen.textContent;
}

let shaderMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertShaderText ? vertShaderText : "",
    fragmentShader: fragShaderText ? fragShaderText : "",
});

let shaderMat2 = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertShaderText ? vertShaderText : "",
    fragmentShader: fragScreenText ? fragScreenText : "",
});


paperMat.map = bufferTexture.texture;
paperMat.map.wrapS = THREE.RepeatWrapping;
paperMat.map.wrapT = THREE.RepeatWrapping;

const paperObj = new THREE.Mesh(paper, shaderMat2);

const cube = new THREE.Mesh(geometry, shaderMat);
bufferScene.add(cube)
scene.add(paperObj);

const colorSet = { 
    red: new THREE.Vector4(1,0,0,1),
    green: new THREE.Vector4(0,1,0,1),
    blue: new THREE.Vector4(0,0,1,1),
};
const curColor = {Color: new THREE.Vector4(1,0,0,1)};

const gui = new GUI();
const colorFolder = gui.addFolder('Color')
colorFolder.add(curColor,'Color',colorSet);


let screenToggle = false;

let initTime = Date.now();

function render() {
    requestAnimationFrame( render );
    uniforms.inkColor.value = curColor.Color;
    uniforms.iTime.value = (Date.now() - initTime)/1000;
    // Render onto our off-screen texture
    if(screenToggle){
        uniforms.tSource.value = Texture1.texture;
        renderer.setClearColor("rgb(0, 0, 0)");
        renderer.setRenderTarget(Texture2);
        renderer.render(bufferScene, camera);
        uniforms.tSource.value = Texture2.texture;
    } else {
        // Finally, draw to the screen
        uniforms.tSource.value = Texture2.texture;
        renderer.setClearColor("rgb(0, 0, 0)");
        renderer.setRenderTarget(Texture1);
        renderer.render( scene, camera );
        uniforms.tSource.value = Texture1.texture;
    }
    screenToggle = !screenToggle;
    renderer.setClearColor("rgb(150, 150, 150)");
    renderer.setRenderTarget(null);
    renderer.render( scene, camera );
    initTime = Date.now();
}
 
render()